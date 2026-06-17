"""
PPT 生成工作流路由
实现多角色工作流：Strategist → Executor → PPTX 导出
"""

from fastapi import APIRouter, Form, HTTPException
from fastapi.responses import FileResponse, StreamingResponse
import json
import os
from pathlib import Path
import asyncio

router = APIRouter()

TEMP_DIR = Path(__file__).parent.parent.parent / "temp"


@router.post("/design-spec")
async def generate_design_spec(
    outline: str = Form(...),
    source: str = Form(...),
    api_url: str = Form(...),
    api_key: str = Form(...),
    model: str = Form(...),
    project_id: str = Form(...)
):
    """
    Strategist 角色：根据大纲和源内容生成设计规范
    """
    try:
        prompt = f"""你是 PPT 设计专家。请根据以下大纲和源内容，生成一份详细的设计规范。

源内容摘要：
{source[:2000]}

大纲：
{outline}

请生成以下设计规范（YAML frontmatter + Markdown 格式）：

```yaml
---
title: "PPT标题"
audience: "目标受众"
pages: 10
tone: "专业/活泼/正式/轻松"
color_scheme:
  primary: "#主色"
  secondary: "#辅助色"
  accent: "#强调色"
  background: "#背景色"
font_family:
  heading: "标题字体"
  body: "正文字体"
layout_style: "标准/杂志/瑞士网格/新闻"
image_style: "摄影/插画/图标/无"
---

# 设计规范

## 1. 视觉风格
...

## 2. 色彩系统
...

## 3. 字体层级
...

## 4. 页面布局建议
...

## 5. 图片使用策略
...
```

请输出完整的设计规范文档。"""

        import requests
        response = requests.post(
            f"{api_url}/chat/completions",
            headers={"Authorization": f"Bearer {api_key}"},
            json={
                "model": model,
                "messages": [{"role": "user", "content": prompt}],
                "stream": True
            },
            stream=True
        )
        
        # 保存设计规范
        project_dir = TEMP_DIR / project_id
        project_dir.mkdir(exist_ok=True)
        
        spec_content = ""
        
        def stream_generator():
            nonlocal spec_content
            for line in response.iter_lines():
                if line:
                    decoded = line.decode('utf-8')
                    if decoded.startswith('data: '):
                        data = decoded[6:]
                        if data == '[DONE]':
                            # 保存到文件
                            spec_file = project_dir / "design_spec.md"
                            with open(spec_file, "w", encoding="utf-8") as f:
                                f.write(spec_content)
                            break
                        try:
                            json_data = json.loads(data)
                            if 'choices' in json_data:
                                delta = json_data['choices'][0].get('delta', {})
                                if 'content' in delta:
                                    spec_content += delta['content']
                                    yield f"data: {json.dumps({'content': delta['content']})}\n\n"
                        except:
                            pass
        
        return StreamingResponse(
            stream_generator(),
            media_type="text/event-stream"
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"设计规范生成失败: {str(e)}")


@router.post("/design-spec/lock")
async def lock_design_spec(
    design_spec: str = Form(...),
    project_id: str = Form(...)
):
    """
    锁定设计规范，保存为 spec_lock.md
    """
    try:
        project_dir = TEMP_DIR / project_id
        project_dir.mkdir(exist_ok=True)
        
        lock_file = project_dir / "spec_lock.md"
        with open(lock_file, "w", encoding="utf-8") as f:
            f.write(design_spec)
        
        return {"success": True, "message": "设计规范已锁定"}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"锁定失败: {str(e)}")


