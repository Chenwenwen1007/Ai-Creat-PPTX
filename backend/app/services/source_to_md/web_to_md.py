"""
网页 URL 转 Markdown 解析器
抓取网页内容并转为 Markdown
"""

import re
from urllib.parse import urlparse


def parse_url(url: str) -> str:
    """
    解析网页 URL，返回 Markdown 格式文本
    
    Args:
        url: 网页链接
    
    Returns:
        Markdown 格式的文本内容
    """
    try:
        import requests
        from bs4 import BeautifulSoup
        
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.0'
        }
        
        response = requests.get(url, headers=headers, timeout=30)
        response.encoding = response.apparent_encoding or 'utf-8'
        
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # 移除无关元素
        for tag in soup(['script', 'style', 'nav', 'header', 'footer', 'aside', 'advertisement']):
            tag.decompose()
        
        # 针对特定网站的优化
        domain = urlparse(url).netloc
        
        if 'zhihu.com' in domain:
            content = soup.find('div', class_='RichContent-inner')
        elif 'mp.weixin.qq.com' in domain:
            content = soup.find('div', id='js_content')
        elif 'csdn.net' in domain:
            content = soup.find('article') or soup.find('div', class_='article-content')
        elif 'juejin.cn' in domain:
            content = soup.find('article')
        else:
            # 通用策略：找最长文本内容的区域
            content = find_main_content(soup)
        
        if not content:
            content = soup.find('body')
        
        if content:
            return html_to_markdown(str(content))
        else:
            return "# 内容提取失败\n\n无法从该网页提取正文内容。"
    
    except ImportError:
        return "# 网页解析失败\n\n请安装依赖：\n```bash\npip install requests beautifulsoup4\n```"
    
    except Exception as e:
        return f"# 网页解析错误\n\n错误信息：{str(e)}"


def find_main_content(soup):
    """找到网页主要内容区域"""
    # 常见的内容容器选择器
    selectors = [
        'article',
        'main',
        'div[role="main"]',
        '.content',
        '.post-content',
        '.entry-content',
        '.article-content',
        '#content',
        '#main-content',
    ]
    
    for selector in selectors:
        elements = soup.select(selector)
        if elements:
            # 选择文本量最大的元素
            return max(elements, key=lambda e: len(e.get_text(strip=True)))
    
    return None


def html_to_markdown(html: str) -> str:
    """将 HTML 转为 Markdown"""
    try:
        from bs4 import BeautifulSoup
        
        soup = BeautifulSoup(html, 'html.parser')
        markdown_lines = []
        
        def process_element(element, depth=0):
            if element.name is None:
                # 文本节点
                text = str(element).strip()
                if text:
                    markdown_lines.append(text)
                return
            
            if element.name in ['script', 'style', 'nav', 'header', 'footer']:
                return
            
            if element.name == 'h1':
                markdown_lines.append(f"# {element.get_text(strip=True)}")
            elif element.name == 'h2':
                markdown_lines.append(f"## {element.get_text(strip=True)}")
            elif element.name == 'h3':
                markdown_lines.append(f"### {element.get_text(strip=True)}")
            elif element.name == 'h4':
                markdown_lines.append(f"#### {element.get_text(strip=True)}")
            elif element.name == 'p':
                text = element.get_text(strip=True)
                if text:
                    markdown_lines.append(text)
                    markdown_lines.append("")
            elif element.name in ['ul', 'ol']:
                for li in element.find_all('li', recursive=False):
                    prefix = '- ' if element.name == 'ul' else '1. '
                    text = li.get_text(strip=True)
                    if text:
                        markdown_lines.append(f"{prefix}{text}")
                markdown_lines.append("")
            elif element.name == 'img':
                src = element.get('src', '')
                alt = element.get('alt', '图片')
                markdown_lines.append(f"![{alt}]({src})")
            elif element.name == 'a':
                href = element.get('href', '')
                text = element.get_text(strip=True)
                markdown_lines.append(f"[{text}]({href})")
            elif element.name == 'br':
                markdown_lines.append("")
            elif element.name == 'strong' or element.name == 'b':
                text = element.get_text(strip=True)
                if text:
                    markdown_lines.append(f"**{text}**")
            elif element.name == 'em' or element.name == 'i':
                text = element.get_text(strip=True)
                if text:
                    markdown_lines.append(f"*{text}*")
            else:
                # 递归处理子元素
                for child in element.children:
                    process_element(child, depth + 1)
        
        for child in soup.children:
            process_element(child)
        
        # 清理空行和合并文本
        result = '\n'.join(markdown_lines)
        result = re.sub(r'\n{3,}', '\n\n', result)
        
        return result.strip()
    
    except Exception as e:
        return f"# HTML 转 Markdown 失败\n\n错误：{str(e)}"
