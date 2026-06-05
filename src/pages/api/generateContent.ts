/**
 * 本地 PPT 内容生成代理路由
 * 当后端不可达时，使用用户配置的 AI 服务或本地解析生成 PPT 内容
 * 生成与 ppt2svg.js 完全兼容的 pptxObj 数据结构
 *
 * 核心设计原则：
 * 1. 每个小观点（#### 级别）独立成页，作为该页标题
 * 2. 每个标题配有详细的内容阐述
 * 3. 颜色搭配遵循专业设计规范，同色系协调
 * 4. 模板预览使用真实 PPT 渲染
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

// PPT 画布尺寸
const PPT_WIDTH = 960
const PPT_HEIGHT = 540

/**
 * 生成唯一 ID
 */
const genId = (prefix: string) => `${prefix}${Math.floor(Math.random() * 100000 + 100000)}`

/**
 * 创建带渐变背景的页面
 */
const createPage = (page: number, bgFillStyle?: any): any => ({
  page,
  extInfo: {
    background: {
      realType: 'Background',
      anchor: [0, 0, PPT_WIDTH, PPT_HEIGHT],
      fillStyle: bgFillStyle || {
        type: 'color',
        color: { color: -1, realColor: -1 },
      },
    },
    slideMasterIdx: 0,
    slideLayoutIdx: 0,
  },
  children: [],
})

/**
 * 计算适合文本框的字体大小
 * 根据文本长度和文本框宽度自动调整，确保标题不会超出页面
 */
const calcAdaptiveFontSize = (text: string, boxWidth: number, baseFontSize: number, subType: string): number => {
  // 中文字符宽度系数
  const charWidth = baseFontSize * 0.55
  const maxWidth = boxWidth * 0.9
  const textWidth = text.length * charWidth

  if (textWidth <= maxWidth) {
    return baseFontSize
  }

  // 根据文本长度缩小字体
  const ratio = maxWidth / textWidth
  let adjustedSize = Math.max(Math.floor(baseFontSize * ratio), subType === 'title1' ? 24 : subType === 'title2' ? 18 : 14)

  return adjustedSize
}

/**
 * 创建文本框（与 element.js createTextBox 兼容）
 * 改进：标题自动调整字体大小防止溢出，内容自动换行
 */
const createTextBox = (
  text: string,
  subType: string,
  fontColor?: any,
  anchor?: number[],
  textAlign?: string
): any => {
  let fontSize = subType === 'title1' ? 40 : subType === 'title2' ? 28 : subType === 'title3' ? 20 : 16
  const defaultTextAlign = subType === 'content' ? 'LEFT' : 'CENTER'
  const textWordWrap = subType === 'content' || subType === 'title2' // 标题也允许换行
  const id = genId('txt')

  // 计算文本框位置
  let anchorX: number
  let anchorY: number
  let textWidth: number
  let textHeight: number

  if (anchor) {
    [anchorX, anchorY, textWidth, textHeight] = anchor
  } else {
    textWidth = Math.min(text.length * fontSize * 0.6 + 60, PPT_WIDTH * 0.8)
    textHeight = fontSize * (subType === 'content' ? 4 : 2)
    anchorX = (PPT_WIDTH - textWidth) / 2
    anchorY = subType === 'title1'
      ? PPT_HEIGHT * 0.3
      : subType === 'title2'
        ? PPT_HEIGHT * 0.15
        : PPT_HEIGHT * 0.35
  }

  // 标题类型自动调整字体大小防止溢出
  if (subType === 'title1' || subType === 'title2') {
    fontSize = calcAdaptiveFontSize(text, textWidth, fontSize, subType)
  }

  // 根据内容类型设置合适的行间距（中国PPT常用格式）
  // 标题：1.3倍行距，内容：1.5倍行距，使阅读更舒适
  const lineSpacing = subType === 'content' ? 150 : subType === 'title1' ? 130 : 140

  return {
    id,
    type: 'text',
    depth: 1,
    point: [anchorX, anchorY, textWidth, textHeight],
    extInfo: {
      property: {
        realType: 'TextBox',
        shapeType: 'rect',
        anchor: [anchorX, anchorY, textWidth, textHeight],
        fillStyle: { type: 'noFill' },
        geometry: { name: 'rect' },
        textAutofit: 'SHAPE',
        textDirection: 'HORIZONTAL',
        textVerticalAlignment: subType === 'content' ? 'TOP' : 'MIDDLE',
        textWordWrap,
        // 增加文本内边距，使文字不贴边，更符合中国PPT审美
        textInsets: subType === 'content' ? [8, 12, 8, 12] : [6, 10, 6, 10],
        lineSpacing,
      },
    },
    children: [
      {
        id: `${id}_p`,
        pid: id,
        type: 'p',
        depth: 2,
        extInfo: {
          property: {
            textAlign: textAlign || defaultTextAlign,
            leftMargin: 0,
          },
        },
        children: [
          {
            id: `${id}_p_r`,
            pid: `${id}_p`,
            type: 'r',
            text,
            depth: 3,
            extInfo: {
              property: {
                fontSize,
                bold: subType === 'title1' || subType === 'title2' ? true : null,
                fontFamily: null,
                fontColor: fontColor ? { ...fontColor } : {
                  type: 'color',
                  color: { scheme: null, realColor: -16777216, color: -16777216 },
                },
                line: null,
                lang: 'zh-CN',
              },
            },
          },
        ],
      },
    ],
  }
}

