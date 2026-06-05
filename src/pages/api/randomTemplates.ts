/**
 * 本地模板代理路由
 * 当后端不可达时，返回内置的默认模板列表
 * 优化：优先使用本地模板，减少加载等待时间
 */

import type { IncomingMessage } from 'http'

interface ApiRequest extends IncomingMessage {
  method?: string
  headers: Record<string, string | string[] | undefined>
  body: any
}

interface ApiResponse {
  status: (code: number) => ApiResponse
  json: (data: any) => void
  setHeader: (name: string, value: string | string[]) => ApiResponse
  write: (chunk: any) => void
  end: () => void
}

// 内置默认模板列表（当后端不可达时使用）
const DEFAULT_TEMPLATES = [
  { id: 1, subject: 'default_blue' },
  { id: 2, subject: 'default_green' },
  { id: 3, subject: 'default_red' },
  { id: 4, subject: 'default_dark' },
  { id: 5, subject: 'default_simple' },
  { id: 6, subject: 'default_elegant' },
  { id: 7, subject: 'default_tech' },
  { id: 8, subject: 'default_nature' },
]

/**
 * 带超时的 fetch
 */
const fetchWithTimeout = async (url: string, options: any, timeout = 3000) => {
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(url, { ...options, signal: controller.signal })
    clearTimeout(id)

    return response
  } catch (error) {
    clearTimeout(id)
    throw error
  }
}

const handler = async (req: ApiRequest, res: ApiResponse) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })

    return
  }

  // 尝试从后端获取模板，但设置短超时（3秒）
  const backendUrl = 'https://fdzz.dandian.net:8443/aipptx/randomTemplates.php'

  try {
    const token = req.headers['token'] as string || ''
    const response = await fetchWithTimeout(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'token': token,
      },
      body: JSON.stringify({ page: 1, size: 28, filters: { type: 1 } }),
    }, 3000)

    if (response.ok) {
      const data = await response.json()

      if (data.code === 0 && data.data && data.data.length > 0) {
        res.status(200).json(data)

        return
      }
    }
  } catch (error) {
    // 后端不可达，使用内置模板
    console.log('后端模板服务不可达，使用内置默认模板')
  }

  // 返回内置默认模板
  res.status(200).json({
    code: 0,
    message: '使用内置默认模板',
    data: DEFAULT_TEMPLATES,
  })
}

export default handler
