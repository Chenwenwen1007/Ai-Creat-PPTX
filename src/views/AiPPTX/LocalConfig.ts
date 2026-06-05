// ** 本地配置管理模块
// 使用 localStorage 临时存储用户自己的 AI API 配置
// 不依赖后端保存，仅在当前浏览器会话中生效
// 这样其他人可以使用你的项目，但使用他们自己的 API key

const STORAGE_KEY = 'ai-pptx-local-config'

/**
 * 本地配置的数据结构
 */
export interface LocalAiConfig {
  apiUrl: string
  apiModel: string
  apiToken: string
}

/**
 * 从 localStorage 读取本地配置
 * @returns 本地配置对象，如果不存在则返回 null
 */
export const getLocalConfig = (): LocalAiConfig | null => {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)

    if (!raw) {
      return null
    }

    const parsed = JSON.parse(raw) as LocalAiConfig

    return parsed
  } catch (err) {
    console.error('读取本地配置失败:', err)

    return null
  }
}

/**
 * 将配置保存到 localStorage
 * @param config 要保存的配置对象
 */
export const setLocalConfig = (config: LocalAiConfig): void => {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
  } catch (err) {
    console.error('保存本地配置失败:', err)
  }
}

/**
 * 清除 localStorage 中的本地配置
 */
export const clearLocalConfig = (): void => {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch (err) {
    console.error('清除本地配置失败:', err)
  }
}

/**
 * 获取用于后端请求的 token
 * 优先使用本地配置中的 apiToken，如果没有则返回空字符串
 * @returns 可用于请求头的 token 值
 */
export const getRequestToken = (): string => {
  const localConfig = getLocalConfig()

  if (localConfig && localConfig.apiToken) {
    // 如果有本地配置，返回本地 token
    // 后端使用此 token 作为配置查找键或直接使用
    return localConfig.apiToken
  }

  return ''
}

/**
 * 获取自定义 API 配置（用于前端直接调用或传递给后端）
 * @returns 包含自定义 API 配置的对象，或 null
 */
export const getCustomApiHeaders = (): Record<string, string> => {
  const localConfig = getLocalConfig()

  if (!localConfig) {
    return {}
  }

  const headers: Record<string, string> = {}
  if (localConfig.apiUrl) {
    headers['x-custom-api-url'] = localConfig.apiUrl
  }
  if (localConfig.apiModel) {
    headers['x-custom-api-model'] = localConfig.apiModel
  }
  if (localConfig.apiToken) {
    headers['x-custom-api-token'] = localConfig.apiToken
  }

  return headers
}