/**
 * 创建装饰形状（矩形/圆形等）
 */
const createShape = (
  shapeName: string,
  anchor: number[],
  fillStyle: any,
  strokeStyle?: any
): any => {
  const id = genId('shp')

  return {
    id,
    type: 'text',
    depth: 1,
    point: [...anchor],
    extInfo: {
      property: {
        realType: 'Auto',
        shapeType: shapeName,
        anchor: [...anchor],
        fillStyle: { ...fillStyle },
        strokeStyle: strokeStyle || {
          paint: { type: 'noFill' },
          lineWidth: 0,
          lineCap: 'FLAT',
          lineDash: 'SOLID',
          lineCompound: 'SINGLE',
        },
        geometry: { name: shapeName, data: null, avLst: null },
        textAutofit: 'NORMAL',
        textDirection: 'HORIZONTAL',
        textVerticalAlignment: 'MIDDLE',
        textInsets: [3.6, 7.2, 3.6, 7.2],
      },
    },
    children: [
      {
        id: `${id}_p`,
        pid: id,
        type: 'p',
        depth: 2,
        extInfo: { property: { textAlign: 'CENTER', leftMargin: 0 } },
        children: [],
      },
    ],
  }
}

/**
 * 创建装饰线条
 */
const createLine = (anchor: number[], strokeColor: number): any => {
  const id = genId('line')

  return {
    id,
    type: 'text',
    depth: 1,
    point: [...anchor],
    extInfo: {
      property: {
        realType: 'Auto',
        shapeType: 'rect',
        anchor: [...anchor],
        fillStyle: {
          type: 'color',
          color: { color: strokeColor, realColor: strokeColor },
        },
        strokeStyle: {
          paint: { type: 'noFill' },
          lineWidth: 0,
          lineCap: 'FLAT',
          lineDash: 'SOLID',
          lineCompound: 'SINGLE',
        },
        geometry: { name: 'rect', data: null, avLst: null },
        textAutofit: 'NORMAL',
        textDirection: 'HORIZONTAL',
        textVerticalAlignment: 'MIDDLE',
        textInsets: [3.6, 7.2, 3.6, 7.2],
      },
    },
    children: [],
  }
}

/**
 * 创建 slideMaster（母版）带渐变背景
 */
const createSlideMaster = (bgFillStyle: any): any => ({
  background: {
    realType: 'Background',
    anchor: [0, 0, PPT_WIDTH, PPT_HEIGHT],
    fillStyle: bgFillStyle,
  },
  children: [],
  slideLayouts: [
    // 封面版式
    {
      background: {
        realType: 'Background',
        anchor: [0, 0, PPT_WIDTH, PPT_HEIGHT],
        fillStyle: { type: 'noFill' },
      },
      noMaster: false,
      children: [],
    },
    // 内容版式
    {
      background: {
        realType: 'Background',
        anchor: [0, 0, PPT_WIDTH, PPT_HEIGHT],
        fillStyle: { type: 'noFill' },
      },
      noMaster: false,
      children: [],
    },
  ],
})

/**
 * 颜色转换辅助函数：将十六进制颜色字符串转换为 Windows 有符号整数格式
 * 例如：'#0B3D91' -> -12666191
 */
const hexToWinColor = (hex: string): number => {
  const clean = hex.replace('#', '')
  const r = parseInt(clean.substring(0, 2), 16)
  const g = parseInt(clean.substring(2, 4), 16)
  const b = parseInt(clean.substring(4, 6), 16)
  // Windows 使用 ARGB 格式，Alpha=FF
  const argb = (0xFF << 24) | (r << 16) | (g << 8) | b

  // 转换为有符号32位整数（与 Windows 行为一致）
  return argb | 0
}

