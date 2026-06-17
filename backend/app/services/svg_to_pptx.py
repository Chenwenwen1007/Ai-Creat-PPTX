"""
SVG 转 PPTX 导出器
将 AI 生成的 SVG 页面转换为原生可编辑的 PowerPoint 文件
"""

import os
import re
from pathlib import Path
from typing import List


def convert_svgs_to_pptx(svg_dir: str, output_path: str):
    """
    将目录下的所有 SVG 文件转换为 PPTX
    
    Args:
        svg_dir: SVG 文件所在目录
        output_path: 输出的 PPTX 文件路径
    """
    try:
        from pptx import Presentation
        from pptx.util import Inches, Pt, Emu
        from pptx.dml.color import RgbColor
        from pptx.enum.text import PP_ALIGN
        from pptx.enum.shapes import MSO_SHAPE
        import xml.etree.ElementTree as ET
        
        prs = Presentation()
        prs.slide_width = Inches(13.333)  # 16:9
        prs.slide_height = Inches(7.5)
        
        svg_files = sorted(Path(svg_dir).glob("*.svg"))
        
        for svg_file in svg_files:
            # 解析 SVG
            tree = ET.parse(svg_file)
            root = tree.getroot()
            
            # 创建空白幻灯片
            blank_layout = prs.slide_layouts[6]  # 空白布局
            slide = prs.slides.add_slide(blank_layout)
            
            # 解析 SVG 元素并转换为 PPTX 形状
            parse_svg_element(root, slide)
        
        prs.save(output_path)
        print(f"PPTX 导出成功: {output_path}")
    
    except ImportError:
        print("请安装 python-pptx: pip install python-pptx")
        # 创建空文件占位
        with open(output_path, 'wb') as f:
            pass
    
    except Exception as e:
        print(f"PPTX 导出失败: {e}")
        raise


def parse_svg_element(element, slide, parent_group=None):
    """
    递归解析 SVG 元素并转换为 PPTX 形状
    
    Args:
        element: SVG XML 元素
        slide: PPTX 幻灯片对象
        parent_group: 父级组合（用于 <g> 元素）
    """
    try:
        from pptx.util import Inches, Pt, Emu
        from pptx.dml.color import RgbColor
        from pptx.enum.text import PP_ALIGN
        from pptx.enum.shapes import MSO_SHAPE
        
        tag = element.tag.split('}')[-1] if '}' in element.tag else element.tag
        
        # 处理 <rect> 矩形
        if tag == 'rect':
            x = float(element.get('x', 0))
            y = float(element.get('y', 0))
            width = float(element.get('width', 0))
            height = float(element.get('height', 0))
            fill = element.get('fill', '#ffffff')
            
            shape = slide.shapes.add_shape(
                MSO_SHAPE.RECTANGLE,
                Inches(x / 96),
                Inches(y / 96),
                Inches(width / 96),
                Inches(height / 96)
            )
            
            if fill and fill != 'none':
                shape.fill.solid()
                shape.fill.fore_color.rgb = hex_to_rgb(fill)
            else:
                shape.fill.background()
        
        # 处理 <text> 文本
        elif tag == 'text':
            x = float(element.get('x', 0))
            y = float(element.get('y', 0))
            text_content = ''.join(element.itertext())
            fill = element.get('fill', '#000000')
            font_size = element.get('font-size', '16')
            font_family = element.get('font-family', 'Microsoft YaHei')
            
            # 提取字体大小数值
            size_match = re.search(r'(\d+)', font_size)
            font_size_pt = int(size_match.group(1)) if size_match else 16
            
            textbox = slide.shapes.add_textbox(
                Inches(x / 96),
                Inches(y / 96),
                Inches(10),
                Inches(1)
            )
            
            tf = textbox.text_frame
            tf.text = text_content
            
            for paragraph in tf.paragraphs:
                paragraph.font.size = Pt(font_size_pt)
                paragraph.font.color.rgb = hex_to_rgb(fill)
                paragraph.font.name = font_family
        
        # 处理 <image> 图片
        elif tag == 'image':
            x = float(element.get('x', 0))
            y = float(element.get('y', 0))
            width = float(element.get('width', 100))
            height = float(element.get('height', 100))
            href = element.get('{http://www.w3.org/1999/xlink}href', '')
            
            if href and os.path.exists(href):
                slide.shapes.add_picture(
                    href,
                    Inches(x / 96),
                    Inches(y / 96),
                    Inches(width / 96),
                    Inches(height / 96)
                )
        
        # 递归处理子元素
        for child in element:
            parse_svg_element(child, slide, parent_group)
    
    except Exception as e:
        print(f"解析 SVG 元素失败: {e}")


def hex_to_rgb(hex_color: str):
    """将十六进制颜色转为 RGB"""
    try:
        from pptx.dml.color import RgbColor
        
        hex_color = hex_color.lstrip('#')
        if len(hex_color) == 3:
            hex_color = ''.join([c * 2 for c in hex_color])
        
        r = int(hex_color[0:2], 16)
        g = int(hex_color[2:4], 16)
        b = int(hex_color[4:6], 16)
        
        return RgbColor(r, g, b)
    except:
        from pptx.dml.color import RgbColor
        return RgbColor(0, 0, 0)
