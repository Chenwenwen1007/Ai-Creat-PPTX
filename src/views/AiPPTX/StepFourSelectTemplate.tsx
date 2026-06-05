import { useState, useEffect } from 'react'
import { BackendApi } from './Config'
import { getRequestToken, getCustomApiHeaders } from './LocalConfig'

import Button from '@mui/material/Button'
import Grid from '@mui/material/Grid'
import Box from '@mui/material/Box'

import { PlayCircleFilled } from "@mui/icons-material";
import { ArrowBack } from '@mui/icons-material';

const StepFourSelectTemplate = ({activeStep, setActiveStep, inputData, setInputData, token: propToken}: any) => {

    const [templateId, setTemplateId] = useState('')
    const [templates, setTemplates] = useState([] as any)

    // 获取实际使用的 token：优先使用本地配置中的 token
    const effectiveToken = getRequestToken() || propToken || ''

    // 获取自定义 API 配置（从本地存储）
    const customApiHeaders = getCustomApiHeaders()

    console.log("inputDatainputData0001", inputData, activeStep)

    const loadTemplates = async () => {
        try {
            // 先尝试从后端获取模板
            const url = BackendApi + 'randomTemplates.php'
            const resp = await (await fetch(url, {
                method: 'POST',
                headers: {
                    'token': effectiveToken,
                    'Content-Type': 'application/json',
                    ...customApiHeaders
                },
                body: JSON.stringify({ page: 1, size: 28, filters: { type: 1 } })
            })).json()
            if (resp.code != 0) {
                throw new Error(resp.message || '后端返回错误')
            }
            setTemplates(resp.data || [])
            if (resp.data && resp.data.length > 0) {
                selectTemplate(resp.data[0])
            }
        } catch (error: any) {
            // 后端不可达，使用本地代理获取内置模板
            console.log('后端模板服务不可达，尝试本地代理:', error.message)
            try {
                const localUrl = '/api/randomTemplates'
                const resp = await (await fetch(localUrl, {
                    method: 'POST',
                    headers: {
                        'token': effectiveToken,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ page: 1, size: 28, filters: { type: 1 } })
                })).json()
                if (resp.code === 0) {
                    setTemplates(resp.data || [])
                    if (resp.data && resp.data.length > 0) {
                        selectTemplate(resp.data[0])
                    }
                }
            } catch (localError: any) {
                console.error('本地代理也失败:', localError.message)
                alert('获取模板失败，请检查网络连接')
            }
        }
    }

    const selectTemplate = (template: any) => {
        setInputData((prevState: any) => ({...prevState, templateId: template.id, templateSubject: template.subject}))
        setTemplateId(template.id)
    }

    useEffect(() => {
        loadTemplates()
    }, [])

    // 当模板列表加载完成后，如果有已保存的模板ID，选中它
    useEffect(() => {
        if (templates.length > 0 && inputData.templateId) {
            const savedTemplate = templates.find((t: any) => t.id == inputData.templateId)
            if (savedTemplate) {
                setTemplateId(savedTemplate.id)
            }
        }
    }, [templates, inputData.templateId])

    return (
      <>
        <Grid container justifyContent="center" sx={{ marginBottom: 2 }}>
          <Grid item>
            <Button
              variant="outlined"
              onClick={() => setActiveStep((prevActiveStep: number) => prevActiveStep - 1)}
              startIcon={<ArrowBack />}
              sx={{mx: 1}}
            >
              上一步
            </Button>
            <Button
              variant="contained"
              onClick={() => setActiveStep((prevActiveStep: number) => prevActiveStep + 1)}
              startIcon={<PlayCircleFilled />}
              sx={{mx: 1}}
            >
              下一步：生成PPTX
            </Button>
          </Grid>
        </Grid>

        <Grid container sx={{ mb: 2, px: 4 }}>
          {templates.map((template: any) => (
            <Grid
              item
              xs={12}
              sm={4}
              md={4}
              lg={3}
              key={template.id}
              onClick={() => selectTemplate(template)}
            >
              <Grid item sx={{
                m: 1,
                cursor: 'pointer', // 鼠标悬停时显示手型
                border: template.id === templateId ? '2px solid #1976d2' : '1px solid #ddd', // 选中时边框颜色
                borderRadius: '8px', // 圆角
                overflow: 'hidden', // 防止图片溢出
              }}>
                <img
                  src={`/api/templatePreview?name=${template.subject}`}
                  alt={template.subject}
                  style={{ width: '100%', height: 'auto', minHeight: '120px', background: '#f0f0f0' }}
                  onError={(e: any) => {
                    // 本地预览失败时，尝试后端图片
                    if (!e.target.src.includes('dandian.net')) {
                      e.target.src = `${BackendApi}json/${template.subject}.png`
                    }
                  }}
                />
              </Grid>
            </Grid>
          ))}
          {templates.length === 0 && (
            <Grid container justifyContent="center" alignItems="center">
              <Grid item xs={12}>
                <Box display="flex" justifyContent="center" alignItems="center" sx={{mt: 2}}>
                  <div>模板加载中...</div>
                </Box>
              </Grid>
            </Grid>
          )}
        </Grid>
      </>
    )
}

export default StepFourSelectTemplate
