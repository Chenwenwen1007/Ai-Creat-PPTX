"""
文件上传与解析路由
支持 PDF、DOCX、URL 等多种输入源
"""

from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import JSONResponse
import os
import shutil
from pathlib import Path

router = APIRouter()

# 临时文件存储目录
TEMP_DIR = Path(__file__).parent.parent.parent / "temp"
TEMP_DIR.mkdir(exist_ok=True)


@router.post("/upload")
async def upload_file(
    file: UploadFile = File(None),
    url: str = Form(None),
    project_id: str = Form(...)
):
    """
    上传文件或提供 URL，返回解析后的 Markdown 内容
    
    - file: 上传的文件 (PDF/DOCX)
    - url: 网页链接
    - project_id: 项目唯一标识
    """
    project_dir = TEMP_DIR / project_id
    project_dir.mkdir(exist_ok=True)
    sources_dir = project_dir / "sources"
    sources_dir.mkdir(exist_ok=True)

    try:
        if file:
            # 保存上传的文件
            file_path = sources_dir / file.filename
            with open(file_path, "wb") as f:
                shutil.copyfileobj(file.file, f)
            
            # 根据文件类型解析
            if file.filename.lower().endswith('.pdf'):
                from app.services.source_to_md.pdf_to_md import parse_pdf
                markdown = parse_pdf(str(file_path))
            elif file.filename.lower().endswith(('.docx', '.doc')):
                from app.services.source_to_md.doc_to_md import parse_docx
                markdown = parse_docx(str(file_path))
            else:
                raise HTTPException(status_code=400, detail="不支持的文件格式，仅支持 PDF 和 DOCX")
            
            return {
                "success": True,
                "type": "file",
                "filename": file.filename,
                "markdown": markdown
            }
        
        elif url:
            # 解析 URL
            from app.services.source_to_md.web_to_md import parse_url
            markdown = parse_url(url)
            
            # 保存 URL 内容
            url_file = sources_dir / "url_source.md"
            with open(url_file, "w", encoding="utf-8") as f:
                f.write(markdown)
            
            return {
                "success": True,
                "type": "url",
                "url": url,
                "markdown": markdown
            }
        
        else:
            raise HTTPException(status_code=400, detail="请提供文件或 URL")
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"解析失败: {str(e)}")


@router.get("/upload/status/{project_id}")
async def upload_status(project_id: str):
    """查询上传/解析状态"""
    project_dir = TEMP_DIR / project_id
    sources_dir = project_dir / "sources"
    
    if not sources_dir.exists():
        return {"status": "not_found"}
    
    files = list(sources_dir.iterdir())
    return {
        "status": "ready",
        "files": [f.name for f in files],
        "project_id": project_id
    }
