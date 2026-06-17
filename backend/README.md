# Ai-Creat-PPTX Python 后端

基于 FastAPI 的 PPT 生成后端服务，实现 ppt-master 风格的多角色工作流。

## 环境要求

- Python 3.10+
- pip

## 快速开始

### 1. 创建虚拟环境

```bash
cd backend
python -m venv venv
```

Windows:
```bash
venv\Scripts\activate
```

macOS/Linux:
```bash
source venv/bin/activate
```

### 2. 安装依赖

```bash
pip install -r requirements.txt
```

### 3. 启动服务

```bash
python -m app.main
```

服务将运行在 http://127.0.0.1:8002（默认端口，可在 app/main.py 中修改）

API 文档：http://localhost:8000/docs

## 目录结构

```
backend/
├── app/
│   ├── main.py              # FastAPI 入口
│   ├── routers/             # API 路由
│   │   ├── upload.py        # 文件上传解析
│   │   ├── outline.py       # 大纲生成
│   │   └── generate.py      # PPT 生成工作流
│   ├── core/                # 核心模块
│   │   ├── config.py        # 配置管理
│   │   └── pipeline.py      # 工作流引擎
│   ├── services/            # 业务服务
│   │   ├── source_to_md/    # 源文件转 Markdown
│   │   └── svg_to_pptx.py   # SVG 转 PPTX
│   └── templates/           # 模板系统
│       ├── brands/          # 品牌预设
│       ├── layouts/         # 布局模板
│       └── decks/           # 完整模板
├── temp/                    # 临时文件
├── requirements.txt
└── README.md
```

## API 接口

### 健康检查
- GET `/api/health`

### 文件上传
- POST `/api/upload` - 上传 PDF/DOCX/URL
- GET `/api/upload/status/{project_id}` - 查询上传状态

### 大纲生成
- POST `/api/outline/generate` - 生成大纲
- POST `/api/outline/refine` - 优化大纲

### PPT 生成
- POST `/api/design-spec` - 生成设计规范
- POST `/api/design-spec/lock` - 锁定设计规范
- POST `/api/generate` - 生成 PPT（SSE 流式）
- POST `/api/export/pptx` - 导出 PPTX
- GET `/api/download/{project_id}` - 下载 PPTX

## 工作流

1. **上传源文件** → `/api/upload`
2. **生成大纲** → `/api/outline/generate`
3. **生成设计规范** → `/api/design-spec`
4. **锁定设计规范** → `/api/design-spec/lock`
5. **生成 PPT** → `/api/generate`（SSE 实时进度）
6. **导出 PPTX** → `/api/export/pptx`
7. **下载** → `/api/download/{project_id}`
