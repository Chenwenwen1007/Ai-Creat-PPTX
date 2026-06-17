/**
 * Python 后端 API 封装层
 * 统一管理与 FastAPI 后端的通信
 * 所有请求通过 /api/python/* 路径，由 Next.js 代理转发到 Python 服务
 */

const PYTHON_API_BASE = '/api/python'

/**
 * 通用的 Python API 请求封装
 * @param endpoint API 端点（不含前缀）
 * @param options fetch 选项
 */
async function pythonApiRequest(endpoint: string, options: RequestInit = {}) {
  const url = `${PYTHON_API_BASE}${endpoint}`
  
  const defaultOptions: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  }
  
  const response = await fetch(url, { ...defaultOptions, ...options })
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: '请求失败' }))
    throw new Error(errorData.detail || `HTTP ${response.status}`)
  }
  
  return response
}

/**
 * 健康检查
 */
export async function checkPythonHealth() {
  const response = await fetch(`${PYTHON_API_BASE}/health`)
  return response.json()
}

/**
 * 上传文件并解析
 * @param file 上传的文件
 * @param projectId 项目标识
 */
export async function uploadFile(file: File, projectId: string) {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('project_id', projectId)
  
  const response = await fetch(`${PYTHON_API_BASE}/upload`, {
    method: 'POST',
    body: formData
  })
  
  return response.json()
}

/**
 * 通过 URL 解析网页
 * @param url 网页链接
 * @param projectId 项目标识
 */
export async function uploadUrl(url: string, projectId: string) {
  const formData = new FormData()
  formData.append('url', url)
  formData.append('project_id', projectId)
  
  const response = await fetch(`${PYTHON_API_BASE}/upload`, {
    method: 'POST',
    body: formData
  })
  
  return response.json()
}

/**
 * 生成 PPT 大纲（流式）
 * @param params 生成参数
 */
export async function generateOutlineStream(params: {
  source: string
  language: string
  length: string
  apiUrl: string
  apiKey: string
  model: string
  projectId: string
}) {
  const formData = new FormData()
  formData.append('source', params.source)
  formData.append('language', params.language)
  formData.append('length', params.length)
  formData.append('api_url', params.apiUrl)
  formData.append('api_key', params.apiKey)
  formData.append('model', params.model)
  formData.append('project_id', params.projectId)
  
  const response = await fetch(`${PYTHON_API_BASE}/outline/generate`, {
    method: 'POST',
    body: formData
  })
  
  return response
}

/**
 * 生成设计规范（流式）
 * @param params 生成参数
 */
export async function generateDesignSpecStream(params: {
  outline: string
  source: string
  apiUrl: string
  apiKey: string
  model: string
  projectId: string
}) {
  const formData = new FormData()
  formData.append('outline', params.outline)
  formData.append('source', params.source)
  formData.append('api_url', params.apiUrl)
  formData.append('api_key', params.apiKey)
  formData.append('model', params.model)
  formData.append('project_id', params.projectId)
  
  const response = await fetch(`${PYTHON_API_BASE}/design-spec`, {
    method: 'POST',
    body: formData
  })
  
  return response
}

/**
 * 锁定设计规范
 * @param designSpec 设计规范内容
 * @param projectId 项目标识
 */
export async function lockDesignSpec(designSpec: string, projectId: string) {
  const formData = new FormData()
  formData.append('design_spec', designSpec)
  formData.append('project_id', projectId)
  
  const response = await fetch(`${PYTHON_API_BASE}/design-spec/lock`, {
    method: 'POST',
    body: formData
  })
  
  return response.json()
}

/**
 * 生成 PPT（SSE 流式）
 * @param params 生成参数
 */
export async function generatePptStream(params: {
  outline: string
  designSpec: string
  apiUrl: string
  apiKey: string
  model: string
  projectId: string
}) {
  const formData = new FormData()
  formData.append('outline', params.outline)
  formData.append('design_spec', params.designSpec)
  formData.append('api_url', params.apiUrl)
  formData.append('api_key', params.apiKey)
  formData.append('model', params.model)
  formData.append('project_id', params.projectId)
  
  const response = await fetch(`${PYTHON_API_BASE}/generate`, {
    method: 'POST',
    body: formData
  })
  
  return response
}

/**
 * 导出 PPTX
 * @param projectId 项目标识
 */
export async function exportPptx(projectId: string) {
  const formData = new FormData()
  formData.append('project_id', projectId)
  
  const response = await fetch(`${PYTHON_API_BASE}/export/pptx`, {
    method: 'POST',
    body: formData
  })
  
  return response
}

/**
 * 下载 PPTX 文件
 * @param projectId 项目标识
 */
export async function downloadPptx(projectId: string) {
  const response = await fetch(`${PYTHON_API_BASE}/download/${projectId}`)
  return response
}

/**
 * 查询上传状态
 * @param projectId 项目标识
 */
export async function getUploadStatus(projectId: string) {
  const response = await fetch(`${PYTHON_API_BASE}/upload/status/${projectId}`)
  return response.json()
}
