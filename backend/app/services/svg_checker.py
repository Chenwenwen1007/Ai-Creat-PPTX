"""
SVG 质量检查器
验证 AI 生成的 SVG 是否符合设计规范
"""

import re
import xml.etree.ElementTree as ET
from typing import Dict, List, Tuple


def check_svg(svg_content: str, design_spec: str = "") -> Tuple[bool, List[Dict]]:
    """
    检查 SVG 质量
    
    Returns:
        (是否通过, [问题列表])
    """
    issues = []

    # 1. 基础结构检查
    struct_ok, struct_issues = check_structure(svg_content)
    issues.extend(struct_issues)

    # 2. 颜色检查（如果有设计规范）
    if design_spec:
        color_ok, color_issues = check_colors(svg_content, design_spec)
        issues.extend(color_issues)

    # 3. 文字溢出检查
    overflow_ok, overflow_issues = check_text_overflow(svg_content)
    issues.extend(overflow_issues)

    # 4. 可读性检查
    readability_ok, readability_issues = check_readability(svg_content)
    issues.extend(readability_issues)

    # 5. 安全/性能检查
    perf_ok, perf_issues = check_performance(svg_content)
    issues.extend(perf_issues)

    # 严重级别分类
    critical_issues = [i for i in issues if i['severity'] == 'critical']
    warning_issues = [i for i in issues if i['severity'] == 'warning']
    info_issues = [i for i in issues if i['severity'] == 'info']

    passed = len(critical_issues) == 0

    return passed, {
        "passed": passed,
        "critical_count": len(critical_issues),
        "warning_count": len(warning_issues),
        "info_count": len(info_issues),
        "issues": issues
    }


def check_structure(svg_content: str) -> Tuple[bool, List[Dict]]:
    """检查 SVG 基础结构"""
    issues = []

    # 检查是否有 SVG 标签
    if '<svg' not in svg_content.lower():
        issues.append({
            "severity": "critical",
            "category": "结构",
            "message": "缺少 <svg> 根标签"
        })
        return False, issues

    # 检查 viewBox
    if 'viewBox' not in svg_content:
        issues.append({
            "severity": "warning",
            "category": "结构",
            "message": "缺少 viewBox 属性，可能导致显示问题"
        })

    # 检查 xmlns
    if 'xmlns="http://www.w3.org/2000/svg"' not in svg_content:
        issues.append({
            "severity": "warning",
            "category": "结构",
            "message": "缺少 xmlns 命名空间声明"
        })

    # 检查是否可解析为有效 XML
    try:
        ET.fromstring(svg_content)
    except ET.ParseError as e:
        issues.append({
            "severity": "critical",
            "category": "结构",
            "message": f"XML 解析错误: {str(e)}"
        })

    return len(issues) == 0, issues


def check_colors(svg_content: str, design_spec: str) -> Tuple[bool, List[Dict]]:
    """检查颜色是否符合设计规范"""
    issues = []

    # 从设计规范中提取颜色
    spec_colors = set()
    color_pattern = r'#[0-9A-Fa-f]{6}'
    spec_colors.update(re.findall(color_pattern, design_spec))

    if not spec_colors:
        return True, issues

    # 从 SVG 中提取颜色
    svg_colors = set(re.findall(color_pattern, svg_content))

    # 检查 SVG 中是否有不在规范中的颜色（排除黑白灰）
    allowed_neutrals = {'#000000', '#FFFFFF', '#ffffff', '#333333', '#666666', '#999999', '#CCCCCC', '#cccccc'}
    unauthorized_colors = svg_colors - spec_colors - allowed_neutrals

    if unauthorized_colors:
        issues.append({
            "severity": "warning",
            "category": "颜色",
            "message": f"发现未授权颜色: {', '.join(list(unauthorized_colors)[:3])}"
        })

    return len(issues) == 0, issues


