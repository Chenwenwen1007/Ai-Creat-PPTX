# Ai-Creat-PPTX 方案C 全量迁移工作计划

> 目标：基于 ppt-master 的多角色工作流，将当前纯前端 Next.js 应用重构为 **Python 后端（FastAPI）+ React 前端** 架构，实现真正的原生 PPTX 导出和多格式输入支持。

---

## 一、现状分析

### 当前架构
| 层级 | 技术 | 职责 |
|------|------|------|
| 前端 | Next.js 15 + React 18 + TypeScript | UI、Canvas/SVG 渲染、本地配置 |
| 后端 | Next.js API Routes (Node.js) | AI 代理（大纲/内容生成） |
| 渲染 | ppt2svg.js + ppt2canvas.js | 浏览器端模拟 PPT 渲染 |
| 导出 | JSZip + Canvas.toDataURL | 仅能导出图片 ZIP |

### 核心痛点
1. ❌ **无真正 PPTX 导出** — 只能导出图片 ZIP，无法生成可编辑的 .pptx
2. ❌ **无多格式输入** — 仅支持文本主题输入，不支持 PDF/Word/URL
3. ❌ **渲染精度低** — Canvas/SVG 模拟渲染与真实 PowerPoint 差异大
4. ❌ **单阶段生成** — 缺少 ppt-master 的多角色质量把控

---

## 二、目标架构

```
┌─────────────────────────────────────────────────────────────┐
│                      React 前端 (保留)                        │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │ 源文件   │ │ 大纲编辑 │ │ 设计确认 │ │ 预览/下载│       │
│  │ 上传区   │ │ 器       │ │ 对话框   │ │          │       │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘       │
└───────┼────────────┼────────────┼────────────┼─────────────┘
        │            │            │            │
        ▼            ▼            ▼            ▼
┌─────────────────────────────────────────────────────────────┐
│              Python 后端服务 (FastAPI)  新增                  │
│  ┌──────────────┐ ┌──────────────┐ ┌─────────────────────┐  │
│  │ /api/upload  │ │ /api/outline │ │ /api/generate       │  │
│  │ 源文件解析   │ │ 大纲生成     │ │ 多角色PPT生成工作流 │  │
│  └──────┬───────┘ └──────┬───────┘ └──────────┬──────────┘  │
│         │                │                    │              │
│         ▼                ▼                    ▼              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │           PPT Master 工作流引擎 (Python)              │    │
│  │  Step1: Source → MD    │  pdf_to_md / doc_to_md     │    │
│  │  Step2: Strategist     │  设计规范确认（八问）       │    │
│  │  Step3: Executor       │  SVG 逐页生成               │    │
│  │  Step4: Post-process   │  svg_to_pptx 导出           │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

---

## 三、工作阶段与任务清单

### Phase 1: 基础架构搭建 ✅ 已完成

#### Task 1.1: 创建 Python 后端服务目录结构
**状态**: ✅ 已完成
**做什么**: 在项目根目录创建 `backend/` 文件夹，初始化 Python FastAPI 服务
**怎么做**:
```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI 入口
│   ├── routers/
│   │   ├── upload.py        # 文件上传解析
│   │   ├── outline.py       # 大纲生成
│   │   └── generate.py      # PPT 生成工作流
│   ├── core/
│   │   ├── config.py        # 配置管理
│   │   └── pipeline.py      # 工作流引擎
│   ├── services/
│   │   ├── source_to_md/    # 源文件转 Markdown
│   │   ├── strategist.py    # 策划角色
│   │   ├── executor.py      # 执行角色
│   │   └── svg_to_pptx.py   # SVG 转 PPTX
│   └── templates/           # 模板系统
├── requirements.txt
└── README.md
```
**完成后检查**:
- [ ] `backend/` 目录存在且结构正确
- [ ] `python -m app.main` 可以启动 FastAPI 服务
- [ ] 访问 `http://localhost:8000/docs` 可见 Swagger UI

---

#### Task 1.2: 配置 Python 虚拟环境与依赖
**状态**: ✅ 已完成
**做什么**: 安装 FastAPI、python-pptx、pdfplumber、python-docx 等核心依赖
**怎么做**:
1. 创建 venv: `python -m venv backend/venv`
2. 激活 venv: `backend\venv\Scripts\activate` (Windows)
3. 安装依赖: `pip install fastapi uvicorn python-pptx pdfplumber python-docx beautifulsoup4 markdown Pillow`
4. 生成 requirements.txt: `pip freeze > backend/requirements.txt`
**完成后检查**:
- [ ] `pip list` 显示所有依赖已安装
- [ ] `uvicorn app.main:app --reload` 可正常启动