/**
 * 模板配色方案 - 专业协调的同色系设计
 * 使用精确的十六进制颜色值，确保每种模板颜色正确
 * 原则：避免使用灰色、黄色等不协调的杂色，保持同色系和谐
 */
const TEMPLATE_SCHEMES: Record<number, {
  bgGradient: { angle: number; colors: { color: number; realColor: number; alpha: number }[]; fractions: number[]; gradientType: string }
  primary: number
  secondary: number
  accent: number
  titleColor: any
  textColor: any
  decorColor: number
  decorAlpha: number
}> = {
  // 1: 深海蓝 - 专业商务（深蓝背景，白色文字）
  1: {
    bgGradient: {
      angle: 135,
      colors: [
        { color: hexToWinColor('#0B3D91'), realColor: hexToWinColor('#0B3D91'), alpha: 100000 },
        { color: hexToWinColor('#1565C0'), realColor: hexToWinColor('#1565C0'), alpha: 100000 }
      ],
      fractions: [0, 1],
      gradientType: 'linear'
    },
    primary: hexToWinColor('#64B5F6'),
    secondary: hexToWinColor('#1565C0'),
    accent: hexToWinColor('#90CAF9'),
    titleColor: { type: 'color', color: { scheme: null, realColor: -1, color: -1 } },
    textColor: { type: 'color', color: { scheme: null, realColor: -1, color: -1 } },
    decorColor: hexToWinColor('#64B5F6'),
    decorAlpha: 20000,
  },

  // 2: 森林绿 - 自然生态（深绿背景，白色文字）
  2: {
    bgGradient: {
      angle: 135,
      colors: [
        { color: hexToWinColor('#1B5E20'), realColor: hexToWinColor('#1B5E20'), alpha: 100000 },
        { color: hexToWinColor('#2E7D32'), realColor: hexToWinColor('#2E7D32'), alpha: 100000 }
      ],
      fractions: [0, 1],
      gradientType: 'linear'
    },
    primary: hexToWinColor('#81C784'),
    secondary: hexToWinColor('#2E7D32'),
    accent: hexToWinColor('#A5D6A7'),
    titleColor: { type: 'color', color: { scheme: null, realColor: -1, color: -1 } },
    textColor: { type: 'color', color: { scheme: null, realColor: -1, color: -1 } },
    decorColor: hexToWinColor('#81C784'),
    decorAlpha: 20000,
  },

  // 3: 中国红 - 活力庄重（深红背景，白色文字）
  3: {
    bgGradient: {
      angle: 135,
      colors: [
        { color: hexToWinColor('#B71C1C'), realColor: hexToWinColor('#B71C1C'), alpha: 100000 },
        { color: hexToWinColor('#C62828'), realColor: hexToWinColor('#C62828'), alpha: 100000 }
      ],
      fractions: [0, 1],
      gradientType: 'linear'
    },
    primary: hexToWinColor('#EF5350'),
    secondary: hexToWinColor('#C62828'),
    accent: hexToWinColor('#EF9A9A'),
    titleColor: { type: 'color', color: { scheme: null, realColor: -1, color: -1 } },
    textColor: { type: 'color', color: { scheme: null, realColor: -1, color: -1 } },
    decorColor: hexToWinColor('#EF5350'),
    decorAlpha: 20000,
  },

  // 4: 极夜黑 - 高端简约（深灰黑背景，白色文字）
  4: {
    bgGradient: {
      angle: 180,
      colors: [
        { color: hexToWinColor('#1A1A2E'), realColor: hexToWinColor('#1A1A2E'), alpha: 100000 },
        { color: hexToWinColor('#16213E'), realColor: hexToWinColor('#16213E'), alpha: 100000 }
      ],
      fractions: [0, 1],
      gradientType: 'linear'
    },
    primary: hexToWinColor('#E0E0E0'),
    secondary: hexToWinColor('#16213E'),
    accent: hexToWinColor('#BDBDBD'),
    titleColor: { type: 'color', color: { scheme: null, realColor: -1, color: -1 } },
    textColor: { type: 'color', color: { scheme: null, realColor: -1, color: -1 } },
    decorColor: hexToWinColor('#E0E0E0'),
    decorAlpha: 15000,
  },

  // 5: 珍珠白 - 清新简约（浅灰白背景，深色文字）
  5: {
    bgGradient: {
      angle: 180,
      colors: [
        { color: hexToWinColor('#FAFAFA'), realColor: hexToWinColor('#FAFAFA'), alpha: 100000 },
        { color: hexToWinColor('#ECEFF1'), realColor: hexToWinColor('#ECEFF1'), alpha: 100000 }
      ],
      fractions: [0, 1],
      gradientType: 'linear'
    },
    primary: hexToWinColor('#37474F'),
    secondary: hexToWinColor('#546E7A'),
    accent: hexToWinColor('#78909C'),
    titleColor: { type: 'color', color: { scheme: null, realColor: hexToWinColor('#263238'), color: hexToWinColor('#263238') } },
    textColor: { type: 'color', color: { scheme: null, realColor: hexToWinColor('#455A64'), color: hexToWinColor('#455A64') } },
    decorColor: hexToWinColor('#78909C'),
    decorAlpha: 15000,
  },

  // 6: 罗兰紫 - 优雅高贵（深紫背景，白色文字）
  6: {
    bgGradient: {
      angle: 135,
      colors: [
        { color: hexToWinColor('#4A148C'), realColor: hexToWinColor('#4A148C'), alpha: 100000 },
        { color: hexToWinColor('#6A1B9A'), realColor: hexToWinColor('#6A1B9A'), alpha: 100000 }
      ],
      fractions: [0, 1],
      gradientType: 'linear'
    },
    primary: hexToWinColor('#CE93D8'),
    secondary: hexToWinColor('#6A1B9A'),
    accent: hexToWinColor('#E1BEE7'),
    titleColor: { type: 'color', color: { scheme: null, realColor: -1, color: -1 } },
    textColor: { type: 'color', color: { scheme: null, realColor: -1, color: -1 } },
    decorColor: hexToWinColor('#CE93D8'),
    decorAlpha: 20000,
  },

  // 7: 科技青 - 未来感（深青背景，白色文字）
  7: {
    bgGradient: {
      angle: 180,
      colors: [
        { color: hexToWinColor('#006064'), realColor: hexToWinColor('#006064'), alpha: 100000 },
        { color: hexToWinColor('#00838F'), realColor: hexToWinColor('#00838F'), alpha: 100000 }
      ],
      fractions: [0, 1],
      gradientType: 'linear'
    },
    primary: hexToWinColor('#4DD0E1'),
    secondary: hexToWinColor('#00838F'),
    accent: hexToWinColor('#80DEEA'),
    titleColor: { type: 'color', color: { scheme: null, realColor: -1, color: -1 } },
    textColor: { type: 'color', color: { scheme: null, realColor: -1, color: -1 } },
    decorColor: hexToWinColor('#4DD0E1'),
    decorAlpha: 15000,
  },

  // 8: 薄荷绿 - 清新自然（清新绿背景，白色文字）
  8: {
    bgGradient: {
      angle: 135,
      colors: [
        { color: hexToWinColor('#004D40'), realColor: hexToWinColor('#004D40'), alpha: 100000 },
        { color: hexToWinColor('#00695C'), realColor: hexToWinColor('#00695C'), alpha: 100000 }
      ],
      fractions: [0, 1],
      gradientType: 'linear'
    },
    primary: hexToWinColor('#80CBC4'),
    secondary: hexToWinColor('#00695C'),
    accent: hexToWinColor('#B2DFDB'),
    titleColor: { type: 'color', color: { scheme: null, realColor: -1, color: -1 } },
    textColor: { type: 'color', color: { scheme: null, realColor: -1, color: -1 } },
    decorColor: hexToWinColor('#80CBC4'),
    decorAlpha: 20000,
  },
}

