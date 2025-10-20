"""
Phase 2 API endpoints: Code Analysis
"""
from fastapi import APIRouter, HTTPException
from models.schemas import (
    AnalysisStartRequest,
    AnalysisStartResponse,
    AnalysisStatusResponse,
    AnalysisResultResponse
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

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/analysis/{analysis_id}/status")
async def get_analysis_status(analysis_id: str):
    """Get analysis status (for polling)"""
    try:
        status = orchestrator.get_status(analysis_id)
        return status

    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


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
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


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
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


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
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/analysis/{analysis_id}/result")
async def get_analysis_result(analysis_id: str):
    """Get complete analysis result"""
    try:
        result = orchestrator.get_result(analysis_id)
        return result

    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
