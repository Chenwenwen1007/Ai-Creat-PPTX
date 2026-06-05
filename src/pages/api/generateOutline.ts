/**
 * 本地 AI API 代理路由
 * 接收前端的 AI 请求，使用用户自定义的 API 配置调用 AI 服务
 * 解决前端直接调用 AI API 时的 CORS 限制问题
 *
 * 请求头：
 *   x-custom-api-url: AI API 基础地址（如 https://api.deepseek.com）
 *   x-custom-api-model: AI 模型名称（如 deepseek-chat）
 *   x-custom-api-token: API 密钥
 *
 * 请求体：与 OpenAI Chat Completions API 兼容的 JSON
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

const handler = async (req: ApiRequest, res: ApiResponse) => {
  // 仅支持 POST 请求
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })

    return
  }

  // 从请求头读取用户自定义的 API 配置
  const apiUrl = req.headers['x-custom-api-url'] as string
  const apiModel = req.headers['x-custom-api-model'] as string
  const apiToken = req.headers['x-custom-api-token'] as string

  if (!apiUrl || !apiToken) {
    res.status(400).json({ error: '缺少 API 配置，请在参数设置中配置 API URL 和 Token' })

    return
  }

  // 构建完整的 AI API 请求地址
  const fullUrl = apiUrl.endsWith('/')
    ? `${apiUrl}chat/completions`
    : `${apiUrl}/chat/completions`

  // 构建请求体 - 兼容 OpenAI Chat Completions API 格式
  const requestBody = {
    model: apiModel || 'deepseek-chat',
    messages: req.body.messages || [],
    stream: true,
  }

  try {
    // 调用 AI API
    const response = await fetch(fullUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiToken}`,
      },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('AI API 请求失败:', response.status, errorText)
      res.status(response.status).json({
        error: `AI API 请求失败 (${response.status})`,
        detail: errorText,
      })

      return
    }

    // 设置 SSE 响应头
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')

    // 流式转发 AI 响应
    const reader = response.body?.getReader()
    if (!reader) {
      res.status(500).json({ error: '无法读取 AI 响应流' })

      return
    }

    const decoder = new TextDecoder()

    // 读取流式响应并转发给客户端
    const processStream = async () => {
      try {
        // eslint-disable-next-line no-constant-condition
        while (true) {
          const { done, value } = await reader.read()

          if (done) {
            break
          }

          const chunk = decoder.decode(value, { stream: true })
          res.write(chunk)
        }

        res.end()
      } catch (streamError) {
        console.error('流式传输错误:', streamError)
        res.end()
      }
    }

    await processStream()
  } catch (error: any) {
    console.error('AI API 代理错误:', error)
    res.status(500).json({
      error: 'AI API 代理请求失败',
      detail: error.message,
    })
  }
}

export default handler