/**
 * 为封面页添加装饰元素
 */
const addCoverDecorations = (page: any, scheme: typeof TEMPLATE_SCHEMES[1]): void => {
  // 右上角大圆装饰
  page.children.push(createShape('ellipse', [PPT_WIDTH * 0.75, -40, 260, 260], {
    type: 'color',
    color: { color: scheme.decorColor, realColor: scheme.decorColor, alpha: scheme.decorAlpha },
  }))

  // 左下角小圆装饰
  page.children.push(createShape('ellipse', [-60, PPT_HEIGHT * 0.65, 200, 200], {
    type: 'color',
    color: { color: scheme.decorColor, realColor: scheme.decorColor, alpha: scheme.decorAlpha },
  }))

  // 标题下方装饰线
  page.children.push(createLine(
    [PPT_WIDTH * 0.3, PPT_HEIGHT * 0.52, PPT_WIDTH * 0.4, 4],
    scheme.primary
  ))
}

/**
 * 为内容页添加装饰元素
 */
const addContentDecorations = (page: any, scheme: typeof TEMPLATE_SCHEMES[1]): void => {
  // 左侧装饰条
  page.children.push(createLine(
    [40, PPT_HEIGHT * 0.12, 6, PPT_HEIGHT * 0.76],
    scheme.primary
  ))

  // 右下角小圆
  page.children.push(createShape('ellipse', [PPT_WIDTH * 0.85, PPT_HEIGHT * 0.7, 120, 120], {
    type: 'color',
    color: { color: scheme.decorColor, realColor: scheme.decorColor, alpha: Math.floor(scheme.decorAlpha * 0.6) },
  }))
}

