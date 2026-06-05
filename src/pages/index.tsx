// ** React Imports
import { useState, useEffect, ReactNode } from 'react';

import AiPPTX from 'src/views/AiPPTX/AiPPTX'
import Setting from 'src/views/AiPPTX/Setting'

import { Box, Button, IconButton, Typography, Chip } from '@mui/material';

import BlankLayout from 'src/@core/layouts/BlankLayout'

import { useSettings } from 'src/@core/hooks/useSettings'
import Icon from 'src/@core/components/icon'

/** 生成星星数据 - 随机分布的星空暗示知识的隐性分布 */
const generateStars = (count: number) => {
  const stars = []
  for (let i = 0; i < count; i++) {
    stars.push({
      id: i,
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      size: Math.random() * 2 + 1,
      duration: Math.random() * 4 + 2,
      delay: Math.random() * 4,
    })
  }

  return stars
}

const AiPPTXModel = () => {

  /** 页面模式状态：Landing为初始介绍页，AiToPPTX为功能页，Setting为设置页 */
  const [pageMode, setPageMode] = useState("Landing");

  /** 星星数据 - 仅在客户端生成以避免hydration不匹配 */
  const [stars, setStars] = useState<Array<{ id: number; left: string; top: string; size: number; duration: number; delay: number }>>([])

  /** 获取主题设置，用于日间/夜间切换 */
  const { settings, saveSettings } = useSettings()

  /** 客户端生成星星数据，避免SSR hydration问题 */
  useEffect(() => {
    setStars(generateStars(60))
  }, [])

  /** 打开外部链接 - 在新窗口中打开指定URL */
  const handleButtonClick = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  /** 切换日间/夜间模式 - 体现默会知识中"情境感知"的设计理念 */
  const handleModeToggle = () => {
    saveSettings({ ...settings, mode: settings.mode === 'light' ? 'dark' : 'light' })
  }

  /** 判断当前是否为暗色模式 */
  const isDark = settings.mode === 'dark'

  return (
    <Box sx={{ minHeight: '100vh', position: 'relative' }}>
      {/* 日间/夜间切换按钮 - 固定在右上角，随时可达 */}
      <IconButton
        onClick={handleModeToggle}
        sx={{
          position: 'fixed',
          top: 20,
          right: 20,
          zIndex: 9999,
          background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
          backdropFilter: 'blur(8px)',
          '&:hover': {
            background: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)',
          },
        }}
      >
        <Icon icon={isDark ? 'mdi:weather-sunny' : 'mdi:weather-night'} />
      </IconButton>

      {/* ============ 初始默认页面 - 项目介绍 ============ */}
      {pageMode === "Landing" && (
        <Box sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
          padding: '80px 24px',
          background: isDark
            ? 'linear-gradient(180deg, #000000 0%, #0a0a0a 50%, #111111 100%)'
            : 'linear-gradient(180deg, #f8f9fa 0%, #ffffff 50%, #f0f0f0 100%)',
        }}>
          {/* 星空背景 - 营造沉浸式氛围 */}
          {stars.map(star => (
            <Box
              key={star.id}
              sx={{
                position: 'absolute',
                background: isDark ? 'white' : '#333',
                borderRadius: '50%',
                left: star.left,
                top: star.top,
                width: star.size,
                height: star.size,
                opacity: 0.4,
                animation: `twinkle ${star.duration}s ease-in-out ${star.delay}s infinite`,
                '@keyframes twinkle': {
                  '0%, 100%': { opacity: 0.2 },
                  '50%': { opacity: 0.8 },
                },
              }}
            />
          ))}

          {/* Hero内容区 */}
          <Box sx={{ maxWidth: 800, position: 'relative', zIndex: 1, textAlign: 'center' }}>
            {/* 状态徽章 */}
            <Chip
              label="AI-Powered · 智能演示文稿"
              sx={{
                mb: 4,
                px: 2,
                py: 2.5,
                fontSize: '0.8rem',
                borderRadius: '100px',
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)',
              }}
            />

            {/* 主标题 - 渐变文字传达"从隐性到显性"的知识转化 */}
            <Typography
              sx={{
                fontSize: { xs: '2.5rem', md: '4.5rem' },
                fontWeight: 700,
                lineHeight: 1.1,
                letterSpacing: '-0.03em',
                mb: 3,
              }}
            >
              <Box component="span" sx={{ color: isDark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>
                用 AI 重新定义
              </Box>
              <br />
              <Box
                component="span"
                sx={{
                  background: isDark
                    ? 'linear-gradient(135deg, #e0e0e0, #888, #ccc)'
                    : 'linear-gradient(135deg, #333, #111, #555)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                演示文稿的创作方式
              </Box>
            </Typography>

            {/* 副标题 - Polanyi默会知识核心命题的视觉化表达 */}
            <Typography
              sx={{
                fontSize: '1.1rem',
                color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)',
                mb: 5,
                maxWidth: 500,
                mx: 'auto',
              }}
            >
              我们所知道的，远比我们能说出的多。让 AI 将你的默会知识转化为精美的演示文稿。
            </Typography>

            {/* 行动按钮组 */}
            <Box sx={{
              display: 'flex',
              gap: 2,
              justifyContent: 'center',
              flexWrap: 'wrap',
              mb: 6,
            }}>
              <Button
                onClick={() => setPageMode('AiToPPTX')}
                sx={{
                  padding: '12px 32px',
                  borderRadius: '100px',
                  fontSize: '1rem',
                  fontWeight: 600,
                  textTransform: 'none',
                  background: isDark
                    ? 'linear-gradient(135deg, #e0e0e0, #999)'
                    : 'linear-gradient(135deg, #333, #111)',
                  color: isDark ? '#000' : '#fff',
                  boxShadow: isDark
                    ? '0 4px 20px rgba(255,255,255,0.1)'
                    : '0 4px 20px rgba(0,0,0,0.15)',
                  '&:hover': {
                    background: isDark
                      ? 'linear-gradient(135deg, #f0f0f0, #bbb)'
                      : 'linear-gradient(135deg, #444, #222)',
                    transform: 'translateY(-2px)',
                  },
                  transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
                }}
              >
                开始创作
              </Button>
              <Button
                onClick={() => handleButtonClick('https://github.com/Chenwenwen1007')}
                sx={{
                  padding: '12px 32px',
                  borderRadius: '100px',
                  fontSize: '1rem',
                  fontWeight: 600,
                  textTransform: 'none',
                  border: `1px solid ${isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)'}`,
                  color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)',
                  '&:hover': {
                    background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                    border: `1px solid ${isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'}`,
                  },
                  transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
                }}
              >
                了解更多 →
              </Button>
            </Box>

            {/* 滚动提示 */}
            <Box sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 1,
            }}>
              <Box sx={{
                width: 1,
                height: 40,
                background: isDark
                  ? 'linear-gradient(to bottom, rgba(255,255,255,0.3), transparent)'
                  : 'linear-gradient(to bottom, rgba(0,0,0,0.2), transparent)',
                borderRadius: 1,
                animation: 'breathe 2s ease-in-out infinite',
                '@keyframes breathe': {
                  '0%, 100%': { opacity: 1 },
                  '50%': { opacity: 0.3 },
                },
              }} />
              <Typography variant="caption" sx={{ color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)' }}>
                向下滚动
              </Typography>
            </Box>
          </Box>

          {/* ============ 功能介绍区 ============ */}
          <Box sx={{
            maxWidth: 1000,
            width: '100%',
            mt: 10,
            position: 'relative',
            zIndex: 1,
          }}>
            <Box sx={{ textAlign: 'center', mb: 6 }}>
              <Chip
                label="核心能力"
                sx={{
                  mb: 2,
                  px: 2,
                  fontSize: '0.75rem',
                  borderRadius: '100px',
                  border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                  background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                  color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)',
                }}
              />
              <Typography variant="h4" sx={{ fontWeight: 700, color: isDark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>
                从灵感到演示，一气呵成
              </Typography>
            </Box>

            <Box sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
              gap: 3,
            }}>
              {[
                { icon: 'mdi:brain', title: 'AI 智能生成', desc: '基于大语言模型，输入主题即可自动生成结构化大纲与内容' },
                { icon: 'mdi:pencil-outline', title: '自由编辑', desc: '生成的内容支持二次修改，让创意在 AI 基础上持续迭代' },
                { icon: 'mdi:palette-outline', title: '模板选择', desc: '多种精美模板可供选择，一键切换演示风格' },
                { icon: 'mdi:file-export-outline', title: '多格式导出', desc: '支持导出 PPTX、PDF、PNG 等多种格式，满足不同场景需求' },
              ].map((feature, index) => (
                <Box
                  key={index}
                  sx={{
                    padding: '28px 24px',
                    borderRadius: '16px',
                    border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
                    background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                    transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
                    cursor: 'default',
                    '&:hover': {
                      background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                      transform: 'translateY(-4px)',
                      boxShadow: isDark ? '0 8px 32px rgba(0,0,0,0.4)' : '0 8px 32px rgba(0,0,0,0.08)',
                    },
                  }}
                >
                  <Box sx={{ fontSize: '2rem', mb: 2, color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)' }}>
                    <Icon icon={feature.icon} />
                  </Box>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 1, color: isDark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>
                    {feature.title}
                  </Typography>
                  <Typography variant="body2" sx={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }}>
                    {feature.desc}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>

          {/* ============ 数据统计区 ============ */}
          <Box sx={{
            maxWidth: 900,
            width: '100%',
            mt: 10,
            position: 'relative',
            zIndex: 1,
          }}>
            <Box sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr 1fr', md: '1fr 1fr 1fr 1fr' },
              gap: 4,
              textAlign: 'center',
            }}>
              {[
                { number: '4+', label: '精美模板' },
                { number: '3+', label: '导出格式' },
                { number: 'AI', label: '智能驱动' },
                { number: '∞', label: '创作可能' },
              ].map((stat, index) => (
                <Box key={index}>
                  <Typography sx={{
                    fontSize: '2.5rem',
                    fontWeight: 700,
                    background: isDark ? 'linear-gradient(135deg, #e0e0e0, #999)' : 'linear-gradient(135deg, #333, #111)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}>
                    {stat.number}
                  </Typography>
                  <Typography variant="body2" sx={{ color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }}>
                    {stat.label}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>

          {/* ============ 底部行动召唤 ============ */}
          <Box sx={{
            maxWidth: 600,
            width: '100%',
            mt: 10,
            position: 'relative',
            zIndex: 1,
            textAlign: 'center',
          }}>
            <Typography variant="h5" sx={{ fontWeight: 600, mb: 2, color: isDark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.9)' }}>
              准备好开始了吗？
            </Typography>
            <Typography variant="body1" sx={{ mb: 4, color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }}>
              让 AI 成为你的演示文稿助手，将默会知识转化为可见的力量
            </Typography>
            <Button
              onClick={() => setPageMode('AiToPPTX')}
              sx={{
                px: 6,
                py: 1.5,
                borderRadius: '100px',
                fontSize: '1rem',
                fontWeight: 600,
                textTransform: 'none',
                background: isDark ? 'linear-gradient(135deg, #e0e0e0, #999)' : 'linear-gradient(135deg, #333, #111)',
                color: isDark ? '#000' : '#fff',
                boxShadow: isDark ? '0 4px 20px rgba(255,255,255,0.1)' : '0 4px 20px rgba(0,0,0,0.15)',
                '&:hover': {
                  background: isDark ? 'linear-gradient(135deg, #f0f0f0, #bbb)' : 'linear-gradient(135deg, #444, #222)',
                  transform: 'translateY(-2px)',
                },
                transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
              }}
            >
              立即开始
            </Button>
          </Box>

          {/* 页脚 */}
          <Box sx={{
            maxWidth: 800,
            width: '100%',
            mt: 10,
            pt: 4,
            borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
            position: 'relative',
            zIndex: 1,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 2,
          }}>
            <Typography variant="body2" sx={{ color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)' }}>
              Ai-Creat-PPTX · 让知识可见
            </Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Typography
                variant="body2"
                sx={{
                  color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)',
                  cursor: 'pointer',
                  '&:hover': { color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)' },
                }}
                onClick={() => handleButtonClick('https://github.com/Chenwenwen1007')}
              >
                GitHub
              </Typography>
            </Box>
          </Box>
        </Box>
      )}

      {/* ============ 功能页面 ============ */}
      {pageMode === "AiToPPTX" && <AiPPTX />}
      {pageMode === "Setting" && <Setting />}

      {/* 底部导航栏 - 仅在功能页面显示 */}
      {pageMode !== "Landing" && (
        <Box
          sx={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: 'background.paper',
            padding: 2,
            display: 'flex',
            justifyContent: 'center',
            gap: 2,
            boxShadow: 3,
            zIndex: 1000,
          }}
        >
          <Button
            size={'small'}
            variant="outlined"
            onClick={() => setPageMode('Landing')}
          >
            首页
          </Button>
          <Button
            size={'small'}
            variant={pageMode === "AiToPPTX" ? "contained" : "outlined"}
            onClick={() => setPageMode('AiToPPTX')}
          >
            Go to Creat
          </Button>
          <Button
            size={'small'}
            variant="outlined"
            onClick={() => handleButtonClick('https://github.com/Chenwenwen1007')}
          >
            Git Hub 地址
          </Button>
          <Button
            size={'small'}
            variant={pageMode === "Setting" ? "contained" : "outlined"}
            onClick={() => setPageMode('Setting')}
          >
            参数设置
          </Button>
        </Box>
      )}
    </Box>
  )
}

AiPPTXModel.getLayout = (page: ReactNode) => <BlankLayout>{page}</BlankLayout>

AiPPTXModel.guestGuard = true

export default AiPPTXModel
