"""
FastAPI 后端服务入口
提供 AI PPT 生成的核心 API，包括文件上传、大纲生成、PPT 工作流等
"""

from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
import uvicorn
import os
import sys

# 确保 backend 目录在 Python 路径中
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.routers import upload, outline, generate

app = FastAPI(
    title="Ai-Creat-PPTX Backend",
    description="基于 ppt-master 工作流的 AI PPT 生成后端服务",
    version="1.0.0"
)

# 配置跨域 - 允许前端访问
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3199", "http://localhost:3000", "http://127.0.0.1:3199", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由
app.include_router(upload.router, prefix="/api", tags=["文件上传与解析"])
app.include_router(outline.router, prefix="/api", tags=["大纲生成"])
app.include_router(generate.router, prefix="/api", tags=["PPT 生成工作流"])


@app.get("/api/health")
def health_check():
    """健康检查接口"""
    return {"status": "ok", "service": "Ai-Creat-PPTX Backend", "version": "1.0.0"}


@app.get("/")
def root():
    """根路径重定向到文档"""
    return {"message": "Ai-Creat-PPTX Backend 运行中", "docs": "/docs"}


if __name__ == "__main__":
    uvicorn.run("app.main:app", host="127.0.0.1", port=8002, reload=False)
