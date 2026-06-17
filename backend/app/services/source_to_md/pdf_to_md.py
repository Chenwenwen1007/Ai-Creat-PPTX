"""
PDF 转 Markdown 解析器
提取 PDF 文本内容，保留标题层级结构
"""

import os
from pathlib import Path


def parse_pdf(file_path: str) -> str:
    """
    解析 PDF 文件，返回 Markdown 格式文本
    
    Args:
        file_path: PDF 文件路径
    
    Returns:
        Markdown 格式的文本内容
    """
    try:
        # 优先使用 pdfplumber
        import pdfplumber
        
        markdown_lines = []
        prev_font_size = 0
        
        with pdfplumber.open(file_path) as pdf:
            for page in pdf.pages:
                text = page.extract_text()
                if not text:
                    continue
                
                lines = text.split('\n')
                for line in lines:
                    line = line.strip()
                    if not line:
                        continue
                    
                    # 简单启发式判断标题（通过字体大小，pdfplumber 可获取）
                    # 这里简化处理，通过行长度和特征判断
                    if len(line) < 50 and not line.endswith(('.', '。', '!', '！', '?', '？')):
                        # 可能是标题
                        if len(line) < 20:
                            markdown_lines.append(f"# {line}")
                        else:
                            markdown_lines.append(f"## {line}")
                    else:
                        markdown_lines.append(line)
                
                markdown_lines.append("\n---\n")  # 分页标记
        
        return '\n'.join(markdown_lines)
    
    except ImportError:
        # 降级使用 PyMuPDF
        try:
            import fitz  # PyMuPDF
            
            doc = fitz.open(file_path)
            markdown_lines = []
            
            for page in doc:
                text = page.get_text()
                if text:
                    lines = text.split('\n')
                    for line in lines:
                        line = line.strip()
                        if line:
                            # 简单判断标题
                            if len(line) < 50 and not any(line.endswith(c) for c in ['.', '。', '!', '！', '?', '？']):
                                if len(line) < 20:
                                    markdown_lines.append(f"# {line}")
                                else:
                                    markdown_lines.append(f"## {line}")
                            else:
                                markdown_lines.append(line)
                    
                    markdown_lines.append("\n---\n")
            
            doc.close()
            return '\n'.join(markdown_lines)
        
        except ImportError:
            return "# PDF 解析失败\n\n请安装 pdfplumber 或 PyMuPDF：\n```bash\npip install pdfplumber PyMuPDF\n```"
    
    except Exception as e:
        return f"# PDF 解析错误\n\n错误信息：{str(e)}"


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