@router.post("/generate")
async def generate_ppt(
    outline: str = Form(...),
    design_spec: str = Form(...),
    api_url: str = Form(...),
    api_key: str = Form(...),
    model: str = Form(...),
    project_id: str = Form(...)
):
    """
    Executor 角色：根据大纲和设计规范逐页生成 PPT
    """
    try:
        project_dir = TEMP_DIR / project_id
        svg_dir = project_dir / "svg_output"
        svg_dir.mkdir(exist_ok=True)
        
        # 解析大纲获取页面列表
        pages = parse_outline_pages(outline)
        total_pages = len(pages)
        
        async def stream_generator():
            for idx, page in enumerate(pages):
                page_num = idx + 1
                
                # 发送进度
                yield f"data: {json.dumps({'progress': page_num / total_pages, 'current_page': page_num, 'total_pages': total_pages, 'status': f'正在生成第 {page_num}/{total_pages} 页...'})}\n\n"
                
                # 生成该页 SVG
                svg_content = await generate_page_svg(
                    page, design_spec, api_url, api_key, model
                )
                
                # 保存 SVG
                svg_file = svg_dir / f"page_{page_num:02d}.svg"
                with open(svg_file, "w", encoding="utf-8") as f:
                    f.write(svg_content)
                
                yield f"data: {json.dumps({'progress': page_num / total_pages, 'current_page': page_num, 'total_pages': total_pages, 'status': f'第 {page_num} 页完成', 'svg': svg_content[:500]})}\n\n"
                
                await asyncio.sleep(0.1)
            
            # 生成完成
            yield f"data: {json.dumps({'progress': 1.0, 'status': '全部页面生成完成', 'total_pages': total_pages})}\n\n"
        
        return StreamingResponse(
            stream_generator(),
            media_type="text/event-stream"
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PPT 生成失败: {str(e)}")


@router.post("/export/pptx")
async def export_pptx(
    project_id: str = Form(...)
):
    """
    将生成的 SVG 导出为 PPTX
    """
    try:
        project_dir = TEMP_DIR / project_id
        svg_dir = project_dir / "svg_output"
        exports_dir = project_dir / "exports"
        exports_dir.mkdir(exist_ok=True)
        
        if not svg_dir.exists():
            raise HTTPException(status_code=404, detail="未找到生成的 SVG 文件")
        
        # 调用 svg_to_pptx 服务
        from app.services.svg_to_pptx import convert_svgs_to_pptx
        
        pptx_path = exports_dir / f"{project_id}.pptx"
        convert_svgs_to_pptx(str(svg_dir), str(pptx_path))
        
        return FileResponse(
            path=str(pptx_path),
            filename=f"{project_id}.pptx",
            media_type="application/vnd.openxmlformats-officedocument.presentationml.presentation"
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PPTX 导出失败: {str(e)}")


@router.get("/download/{project_id}")
async def download_pptx(project_id: str):
    """
    下载已生成的 PPTX 文件
    """
    try:
        exports_dir = TEMP_DIR / project_id / "exports"
        pptx_file = exports_dir / f"{project_id}.pptx"
        
        if not pptx_file.exists():
            raise HTTPException(status_code=404, detail="PPTX 文件不存在，请先导出")
        
        return FileResponse(
            path=str(pptx_file),
            filename=f"{project_id}.pptx",
            media_type="application/vnd.openxmlformats-officedocument.presentationml.presentation"
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"下载失败: {str(e)}")


def parse_outline_pages(outline: str) -> list:
    """解析 Markdown 大纲，返回页面列表"""
    pages = []
    lines = outline.strip().split('\n')
    current_page = None
    
    for line in lines:
        line = line.strip()
        if not line:
            continue
        
        # 一级标题 (#) 是章节，二级标题 (##) 是页面
        if line.startswith('## '):
            if current_page:
                pages.append(current_page)
            current_page = {
                'title': line.replace('## ', '').strip(),
                'points': []
            }
        elif line.startswith('- ') or line.startswith('* '):
            if current_page:
                current_page['points'].append(line.replace('- ', '').replace('* ', '').strip())
        elif line.startswith('### '):
            if current_page:
                current_page['points'].append(line.replace('### ', '').strip())
    
    if current_page:
        pages.append(current_page)
    
    return pages


async def generate_page_svg(page: dict, design_spec: str, api_url: str, api_key: str, model: str) -> str:
    """生成单页 SVG"""
    points_text = '\n'.join([f"- {p}" for p in page['points']])
    
    prompt = f"""你是 PPT 设计专家。请根据以下设计规范和页面内容，生成一页 PPT 的 SVG 代码。

设计规范：
{design_spec[:1500]}

页面内容：
标题：{page['title']}
要点：
{points_text}

要求：
1. SVG 尺寸：1280x720（16:9）
2. 包含完整的 SVG 标签（xmlns、viewBox）
3. 使用设计规范中的颜色和字体
4. 布局美观，符合中文排版习惯
5. 文字不要溢出边界
6. 输出纯 SVG 代码，不要任何其他说明

请直接输出 SVG 代码："""

    import requests
    response = requests.post(
        f"{api_url}/chat/completions",
        headers={"Authorization": f"Bearer {api_key}"},
        json={
            "model": model,
            "messages": [{"role": "user", "content": prompt}],
            "stream": False
        }
    )
    
    if response.status_code == 200:
        result = response.json()
        content = result['choices'][0]['message']['content']
        # 提取 SVG 代码
        if '<svg' in content and '</svg>' in content:
            start = content.find('<svg')
            end = content.find('</svg>') + 6
            return content[start:end]
        return content
    
    # 如果 API 失败，返回基础 SVG
    return f'''<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720" width="1280" height="720">
  <rect width="1280" height="720" fill="#1a1a2e"/>
  <text x="640" y="300" text-anchor="middle" fill="white" font-size="40" font-family="Microsoft YaHei">{page['title']}</text>
</svg>'''
