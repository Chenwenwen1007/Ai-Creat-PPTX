"""
大纲生成路由
基于 AI 生成 PPT 大纲
"""

from fastapi import APIRouter, Form, HTTPException
from fastapi.responses import StreamingResponse
import json
import os
from pathlib import Path

router = APIRouter()

TEMP_DIR = Path(__file__).parent.parent.parent / "temp"


@router.post("/outline/generate")
async def generate_outline(
    source: str = Form(...),
    language: str = Form("zh-CN"),
    length: str = Form("regular"),
    api_url: str = Form(...),
    api_key: str = Form(...),
    model: str = Form(...),
    project_id: str = Form(...)
):
    """
    根据源内容生成 PPT 大纲
    
    - source: Markdown 源内容
    - language: 语言 (zh-CN/en 等)
    - length: 大纲长度 (short/regular/detailed)
    - api_url: AI API 地址
    - api_key: API 密钥
    - model: 模型名称
    - project_id: 项目标识
    """
    try:
        # 构建提示词
        length_desc = {
            "short": "简短（5-8页）",
            "regular": "常规（10-15页）",
            "detailed": "详细（15-20页）"
        }
        
        prompt = f"""请根据以下内容生成一份结构化的 PPT 大纲。

内容：
{source}

要求：
- 语言：{language}
- 长度：{length_desc.get(length, '常规')}
- 格式：使用 Markdown 格式，一级标题 (#) 为章节，二级标题 (##) 为页面标题
- 每个页面标题下需要有 3-5 个要点说明

请直接输出 Markdown 格式的大纲，不要添加其他说明。"""

        # 调用 AI API（流式输出）
        import requests
        
        response = requests.post(
            f"{api_url}/chat/completions",
            headers={"Authorization": f"Bearer {api_key}"},
            json={
                "model": model,
                "messages": [{"role": "user", "content": prompt}],
                "stream": True
            },
            stream=True
        )
        
        if response.status_code != 200:
            raise HTTPException(status_code=500, detail="AI API 调用失败")
        
        # 流式返回
        def stream_generator():
            for line in response.iter_lines():
                if line:
                    decoded = line.decode('utf-8')
                    if decoded.startswith('data: '):
                        data = decoded[6:]
                        if data == '[DONE]':
                            break
                        try:
                            json_data = json.loads(data)
                            if 'choices' in json_data:
                                delta = json_data['choices'][0].get('delta', {})
                                if 'content' in delta:
                                    yield f"data: {json.dumps({'content': delta['content']})}\n\n"
                        except:
                            pass
        
        return StreamingResponse(
            stream_generator(),
            media_type="text/event-stream"
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"大纲生成失败: {str(e)}")


@router.post("/outline/refine")
async def refine_outline(
    outline: str = Form(...),
    feedback: str = Form(...),
    api_url: str = Form(...),
    api_key: str = Form(...),
    model: str = Form(...)
):
    """
    根据用户反馈优化大纲
    """
    try:
        prompt = f"""请根据以下反馈优化 PPT 大纲。

当前大纲：
{outline}

用户反馈：
{feedback}

请输出优化后的 Markdown 大纲。"""

        import requests
        response = requests.post(
            f"{api_url}/chat/completions",
            headers={"Authorization": f"Bearer {api_key}"},
            json={
                "model": model,
                "messages": [{"role": "user", "content": prompt}],
                "stream": True
            },
            stream=True
        )
        
        def stream_generator():
            for line in response.iter_lines():
                if line:
                    decoded = line.decode('utf-8')
                    if decoded.startswith('data: '):
                        data = decoded[6:]
                        if data == '[DONE]':
                            break
                        try:
                            json_data = json.loads(data)
                            if 'choices' in json_data:
                                delta = json_data['choices'][0].get('delta', {})
                                if 'content' in delta:
                                    yield f"data: {json.dumps({'content': delta['content']})}\n\n"
                        except:
                            pass
        
        return StreamingResponse(
            stream_generator(),
            media_type="text/event-stream"
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"大纲优化失败: {str(e)}")
