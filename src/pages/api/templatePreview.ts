/**
 * 本地模板预览图生成路由
 * 使用真实 PPT 数据结构渲染预览图，而非静态 SVG
 * 基于 generateContent.ts 中的配色方案和页面结构生成真实排版预览
 */

import type { IncomingMessage } from 'http'

interface ApiRequest extends IncomingMessage {
  method?: string
  query: Record<string, string | string[] | undefined>
}

interface ApiResponse {
  status: (code: number) => ApiResponse
  json: (data: any) => void
  setHeader: (name: string, value: string | string[]) => ApiResponse
  write: (chunk: any) => void
  end: () => void
  send: (data: any) => void
}

// PPT 画布尺寸
const PPT_WIDTH = 960
const PPT_HEIGHT = 540

/**
 * 模板配色方案 - 与 generateContent.ts 保持一致
 */
const TEMPLATE_STYLES: Record<string, {
  bgGradient: { angle: number; colors: string[]; fractions: number[] }
  primary: string
  accent: string
  title: string
  subtitle: string
  text: string
}> = {
  default_blue: {
    bgGradient: { angle: 135, colors: ['#0f4c81', '#1a6db5'], fractions: [0, 1] },
    primary: '#4a9eff',
    accent: '#7ec8ff',
    title: '#ffffff',
    subtitle: '#b0d4ff',
    text: '#e0e8f0',
  },
  default_green: {
    bgGradient: { angle: 135, colors: ['#1a5c3a', '#2a8f5a'], fractions: [0, 1] },
    primary: '#4aff8a',
    accent: '#7effaa',
    title: '#ffffff',
    subtitle: '#b0ffcc',
    text: '#e0f0e8',
  },
  default_red: {
    bgGradient: { angle: 135, colors: ['#8b2020', '#b53030'], fractions: [0, 1] },
    primary: '#ff6b6b',
    accent: '#ff9e9e',
    title: '#ffffff',
    subtitle: '#ffb0b0',
    text: '#f0e0e0',
  },
  default_dark: {
    bgGradient: { angle: 180, colors: ['#1a1a2e', '#2d2d44'], fractions: [0, 1] },
    primary: '#a0a0ff',
    accent: '#c0c0ff',
    title: '#ffffff',
    subtitle: '#aaaacc',
    text: '#ccccdd',
  },
  default_simple: {
    bgGradient: { angle: 180, colors: ['#f8f9fa', '#e9ecef'], fractions: [0, 1] },
    primary: '#495057',
    accent: '#6c757d',
    title: '#212529',
    subtitle: '#495057',
    text: '#343a40',
  },
  default_elegant: {
    bgGradient: { angle: 135, colors: ['#3d1a5c', '#5c2a8a'], fractions: [0, 1] },
    primary: '#d4a5ff',
    accent: '#e0c0ff',
    title: '#ffffff',
    subtitle: '#d4c5ff',
    text: '#e8e0f0',
  },
  default_tech: {
    bgGradient: { angle: 180, colors: ['#0a1628', '#1a2d4a'], fractions: [0, 1] },
    primary: '#00d4ff',
    accent: '#66e5ff',
    title: '#ffffff',
    subtitle: '#88ddff',
    text: '#c0e8f5',
  },
  default_nature: {
    bgGradient: { angle: 135, colors: ['#2a5a1a', '#3d8a2a'], fractions: [0, 1] },
    primary: '#a5e44a',
    accent: '#c0ff70',
    title: '#ffffff',
    subtitle: '#d4ffb0',
    text: '#e8f0d8',
  },
}

/**
 * 生成装饰元素 SVG
 */
const generateDecorations = (style: typeof TEMPLATE_STYLES['default_blue'], width: number, height: number): string => {
  return `
    <!-- 右上角装饰圆 -->
    <circle cx="${width * 0.85}" cy="${height * 0.15}" r="60" fill="${style.primary}" opacity="0.12"/>
    <circle cx="${width * 0.9}" cy="${height * 0.1}" r="35" fill="${style.accent}" opacity="0.08"/>
    
    <!-- 左下角装饰圆 -->
    <circle cx="${width * 0.1}" cy="${height * 0.85}" r="50" fill="${style.primary}" opacity="0.08"/>
    
    <!-- 标题下方装饰线 -->
    <rect x="${width * 0.08}" y="${height * 0.42}" width="${width * 0.25}" height="3" rx="1.5" fill="${style.primary}" opacity="0.8"/>
  `
}