---

#### Task 1.3: 配置前端代理与跨域
**状态**: ✅ 已完成
**做什么**: 修改 Next.js 配置，使前端请求能正确转发到 Python 后端
**怎么做**:
1. 在 `next.config.js` 中添加 API 代理配置（开发环境）
2. 创建 `src/configs/api.ts` 统一后端地址管理
3. 修改现有 API 调用，区分 Node API 和 Python API
**完成后检查**:
- [ ] 前端 `npm run dev` 可访问
- [ ] 前端可成功调用 Python 后端 `/api/health` 接口
- [ ] 无跨域错误

---

### Phase 2: 源文件解析模块 ✅ 已完成

#### Task 2.1: 实现 PDF 转 Markdown
**状态**: ✅ 已完成
**做什么**: 参考 ppt-master 的 `pdf_to_md.py`，实现 PDF 文本/图片提取
**怎么做**:
1. 安装 `pdfplumber` 和 `PyMuPDF`
2. 创建 `backend/app/services/source_to_md/pdf_to_md.py`
3. 提取文本保留标题层级（通过字体大小判断 H1/H2/H3）
4. 提取图片保存到 `temp/` 目录
**完成后检查**:
- [ ] 上传 PDF 后可返回结构化 Markdown
- [ ] 标题层级识别准确率 > 80%
- [ ] 图片被正确提取并附带路径

---

#### Task 2.2: 实现 Word/DOCX 转 Markdown
**状态**: ✅ 已完成
**做什么**: 参考 ppt-master 的 `doc_to_md.py`，实现 DOCX 解析
**怎么做**:
1. 使用 `python-docx` 库读取 .docx 文件
2. 解析段落样式（Heading 1/2/3 → Markdown #/##/###）
3. 提取表格为 Markdown 表格格式
4. 提取图片并保存
**完成后检查**:
- [ ] .docx 文件上传后可返回 Markdown
- [ ] 表格被正确转换为 Markdown 表格语法
- [ ] 图片正确提取

---

#### Task 2.3: 实现 URL 网页转 Markdown
**状态**: ✅ 已完成
**做什么**: 支持输入 URL，抓取网页内容转为 Markdown
**怎么做**:
1. 使用 `requests` + `beautifulsoup4` 抓取网页
2. 过滤广告/导航等无关内容（参考 Readability 算法）
3. 将 HTML 转为 Markdown（使用 `markdownify` 库）
**完成后检查**:
- [ ] 输入知乎/微信公众号/CSDN 等 URL 可正确提取正文
- [ ] 返回的 Markdown 无导航栏/广告等多余内容

---

#### Task 2.4: 前端文件上传组件
**状态**: ✅ 已完成
**做什么**: 修改 StepOneInputData.tsx，支持上传 PDF/DOCX/URL
**怎么做**:
1. 添加 `<input type="file" accept=".pdf,.docx,.doc" />`
2. 添加 URL 输入框（切换输入模式）
3. 上传文件到 Python 后端 `/api/upload`
4. 显示解析后的 Markdown 预览
**完成后检查**:
- [ ] 可上传 PDF 并看到解析结果
- [ ] 可上传 DOCX 并看到解析结果
- [ ] 可输入 URL 并看到抓取结果

---

### Phase 3: AI 多角色工作流（预计 3-4 天）

#### Task 3.1: 实现 Strategist（策划角色）
**状态**: ⬜ 未完成
**做什么**: 参考 ppt-master 的 "八问确认" 机制，实现设计规范确认
**怎么做**:
1. 创建 `backend/app/services/strategist.py`
2. 读取源 Markdown，生成设计规范问卷：
   - a. 受众是谁？
   - b. 页数多少？
   - c. 大纲结构？
   - d. 语气风格？
   - e-h. 颜色/字体/视觉/图片偏好
