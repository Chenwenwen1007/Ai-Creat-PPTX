import { useState, useEffect, useCallback } from 'react'
import { BackendApi } from './Config'
import { getRequestToken, getCustomApiHeaders } from './LocalConfig'

export default function SelectTemplate({token: propToken, nextStep}: { token: string, nextStep: (id: string) => void}) {
    const [templateId, setTemplateId] = useState('')
    const [templates, setTemplates] = useState([] as any)

    // 获取实际使用的 token：优先使用本地配置中的 token
    const effectiveToken = getRequestToken() || propToken || ''

    // 获取自定义 API 配置（从本地存储）
    const customApiHeaders = getCustomApiHeaders()

    const loadTemplates = useCallback(async () => {
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
            }
        }
    }, [effectiveToken])

    const selectTemplate = useCallback((template: any) => {
        setTemplateId(template.id)
    }, [])

    useEffect(() => {
        loadTemplates()
    }, [])

    return (
      <>
        <div className="template_content">
            <div>---- 选择模板 ----</div>
            <div className="but_div">
                <button onClick={() => {
                    nextStep(templateId)
                }}>下一步: 生成PPT</button>
            </div>
            <div className="template_div">
                {templates.map((template: any) => (
                    <div className={template.id == templateId ? 'template template_select' : 'template'} key={template.id} onClick={() => selectTemplate(template)}>
                        <img src={`/api/templatePreview?name=${template.subject}`} alt={template.subject} onError={(e: any) => { if (!e.target.src.includes('dandian.net')) { e.target.src = BackendApi + "json/" + template.subject + ".png" } }} />
                    </div>
                ))}
                { templates.length == 0 && <div>模板加载中...</div> }
            </div>
        </div>
      </>
    )
}
