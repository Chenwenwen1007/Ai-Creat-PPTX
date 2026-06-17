"""
PPT Master 工作流引擎
实现多角色协作的核心流水线
"""

import asyncio
from enum import Enum
from typing import Dict, List, Optional
from pathlib import Path
import json


class PipelineStage(Enum):
    """工作流阶段"""
    IDLE = "idle"
    SOURCE_PROCESSING = "source_processing"
    STRATEGIST = "strategist"
    DESIGN_LOCKED = "design_locked"
    EXECUTOR = "executor"
    QUALITY_CHECK = "quality_check"
    EXPORT = "export"
    COMPLETED = "completed"
    ERROR = "error"


class PPTPipeline:
    """
    PPT 生成工作流管理器
    管理从源文件到 PPTX 的完整流水线
    """
    
    def __init__(self, project_id: str, temp_dir: Path):
        self.project_id = project_id
        self.project_dir = temp_dir / project_id
        self.project_dir.mkdir(exist_ok=True)
        
        self.stage = PipelineStage.IDLE
        self.progress = 0.0
        self.status_message = "等待开始"
        self.errors = []
        
        # 项目文件路径
        self.sources_dir = self.project_dir / "sources"
        self.svg_dir = self.project_dir / "svg_output"
        self.exports_dir = self.project_dir / "exports"
        
        for d in [self.sources_dir, self.svg_dir, self.exports_dir]:
            d.mkdir(exist_ok=True)
    
    def update_stage(self, stage: PipelineStage, message: str = ""):
        """更新工作流阶段"""
        self.stage = stage
        self.status_message = message or stage.value
        self._save_state()
    
    def update_progress(self, progress: float, message: str = ""):
        """更新进度"""
        self.progress = min(max(progress, 0.0), 1.0)
        if message:
            self.status_message = message
        self._save_state()
    
    def add_error(self, error: str):
        """记录错误"""
        self.errors.append(error)
        self.stage = PipelineStage.ERROR
        self._save_state()
    
    def _save_state(self):
        """保存工作流状态到文件"""
        state_file = self.project_dir / "pipeline_state.json"
        state = {
            "project_id": self.project_id,
            "stage": self.stage.value,
            "progress": self.progress,
            "status_message": self.status_message,
            "errors": self.errors
        }
        with open(state_file, "w", encoding="utf-8") as f:
            json.dump(state, f, ensure_ascii=False, indent=2)
    
    def get_state(self) -> dict:
        """获取当前状态"""
        return {
            "project_id": self.project_id,
            "stage": self.stage.value,
            "progress": self.progress,
            "status_message": self.status_message,
            "errors": self.errors
        }


class PipelineManager:
    """工作流管理器，管理多个项目"""
    
    def __init__(self, temp_dir: Path):
        self.temp_dir = temp_dir
        self.pipelines: Dict[str, PPTPipeline] = {}
    
    def create_pipeline(self, project_id: str) -> PPTPipeline:
        """创建新工作流"""
        pipeline = PPTPipeline(project_id, self.temp_dir)
        self.pipelines[project_id] = pipeline
        return pipeline
    
    def get_pipeline(self, project_id: str) -> Optional[PPTPipeline]:
        """获取工作流"""
        if project_id in self.pipelines:
            return self.pipelines[project_id]
        
        # 尝试从文件恢复
        project_dir = self.temp_dir / project_id
        state_file = project_dir / "pipeline_state.json"
        if state_file.exists():
            pipeline = PPTPipeline(project_id, self.temp_dir)
            with open(state_file, "r", encoding="utf-8") as f:
                state = json.load(f)
                pipeline.stage = PipelineStage(state.get("stage", "idle"))
                pipeline.progress = state.get("progress", 0.0)
                pipeline.status_message = state.get("status_message", "")
                pipeline.errors = state.get("errors", [])
            self.pipelines[project_id] = pipeline
            return pipeline
        
        return None
    
    def remove_pipeline(self, project_id: str):
        """移除工作流"""
        if project_id in self.pipelines:
            del self.pipelines[project_id]


# 全局工作流管理器实例
pipeline_manager = PipelineManager(Path(__file__).parent.parent.parent / "temp")
