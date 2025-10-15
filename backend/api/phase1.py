"""
Phase 1 API endpoints: Project Upload & File Filtering
"""
from fastapi import APIRouter, HTTPException, status
from datetime import datetime
import json
import traceback

from models.schemas import (
    ScanProjectRequest, ScanProjectResponse,
    ApplyFiltersRequest, ApplyFiltersResponse,
    ExportConfigRequest, ExportConfigResponse,
    ImportConfigRequest, FilterConfig,
    ErrorResponse, Language
)
from services.file_scanner import FileScanner
from services.filter_service import FilterService

router = APIRouter(prefix="/api", tags=["phase1"])

# Service instances
file_scanner = FileScanner()
filter_service = FilterService()


@router.post("/scan-project", response_model=ScanProjectResponse)
async def scan_project(request: ScanProjectRequest):
    """
    Scan project directory and return file tree

    Args:
        request: ScanProjectRequest with project_path

    Returns:
        ScanProjectResponse with file tree and metadata

    Raises:
        HTTPException: 400 for invalid path, 403 for permission denied, 500 for other errors
    """
    try:
        # Scan directory
        file_tree = file_scanner.scan_project_directory(request.project_path)

        # Detect language
        detected_language = file_scanner.detect_language(request.project_path)

        # Count total files
        total_files = file_scanner.count_files(file_tree)

        # Check for .gitignore
        gitignore_rules = file_scanner.parse_gitignore(request.project_path)
        gitignore_found = len(gitignore_rules) > 0

        return ScanProjectResponse(
            file_tree=file_tree,
            detected_language=detected_language,
            total_files=total_files,
            gitignore_found=gitignore_found
        )

    except FileNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error_type": "parse_error",
                "message": f"Path does not exist: {request.project_path}",
                "path": request.project_path,
                "recoverable": True
            }
        )

    except PermissionError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "error_type": "permission_denied",
                "message": f"No permission to access: {request.project_path}",
                "path": request.project_path,
                "recoverable": True
            }
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error_type": "unknown",
                "message": f"Failed to scan project: {str(e)}",
                "path": request.project_path,
                "recoverable": False,
                "details": {"traceback": traceback.format_exc()}
            }
        )


@router.post("/apply-filters", response_model=ApplyFiltersResponse)
async def apply_filters(request: ApplyFiltersRequest):
    """
    Apply filter configuration to file tree

    Args:
        request: ApplyFiltersRequest with project_path and filter_config

    Returns:
        ApplyFiltersResponse with filtered tree and statistics

    Raises:
        HTTPException: 500 for processing errors
    """
    try:
        # First, scan the project if we don't have the tree
        file_tree = file_scanner.scan_project_directory(request.project_path)

        # Auto-populate presets if needed
        if request.filter_config.use_presets and not request.filter_config.presets:
            detected_language = file_scanner.detect_language(request.project_path)
            preset = file_scanner.load_language_preset(detected_language)
            if preset:
                request.filter_config.presets = [preset]

        # Auto-populate gitignore rules if needed
        if request.filter_config.use_gitignore and not request.filter_config.gitignore_rules:
            gitignore_rules = file_scanner.parse_gitignore(request.project_path)
            request.filter_config.gitignore_rules = gitignore_rules

        # Apply filters
        filtered_tree, selected_paths = filter_service.apply_filters(
            file_tree,
            request.filter_config
        )

        # Calculate statistics
        stats = filter_service.calculate_stats(filtered_tree)

        return ApplyFiltersResponse(
            filtered_tree=filtered_tree,
            stats=stats,
            selected_file_paths=selected_paths
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error_type": "unknown",
                "message": f"Failed to apply filters: {str(e)}",
                "recoverable": False,
                "details": {"traceback": traceback.format_exc()}
            }
        )


@router.post("/filter-config/export", response_model=ExportConfigResponse)
async def export_filter_config(request: ExportConfigRequest):
    """
    Export filter configuration as JSON

    Args:
        request: ExportConfigRequest with filter_config

    Returns:
        ExportConfigResponse with JSON string and timestamp
    """
    try:
        config_dict = request.filter_config.model_dump()
        config_json = json.dumps(config_dict, indent=2, default=str)

        return ExportConfigResponse(
            config_json=config_json,
            exported_at=datetime.utcnow()
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error_type": "unknown",
                "message": f"Failed to export config: {str(e)}",
                "recoverable": False
            }
        )


@router.post("/filter-config/import", response_model=FilterConfig)
async def import_filter_config(request: ImportConfigRequest):
    """
    Import filter configuration from JSON

    Args:
        request: ImportConfigRequest with config_json

    Returns:
        FilterConfig object

    Raises:
        HTTPException: 400 for invalid JSON
    """
    try:
        config_dict = json.loads(request.config_json)
        filter_config = FilterConfig(**config_dict)

        return filter_config

    except json.JSONDecodeError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error_type": "parse_error",
                "message": f"Invalid JSON format: {str(e)}",
                "recoverable": True
            }
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error_type": "parse_error",
                "message": f"Failed to parse config: {str(e)}",
                "recoverable": True
            }
        )