3. 通过 AI API 生成推荐配置
4. 输出 `design_spec.md`（YAML frontmatter + 规范内容）
**完成后检查**:
- [ ] 给定 Markdown 源文件，可生成 design_spec.md
- [ ] design_spec 包含完整的八项确认内容
- [ ] 前端可展示设计规范供用户确认/修改

---

#### Task 3.2: 前端设计规范确认界面
**状态**: ⬜ 未完成
**做什么**: 新增步骤 "确认设计规范"，展示 Strategist 生成的配置
**怎么做**:
1. 在 Stepper 中新增 Step 3.5（或替换原有步骤）
2. 展示：主题色、字体、页数、大纲、语气等
3. 用户可手动调整参数
4. 确认后锁定为 `spec_lock.md`
**完成后检查**:
- [ ] 界面展示设计规范的各项参数
- [ ] 用户可修改颜色/字体/页数等
- [ ] 点击确认后进入下一步

---

#### Task 3.3: 实现 Executor（执行角色）- SVG 生成
**状态**: ⬜ 未完成
**做什么**: 参考 ppt-master 的 Executor，逐页生成 SVG
**怎么做**:
1. 创建 `backend/app/services/executor.py`
2. 读取 `spec_lock.md` 获取设计规范
3. 逐页调用 AI API 生成 SVG 代码：
   - 每页 SVG 尺寸：1280x720 (16:9)
   - 使用 design_spec 中锁定的颜色/字体
   - 支持布局模板：标题页、内容页、图表页、章节页
4. 保存 SVG 到 `backend/temp/{project}/svg_output/`
**完成后检查**:
- [ ] 给定 design_spec 和大纲，可逐页生成 SVG
- [ ] SVG 文件可在浏览器中正确预览
- [ ] 颜色/字体符合 design_spec 锁定值

---

#### Task 3.4: 实现 SVG 质量检查
**状态**: ⬜ 未完成
**做什么**: 检查生成的 SVG 是否符合规范
**怎么做**:
1. 创建 `backend/app/services/svg_checker.py`
2. 检查项：
   - SVG 是否完整（有 xmlns、viewBox）
   - 颜色是否来自 design_spec（无自创颜色）
   - 字体是否来自锁定字体族
   - 文字是否溢出边界
3. 不合格则标记并返回错误信息
**完成后检查**:
- [ ] 可检测 SVG 中的自创颜色
- [ ] 可检测文字溢出
- [ ] 返回清晰的错误报告

---

### Phase 4: PPTX 导出引擎（预计 2-3 天）

#### Task 4.1: 实现 SVG 转 PPTX（核心）
**状态**: ⬜ 未完成
**做什么**: 使用 `python-pptx` 将 SVG 转为原生可编辑 PPTX
**怎么做**:
1. 创建 `backend/app/services/svg_to_pptx.py`
2. 解析 SVG 元素：
   - `<rect>` → PPTX 形状
   - `<text>` → PPTX 文本框
   - `<image>` → PPTX 图片
   - `<g>` → 组合
3. 保留可编辑属性：
   - 文字内容可修改
   - 颜色可修改
   - 位置可拖动
4. 输出 `.pptx` 文件到 `backend/temp/{project}/exports/`
**完成后检查**:
- [ ] 生成的 .pptx 可在 PowerPoint/WPS 中打开
- [ ] 文本框可点击编辑
- [ ] 颜色/位置可修改
- [ ] 无图片拼接（每页是原生形状）

---

#### Task 4.2: 前端下载 PPTX 功能
**状态**: ⬜ 未完成
**做什么**: 修改下载按钮，支持下载真正的 .pptx 文件
**怎么做**:
1. 后端提供 `/api/download/{project_id}` 接口
2. 前端点击下载后，请求该接口获取二进制文件
3. 使用 `file-saver` 保存为 `.pptx`
4. 移除原有的图片 ZIP 导出逻辑（或降级为备选）
**完成后检查**:
- [ ] 点击下载可获取 .pptx 文件
- [ ] 文件可在 PowerPoint 中正常打开编辑
- [ ] 下载进度可见

---

### Phase 5: 模板系统重构（预计 2-3 天）