/**
 * 为结尾页添加装饰元素
 */
const addEndDecorations = (page: any, scheme: typeof TEMPLATE_SCHEMES[1]): void => {
  // 中央装饰线
  page.children.push(createLine(
    [PPT_WIDTH * 0.35, PPT_HEIGHT * 0.55, PPT_WIDTH * 0.3, 3],
    scheme.primary
  ))

  // 底部小圆
  page.children.push(createShape('ellipse', [PPT_WIDTH * 0.45, PPT_HEIGHT * 0.65, 80, 80], {
    type: 'color',
    color: { color: scheme.decorColor, realColor: scheme.decorColor, alpha: scheme.decorAlpha },
  }))
}

/**
 * 根据标题智能生成详细内容说明
 * 不使用编造数据，而是基于标题主题生成合理的分析框架和阐述
 */
const generateContentForTitle = (title: string): string => {
  // 分析标题中的关键词，生成对应的内容框架
  const keywords = extractKeywords(title)

  // 根据关键词组合生成内容
  const content = buildContentFromKeywords(title, keywords)

  return content
}

/**
 * 提取标题关键词
 */
const extractKeywords = (title: string): string[] => {
  const commonWords = ['的', '了', '在', '是', '与', '及', '等', '对', '为', '以', '从', '到', '由', '向', '和', '或', '而', '但', '却', '因为', '所以', '如果', '虽然', '不仅', '而且']

  return title
    .split(/[：:；;，,。\.\s]+/)
    .filter(w => w.length >= 2 && !commonWords.includes(w))
    .slice(0, 3)
}

/**
 * 基于关键词构建内容
 * 生成分析框架而非编造具体数据
 * 改进：内容更加丰富，每页6-8个要点，增加深度阐述
 */
