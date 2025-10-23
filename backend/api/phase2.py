"""
Phase 2 API endpoints: Code Analysis
"""
from fastapi import APIRouter, HTTPException, status
from datetime import datetime
from models.schemas import (
    AnalysisStartRequest,
    AnalysisStartResponse,
    AnalysisStatusResponse,
    AnalysisResultResponse,
    ErrorResponse
)
from services.analysis_orchestrator import AnalysisOrchestrator

router = APIRouter(prefix="/api", tags=["Phase 2: Analysis"])

# Global orchestrator instance
orchestrator = AnalysisOrchestrator()


@router.post("/analysis/start", response_model=AnalysisStartResponse)
async def start_analysis(request: AnalysisStartRequest):
    """Start code analysis"""
    try:
        analysis_id = await orchestrator.start_analysis(
            project_path=request.project_path,
            selected_files=request.selected_files,
            categories=request.categories,
            analyzers=request.analyzers
        )

        return AnalysisStartResponse(
            analysis_id=analysis_id,
            status="PENDING",
            message="Analysis started successfully"
        )

    except ValueError as e:
        # File limit exceeded or validation errors
        error_msg = str(e)
        if "파일이 너무 많습니다" in error_msg or "MAX_ANALYSIS_FILES" in error_msg:
            error_type = "file_limit_exceeded"
        else:
            error_type = "validation_error"

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error_type": error_type,
                "message": error_msg,
                "recoverable": True,
                "timestamp": datetime.utcnow().isoformat()
            }
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error_type": "internal_error",
                "message": f"분석 시작 실패: {str(e)}",
                "recoverable": False,
                "timestamp": datetime.utcnow().isoformat()
            }
        )


@router.get("/analysis/{analysis_id}/status")
async def get_analysis_status(analysis_id: str):
    """Get analysis status (for polling)"""
    try:
        status_data = orchestrator.get_status(analysis_id)
        return status_data

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "error_type": "not_found",
                "message": f"분석 ID를 찾을 수 없습니다: {analysis_id}",
                "recoverable": True,
                "timestamp": datetime.utcnow().isoformat()
            }
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error_type": "internal_error",
                "message": f"상태 조회 실패: {str(e)}",
                "recoverable": False,
                "timestamp": datetime.utcnow().isoformat()
            }
        )


@router.post("/analysis/{analysis_id}/pause")
async def pause_analysis(analysis_id: str):
    """Pause analysis"""
    try:
        orchestrator.pause_analysis(analysis_id)
        return {
            "status": "PAUSED",
            "message": "Analysis paused successfully"
        }

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "error_type": "not_found",
                "message": f"분석 ID를 찾을 수 없습니다: {analysis_id}",
                "recoverable": True,
                "timestamp": datetime.utcnow().isoformat()
            }
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error_type": "internal_error",
                "message": f"분석 일시정지 실패: {str(e)}",
                "recoverable": False,
                "timestamp": datetime.utcnow().isoformat()
            }
        )


@router.post("/analysis/{analysis_id}/resume")
async def resume_analysis(analysis_id: str):
    """Resume paused analysis"""
    try:
        orchestrator.resume_analysis(analysis_id)
        return {
            "status": "RUNNING",
            "message": "Analysis resumed successfully"
        }

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "error_type": "not_found",
                "message": f"분석 ID를 찾을 수 없습니다: {analysis_id}",
                "recoverable": True,
                "timestamp": datetime.utcnow().isoformat()
            }
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error_type": "internal_error",
                "message": f"분석 재개 실패: {str(e)}",
                "recoverable": False,
                "timestamp": datetime.utcnow().isoformat()
            }
        )


@router.post("/analysis/{analysis_id}/cancel")
async def cancel_analysis(analysis_id: str):
    """Cancel analysis"""
    try:
        orchestrator.cancel_analysis(analysis_id)
        return {
            "status": "CANCELLED",
            "message": "Analysis cancelled successfully"
        }

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "error_type": "not_found",
                "message": f"분석 ID를 찾을 수 없습니다: {analysis_id}",
                "recoverable": True,
                "timestamp": datetime.utcnow().isoformat()
            }
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error_type": "internal_error",
                "message": f"분석 취소 실패: {str(e)}",
                "recoverable": False,
                "timestamp": datetime.utcnow().isoformat()
            }
        )


@router.get("/analysis/{analysis_id}/result")
async def get_analysis_result(analysis_id: str):
    """Get complete analysis result"""
    try:
        result = orchestrator.get_result(analysis_id)
        return result

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "error_type": "not_found",
                "message": f"분석 ID를 찾을 수 없습니다: {analysis_id}",
                "recoverable": True,
                "timestamp": datetime.utcnow().isoformat()
            }
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error_type": "internal_error",
                "message": f"분석 결과 조회 실패: {str(e)}",
                "recoverable": False,
                "timestamp": datetime.utcnow().isoformat()
            }
        )