#### Task 5.1: 三级模板架构设计
**状态**: ⬜ 未完成
**做什么**: 参考 ppt-master 的 Brand + Layout + Deck 三级模板系统
**怎么做**:
1. 创建模板目录结构：
```
backend/app/templates/
├── brands/                    # 品牌预设（颜色+字体+语气）
│   ├── default_blue/
│   ├── corporate_red/
│   └── minimal_black/
├── layouts/                   # 布局模板（页面结构）
│   ├── standard_16x9/
│   ├── magazine_grid/
│   └── swiss_system/
└── decks/                     # 完整模板（品牌+布局）
    └── full_corporate/
```
2. 每个模板包含 `design_spec.md`（YAML frontmatter）
3. 前端加载模板列表时从后端获取
**完成后检查**:
- [ ] 模板目录结构正确
- [ ] 前端可加载并展示模板列表
- [ ] 选择模板后 design_spec 正确填充

---

#### Task 5.2: 模板预览图生成
**状态**: ⬜ 未完成
**做什么**: 为每个模板自动生成预览图
**怎么做**:
1. 使用模板生成一页示例 SVG
2. 将 SVG 转为 PNG 预览图
3. 前端展示预览图（替代当前的静态图片）
**完成后检查**:
- [ ] 每个模板有对应的预览图
- [ ] 预览图与真实效果一致

---

### Phase 6: 前端适配与优化（预计 2-3 天）

#### Task 6.1: 重构前端 API 调用层
**状态**: ⬜ 未完成
**做什么**: 统一前端调用 Python 后端的接口
**怎么做**:
1. 创建 `src/api/pythonApi.ts` 封装所有 Python 后端调用
2. 保留 `src/api/nodeApi.ts` 用于原 Node API（如需要）
3. 修改各 Step 组件，使用新的 API 层
**完成后检查**:
- [ ] 所有 API 调用通过统一封装层
- [ ] 错误处理统一
- [ ] 请求/响应日志清晰

---

#### Task 6.2: 新增实时进度展示
**状态**: ⬜ 未完成
**做什么**: 由于 Python 后端生成 PPT 时间较长，需要展示实时进度
**怎么做**:
1. 后端使用 SSE 或 WebSocket 推送进度：
   - "正在解析源文件..."
   - "正在生成设计规范..."
   - "正在生成第 3/10 页 SVG..."
   - "正在导出 PPTX..."
2. 前端展示进度条和当前步骤说明
3. 支持取消生成
**完成后检查**:
- [ ] 生成过程中可见实时进度
- [ ] 每页 SVG 生成完成时有反馈
- [ ] 可随时取消生成

---

#### Task 6.3: 预览功能优化
**状态**: ⬜ 未完成
**做什么**: 使用 SVG 直接预览（替代 Canvas 模拟）
**怎么做**:
1. 后端生成 SVG 后，前端直接渲染 SVG（无需转 Canvas）
2. 支持缩放、全屏预览
3. 支持点击某页直接跳转到该页编辑
**完成后检查**:
- [ ] 预览清晰度与导出效果一致
- [ ] 支持缩放操作
- [ ] 支持全屏演示模式

---

### Phase 7: 测试与文档（预计 2-3 天）

#### Task 7.1: 编写后端单元测试
**状态**: ⬜ 未完成
**做什么**: 为 Python 后端核心模块编写测试
**怎么做**:
1. 安装 `pytest` 和 `pytest-asyncio`
2. 测试模块：
   - `test_pdf_to_md.py` — PDF 解析测试
   - `test_strategist.py` — 设计规范生成测试
   - `test_svg_to_pptx.py` — PPTX 导出测试
3. 准备测试样本文件（sample.pdf, sample.docx）
**完成后检查**:
- [ ] `pytest` 可正常运行所有测试
- [ ] 所有核心功能有测试覆盖
- [ ] 测试样本文件齐全

---

#### Task 7.2: 端到端测试
**状态**: ⬜ 未完成
**做什么**: 完整流程测试：上传文件 → 生成大纲 → 确认设计 → 生成 PPT → 下载
**怎么做**:
1. 使用 Playwright 或 Cypress 编写 E2E 测试
2. 测试场景：
   - 场景A：输入主题生成 PPT
   - 场景B：上传 PDF 生成 PPT
   - 场景C：上传 Word 生成 PPT
   - 场景D：输入 URL 生成 PPT
3. 验证生成的 PPTX 可正常打开
**完成后检查**:
- [ ] 四个场景全部通过
- [ ] 生成的 PPTX 文件可用 PowerPoint 打开

---

