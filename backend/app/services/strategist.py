"""
Strategist（策划角色）
根据大纲和源内容生成设计规范，实现 ppt-master 风格的"八问确认"机制
"""

import re
import json
from typing import Dict, List, Tuple


# 预设配色方案库
COLOR_SCHEMES = {
    "深海蓝": {
        "primary": "#0B3D91",
        "secondary": "#1565C0",
        "accent": "#64B5F6",
        "background": "#E3F2FD"
    },
    "森林绿": {
        "primary": "#1B5E20",
        "secondary": "#2E7D32",
        "accent": "#81C784",
        "background": "#E8F5E9"
    },
    "中国红": {
        "primary": "#B71C1C",
        "secondary": "#C62828",
        "accent": "#EF5350",
        "background": "#FFEBEE"
    },
    "极夜黑": {
        "primary": "#1A1A2E",
        "secondary": "#16213E",
        "accent": "#E0E0E0",
        "background": "#F5F5F5"
    },
    "罗兰紫": {
        "primary": "#4A148C",
        "secondary": "#6A1B9A",
        "accent": "#CE93D8",
        "background": "#F3E5F5"
    },
    "科技青": {
        "primary": "#006064",
        "secondary": "#00838F",
        "accent": "#4DD0E1",
        "background": "#E0F7FA"
    }
}

# 预设字体方案
FONT_SCHEMES = {
    "商务正式": {
        "heading": "Microsoft YaHei",
        "body": "Microsoft YaHei"
    },
    "科技现代": {
        "heading": "Microsoft YaHei",
        "body": "Microsoft YaHei"
    },
    "学术严谨": {
        "heading": "SimSun",
        "body": "SimSun"
    },
    "创意活泼": {
        "heading": "Microsoft YaHei",
        "body": "Microsoft YaHei"
    }
}


def analyze_content(source: str, outline: str) -> Dict:
    """
    分析内容特征，推断受众、领域、语气等
    """
    combined_text = (source + " " + outline).lower()

    # 领域识别
    domains = {
        "科技/互联网": ["科技", "互联网", "AI", "人工智能", "大数据", "云计算", "软件", "算法", "技术", "数字化"],
        "金融/经济": ["金融", "经济", "投资", "市场", "股票", "基金", "银行", "证券", "贸易", "汇率", "GDP"],
        "教育/学术": ["教育", "学术", "研究", "论文", "教学", "学习", "学校", "大学", "课程", "培训"],
        "医疗/健康": ["医疗", "健康", "医院", "药品", "疾病", "诊断", "治疗", "养生", "临床", "医学"],
        "制造业": ["制造", "工业", "生产", "工厂", "供应链", "自动化", "机械", "工程"],
        "环保/能源": ["环保", "能源", "绿色", "碳中和", "新能源", "光伏", "风电", "可持续"],
        "政策/公共": ["政策", "政府", "公共", "社会", "治理", "法规", "制度", "规划"]
    }

    domain_scores = {domain: sum(1 for kw in keywords if kw in combined_text)
                     for domain, keywords in domains.items()}
    detected_domain = max(domain_scores, key=domain_scores.get) if max(domain_scores.values()) > 0 else "通用"

    # 受众推断
    audiences = {
        "高管/决策者": ["战略", "决策", "投资", "并购", "董事会", "总裁", "CEO", "管理层"],
        "专业人士": ["分析师", "工程师", "研究员", "专家", "顾问", "从业者"],
        "投资者": ["投资者", "股东", "股民", "基金", "理财", "回报率", "估值"],
        "学生/学者": ["学生", "论文", "课程", "学位", "毕业", "学术", "研究"],
        "公众/消费者": ["消费者", "用户", "公众", "大众", "市民", "居民"],
        "政府官员": ["政策", "政府", "官员", "监管", "法规", "公共服务"]
    }

    audience_scores = {aud: sum(1 for kw in keywords if kw in combined_text)
                       for aud, keywords in audiences.items()}
    detected_audience = max(audience_scores, key=audience_scores.get) if max(audience_scores.values()) > 0 else "专业人士"

    # 语气推断
    tones = {
        "专业严谨": ["分析", "研究", "数据", "报告", "评估", "策略", "预测"],
        "活泼生动": ["趋势", "热点", "创新", "变革", "机遇", "挑战", "未来"],
        "正式庄重": ["政策", "法规", "公告", "声明", "决议", "纲要", "规划"],
        "亲和易懂": ["指南", "科普", "介绍", "入门", "基础", "简明"]
    }

    tone_scores = {tone: sum(1 for kw in keywords if kw in combined_text)
                   for tone, keywords in tones.items()}
    detected_tone = max(tone_scores, key=tone_scores.get) if max(tone_scores.values()) > 0 else "专业严谨"

    # 页数估算
    outline_lines = [l.strip() for l in outline.split('\n') if l.strip()]
    heading_count = sum(1 for l in outline_lines if l.startswith('#'))
    estimated_pages = max(8, min(heading_count * 2 + 4, 30))

    return {
        "domain": detected_domain,
        "audience": detected_audience,
        "tone": detected_tone,
        "estimated_pages": estimated_pages
    }


