"""
后端配置管理
集中管理所有配置项，支持环境变量覆盖
"""

import os
from pathlib import Path

# 项目根目录
BASE_DIR = Path(__file__).parent.parent.parent

# 临时文件目录
TEMP_DIR = BASE_DIR / "temp"
TEMP_DIR.mkdir(exist_ok=True)

# API 配置
API_V1_STR = "/api"
PROJECT_NAME = "Ai-Creat-PPTX Backend"
VERSION = "1.0.0"

# CORS 配置
CORS_ORIGINS = [
    "http://localhost:3199",
    "http://localhost:3000",
    "http://127.0.0.1:3199",
    "http://127.0.0.1:3000",
]

# 文件上传配置
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB
ALLOWED_EXTENSIONS = {'.pdf', '.docx', '.doc', '.pptx', '.ppt'}

# AI 默认配置
DEFAULT_AI_API_URL = "https://api.deepseek.com/v1"
DEFAULT_MODEL = "deepseek-chat"

# 日志配置
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
LOG_FORMAT = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
