import { useEffect, useRef } from 'react'
import OutlineEdit from './OutlineEdit'
import { marked } from 'marked'
import { SSE } from 'src/functions/AiPPTX/sse'
import { BackendApi } from './Config'
import { getRequestToken, getCustomApiHeaders, getLocalConfig } from './LocalConfig'
import MagneticParticles from './MagneticParticles'

import Button from '@mui/material/Button'
import Grid from '@mui/material/Grid'

import { PlayCircleFilled } from "@mui/icons-material";
import { ArrowBack } from '@mui/icons-material';

let outline = ''
let outlineTree = null as any

marked.setOptions({
    renderer: new marked.Renderer(),
    gfm: true,
    async: false,
    breaks: false,
    pedantic: false,
    silent: true
})

const StepTwoThreeGenerateOutline = ({activeStep, setActiveStep, inputData, setInputData, token: propToken}: any) => {

    // 生成状态: 0未开始 1生成中 2已完成
    // 获取实际使用的 token：优先使用本地配置中的 token
    const effectiveToken = getRequestToken() || propToken || ''

    // 获取自定义 API 配置（从本地存储）
    const customApiHeaders = getCustomApiHeaders()

    const parseTextFromAiResult = (ParseText: string) => {
        const ParseTextArray = ParseText.split("\n")
        console.log("ParseTextArray", ParseTextArray)
        const ParseResult: any = {}
        let TitleOne = ''
        let TitleTwo = ''
        let TitleThree = ''
        let Subject = ''
        ParseTextArray.map((Item: string)=>{
            if(Item.trim() !="" && Item.trim() !="```markdown" && Item.trim() !="```")  {
                if(Item.trim().startsWith('# '))  {
                    Subject = Item.trim().substring(2)
                }
                else if(Item.trim().startsWith('## '))  {
                    TitleOne = Item.trim().substring(3)
                    ParseResult[TitleOne] = {}
                }
                else if(Item.trim().startsWith('### '))  {
                    TitleTwo = Item.trim().substring(4)
                    ParseResult[TitleOne][TitleTwo] = []
                }
                else if(Item.trim().startsWith('#### '))  {
                    //标题
                    TitleThree = Item.trim().substring(5)
                    if(TitleOne!="" && TitleTwo!="" && TitleThree!="" && ParseResult[TitleOne][TitleTwo])   {
                        ParseResult[TitleOne][TitleTwo].push(TitleThree)
                    }
                }
                else    {
                    //普通列表项（如 - 开头的要点）
                    TitleThree = Item.trim().replace(/^[-*]\s*/, '')
                    if(TitleOne!="" && TitleTwo!="" && TitleThree!="" && ParseResult[TitleOne][TitleTwo])   {
                        ParseResult[TitleOne][TitleTwo].push(TitleThree)
                    }
                }
            }
        })

        const ResultTopChildren: any = []
        const KeysOne = Object.keys(ParseResult)
        KeysOne.map((ItemOne: string)=>{
            const MapOne = ParseResult[ItemOne]
            const KeysTwo = Object.keys(MapOne)
            const ResultOneChildren: any = []
            KeysTwo.map((ItemTwo: string)=>{
                const MapTwo = MapOne[ItemTwo]
                const ResultTwoChildren: any = []
                MapTwo.map((ItemThree: string)=>{
                    ResultTwoChildren.push({name: ItemThree, level: 4, children: []})
                })
                const ResultTwo = {name: ItemTwo, level: 3, children: ResultTwoChildren}
                console.log("MapTwo", ItemTwo, MapTwo)
                ResultOneChildren.push(ResultTwo)
            })
            const ResultOne = {name: ItemOne, level: 2, children: ResultOneChildren}
            ResultTopChildren.push(ResultOne)
        })
        const ResultMap = {name: Subject, level: 1, children: ResultTopChildren}
        console.log("ResultMap", ResultMap)

        return ResultMap
    }

    const generateOutline = () => {

        //outline = TestText
        //setActiveStep(2)
        //outlineTree = parseTextFromAiResult(TestText)
        //return

        // 检查是否已配置 API Token，未配置则提示用户前往设置
        const localConfig = getLocalConfig()
        if (!effectiveToken && !localConfig) {
            alert('请先在"参数设置"中配置您的 AI API Key，点击"本地临时保存"后即可使用。')
            setActiveStep(0)

            return
        }

        setActiveStep(1)
        setInputData((prevState: any) => ({...prevState, outlineContent: '', outlineHtml: '<h3>正在生成中，请稍后....</h3>'}))

        // 判断是否使用本地 API 代理（用户自定义了 API 配置时走本地代理）
        const useLocalProxy = !!localConfig && localConfig.apiToken

        if (useLocalProxy) {
            // 使用本地 API 代理路由，直接调用用户配置的 AI 服务
            const url = '/api/generateOutline'
            const source = new SSE(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Cache-Control': 'no-cache',
                    'x-custom-api-url': localConfig.apiUrl,
                    'x-custom-api-model': localConfig.apiModel,
                    'x-custom-api-token': localConfig.apiToken,
                },
                payload: JSON.stringify({
                    messages: [
                        {
                            role: 'system',
                            content: '你是一位专业的PPT大纲生成助手。请根据用户提供的主题，生成一个结构化的PPT大纲。大纲格式要求：使用Markdown格式，一级标题为PPT主题，二级标题为章节，三级标题为小节，四级标题为要点。每个章节包含2-3个小节，每个小节包含2-4个要点。请直接输出大纲内容，不要输出其他说明。'
                        },
                        {
                            role: 'user',
                            content: `请为以下主题生成一个详细的PPT大纲：${inputData.inputText}`
                        }
                    ],
                }),
            }) as any
            source.onmessage = function (data: any) {
                if(data.data != "[DONE]") {
                    try {
                        const json = JSON.parse(data.data)
                        if(json && json.choices && json.choices[0] && json.choices[0]['delta'] && json.choices[0]['delta']['content']) {
                            outline = outline + json.choices[0]['delta']['content']
                            const outlineHtml = marked.parse(outline.replace('```markdown', '').replace(/```/g, '')) as string
                            if(outline && outline.length > 20) {
                                setInputData((prevState: any) => ({...prevState, outlineContent: outline, outlineHtml: outlineHtml}))
                            }
                        }
                    }
                    catch(ErrorMsg: any) {
                        console.log("ErrorMsg", ErrorMsg)
                    }
                }
                else {
                    console.log("[DONE]outline", outline)
                    outlineTree = parseTextFromAiResult(outline)
                    console.log("[DONE]outlineTree", outlineTree)
                    const outlineHtml = marked.parse(outline.replace('```markdown', '').replace(/```/g, '')) as string
                    setInputData((prevState: any) => ({...prevState, outlineContent: outline, outlineHtml: outlineHtml}))
                }
            }
            source.onend = function (data: any) {
                if (data.data.startsWith('{') && data.data.endsWith('}')) {
                    try {
                        const json = JSON.parse(data.data)
                        if (json.error) {
                            alert('生成大纲异常：' + (json.error.message || json.error || JSON.stringify(json)))
                            setActiveStep(0)

                            return
                        }
                    } catch(e) {
                        // 非 JSON 格式的结束数据，正常完成
                    }
                }
                setActiveStep(2)
            }
            source.onerror = function (err: any) {
                console.error('生成大纲异常', err)
                alert('生成大纲异常：无法连接到 AI 服务。请检查：\n1. 是否已在"参数设置"中配置 API Key\n2. API URL 和 Model 是否正确\n3. 网络连接是否正常')
                setActiveStep(0)
            }
            source.stream()
        } else {
            // 使用后端默认 API
            const submitData = {subject: inputData.inputText}
            const url = BackendApi + 'generateOutline.php'
            const source = new SSE(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Cache-Control': 'no-cache',
                    'token': effectiveToken,
                    ...customApiHeaders
                },
                payload: JSON.stringify(submitData),
            }) as any
            source.onmessage = function (data: any) {
                if(data.data != "[DONE]")       {
                    try {
                        const json = JSON.parse(data.data)
                        if(json && json.choices && json.choices[0] && json.choices[0]['delta'] && json.choices[0]['delta']['content']) {

                          //console.log("json.choices[0]['delta']['content']", json.choices[0]['delta']['content'])
                          outline = outline + json.choices[0]['delta']['content']
                          const outlineHtml = marked.parse(outline.replace('```markdown', '').replace(/```/g, '')) as string
                          if(outline && outline.length > 20) {
                            setInputData((prevState: any) => ({...prevState, outlineContent: outline, outlineHtml: outlineHtml}))
                          }
                        }
                    }
                    catch(ErrorMsg: any) {
                        console.log("ErrorMsg", ErrorMsg)
                    }
                }
                else {
                    console.log("[DONE]outline", outline)
                    outlineTree = parseTextFromAiResult(outline)
                    console.log("[DONE]outlineTree", outlineTree)
                    const outlineHtml = marked.parse(outline.replace('```markdown', '').replace(/```/g, '')) as string
                    setInputData((prevState: any) => ({...prevState, outlineContent: outline, outlineHtml: outlineHtml}))
                }
            }
            source.onend = function (data: any) {
                if (data.data.startsWith('{') && data.data.endsWith('}')) {
                    const json = JSON.parse(data.data)
                    if (json.code != 0) {
                        alert('生成大纲异常：' + json.message)
                        setActiveStep(0)

                        return
                    }
                }
                setActiveStep(2)
            }
            source.onerror = function (err: any) {
                console.error('生成大纲异常', err)
                alert('生成大纲异常：无法连接到 AI 服务。请检查：\n1. 是否已在"参数设置"中配置 API Key\n2. 网络连接是否正常')
                setActiveStep(0)
            }
            source.stream()
        }
    }

    const outlineRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      if (inputData) {
          window.scrollTo({ behavior: 'smooth', top: document.body.scrollHeight })
      }
      if (outlineRef.current) {
        // 将滚动条滚动到底部
        outlineRef.current.scrollTop = outlineRef.current.scrollHeight;
      }
    }, [inputData])

    useEffect(() => {
      activeStep == 1 && generateOutline()
      activeStep == 2 && window.scrollTo(0, 0)
    }, [activeStep])

    //console.log("activeStep0001", activeStep, inputData, outline, outlineTree)

    return (
      <>
        {activeStep == 1 && (
          <div style={{ position: 'relative', width: '100%', height: '100%' }}>
            <MagneticParticles />
            <Grid
              ref={outlineRef} // 绑定 ref
              dangerouslySetInnerHTML={{ __html: inputData.outlineHtml }}
              style={{
                overflowY: 'auto',
                maxHeight: '100%',
                width: '100%',
                wordWrap: 'break-word',
                whiteSpace: 'normal',
                position: 'relative',
                zIndex: 2,
                pointerEvents: 'none',
              }}
            />
          </div>
        )}
        {activeStep == 2 && (
          <Grid>
            <Grid container justifyContent="center">
              <Grid item>
                <Button
                  variant="outlined"
                  onClick={() => setActiveStep(0)}
                  startIcon={<ArrowBack />}
                  sx={{mx: 1}}
                >
                  上一步
                </Button>
                <Button
                  variant={"contained"}
                  onClick={() => setActiveStep((prevActiveStep: number) => prevActiveStep + 1) }
                  startIcon={<PlayCircleFilled />}
                  >
                  下一步：选择模板
                </Button>
              </Grid>
            </Grid>
            <Grid className="outline_edit">
              <OutlineEdit outlineTree={outlineTree} update={(_outline) => { outline = _outline }} />
            </Grid>
          </Grid>
        )}
      </>
    )
}

export default StepTwoThreeGenerateOutline
