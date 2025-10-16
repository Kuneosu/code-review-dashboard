"""
Pydantic models for request/response schemas
"""
from typing import List, Optional, Dict, Any, Literal
from pydantic import BaseModel, Field
from datetime import datetime
from enum import Enum


class FileType(str, Enum):
    """File type enumeration"""
    FILE = "file"
    DIRECTORY = "directory"


class Language(str, Enum):
    """Supported languages"""
    JAVASCRIPT = "javascript"
    TYPESCRIPT = "typescript"
    PYTHON = "python"
    UNKNOWN = "unknown"


class AnalysisStatus(str, Enum):
    """Analysis task status"""
    IDLE = "IDLE"
    PENDING = "PENDING"
    RUNNING = "RUNNING"
    PAUSED = "PAUSED"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"


class Severity(str, Enum):
    """Issue severity levels"""
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class Category(str, Enum):
    """Issue categories"""
    SECURITY = "security"
    PERFORMANCE = "performance"
    QUALITY = "quality"


class FileNode(BaseModel):
    """File tree node structure"""
    name: str
    path: str
    type: FileType
    children: Optional[List['FileNode']] = None
    size: Optional[int] = None
    filtered: bool = False


class FilterRule(BaseModel):
    """Filter rule definition"""
    pattern: str
    exclude: bool = True
    description: Optional[str] = None


class FilterPreset(BaseModel):
    """Language-specific filter preset"""
    language: Language
    rules: List[FilterRule]


class FilterConfig(BaseModel):
    """Complete filter configuration"""
    project_path: str
    presets: List[FilterPreset] = []
    gitignore_rules: List[FilterRule] = []
    custom_rules: List[FilterRule] = []
    use_presets: bool = True
    use_gitignore: bool = True


# API Request/Response Models

class ScanProjectRequest(BaseModel):
    """Request to scan a project directory"""
    project_path: str


class ScanProjectResponse(BaseModel):
    """Response from project scan"""
    file_tree: FileNode
    detected_language: Language
    total_files: int
    gitignore_found: bool


class ApplyFiltersRequest(BaseModel):
    """Request to apply filters"""
    project_path: str
    filter_config: FilterConfig


class FilterStats(BaseModel):
    """Filter statistics"""
    total_files: int
    selected_files: int
    filtered_files: int


class ApplyFiltersResponse(BaseModel):
    """Response from applying filters"""
    filtered_tree: FileNode
    stats: FilterStats
    selected_file_paths: List[str]


class ExportConfigRequest(BaseModel):
    """Request to export filter config"""
    filter_config: FilterConfig


class ExportConfigResponse(BaseModel):
    """Response from config export"""
    config_json: str
    exported_at: datetime


class ImportConfigRequest(BaseModel):
    """Request to import filter config"""
    config_json: str


class ErrorResponse(BaseModel):
    """Error response"""
    error_type: Literal['permission_denied', 'parse_error', 'network_error', 'unknown']
    message: str
    path: Optional[str] = None
    recoverable: bool = False
    details: Optional[Dict[str, Any]] = None


# Phase 2: Analysis Models

class Issue(BaseModel):
    """Code analysis issue"""
    id: Optional[str] = None
    file: str
    line: int
    column: int = 0
    severity: Severity
    category: Category
    rule: str
    message: str
    code_snippet: Optional[str] = None
    tool: str  # ESLint, Bandit, etc.


class LiveSummary(BaseModel):
    """Real-time issue summary"""
    critical: int = 0
    high: int = 0
    medium: int = 0
    low: int = 0
    total: int = 0


class AnalysisStartRequest(BaseModel):
    """Request to start analysis"""
    project_path: str
    selected_files: List[str]
    filter_config: Optional[FilterConfig] = None
    categories: List[Category] = [Category.SECURITY, Category.PERFORMANCE, Category.QUALITY]


class AnalysisStartResponse(BaseModel):
    """Response from starting analysis"""
    analysis_id: str
    status: AnalysisStatus
    message: str
    created_at: datetime = Field(default_factory=datetime.utcnow)


class AnalysisStatusResponse(BaseModel):
    """Response from status query"""
    analysis_id: str
    status: AnalysisStatus
    progress: float  # 0.0 to 1.0
    current_file: Optional[str] = None
    completed_files: int = 0
    total_files: int = 0
    elapsed_time: int = 0  # seconds
    estimated_remaining: int = 0  # seconds
    live_summary: Optional[LiveSummary] = None
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class AnalysisResultResponse(BaseModel):
    """Response with complete analysis results"""
    analysis_id: str
    status: AnalysisStatus
    summary: LiveSummary
    issues: List[Issue]
    completed_at: Optional[datetime] = None
    elapsed_time: int = 0
    total_files: int = 0


# Update forward references
FileNode.model_rebuild()
