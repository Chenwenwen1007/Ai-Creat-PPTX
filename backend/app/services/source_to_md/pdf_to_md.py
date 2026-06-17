"""
PDF 转 Markdown 解析器
提取 PDF 文本内容，通过字体大小精确识别标题层级结构
"""

import os
import statistics
from pathlib import Path
from typing import List, Dict, Tuple


def parse_pdf(file_path: str) -> str:
    """
    解析 PDF 文件，返回 Markdown 格式文本
    使用字体大小精确判断标题层级
    
    Args:
        file_path: PDF 文件路径
    
    Returns:
        Markdown 格式的文本内容
    """
    try:
        import pdfplumber
        
        all_lines = []
        
        with pdfplumber.open(file_path) as pdf:
            # 第一遍：收集所有字体大小，计算阈值
            all_font_sizes = []
            for page in pdf.pages:
                words = page.extract_words(
                    keep_blank_chars=True,
                    x_tolerance=3,
                    y_tolerance=3
                )
                for word in words:
                    if 'height' in word:
                        all_font_sizes.append(word['height'])
            
            if not all_font_sizes:
                # 降级到纯文本提取
                return _extract_text_fallback(pdf)
            
            # 计算标题层级阈值
            thresholds = _calculate_heading_thresholds(all_font_sizes)
            
            # 第二遍：按行解析并标记标题
            for page_idx, page in enumerate(pdf.pages):
                lines = _extract_lines_with_font_size(page)
                
                for line_text, avg_font_size, is_bold in lines:
                    if not line_text.strip():
                        continue
                    
                    heading_level = _determine_heading_level(
                        line_text, avg_font_size, is_bold, thresholds
                    )
                    
                    if heading_level:
                        prefix = '#' * heading_level
                        all_lines.append(f"{prefix} {line_text.strip()}")
                    else:
                        all_lines.append(line_text.strip())
                
                # 分页标记（不是每一页都加，只在有多页时）
                if len(pdf.pages) > 1 and page_idx < len(pdf.pages) - 1:
                    all_lines.append("")
        
        return '\n'.join(all_lines)
    
    except ImportError:
        try:
            return _parse_with_pymupdf(file_path)
        except ImportError:
            return "# PDF 解析失败\n\n请安装 pdfplumber 或 PyMuPDF：\n```bash\npip install pdfplumber PyMuPDF\n```"
    
    except Exception as e:
        return f"# PDF 解析错误\n\n错误信息：{str(e)}"


def _extract_lines_with_font_size(page) -> List[Tuple[str, float, bool]]:
    """
    从页面提取每行文本及其平均字体大小
    
    Returns:
        [(行文本, 平均字体大小, 是否粗体), ...]
    """
    import pdfplumber
    
    lines = []
    
    # 使用 chars 获取每个字符的精确信息
    chars = page.chars
    if not chars:
        # 降级到 words
        words = page.extract_words(keep_blank_chars=True)
        text = page.extract_text() or ""
        for line in text.split('\n'):
            if line.strip():
                lines.append((line.strip(), 12.0, False))
        return lines
    
    # 按 y 坐标分组（同一行的字符）
    lines_dict: Dict[float, List[dict]] = {}
    for char in chars:
        y = round(char['top'], 1)  # 保留一位小数进行分组
        if y not in lines_dict:
            lines_dict[y] = []
        lines_dict[y].append(char)
    
    # 按 y 坐标排序，合并相近的行
    sorted_y = sorted(lines_dict.keys())
    merged_lines = []
    current_line_chars = []
    current_y = None
    
    for y in sorted_y:
        if current_y is None or abs(y - current_y) < 3:
            current_line_chars.extend(lines_dict[y])
            current_y = y if current_y is None else (current_y + y) / 2
        else:
            if current_line_chars:
                merged_lines.append(current_line_chars)
            current_line_chars = lines_dict[y][:]
            current_y = y
    
    if current_line_chars:
        merged_lines.append(current_line_chars)
    
    # 处理每行字符
    for line_chars in merged_lines:
        # 按 x 坐标排序
        line_chars.sort(key=lambda c: c['x0'])
        
        # 构建文本
        text = ''.join([c['text'] for c in line_chars])
        
        # 计算平均字体大小
        font_sizes = [c['size'] for c in line_chars if 'size' in c]
        avg_size = statistics.mean(font_sizes) if font_sizes else 12.0
        
        # 检测是否粗体
        is_bold = any(
            'bold' in c.get('fontname', '').lower() or 
            'black' in c.get('fontname', '').lower() or
            'heavy' in c.get('fontname', '').lower()
            for c in line_chars
        )
        
        if text.strip():
            lines.append((text, avg_size, is_bold))
    
    return lines