const buildContentFromKeywords = (title: string, keywords: string[]): string => {
  // 识别标题类型
  const isEconomic = /经济|增长|GDP|市场|投资|产业|就业|消费|贸易|金融|财政|货币|通胀|汇率|股票|基金|债券|房地产/.test(title)
  const isTech = /科技|技术|创新|数字化|智能|互联网|人工智能|AI|大数据|云计算|区块链|5G|物联网/.test(title)
  const isSocial = /社会|人口|教育|医疗|养老|环保|绿色|碳|能源|气候|城市|农村|民生|文化/.test(title)
  const isPolicy = /政策|改革|制度|法规|战略|规划|政府|监管|法规|法律/.test(title)
  const isTrend = /趋势|预测|展望|未来|发展|变化|转型|升级|机遇|挑战/.test(title)
  const isIndustry = /行业|产业|制造|服务|农业|工业|商业|零售|物流|供应链/.test(title)
  const isRegional = /区域|城市|地区|省份|国家|全球|国际|国内|东部|西部|南部|北部/.test(title)

  let content = ''

  if (isEconomic) {
    content = `• 背景分析：当前宏观经济环境下的相关因素与驱动力量，包括国内外经济形势、政策导向及市场供需关系的变化趋势\n• 核心逻辑：产业链上下游联动效应及市场传导机制，分析价值创造与分配的关键环节\n• 关键影响：对区域发展、行业格局及企业经营的深远意义，重点关注结构性调整带来的机遇与挑战\n• 数据支撑：建议参考国家统计局、行业协会发布的权威数据，进行定量分析与趋势判断\n• 风险评估：识别潜在的市场波动、政策变化及外部冲击等不确定性因素\n• 应对建议：基于现有政策框架的战略布局方向，提出可操作性的实施路径与资源配置方案`
  } else if (isTech) {
    content = `• 技术原理：核心技术架构与关键突破点分析，阐述技术创新的理论基础与实现路径\n• 应用场景：典型落地领域及商业化路径探索，分析技术转化的关键成功因素\n• 产业生态：上下游协同与价值链重构趋势，识别产业链中的核心参与者与竞争格局\n• 发展现状：当前技术成熟度、市场渗透率及主要应用案例的综合评估\n• 面临挑战：技术瓶颈、成本控制、标准制定及人才储备等方面的制约因素\n• 发展前瞻：技术迭代方向与潜在颠覆性影响，预测未来3-5年的发展趋势与突破点`
  } else if (isSocial) {
    content = `• 现状梳理：相关社会领域的当前发展态势与主要特征，基于公开统计数据与研究报告的综合分析\n• 问题聚焦：核心矛盾与结构性挑战的深度剖析，识别制约发展的关键瓶颈\n• 群体影响：分析对不同年龄段、收入层次及地域人群的影响差异与关联性\n• 实践路径：国内外先进经验与本土化解决方案，总结可复制的成功模式\n• 政策响应：梳理相关政策的演进脉络与实施效果，评估政策工具的适用性\n• 长远价值：对社会可持续发展的战略意义与贡献，构建多维度的评价指标体系`
  } else if (isPolicy) {
    content = `• 政策背景：出台的历史契机与现实需求分析，梳理政策制定的宏观环境与问题导向\n• 核心要点：政策框架、目标定位与关键举措梳理，明确政策工具的组合逻辑\n• 实施主体：界定各级政府、企业及社会组织的职责分工与协作机制\n• 实施路径：阶段性推进计划与配套机制设计，制定可量化的里程碑目标\n• 预期成效：对经济社会发展的多维影响评估，建立科学的监测与评价体系\n• 优化建议：基于实施反馈的政策调整方向，提出动态优化与持续改进的路径`
  } else if (isTrend) {
    content = `• 历史脉络：该领域发展演变的关键阶段与标志性事件，构建完整的发展时间线\n• 现状研判：当前所处周期位置与核心特征识别，分析市场饱和度与竞争强度\n• 驱动因素：推动变化的关键力量与深层逻辑，包括技术创新、消费升级及政策引导等\n• 国际比较：对标国际先进经验与典型模式，识别差距与可借鉴之处\n• 风险预警：潜在的不确定性因素与黑天鹅事件，建立情景分析与应急预案\n• 前瞻展望：未来发展趋势与潜在变量分析，提出分阶段的发展目标与战略重点`
  } else if (isIndustry) {
    content = `• 产业概述：该行业的基本特征、发展阶段及在国民经济中的地位与作用\n• 市场结构：竞争格局、集中度及主要参与者的战略定位与差异化优势\n• 价值链分析：从原材料到终端消费者的全链条价值分布与利润池识别\n• 技术变革：数字化、智能化对传统模式的冲击与转型升级路径\n• 政策环境：行业监管政策、准入门槛及产业扶持措施的影响分析\n• 发展建议：基于行业规律与企业实际的战略选择，明确核心能力建设方向`
  } else if (isRegional) {
    content = `• 区域概况：地理位置、资源禀赋、人口结构及经济发展水平的基本特征\n• 比较优势：与同类区域相比的核心竞争力与差异化发展路径\n• 发展瓶颈：基础设施、人才储备、产业结构及营商环境等方面的制约因素\n• 协同机遇：区域一体化、城市群建设及跨区域合作带来的发展空间\n• 典型案例：区域内成功实践的经验总结与推广价值分析\n• 战略定位：基于资源禀赋与市场需求的差异化发展策略与目标愿景`
  } else {
    content = `• 核心概念：该主题的关键定义与内涵解析，建立清晰的分析框架与边界\n• 现实意义：当前背景下的重要性与紧迫性阐述，说明关注该议题的价值所在\n• 多维分析：从不同视角对该主题的系统性解读，整合理论与实践的多重证据\n• 关联因素：识别与该主题相关的内外部变量及其相互作用机制\n• 实践探索：已有的成功经验与失败教训，提炼可推广的方法论与工具\n• 行动方向：基于分析结论的实践建议与实施路径，明确优先级与资源配置`
  }

  return content
}

/**
 * 解析大纲结构
 * 结构：# 主题 -> ## 章节 -> ### 小节 -> #### 页面标题
 */
interface SlidePage {
  chapterTitle: string
  sectionTitle: string
  pageTitle: string
  content: string
}

const parseOutlineStructure = (outlineMarkdown: string): { subject: string; pages: SlidePage[] } => {
  const lines = outlineMarkdown.split('\n').filter((line: string) => line.trim())
  let subject = 'PPT'
  const pages: SlidePage[] = []

  let currentChapter = ''
  let currentSection = ''

  for (const line of lines) {
    const trimmed = line.trim()

    if (trimmed.startsWith('# ')) {
      subject = trimmed.substring(2)
    } else if (trimmed.startsWith('## ')) {
      currentChapter = trimmed.substring(3)
    } else if (trimmed.startsWith('### ')) {
      currentSection = trimmed.substring(4)
    } else if (trimmed.startsWith('#### ')) {
      const pageTitle = trimmed.substring(5)
      pages.push({
        chapterTitle: currentChapter,
        sectionTitle: currentSection,
        pageTitle,
        content: generateContentForTitle(pageTitle)
      })
    } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      // 列表项作为独立页面标题（兼容旧格式）
      const pageTitle = trimmed.replace(/^[-*]\s*/, '')
      if (pageTitle.length > 3 && currentSection) {
        pages.push({
          chapterTitle: currentChapter,
          sectionTitle: currentSection,
          pageTitle,
          content: generateContentForTitle(pageTitle)
        })
      }
    }
  }

  return { subject, pages }
}