#### Task 7.3: 更新项目文档
**状态**: ⬜ 未完成
**做什么**: 更新 README 和架构文档
**怎么做**:
1. 更新 README.md：
   - 新增 Python 后端安装说明
   - 更新技术架构图
   - 更新使用流程（新增设计确认步骤）
2. 编写 `backend/README.md`：
   - Python 环境配置
   - 依赖安装
   - 启动命令
3. 编写 API 文档（使用 FastAPI 自动生成的 Swagger）
**完成后检查**:
- [ ] README 包含前后端启动方法
- [ ] 架构图反映新架构
- [ ] API 文档完整

---

## 四、风险与应对

| 风险 | 影响 | 应对措施 |
|------|------|----------|
| python-pptx 不支持某些 SVG 特性 | 高 | 提前测试所有 SVG 元素，必要时降级为图片 |
| AI API 费用过高 | 中 | 支持缓存 design_spec，复用已生成的 SVG |
| Windows Python 环境配置复杂 | 中 | 提供详细的 Windows 安装指南 + 自动化脚本 |
| 生成时间过长（>5分钟） | 中 | 实现 SSE 进度推送 + 异步队列 |
| 与现有 Node 后端冲突 | 低 | 前后端分离，Node 后端逐步迁移 |

---

## 五、里程碑检查点

| 里程碑 | 完成标志 | 预计时间 |
|--------|---------|---------|
| **M1** | Phase 1 完成（Python 后端可启动，前端可调通） | 第 3 天 |
| **M2** | Phase 2 完成（可上传 PDF/Word/URL 并解析） | 第 6 天 |
| **M3** | Phase 3 完成（可生成 design_spec 和 SVG） | 第 10 天 |
| **M4** | Phase 4 完成（可导出真正 PPTX） | 第 13 天 |
| **M5** | Phase 5+6 完成（模板系统+前端适配） | 第 17 天 |
| **M6** | Phase 7 完成（测试通过，文档完整） | 第 20 天 |

---

## 六、当前任务状态总览

| 任务编号 | 任务名称 | 状态 | 所属阶段 |
|---------|---------|------|---------|
| 1.1 | 创建 Python 后端服务目录结构 | ✅ 已完成 | Phase 1 |
| 1.2 | 配置 Python 虚拟环境与依赖 | ✅ 已完成 | Phase 1 |
| 1.3 | 配置前端代理与跨域 | ✅ 已完成 | Phase 1 |
| 2.1 | 实现 PDF 转 Markdown | ✅ 已完成 | Phase 2 |
| 2.2 | 实现 Word/DOCX 转 Markdown | ✅ 已完成 | Phase 2 |
| 2.3 | 实现 URL 网页转 Markdown | ✅ 已完成 | Phase 2 |
| 2.4 | 前端文件上传组件 | ✅ 已完成 | Phase 2 |
| 3.1 | 实现 Strategist（策划角色） | ✅ 已完成 | Phase 3 |
| 3.2 | 前端设计规范确认界面 | ✅ 已完成 | Phase 3 |
| 3.3 | 实现 Executor（SVG 生成） | ✅ 已完成 | Phase 3 |
| 3.4 | 实现 SVG 质量检查 | ✅ 已完成 | Phase 3 |
| 4.1 | 实现 SVG 转 PPTX（核心） | ⬜ 未完成 | Phase 4 |
| 4.2 | 前端下载 PPTX 功能 | ⬜ 未完成 | Phase 4 |
| 5.1 | 三级模板架构设计 | ⬜ 未完成 | Phase 5 |
| 5.2 | 模板预览图生成 | ⬜ 未完成 | Phase 5 |
| 6.1 | 重构前端 API 调用层 | ⬜ 未完成 | Phase 6 |
| 6.2 | 新增实时进度展示 | ⬜ 未完成 | Phase 6 |
| 6.3 | 预览功能优化 | ⬜ 未完成 | Phase 6 |
| 7.1 | 编写后端单元测试 | ⬜ 未完成 | Phase 7 |
| 7.2 | 端到端测试 | ⬜ 未完成 | Phase 7 |
| 7.3 | 更新项目文档 | ⬜ 未完成 | Phase 7 |

---

> **说明**: 每完成一项任务，我会更新此文档中的状态为 ✅ 已完成，并在对话中告知您。如中途中断，您可直接查看此文档了解当前进度和下一步工作。