/**
 * 生成真实 PPT 排版的预览 SVG
 * 模拟真实的标题+内容布局
 */
const generateRealisticPreview = (templateName: string, width: number, height: number): string => {
  const style = TEMPLATE_STYLES[templateName] || TEMPLATE_STYLES.default_blue

  // 构建渐变定义
  const gradientId = `bg_${templateName}`
  const [color1, color2] = style.bgGradient.colors

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <defs>
      <linearGradient id="${gradientId}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:${color1};stop-opacity:1" />
        <stop offset="100%" style="stop-color:${color2};stop-opacity:1" />
      </linearGradient>
    </defs>
    
    <!-- 背景 -->
    <rect width="${width}" height="${height}" fill="url(#${gradientId})"/>
    
    <!-- 装饰元素 -->
    ${generateDecorations(style, width, height)}
    
    <!-- 左侧装饰条（内容页风格） -->
    <rect x="${width * 0.04}" y="${height * 0.15}" width="4" height="${height * 0.7}" rx="2" fill="${style.primary}" opacity="0.6"/>
    
    <!-- 章节/小节面包屑 -->
    <text x="${width * 0.08}" y="${height * 0.12}" font-family="'Microsoft YaHei', 'PingFang SC', sans-serif" font-size="${Math.max(10, height * 0.028)}" fill="${style.primary}" opacity="0.8">第一章 / 市场概述</text>
    
    <!-- 页面标题（小观点）- 模拟真实标题 -->
    <text x="${width * 0.08}" y="${height * 0.28}" font-family="'Microsoft YaHei', 'PingFang SC', sans-serif" font-size="${Math.max(16, height * 0.045)}" font-weight="bold" fill="${style.title}">区域经济分化加剧趋势分析</text>
    
    <!-- 标题下方分隔线 -->
    <rect x="${width * 0.08}" y="${height * 0.33}" width="${width * 0.3}" height="2" rx="1" fill="${style.primary}" opacity="0.5"/>
    
    <!-- 内容要点 1 -->
    <text x="${width * 0.08}" y="${height * 0.45}" font-family="'Microsoft YaHei', 'PingFang SC', sans-serif" font-size="${Math.max(11, height * 0.032)}" fill="${style.text}">• 背景分析：当前宏观经济环境下的区域发展差异</text>
    
    <!-- 内容要点 2 -->
    <text x="${width * 0.08}" y="${height * 0.55}" font-family="'Microsoft YaHei', 'PingFang SC', sans-serif" font-size="${Math.max(11, height * 0.032)}" fill="${style.text}">• 核心逻辑：产业链转移与资源禀赋的重新配置</text>
    
    <!-- 内容要点 3 -->
    <text x="${width * 0.08}" y="${height * 0.65}" font-family="'Microsoft YaHei', 'PingFang SC', sans-serif" font-size="${Math.max(11, height * 0.032)}" fill="${style.text}">• 关键影响：对就业、投资及消费结构的深远意义</text>
    
    <!-- 内容要点 4 -->
    <text x="${width * 0.08}" y="${height * 0.75}" font-family="'Microsoft YaHei', 'PingFang SC', sans-serif" font-size="${Math.max(11, height * 0.032)}" fill="${style.text}">• 应对建议：基于协调发展政策的战略布局方向</text>
    
    <!-- 右下角装饰 -->
    <circle cx="${width * 0.92}" cy="${height * 0.88}" r="25" fill="${style.primary}" opacity="0.1"/>
  </svg>`
}

const handler = async (req: ApiRequest, res: ApiResponse) => {
  const { name } = req.query as { name?: string }

  if (!name) {
    res.status(400).json({ error: 'Missing template name' })

    return
  }

  const width = 960
  const height = 540
  const svg = generateRealisticPreview(name, width, height)

  res.setHeader('Content-Type', 'image/svg+xml')
  res.setHeader('Cache-Control', 'public, max-age=86400')
  res.status(200).send(svg)
}

export default handler