def recommend_design(analysis: Dict) -> Dict:
    """
    根据内容分析结果推荐设计方案
    """
    domain = analysis["domain"]
    tone = analysis["tone"]

    # 推荐配色
    if domain == "科技/互联网":
        color = COLOR_SCHEMES["深海蓝"]
    elif domain == "环保/能源":
        color = COLOR_SCHEMES["森林绿"]
    elif domain == "金融/经济":
        color = COLOR_SCHEMES["中国红"]
    elif domain == "政策/公共":
        color = COLOR_SCHEMES["极夜黑"]
    elif domain == "医疗/健康":
        color = COLOR_SCHEMES["科技青"]
    else:
        color = COLOR_SCHEMES["罗兰紫"]

    # 推荐字体
    if tone == "正式庄重":
        font = FONT_SCHEMES["商务正式"]
    elif tone == "活泼生动":
        font = FONT_SCHEMES["创意活泼"]
    elif tone == "专业严谨":
        font = FONT_SCHEMES["学术严谨"]
    else:
        font = FONT_SCHEMES["科技现代"]

    # 推荐布局
    if analysis["audience"] in ["高管/决策者", "投资者"]:
        layout = "瑞士网格"
    elif analysis["audience"] in ["学生/学者", "专业人士"]:
        layout = "标准"
    else:
        layout = "杂志"

    # 图片风格
    if domain in ["科技/互联网", "制造业"]:
        image_style = "摄影"
    elif domain in ["教育/学术"]:
        image_style = "图表"
    else:
        image_style = "图标"

    return {
        "color_scheme": color,
        "font_family": font,
        "layout_style": layout,
        "image_style": image_style
    }


def generate_prompt(source: str, outline: str, analysis: Dict, design: Dict) -> str:
    """
    生成给 AI 的提示词，用于生成更精细的设计规范
    """
    prompt = f"""你是资深 PPT 设计策略师。请根据以下内容和大纲，生成一份详细的设计规范文档。

## 内容分析结果

- **领域**: {analysis['domain']}
- **目标受众**: {analysis['audience']}
- **语气风格**: {analysis['tone']}
- **预估页数**: {analysis['estimated_pages']} 页

## 推荐设计方案

- **主色**: {design['color_scheme']['primary']}
- **辅助色**: {design['color_scheme']['secondary']}
- **强调色**: {design['color_scheme']['accent']}
- **背景色**: {design['color_scheme']['background']}
- **标题字体**: {design['font_family']['heading']}
- **正文字体**: {design['font_family']['body']}
- **布局风格**: {design['layout_style']}
- **图片风格**: {design['image_style']}

## 源内容摘要

{source[:1500]}

## 大纲结构

{outline[:1500]}

---

请基于以上信息，生成一份完整的设计规范，使用以下格式：

```yaml
---
title: "PPT标题"
audience: "目标受众"
pages: 页数
tone: "语气风格"
color_scheme:
  primary: "#主色"
  secondary: "#辅助色"
  accent: "#强调色"
  background: "#背景色"
font_family:
  heading: "标题字体"
  body: "正文字体"
layout_style: "布局风格"
image_style: "图片风格"
---

# 设计规范

## 1. 视觉风格定位
（描述整体视觉方向，200字以内）

## 2. 色彩系统
（说明主色/辅助色/强调色的使用场景和比例）

## 3. 字体层级
（标题、副标题、正文、注释的字号和样式）

## 4. 页面布局规范
（每种类型的页面应使用什么布局）

## 5. 图片与图表使用策略
（什么场景用什么类型的视觉元素）

## 6. 动画与过渡建议
（推荐的动画风格和克制原则）
```

注意：
1. 颜色值必须使用上面推荐的色彩
2. 字体必须使用上面推荐的字体
3. 页数必须在 {analysis['estimated_pages']} 页左右
4. 设计必须符合中文 PPT 的排版习惯
"""

    return prompt


