import { useState, useRef, createRef, useEffect } from 'react'
import pako from 'pako'
import base64js from 'base64-js'
import { SSE } from 'src/functions/AiPPTX/sse'
import { Ppt2Svg } from 'src/functions/AiPPTX/ppt2svg'
import { Ppt2Canvas } from 'src/functions/AiPPTX/ppt2canvas'
import { BackendApi } from './Config'
import { getRequestToken, getCustomApiHeaders, getLocalConfig } from './LocalConfig'
import { exportPptx as exportPythonPptx } from 'src/api/pythonApi'

import Button from '@mui/material/Button'
import Box from '@mui/material/Grid'
import Typography from '@mui/material/Grid'
import Grid from '@mui/material/Grid'

import { Download, SwapHoriz, ChangeCircle, Image, Description, PictureAsPdf, InsertDriveFile } from '@mui/icons-material'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'

let pptxObj = null as any
let painter = null as any
const canvasList = [] as any

const resetSize = () => {
    const width = Math.max(Math.min(document.body.clientWidth - 560, 1100), 480)
    painter.resetSize(width, width * 0.5625)
}

const StepFiveGeneratePpt = ({setActiveStep, inputData, setInputData, token: propToken}: any) => {

  // 获取实际使用的 token：优先使用本地配置中的 token
  const effectiveToken = getRequestToken() || propToken || ''

  // 获取自定义 API 配置（从本地存储）
  const customApiHeaders = getCustomApiHeaders()

  const [generatePptxStatus, setGeneratePptxStatus] = useState(false)
  const [descTime, setDescTime] = useState(0)
  const [descMsg, setDescMsg] = useState('正在生成中，请稍后...')
  const svg = useRef(null)
  const [pages, setPages] = useState([] as any)
  const [currentIdx, setCurrentIdx] = useState(0)
  const [downloadMenuAnchor, setDownloadMenuAnchor] = useState<null | HTMLElement>(null)

  /**
   * 更换模板：使用当前大纲重新生成PPT（应用新模板）
   */
  const changePptxTemplate = (templateId: string) => {
    pptxObj = null
    setCurrentIdx(0)
    setPages([])
    // 清除已缓存的pptxContent，强制重新生成
    setInputData((prevState: any) => ({...prevState, pptxContent: null}))
    generateNewPptx(templateId, inputData.outlineContent, inputData.dataUrl)
  }

  /**
   * 重新生成：使用当前模板生成一个不同的PPT（通过微调大纲内容实现变化）
   */
  const regeneratePptx = () => {
    pptxObj = null
    setCurrentIdx(0)
    setPages([])
    setInputData((prevState: any) => ({...prevState, pptxContent: null}))
    // 在大纲中添加随机变化标记，使生成内容有所不同
    const variedOutline = inputData.outlineContent + '\n<!-- regenerate: ' + Date.now() + ' -->'
    generateNewPptx(inputData.templateId, variedOutline, inputData.dataUrl)
  }

  /**
   * 从头开始：回到第一步
   */
  const generatePptxFromBeginning = () => {
    pptxObj = null
    setCurrentIdx(0)
    setActiveStep(0)
    setInputData({selectedOption: "inputTopic", inputText: "", importOption: "inputText", moreOption:{language:"zh-CN", moreRequirement:"", outlineLength:"regular" }, outlineContent: '', outlineHtml: '', templateId: 0, pptxContent: null, dataUrl: ''})
  }

  const generateNewPptx = (templateId: string, outlineContent: string, dataUrl: string) => {
      const timer = setInterval(() => {
          setDescTime(descTime => descTime + 1)
      }, 1000)
      setGeneratePptxStatus(true)

      // 判断是否使用本地代理（有本地配置且后端可能不可达时）
      const localConfig = getLocalConfig()
      const useLocalProxy = !!localConfig && localConfig.apiToken

      // 先尝试后端，失败后使用本地代理
      const tryBackend = () => {
          const url = BackendApi + 'generateContent.php'
          const source = new SSE(url, {
              method: 'POST',
              headers: {
                  'token': effectiveToken,
                  'Cache-Control': 'no-cache',
                  'Content-Type': 'application/json',
                  ...customApiHeaders
              },
              payload: JSON.stringify({ asyncGenPptx: true, templateId, outlineMarkdown: outlineContent, dataUrl }),
          }) as any
          source.onmessage = function (data: any) {
              const json = JSON.parse(data.data)
              if (json.pptId) {
                  setDescMsg(`正在生成中，进度 ${json.current}/${json.total}，请稍后...`)
                  asyncGenPptxInfo(json.pptId, templateId)
              }
          }
          source.onend = function (data: any) {
              if (data.data.startsWith('{') && data.data.endsWith('}')) {
                  const json = JSON.parse(data.data)
                  if (json.code != 0) {
                      alert('生成PPT异常：' + json.message)

                      return
                  }
                  else {
                    console.log("json.data", json.data)
                    setInputData((prevState: any) => ({...prevState, pptxContent: json.data}))
                  }
              }
              clearInterval(timer)
              setGeneratePptxStatus(false)
              setDescMsg('正在生成中，请稍后...')
              setTimeout(() => {
                  drawPptxList(0, false)
              }, 200)
          }
          source.onerror = function (err: any) {
              clearInterval(timer)
              console.error('后端生成内容异常，尝试本地代理', err)

              // 后端失败，尝试本地代理
              if (useLocalProxy) {
                  generateWithLocalProxy()
              } else {
                  alert('生成内容异常：无法连接到后端服务。请在参数设置中配置 AI API Key 后重试。')
                  setGeneratePptxStatus(false)
              }
          }
          source.stream()
      }

      // 使用本地代理生成 PPT 内容
      const generateWithLocalProxy = async () => {
          try {
              const localUrl = '/api/generateContent'
              const headers: Record<string, string> = {
                  'Content-Type': 'application/json',
                  'token': effectiveToken,
              }

              if (localConfig) {
                  if (localConfig.apiUrl) headers['x-custom-api-url'] = localConfig.apiUrl
                  if (localConfig.apiModel) headers['x-custom-api-model'] = localConfig.apiModel
                  if (localConfig.apiToken) headers['x-custom-api-token'] = localConfig.apiToken
              }

              const response = await fetch(localUrl, {
                  method: 'POST',
                  headers,
                  body: JSON.stringify({ templateId, outlineMarkdown: outlineContent, dataUrl }),
              })

              const resp = await response.json()

              if (resp.code === 0 && resp.data) {
                  // 本地生成成功，直接使用返回的 pptxObj
                  pptxObj = resp.data
                  console.log('本地生成 pptxObj:', pptxObj)

                  setInputData((prevState: any) => ({...prevState, pptxContent: pptxObj}))
                  clearInterval(timer)
                  setGeneratePptxStatus(false)
                  setDescMsg('正在生成中，请稍后...')
                  setTimeout(() => {
                      drawPptxList(0, false)
                  }, 200)
              } else {
                  throw new Error(resp.message || '本地生成失败')
              }
          } catch (error: any) {
              clearInterval(timer)
              console.error('本地代理生成内容异常:', error)
              alert('生成内容异常：' + (error.message || '未知错误'))
              setGeneratePptxStatus(false)
          }
      }

      // 如果有本地配置，直接使用本地代理（后端大概率不可达）
      if (useLocalProxy) {
          generateWithLocalProxy()
      } else {
          tryBackend()
      }
  }

  const asyncGenPptxInfo = (id: string, templateId: string) => {
      setInputData((prevState: any) => ({...prevState, pptxId: id}))
      const currentId = pptxObj && pptxObj.pages ? pptxObj.pages.length : 0
      const url = `${BackendApi}asyncPptInfo.php?currentId=${currentId}&pptId=${id}&templateId=${templateId}`
      const xhr = new XMLHttpRequest()
      xhr.open('GET', url, true)
      xhr.setRequestHeader('token', effectiveToken)
      Object.entries(customApiHeaders).forEach(([key, value]) => {
          xhr.setRequestHeader(key, value)
      })
      xhr.send()
      xhr.onload = function () {
          if (this.status === 200) {
            try {
              const resp = JSON.parse(this.responseText)
              const gzipBase64 = resp.data.pptxProperty
              const gzip = base64js.toByteArray(gzipBase64)
              const json = pako.ungzip(gzip, { to: 'string' })
              const _pptxObj = JSON.parse(json)
              if (pptxObj && pptxObj.pages && _pptxObj && _pptxObj.pages) {
                  Object.entries(_pptxObj.pages).forEach(([key, value]) => {
                      const index = Number(key);
                      if (!pptxObj.pages[index]) {
                          pptxObj.pages[index] = value;
                      }
                  });
              }
              else {
                  pptxObj = _pptxObj
              }
              console.log("pptxObj.pages", pptxObj.pages)
              if(resp.data.current == resp.data.total)  {
                drawPptxList(0, false)
              }
              else {
                drawPptxList(resp.data.current - 1, true)
              }
              console.log("json.data _pptxObj", _pptxObj)
              setInputData((prevState: any) => ({...prevState, pptxContent: _pptxObj}))

            }
            catch(e: any) {
              console.log("asyncGenPptxInfo JSON.parse(this.responseText) Failed:", e);
            }
          }
      }
      xhr.onerror = function (e) {
          console.error(e)
      }
  }

  const drawPptxList = (_idx?: number, asyncGen?: boolean) => {
      const idx = _idx || 0
      setCurrentIdx(idx)
      if (_idx == null || asyncGen) {
          const _pages = [] as any
          for (let i = 0; i < pptxObj.pages.length; i++) {
              if (asyncGen && i > idx) {
                  break
              }
              _pages.push(pptxObj.pages[i])
          }
          setPages(_pages)
          drawPptx(idx)
      }
      else {
        if(pptxObj && pptxObj.pages)  {
          setPages(pptxObj.pages)
          drawPptx(0)
        }
        else {
          setPages([])
        }
      }
  }

  const drawPptx = (idx: number) => {
      setCurrentIdx(idx)

      //console.log("pptxObj", pptxObj, idx)
      painter.drawPptx(pptxObj, idx)
  }

  /**
   * 下载 PPT：优先使用后端下载，后端不可达时导出为图片
   */
  const downloadPptx = async () => {
      // 如果有后端 pptxId，先尝试后端下载
      if (inputData.pptxId) {
          const url = BackendApi + 'downloadPptx.php'
          const xhr = new XMLHttpRequest()
          xhr.open('POST', url, true)
          xhr.setRequestHeader('token', effectiveToken)
          xhr.setRequestHeader('Content-Type', 'application/json')
          Object.entries(customApiHeaders).forEach(([key, value]) => {
              xhr.setRequestHeader(key, value)
          })
          xhr.send(JSON.stringify({ id: inputData.pptxId }))
          xhr.onload = function () {
              if (this.status === 200) {
                  try {
                      const resp = JSON.parse(this.responseText)
                      if (resp.data && resp.data.fileUrl) {
                          const fileUrl = BackendApi + resp.data.fileUrl
                          const a = document.createElement('a')
                          a.href = fileUrl
                          a.download = (resp.data.subject || 'download') + '.pptx'
                          a.click()

                          return
                      }
                  } catch (e) {
                      console.log('后端下载失败，使用本地导出')
                  }
              }
              // 后端失败，使用本地导出
              exportLocalPptx()
          }
          xhr.onerror = function () {
              exportLocalPptx()
          }
      } else {
          // 本地生成的 PPT，直接导出
          exportLocalPptx()
      }
  }

  /**
   * 本地导出 PPT 为图片 ZIP
   */
  const exportAsImageZip = async () => {
      if (!pptxObj || !pptxObj.pages) {
          alert('没有可下载的内容')

          return
      }
      setDescMsg('正在导出图片...')
      setGeneratePptxStatus(true)
      try {
          const exportCanvas = document.createElement('canvas')
          const _ppt2Canvas = new Ppt2Canvas(exportCanvas)
          await _ppt2Canvas.downloadAsImages(pptxObj, inputData.subject || 'pptx')
      } catch (e) {
          console.error('导出失败', e)
          alert('导出失败，请重试')
      }
      setGeneratePptxStatus(false)
      setDescMsg('正在生成中，请稍后...')
  }

  /**
   * 导出为 DOCX 文档（使用 HTML 转 Word 方案）
   */
  const exportAsDocx = () => {
      if (!pptxObj || !pptxObj.pages) {
          alert('没有可下载的内容')

          return
      }
      try {
          // 构建 HTML 内容
          let html = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8">
<title>${inputData.subject || 'PPT'}</title>
<style>
body { font-family: 'Microsoft YaHei', 'SimSun', sans-serif; line-height: 1.8; }
h1 { font-size: 24pt; color: #333; text-align: center; margin: 30px 0; }
h2 { font-size: 18pt; color: #444; margin: 25px 0 15px; border-bottom: 2px solid #ddd; padding-bottom: 8px; }
h3 { font-size: 14pt; color: #555; margin: 20px 0 10px; }
p { font-size: 12pt; color: #666; margin: 8px 0; text-indent: 2em; }
.page-break { page-break-before: always; }
.cover { text-align: center; padding: 100px 0; }
.cover h1 { font-size: 32pt; margin-top: 150px; }
</style>
</head>
<body>`

          pptxObj.pages.forEach((page: any, idx: number) => {
              if (idx > 0) html += '<div class="page-break"></div>'
              page.children.forEach((child: any) => {
                  if (child.type === 'text' && child.children) {
                      child.children.forEach((p: any) => {
                          if (p.children && p.children.length > 0) {
                              const text = p.children.map((r: any) => r.text || '').join('')
                              if (!text.trim()) return
                              const prop = child.extInfo?.property || {}
                              const fontSize = p.children[0]?.extInfo?.property?.fontSize || 16
                              if (fontSize >= 32) {
                                  html += `<h1>${text}</h1>`
                              } else if (fontSize >= 24) {
                                  html += `<h2>${text}</h2>`
                              } else if (fontSize >= 18) {
                                  html += `<h3>${text}</h3>`
                              } else {
                                  html += `<p>${text.replace(/\n/g, '</p><p>')}</p>`
                              }
                          }
                      })
                  }
              })
          })

          html += '</body></html>'

          const blob = new Blob(['\ufeff', html], { type: 'application/msword' })
          const link = document.createElement('a')
          link.href = URL.createObjectURL(blob)
          link.download = `${inputData.subject || 'pptx'}.doc`
          link.click()
      } catch (e) {
          console.error('导出 DOCX 失败', e)
          alert('导出失败，请重试')
      }
  }

  /**
   * 导出为真正的 PPTX 文件
   * 优先调用 Python 后端生成原生 PPTX
   */
  const exportAsPptx = async () => {
      // 如果有 Python 后端 projectId，调用后端生成真正的 PPTX
      if (inputData.projectId) {
          setDescMsg('正在导出 PPTX...')
          setGeneratePptxStatus(true)
          try {
              const blob = await exportPythonPptx(inputData.projectId)
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = `${inputData.subject || 'presentation'}.pptx`
              document.body.appendChild(a)
              a.click()
              document.body.removeChild(a)
              URL.revokeObjectURL(url)
          } catch (error: any) {
              console.error('PPTX 导出失败', error)
              alert('PPTX 导出失败: ' + (error.message || '请检查后端服务是否运行'))
          } finally {
              setGeneratePptxStatus(false)
              setDescMsg('正在生成中，请稍后...')
          }
          return
      }

      // 如果没有 projectId，回退到图片 ZIP 导出
      alert('PPTX 导出需要完整的后端工作流。请先通过设计规范步骤生成 PPT，或导出为图片 ZIP。')
      await exportAsImageZip()
  }

  /**
   * 处理下载菜单选择
   */
  const handleDownload = (format: string) => {
      setDownloadMenuAnchor(null)
      switch (format) {
          case 'zip':
              exportAsImageZip()
              break
          case 'docx':
              exportAsDocx()
              break
          case 'pptx':
              exportAsPptx()
              break
          default:
              exportAsImageZip()
      }
  }

  const loadById = (id: string) => {
      setGeneratePptxStatus(false)
      setInputData((prevState: any) => ({...prevState, pptxId: id}))
      const url = BackendApi + 'loadPptx?id=' + id
      const xhr = new XMLHttpRequest()
      xhr.open('GET', url, true)
      xhr.setRequestHeader('token', effectiveToken)
      Object.entries(customApiHeaders).forEach(([key, value]) => {
          xhr.setRequestHeader(key, value)
      })
      xhr.send()
      xhr.onload = function () {
          if (this.status === 200) {
              const resp = JSON.parse(this.responseText)
              if (resp.code != 0) {
                  alert(resp.message)

                  return
              }
              const pptInfo = resp.data.pptInfo
              const gzipBase64 = pptInfo.pptxProperty
              const gzip = base64js.toByteArray(gzipBase64)
              const json = pako.ungzip(gzip, { to: 'string' })
              pptInfo.pptxProperty = JSON.parse(json)
              pptxObj = pptInfo.pptxProperty
              drawPptxList()
          }
      }
      xhr.onerror = function (e) {
          console.error(e)
      }
  }

  useEffect(() => {
      if (generatePptxStatus && currentIdx > 0) {
          if(canvasList[currentIdx - 1] && canvasList[currentIdx - 1].current)  {
              canvasList[currentIdx - 1].current.scrollIntoView(true)
          }
      } else if (canvasList.length > 0 && currentIdx == 0 && canvasList[0].current) {
          canvasList[0].current.scrollIntoView(true)
      }
      if (canvasList.length > 0) {
          for (let i = 0; i < pages.length; i++) {
              const imgCanvas = canvasList[i].current
              if (!imgCanvas) {
                  continue
              }
              try {
                  const _ppt2Canvas = new Ppt2Canvas(imgCanvas)
                  if(pptxObj && pptxObj.pages)   {
                      _ppt2Canvas.drawPptx(pptxObj, i)
                  }
              } catch(e) {
                  console.log('渲染第' + (i + 1) + '页封面异常', e)
              }
          }
      }
  }, [generatePptxStatus, pages])

  useEffect(() => {
      // svg
      painter = new Ppt2Svg(svg.current)
      painter.setMode('edit')

      let mTimer: NodeJS.Timeout | null = null;
      window.addEventListener('resize', function() {
        mTimer && clearTimeout(mTimer)
        mTimer = setTimeout(() => {
          resetSize()
        }, 50)
      })

      resetSize()

      const _pptxId = new URLSearchParams(window.location.search).get('pptxId')
      if (_pptxId) {
        loadById(_pptxId)
      }
      else {
        if(inputData.pptxContent == null) {
          generateNewPptx(inputData.templateId, inputData.outlineContent, inputData.dataUrl)
        }
        else {
          // 已有内容，直接渲染
          pptxObj = inputData.pptxContent
          drawPptxList(0, false)
        }
      }
  }, [])


  console.log("svg", svg)

  return (
    <>
      <div style={{paddingLeft: '1em', paddingTop: '-1.25em'}}>
          <div style={{
                      alignItems: 'center',
                      display: 'flex',
                      flexDirection: 'column',
                      flexShrink: 0,
                      height: 'calc(100vh - 216px)',
                      justifyContent: 'center',
                      position: 'absolute',
                      width: '115px',
                    }}>
              <div style={{
                          borderRadius: '6px',
                          marginLeft: '12px',
                          height: 'calc(100vh - 216px)',
                          width: '190px',
                        }}>
                  <div style={{
                              height: 'calc(100vh - 216px)',
                              overflowX: 'hidden',
                              overflowY: 'auto',
                              padding: '0 8px 0 2px',
                            }}>
                      {pages.map((page: any, index: number) => {
                          canvasList[index] = createRef()

                          return (
                              <div style={{ display: 'flex', cursor: 'pointer', margin: '10px 2px 10px 3px' }} key={index} onClick={() => drawPptx(index)}>
                                  <div style={{
                                        color: '#8d90a5',
                                        flexShrink: 0,
                                        paddingRight: 6,
                                        paddingTop: 30,
                                        textAlign: 'right',
                                        width: 23,
                                      }}>{ index + 1 }</div>
                                  <canvas
                                    ref={canvasList[index]}
                                    width="288"
                                    height="162"
                                    style={{
                                      height: 81,
                                      width: 144,
                                      border: currentIdx == index ? '2px solid #491ff8;' : '1px solid #ccc',
                                      backgroundColor: '#f3f3f3'
                                    }}
                                  />
                              </div>
                          )
                      })}
                      {generatePptxStatus && currentIdx > 0 && (
                          <div style={{ display: 'flex', cursor: 'pointer', margin: '10px 2px 10px 3px' }}>
                              <div style={{
                                        color: '#8d90a5',
                                        flexShrink: 0,
                                        paddingRight: 6,
                                        paddingTop: 30,
                                        textAlign: 'right',
                                        width: 23,
                                      }}>{ currentIdx + 2 }</div>
                              <div style={{
                                    height: 81,
                                    width: 144,
                                    border: '1px solid #ccc',
                                    textAlign: 'center',
                                    lineHeight: 81,
                                    color: '#666',
                                    cursor: 'default',
                                  }}>生成中...</div>
                          </div>
                      )}
                  </div>
              </div>
          </div>
          <Grid sx={{my: 2}}>
              <Grid container justifyContent="right">
                <Grid item>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    {generatePptxStatus && (
                      <Box sx={{ mr: 2 }}>
                        <Typography component="span">
                          {descMsg}
                        </Typography>
                        <Typography component="span" sx={{ marginLeft: '5px' }}>
                          {descTime}秒
                        </Typography>
                      </Box>
                    )}
                    <Button
                      size={'small'}
                      disabled={generatePptxStatus}
                      variant="outlined"
                      onClick={() => {
                        setActiveStep(3)
                      }}
                      startIcon={<SwapHoriz />}
                      sx={{mx: 1}}
                    >
                      更换模板
                    </Button>
                    <Button
                      size={'small'}
                      disabled={generatePptxStatus}
                      variant={"contained"}
                      onClick={(e) => setDownloadMenuAnchor(e.currentTarget)}
                      startIcon={<Download />}
                      sx={{mx: 1}}
                      >
                      下载
                    </Button>
                    <Menu
                      anchorEl={downloadMenuAnchor}
                      open={Boolean(downloadMenuAnchor)}
                      onClose={() => setDownloadMenuAnchor(null)}
                      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                      transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                    >
                      <MenuItem onClick={() => handleDownload('zip')}>
                        <ListItemIcon><Image fontSize="small" /></ListItemIcon>
                        <ListItemText primary="导出为图片 ZIP" secondary="高清 PNG 图片打包" />
                      </MenuItem>
                      <MenuItem onClick={() => handleDownload('pptx')}>
                        <ListItemIcon><InsertDriveFile fontSize="small" /></ListItemIcon>
                        <ListItemText primary="导出为 PPTX" secondary="原生可编辑 PowerPoint" />
                      </MenuItem>
                      <MenuItem onClick={() => handleDownload('docx')}>
                        <ListItemIcon><Description fontSize="small" /></ListItemIcon>
                        <ListItemText primary="导出为 Word" secondary="DOC 文档格式" />
                      </MenuItem>
                    </Menu>
                    <Button
                      size={'small'}
                      disabled={generatePptxStatus}
                      variant={"outlined"}
                      onClick={() => regeneratePptx()}
                      startIcon={<ChangeCircle />}
                      sx={{mx: 1}}
                      >
                      重新生成
                    </Button>
                  </Box>
                </Grid>
              </Grid>
              <Grid sx={{ ml: '180px', mt: 2 }}>
                  <svg ref={svg} style={{ margin: '0 auto', display: 'block', border: '1px solid #666', backgroundColor: '#f3f3f3' }}></svg>
              </Grid>
          </Grid>
      </div>
    </>
  )
}

export default StepFiveGeneratePpt