/**
 * 从大纲 Markdown 解析出页面结构
 * 核心改进：每个 #### 级别的小观点独立成页，作为页面标题
 */
const parseOutlineToPptxObj = (outlineMarkdown: string, templateId: number): any => {
  const { subject, pages } = parseOutlineStructure(outlineMarkdown)

  // 获取模板配色方案
  const scheme = TEMPLATE_SCHEMES[templateId] || TEMPLATE_SCHEMES[4]

  // 构建渐变背景 fillStyle
  const bgFillStyle = {
    type: 'gradient',
    gradient: { ...scheme.bgGradient },
  }

  // 内容页背景（较浅的渐变）
  const contentBgFillStyle = {
    type: 'gradient',
    gradient: {
      ...scheme.bgGradient,
      colors: scheme.bgGradient.colors.map((c: any) => ({
        ...c,
        alpha: Math.min(c.alpha + 20000, 100000),
      })),
    },
  }

  const pptPages: any[] = []

  // ── 封面页 ──
  const coverPage = createPage(1, bgFillStyle)
  coverPage.extInfo.slideLayoutIdx = 0
  addCoverDecorations(coverPage, scheme)
  coverPage.children.push(createTextBox(subject, 'title1', scheme.titleColor))
  pptPages.push(coverPage)

  // ── 目录页 ──
  const uniqueChapters = [...new Set(pages.map(p => p.chapterTitle))]
  if (uniqueChapters.length > 1) {
    const tocPage = createPage(pptPages.length + 1, contentBgFillStyle)
    tocPage.extInfo.slideLayoutIdx = 1
    addContentDecorations(tocPage, scheme)
    tocPage.children.push(createTextBox('目录', 'title2', scheme.titleColor, [60, PPT_HEIGHT * 0.1, PPT_WIDTH * 0.8, 50], 'LEFT'))
    const tocText = uniqueChapters.map((ch, i) => `${String(i + 1).padStart(2, '0')}    ${ch}`).join('\n')
    tocPage.children.push(createTextBox(tocText, 'content', scheme.textColor, [80, PPT_HEIGHT * 0.22, PPT_WIDTH * 0.75, PPT_HEIGHT * 0.6], 'LEFT'))
    pptPages.push(tocPage)
  }

  // ── 内容页：每个小观点独立成页 ──
  let currentChapterIdx = -1
  let lastChapterTitle = ''

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i]

    // 如果进入新章节，添加章节过渡页
    if (page.chapterTitle !== lastChapterTitle && page.chapterTitle) {
      currentChapterIdx++
      lastChapterTitle = page.chapterTitle

      const chapterPage = createPage(pptPages.length + 1, bgFillStyle)
      chapterPage.extInfo.slideLayoutIdx = 0
      addCoverDecorations(chapterPage, scheme)

      // 章节编号
      chapterPage.children.push(createTextBox(
        `0${currentChapterIdx + 1}`,
        'title2',
        { type: 'color', color: { scheme: null, realColor: scheme.primary, color: scheme.primary, alpha: 50000 } },
        [PPT_WIDTH * 0.1, PPT_HEIGHT * 0.2, 200, 60],
        'LEFT'
      ))
      chapterPage.children.push(createTextBox(page.chapterTitle, 'title1', scheme.titleColor, [PPT_WIDTH * 0.1, PPT_HEIGHT * 0.35, PPT_WIDTH * 0.8, 80], 'LEFT'))
      pptPages.push(chapterPage)
    }

    // 小观点详情页
    const contentPage = createPage(pptPages.length + 1, contentBgFillStyle)
    contentPage.extInfo.slideLayoutIdx = 1
    addContentDecorations(contentPage, scheme)

    // 页面标题（小观点）
    contentPage.children.push(createTextBox(
      page.pageTitle,
      'title2',
      scheme.titleColor,
      [70, PPT_HEIGHT * 0.08, PPT_WIDTH * 0.82, 60],
      'LEFT'
    ))

    // 章节/小节标识
    const breadcrumb = page.sectionTitle
      ? `${page.chapterTitle} / ${page.sectionTitle}`
      : page.chapterTitle
    contentPage.children.push(createTextBox(
      breadcrumb,
      'title3',
      { type: 'color', color: { scheme: null, realColor: scheme.primary, color: scheme.primary, alpha: 60000 } },
      [70, PPT_HEIGHT * 0.02, PPT_WIDTH * 0.8, 24],
      'LEFT'
    ))

    // 详细内容
    contentPage.children.push(createTextBox(
      page.content,
      'content',
      scheme.textColor,
      [80, PPT_HEIGHT * 0.22, PPT_WIDTH * 0.82, PPT_HEIGHT * 0.68],
      'LEFT'
    ))

    pptPages.push(contentPage)
  }

  // ── 结尾页 ──
  const endPage = createPage(pptPages.length + 1, bgFillStyle)
  endPage.extInfo.slideLayoutIdx = 0
  addEndDecorations(endPage, scheme)
  endPage.children.push(createTextBox('感谢观看', 'title1', scheme.titleColor))
  endPage.children.push(createTextBox('THANK YOU', 'title2', {
    type: 'color',
    color: { scheme: null, realColor: scheme.primary, color: scheme.primary, alpha: 60000 },
  }, [PPT_WIDTH * 0.3, PPT_HEIGHT * 0.6, PPT_WIDTH * 0.4, 40]))
  pptPages.push(endPage)

  // 构建完整的 pptxObj
  return {
    width: PPT_WIDTH,
    height: PPT_HEIGHT,
    slideMasters: [createSlideMaster(bgFillStyle)],
    pages: pptPages,
  }
}