def generate_design_spec(source: str, outline: str) -> Tuple[str, Dict]:
    """
    生成设计规范（本地分析版本，不调用 AI）
    
    Returns:
        (design_spec_md, analysis_result)
    """
    # 内容分析
    analysis = analyze_content(source, outline)

    # 推荐设计
    design = recommend_design(analysis)

    # 构建设计规范 Markdown
    spec_lines = []
    spec_lines.append("---")
    spec_lines.append(f'title: "{extract_title(outline)}"')
    spec_lines.append(f'audience: "{analysis["audience"]}"')
    spec_lines.append(f'pages: {analysis["estimated_pages"]}')
    spec_lines.append(f'tone: "{analysis["tone"]}"')
    spec_lines.append("color_scheme:")
    spec_lines.append(f'  primary: "{design["color_scheme"]["primary"]}"')
    spec_lines.append(f'  secondary: "{design["color_scheme"]["secondary"]}"')
    spec_lines.append(f'  accent: "{design["color_scheme"]["accent"]}"')
    spec_lines.append(f'  background: "{design["color_scheme"]["background"]}"')
    spec_lines.append("font_family:")
    spec_lines.append(f'  heading: "{design["font_family"]["heading"]}"')
    spec_lines.append(f'  body: "{design["font_family"]["body"]}"')
    spec_lines.append(f'layout_style: "{design["layout_style"]}"')
    spec_lines.append(f'image_style: "{design["image_style"]}"')
    spec_lines.append("---")
    spec_lines.append("")
    spec_lines.append("# 设计规范")
    spec_lines.append("")
    spec_lines.append("## 1. 视觉风格定位")
    spec_lines.append(f"""
本 PPT 面向 **{analysis['audience']}**，采用 **{design['layout_style']}** 布局风格，
以 **{design['color_scheme']['primary']}** 为主色调，传达 **{analysis['tone']}** 的视觉感受。
整体风格适合 **{analysis['domain']}** 领域的专业演示。
""")
    spec_lines.append("## 2. 色彩系统")
    spec_lines.append(f"""
| 用途 | 颜色 | 使用场景 |
|------|------|---------|
| 主色 | {design['color_scheme']['primary']} | 标题、重点强调 |
| 辅助色 | {design['color_scheme']['secondary']} | 副标题、图表主色 |
| 强调色 | {design['color_scheme']['accent']} | 点缀、高亮 |
| 背景色 | {design['color_scheme']['background']} | 页面底色、卡片背景 |
""")
    spec_lines.append("## 3. 字体层级")
    spec_lines.append(f"""
| 层级 | 字体 | 字号 | 用途 |
|------|------|------|------|
| 一级标题 | {design['font_family']['heading']} | 40px | 页面大标题 |
| 二级标题 | {design['font_family']['heading']} | 28px | 章节标题 |
| 正文 | {design['font_family']['body']} | 16px | 内容正文 |
| 注释 | {design['font_family']['body']} | 12px | 来源、页码 |
""")
    spec_lines.append("## 4. 页面布局规范")
    spec_lines.append("""
- **标题页**：居中布局，大标题 + 副标题 + 装饰元素
- **内容页**：左/上标题 + 正文要点（4-6条）+ 辅助图表区域
- **章节过渡页**：纯色背景 + 章节编号 + 章节名
- **数据页**：标题 + 数据图表/表格 + 来源注释
""")
    spec_lines.append("## 5. 图片与图表使用策略")
    spec_lines.append(f"""
- 优先使用 **{design['image_style']}** 类视觉元素
- 每页至少一个视觉焦点（图表/图标/图片）
- 数据来源必须标注来源和日期
- 避免使用与内容无关的纯装饰图片
""")
    spec_lines.append("## 6. 动画与过渡建议")
    spec_lines.append("""
- 保持克制，以内容传达为主
- 推荐：淡入（Fade）和推进（Push）效果
- 避免：过于花哨的旋转、弹跳效果
- 同一页面内动画不超过 3 个
""")

    return '\n'.join(spec_lines), analysis


def extract_title(outline: str) -> str:
    """从大纲中提取标题"""
    lines = outline.strip().split('\n')
    for line in lines:
        line = line.strip()
        if line.startswith('# ') and not line.startswith('## '):
            return line.replace('# ', '').strip()
        if line.startswith('## ') and not line.startswith('### '):
            return line.replace('## ', '').strip()

    # 如果没有标题，取第一行
    if lines:
        return lines[0].strip().lstrip('#').strip()

    return "未命名 PPT"


def validate_design_spec(spec: str) -> Tuple[bool, List[str]]:
    """
    验证设计规范是否完整有效
    
    Returns:
        (是否有效, 错误列表)
    """
    errors = []

    # 检查必须字段
    required_fields = [
        "title:",
        "audience:",
        "pages:",
        "color_scheme:",
        "font_family:",
        "layout_style:"
    ]

    for field in required_fields:
        if field not in spec:
            errors.append(f"缺少必要字段: {field}")

    # 检查颜色格式
    color_pattern = r'#[0-9A-Fa-f]{6}'
    colors_found = re.findall(color_pattern, spec)
    if len(colors_found) < 4:
        errors.append("颜色定义不完整（至少需要主色、辅助色、强调色、背景色）")

    # 检查页数是否合理
    pages_match = re.search(r'pages:\s*(\d+)', spec)
    if pages_match:
        pages = int(pages_match.group(1))
        if pages < 3 or pages > 50:
            errors.append(f"页数 {pages} 不在合理范围内（3-50）")
    else:
        errors.append("未找到页数定义")

    return len(errors) == 0, errors