def _calculate_heading_thresholds(font_sizes: List[float]) -> Dict[str, float]:
    """
    根据字体大小分布计算标题层级阈值
    
    策略：
    - 找出最大的几个字体大小作为标题候选
    - 使用分位数划分层级
    """
    if not font_sizes:
        return {'h1': 24, 'h2': 18, 'h3': 14}
    
    unique_sizes = sorted(set(font_sizes), reverse=True)
    
    if len(unique_sizes) < 3:
        # 字体种类少，使用固定阈值
        max_size = max(font_sizes)
        return {
            'h1': max_size * 0.9,
            'h2': max_size * 0.75,
            'h3': max_size * 0.6
        }
    
    # 使用 90%, 75%, 60% 分位数作为阈值
    sorted_sizes = sorted(font_sizes, reverse=True)
    n = len(sorted_sizes)
    
    return {
        'h1': sorted_sizes[int(n * 0.05)] if n > 20 else sorted_sizes[0],
        'h2': sorted_sizes[int(n * 0.15)] if n > 20 else sorted_sizes[min(1, n-1)],
        'h3': sorted_sizes[int(n * 0.30)] if n > 20 else sorted_sizes[min(2, n-1)]
    }


def _determine_heading_level(
    text: str, 
    font_size: float, 
    is_bold: bool, 
    thresholds: Dict[str, float]
) -> int:
    """
    根据字体大小和文本特征判断标题层级
    
    Returns:
        0=非标题, 1=H1, 2=H2, 3=H3
    """
    text = text.strip()
    
    # 过滤掉页码、注释等
    if _is_noise_text(text):
        return 0
    
    # 根据字体大小判断
    if font_size >= thresholds['h1'] * 0.95:
        # 最大字体，通常是文档标题或章节标题
        if len(text) < 100:
            return 1
    
    if font_size >= thresholds['h2'] * 0.95:
        if len(text) < 80:
            return 2
    
    if font_size >= thresholds['h3'] * 0.95:
        if len(text) < 60:
            return 3
    
    # 粗体 + 较短文本 可能是小标题
    if is_bold and len(text) < 40 and not text.endswith(('.', '。', '!', '！', '?', '？')):
        return 3
    
    return 0


def _is_noise_text(text: str) -> bool:
    """判断是否为噪声文本（页码、页眉页脚等）"""
    text = text.strip()
    
    # 纯数字（页码）
    if text.isdigit():
        return True
    
    # 过短的文本（少于2个字符）
    if len(text) < 2:
        return True
    
    # 常见的页眉页脚关键词
    noise_patterns = [
        '第', '页', 'page', 'of', 'copyright', '©',
        'all rights reserved', 'confidential'
    ]
    text_lower = text.lower()
    if any(p in text_lower for p in noise_patterns) and len(text) < 20:
        return True
    
    return False


def _extract_text_fallback(pdf) -> str:
    """降级方案：纯文本提取"""
    lines = []
    for page in pdf.pages:
        text = page.extract_text()
        if text:
            lines.append(text)
    return '\n\n'.join(lines)


def _parse_with_pymupdf(file_path: str) -> str:
    """使用 PyMuPDF 解析 PDF"""
    import fitz
    
    doc = fitz.open(file_path)
    markdown_lines = []
    
    for page in doc:
        text = page.get_text()
        if text:
            lines = text.split('\n')
            for line in lines:
                line = line.strip()
                if line and not _is_noise_text(line):
                    # 简单启发式判断标题
                    if len(line) < 50 and not any(line.endswith(c) for c in ['.', '。', '!', '！', '?', '？']):
                        if len(line) < 20:
                            markdown_lines.append(f"# {line}")
                        elif len(line) < 40:
                            markdown_lines.append(f"## {line}")
                        else:
                            markdown_lines.append(f"### {line}")
                    else:
                        markdown_lines.append(line)
    
    doc.close()
    return '\n'.join(markdown_lines)


def extract_pdf_images(file_path: str, output_dir: str) -> list:
    """
    提取 PDF 中的图片
    
    Args:
        file_path: PDF 文件路径
        output_dir: 图片输出目录
    
    Returns:
        提取的图片路径列表
    """
    try:
        import fitz
        
        doc = fitz.open(file_path)
        image_paths = []
        output_path = Path(output_dir)
        output_path.mkdir(exist_ok=True)
        
        for page_num in range(len(doc)):
            page = doc[page_num]
            images = page.get_images()
            
            for img_idx, img in enumerate(images):
                xref = img[0]
                base_image = doc.extract_image(xref)
                image_bytes = base_image["image"]
                image_ext = base_image["ext"]
                
                img_path = output_path / f"page_{page_num + 1}_img_{img_idx + 1}.{image_ext}"
                with open(img_path, "wb") as f:
                    f.write(image_bytes)
                
                image_paths.append(str(img_path))
        
        doc.close()
        return image_paths
    
    except Exception as e:
        print(f"提取图片失败: {e}")
        return []
