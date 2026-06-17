/**
 * Step 3: 设计规范确认界面
 * 展示 Strategist 生成的设计规范，允许用户确认或修改
 */

import { useState, useEffect } from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import Grid from '@mui/material/Grid'
import Chip from '@mui/material/Chip'
import Alert from '@mui/material/Alert'
import LinearProgress from '@mui/material/LinearProgress'
import TextField from '@mui/material/TextField'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Divider from '@mui/material/Divider'
import {
  Palette,
  TextFormat,
  Style,
  Image,
  CheckCircle,
  ArrowBack,
  ArrowForward,
  AutoFixHigh
} from '@mui/icons-material'

import { generateDesignSpec, lockDesignSpec } from 'src/api/pythonApi'


const StepThreeConfirmDesign = ({ activeStep, setActiveStep, inputData, setInputData }: any) => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [designSpec, setDesignSpec] = useState('')
  const [analysis, setAnalysis] = useState<any>(null)
  const [isConfirmed, setIsConfirmed] = useState(false)

  // 可编辑的设计参数
  const [editableSpec, setEditableSpec] = useState({
    pages: 12,
    tone: '专业严谨',
    layoutStyle: '标准',
    imageStyle: '图标',
    primaryColor: '#0B3D91',
    headingFont: 'Microsoft YaHei'
  })

  /**
   * 组件加载时自动生成设计规范
   */
  useEffect(() => {
    if (inputData.outlineContent && !designSpec) {
      generateLocalSpec()
    }
  }, [inputData.outlineContent])

  /**
   * 调用后端生成设计规范（本地分析模式）
   */
  const generateLocalSpec = async () => {
    setLoading(true)
    setError('')

    try {
      const result = await generateDesignSpec({
        outline: inputData.outlineContent || '',
        source: inputData.inputText || '',
        apiUrl: '',
        apiKey: '',
        model: '',
        projectId: `ppt_${Date.now()}`
      })

      if (result.success && result.design_spec) {
        setDesignSpec(result.design_spec)
        setAnalysis(result.analysis)

        // 解析设计规范中的关键参数到可编辑状态
        if (result.analysis) {
          setEditableSpec(prev => ({
            ...prev,
            pages: result.analysis.estimated_pages || 12,
            tone: result.analysis.tone || '专业严谨',
            layoutStyle: result.analysis.layout_style || '标准'
          }))
        }
      } else {
        setError('设计规范生成失败')
      }
    } catch (err: any) {
      setError(err.message || '生成失败，请检查后端服务')
    } finally {
      setLoading(false)
    }
  }

  /**
   * 确认设计规范并锁定
   */
  const handleConfirm = async () => {
    setLoading(true)
    try {
      // 锁定设计规范
      const projectId = `ppt_${Date.now()}`
      await lockDesignSpec(designSpec, projectId)

      // 保存到全局状态
      setInputData((prev: any) => ({
        ...prev,
        designSpec: designSpec,
        designParams: editableSpec,
        projectId: projectId
      }))

      setIsConfirmed(true)
      setActiveStep((prev: number) => prev + 1)
    } catch (err: any) {
      setError(err.message || '锁定失败')
    } finally {
      setLoading(false)
    }
  }

  /**
   * 返回上一步
   */
  const handleBack = () => {
    setActiveStep((prev: number) => prev - 1)
  }

  /**
   * 解析 designSpec 中的 YAML frontmatter
   */
  const parseYamlFrontmatter = (spec: string) => {
    const lines = spec.split('\n')
    const yamlData: any = {}
    let inYaml = false
    let currentKey = ''

    for (const line of lines) {
      if (line.trim() === '---') {
        inYaml = !inYaml
        continue
      }
      if (!inYaml) continue

      // 简单解析 key: value
      const match = line.match(/^(\w+):\s*(.*)/)
      if (match) {
        currentKey = match[1]
        yamlData[currentKey] = match[2].replace(/^"|"$/g, '')
      }
    }

    return yamlData
  }

  const yamlData = designSpec ? parseYamlFrontmatter(designSpec) : {}

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto' }}>
      <Typography variant="h5" sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
        <AutoFixHigh color="primary" />
        设计规范确认
      </Typography>

      {loading && !designSpec && (
        <Box sx={{ mb: 3 }}>
          <Alert severity="info" sx={{ mb: 1 }}>
            AI 策略师正在分析内容并生成设计规范...
          </Alert>
          <LinearProgress />
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* 内容分析结果 */}
      {analysis && (
        <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Style color="primary" />
            内容分析
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={6} md={3}>
              <Typography variant="caption" color="text.secondary">领域</Typography>
              <Typography variant="body1" fontWeight="medium">{analysis.domain}</Typography>
            </Grid>
            <Grid item xs={6} md={3}>
              <Typography variant="caption" color="text.secondary">目标受众</Typography>
              <Typography variant="body1" fontWeight="medium">{analysis.audience}</Typography>
            </Grid>
            <Grid item xs={6} md={3}>
              <Typography variant="caption" color="text.secondary">语气风格</Typography>
              <Typography variant="body1" fontWeight="medium">{analysis.tone}</Typography>
            </Grid>
            <Grid item xs={6} md={3}>
              <Typography variant="caption" color="text.secondary">预估页数</Typography>
              <Typography variant="body1" fontWeight="medium">{analysis.estimated_pages} 页</Typography>
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* 设计方案卡片 */}
      {yamlData.title && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          {/* 色彩方案 */}
          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle1" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Palette fontSize="small" />
                  色彩方案
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Box sx={{ width: 40, height: 40, borderRadius: '50%', bgcolor: yamlData.primary_color || yamlData.color_scheme?.primary || editableSpec.primaryColor, mx: 'auto', mb: 0.5 }} />
                    <Typography variant="caption">主色</Typography>
                  </Box>
                  <Box sx={{ textAlign: 'center' }}>
                    <Box sx={{ width: 40, height: 40, borderRadius: '50%', bgcolor: yamlData.secondary_color || yamlData.color_scheme?.secondary || '#1565C0', mx: 'auto', mb: 0.5 }} />
                    <Typography variant="caption">辅助</Typography>
                  </Box>
                  <Box sx={{ textAlign: 'center' }}>
                    <Box sx={{ width: 40, height: 40, borderRadius: '50%', bgcolor: yamlData.accent_color || yamlData.color_scheme?.accent || '#64B5F6', mx: 'auto', mb: 0.5 }} />
                    <Typography variant="caption">强调</Typography>
                  </Box>
                  <Box sx={{ textAlign: 'center' }}>
                    <Box sx={{ width: 40, height: 40, borderRadius: '50%', bgcolor: yamlData.background_color || yamlData.color_scheme?.background || '#E3F2FD', mx: 'auto', mb: 0.5, border: '1px solid #ddd' }} />
                    <Typography variant="caption">背景</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* 字体与布局 */}
          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle1" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <TextFormat fontSize="small" />
                  字体与布局
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">标题字体</Typography>
                    <Typography variant="body2">{yamlData.font_family?.heading || editableSpec.headingFont}</Typography>
                  </Box>
                  <Divider />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">正文字体</Typography>
                    <Typography variant="body2">{yamlData.font_family?.body || editableSpec.headingFont}</Typography>
                  </Box>
                  <Divider />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">布局风格</Typography>
                    <Chip label={yamlData.layout_style || editableSpec.layoutStyle} size="small" />
                  </Box>
                  <Divider />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">图片风格</Typography>
                    <Chip label={yamlData.image_style || editableSpec.imageStyle} size="small" />
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* 可编辑参数 */}
      {designSpec && (
        <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            调整参数（可选）
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                size="small"
                label="页数"
                type="number"
                value={editableSpec.pages}
                onChange={(e) => setEditableSpec({ ...editableSpec, pages: parseInt(e.target.value) || 10 })}
                inputProps={{ min: 3, max: 50 }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                size="small"
                label="语气风格"
                value={editableSpec.tone}
                onChange={(e) => setEditableSpec({ ...editableSpec, tone: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                size="small"
                label="布局风格"
                value={editableSpec.layoutStyle}
                onChange={(e) => setEditableSpec({ ...editableSpec, layoutStyle: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                size="small"
                label="图片风格"
                value={editableSpec.imageStyle}
                onChange={(e) => setEditableSpec({ ...editableSpec, imageStyle: e.target.value })}
              />
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* 设计规范原文预览 */}
      {designSpec && (
        <Paper variant="outlined" sx={{ p: 2, mb: 3, maxHeight: 300, overflow: 'auto' }}>
          <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>
            设计规范原文：
          </Typography>
          <Typography variant="body2" component="pre" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'monospace', fontSize: '0.8rem' }}>
            {designSpec}
          </Typography>
        </Paper>
      )}

      {/* 操作按钮 */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
        <Button
          variant="outlined"
          onClick={handleBack}
          startIcon={<ArrowBack />}
        >
          返回编辑大纲
        </Button>

        {designSpec ? (
          <Button
            variant="contained"
            color="primary"
            onClick={handleConfirm}
            disabled={loading}
            startIcon={<CheckCircle />}
          >
            {loading ? '正在锁定...' : '确认设计规范'}
          </Button>
        ) : (
          <Button
            variant="contained"
            onClick={generateLocalSpec}
            disabled={loading}
            startIcon={<AutoFixHigh />}
          >
            重新生成规范
          </Button>
        )}
      </Box>
    </Box>
  )
}

export default StepThreeConfirmDesign