def check_text_overflow(svg_content: str) -> Tuple[bool, List[Dict]]:
    """检查文字是否可能溢出边界"""
    issues = []

    try:
        root = ET.fromstring(svg_content)

        # 获取 SVG 尺寸
        width = 1280
        height = 720
        if 'viewBox' in root.attrib:
            vb = root.attrib['viewBox'].split()
            if len(vb) >= 4:
                width = float(vb[2])
                height = float(vb[3])

        # 检查文本元素位置
        for text_elem in root.iter('{http://www.w3.org/2000/svg}text'):
            x = float(text_elem.get('x', 0))
            y = float(text_elem.get('y', 0))
            text_content = ''.join(text_elem.itertext())

            # 简单估算文本宽度（中文字符约 16px，英文约 8px）
            chinese_chars = len(re.findall(r'[\u4e00-\u9fff]', text_content))
            other_chars = len(text_content) - chinese_chars
            estimated_width = chinese_chars * 16 + other_chars * 8

            # 检查是否可能溢出
            if x + estimated_width > width * 0.95:
                issues.append({
                    "severity": "warning",
                    "category": "排版",
                    "message": f"文本可能溢出右侧边界: \"{text_content[:20]}...\""
                })

            if y > height * 0.95:
                issues.append({
                    "severity": "warning",
                    "category": "排版",
                    "message": f"文本位置过于靠下: \"{text_content[:20]}...\""
                })

    except Exception:
        # XML 解析失败已在结构检查中报告
        pass

    return len(issues) == 0, issues


def check_readability(svg_content: str) -> Tuple[bool, List[Dict]]:
    """检查可读性"""
    issues = []

    # 检查字体大小
    font_size_pattern = r'font-size[=:]"?(\d+(?:\.\d+)?)"?'
    font_sizes = re.findall(font_size_pattern, svg_content)

    for size_str in font_sizes:
        size = float(size_str)
        if size < 10:
            issues.append({
                "severity": "warning",
                "category": "可读性",
                "message": f"发现过小的字体 ({size}px)，可能影响可读性"
            })

    # 检查对比度（简化检查：深色背景上的深色文字或浅色背景上的浅色文字）
    # 这里只做简单的背景色和文字颜色检查
    bg_match = re.search(r'<rect[^>]*width=["\']100%["\'][^>]*fill=["\']#([0-9A-Fa-f]{6})["\']', svg_content)
    if bg_match:
        bg_color = bg_match.group(1)
        bg_brightness = calculate_brightness(bg_color)

        # 检查文字颜色
        text_fills = re.findall(r'fill=["\']#([0-9A-Fa-f]{6})["\']', svg_content)
        for text_color in text_fills[:3]:  # 只检查前几个
            text_brightness = calculate_brightness(text_color)
            contrast = abs(bg_brightness - text_brightness)
            if contrast < 50:
                issues.append({
                    "severity": "warning",
                    "category": "可读性",
                    "message": f"文字与背景对比度不足，可能影响可读性"
                })
                break

    return len(issues) == 0, issues


def check_performance(svg_content: str) -> Tuple[bool, List[Dict]]:
    """检查性能和安全问题"""
    issues = []

    # 检查文件大小
    svg_size_kb = len(svg_content.encode('utf-8')) / 1024
    if svg_size_kb > 500:
        issues.append({
            "severity": "warning",
            "category": "性能",
            "message": f"SVG 文件过大 ({svg_size_kb:.1f}KB)，可能包含过多细节"
        })

    # 检查是否有外部引用
    if 'href="http' in svg_content or 'xlink:href="http' in svg_content:
        issues.append({
            "severity": "info",
            "category": "安全",
            "message": "SVG 包含外部链接引用"
        })

    # 检查复杂路径数量
    path_count = svg_content.count('<path')
    if path_count > 100:
        issues.append({
            "severity": "info",
            "category": "性能",
            "message": f"路径元素较多 ({path_count} 个)，可能影响渲染性能"
        })

    return len(issues) == 0, issues


def calculate_brightness(hex_color: str) -> float:
    """计算颜色亮度 (0-255)"""
    try:
        r = int(hex_color[0:2], 16)
        g = int(hex_color[2:4], 16)
        b = int(hex_color[4:6], 16)
        return (r * 299 + g * 587 + b * 114) / 1000
    except:
        return 128


def generate_quality_report(page_num: int, svg_content: str, design_spec: str = "") -> Dict:
    """
    生成质量检查报告
    
    Returns:
        格式化的检查报告
    """
    passed, result = check_svg(svg_content, design_spec)

    return {
        "page": page_num,
        "passed": passed,
        "summary": f"通过: {result['passed']}, 严重: {result['critical_count']}, 警告: {result['warning_count']}, 提示: {result['info_count']}",
        "details": result
    }