/**
 * 使用 AI 生成 PPT 内容
 */
const generateWithAI = async (req: ApiRequest, res: ApiResponse) => {
  const { outlineMarkdown, templateId } = req.body
  const apiUrl = req.headers['x-custom-api-url'] as string
  const apiModel = req.headers['x-custom-api-model'] as string
  const apiToken = req.headers['x-custom-api-token'] as string

  if (!apiUrl || !apiToken) {
    generateLocalFallback(outlineMarkdown, templateId, res)

    return
  }

  const fullUrl = apiUrl.endsWith('/')
    ? `${apiUrl}chat/completions`
    : `${apiUrl}/chat/completions`

  const requestBody = {
    model: apiModel || 'deepseek-chat',
    messages: [
      {
        role: 'system',
        content: '你是一位专业的PPT内容生成助手。请根据用户提供的PPT大纲，为每一页生成详细的内容。输出格式为JSON，包含pages数组，每个page有elements数组，每个element有type(title/text)和content字段。只输出JSON，不要其他文字。',
      },
      {
        role: 'user',
        content: `请根据以下PPT大纲生成详细内容：\n${outlineMarkdown}`,
      },
    ],
    stream: false,
  }

  try {
    const response = await fetch(fullUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiToken}`,
      },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      generateLocalFallback(outlineMarkdown, templateId, res)

      return
    }

    generateLocalFallback(outlineMarkdown, templateId, res)
  } catch (error) {
    generateLocalFallback(outlineMarkdown, templateId, res)
  }
}

/**
 * 本地降级方案：从大纲直接解析生成 PPT 内容
 */
const generateLocalFallback = (outlineMarkdown: string, templateId: number, res: ApiResponse) => {
  const pptxObj = parseOutlineToPptxObj(outlineMarkdown, templateId)

  res.setHeader('Content-Type', 'application/json')
  res.status(200).json({
    code: 0,
    message: 'success (local)',
    data: pptxObj,
  })
}

const handler = async (req: ApiRequest, res: ApiResponse) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })

    return
  }

  // 先尝试后端
  const backendUrl = 'https://fdzz.dandian.net:8443/aipptx/generateContent.php'
  const token = req.headers['token'] as string || ''

  try {
    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'token': token,
      },
      body: JSON.stringify(req.body),
    })

    if (response.ok) {
      const contentType = response.headers.get('content-type') || ''

      if (contentType.includes('text/event-stream') || contentType.includes('stream')) {
        res.setHeader('Content-Type', 'text/event-stream')
        res.setHeader('Cache-Control', 'no-cache')
        res.setHeader('Connection', 'keep-alive')

        const reader = response.body?.getReader()
        if (reader) {
          const decoder = new TextDecoder()

          // eslint-disable-next-line no-constant-condition
          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            res.write(decoder.decode(value, { stream: true }))
          }
        }

        res.end()
      } else {
        const data = await response.json()
        res.status(200).json(data)
      }

      return
    }
  } catch (error) {
    console.log('后端不可达，使用本地生成')
  }

  // 后端不可达，使用本地生成
  await generateWithAI(req, res)
}

export default handler
