"""
Phase 3: AI Analysis API endpoints
"""
from fastapi import APIRouter, HTTPException, BackgroundTasks
from typing import Dict, Any, List
from pydantic import BaseModel
from services.ollama_client import OllamaClient
from services.ai_analyzer import AIAnalysisQueue

router = APIRouter(prefix="/api/ai", tags=["ai-analysis"])

# Global instances
ollama_client: OllamaClient = None
analysis_queue: AIAnalysisQueue = None


class IssueInput(BaseModel):
    """Input model for issue data"""
    file: str
    line: int
    column: int
    severity: str
    category: str
    rule: str
    message: str
    tool: str


class AnalyzeRequest(BaseModel):
    """Request model for AI analysis"""
    project_path: str
    issues: List[IssueInput]


def get_ollama_client() -> OllamaClient:
    """Get or create Ollama client instance"""
    global ollama_client
    if ollama_client is None:
        ollama_client = OllamaClient()
    return ollama_client


def get_analysis_queue() -> AIAnalysisQueue:
    """Get or create AI analysis queue instance"""
    global analysis_queue
    if analysis_queue is None:
        client = get_ollama_client()
        analysis_queue = AIAnalysisQueue(client)
    return analysis_queue


@router.get("/health")
async def check_ollama_health() -> Dict[str, Any]:
    """
    Check Ollama service health and available models

    Returns:
        Health status with available models
    """
    client = get_ollama_client()
    health = await client.health_check()

    return {
        "ollama": health,
        "endpoint": "ready" if health["status"] == "healthy" else "unavailable"
    }


@router.post("/initialize")
async def initialize_ollama() -> Dict[str, Any]:
    """
    Initialize Ollama client and select best available model

    Returns:
        Initialization status with selected model
    """
    client = get_ollama_client()

    # Check health first
    health = await client.health_check()
    if health["status"] != "healthy":
        raise HTTPException(
            status_code=503,
            detail={
                "error": "Ollama service is not available",
                "details": health.get("error", "Unknown error"),
                "suggestion": "Please ensure Ollama is installed and running (ollama serve)"
            }
        )

    # Select best model
    selected_model = await client.select_best_model()

    if selected_model is None:
        raise HTTPException(
            status_code=404,
            detail={
                "error": "No suitable code analysis model found",
                "available_models": health.get("models", []),
                "suggestion": "Please install a code model: ollama pull codellama:7b"
            }
        )

    return {
        "success": True,
        "model": selected_model,
        "available_models": health.get("models", []),
        "message": f"Initialized with model: {selected_model}"
    }


@router.post("/analyze")
async def start_ai_analysis(
    request: AnalyzeRequest,
    background_tasks: BackgroundTasks
) -> Dict[str, Any]:
    """
    Start AI analysis for selected issues

    Args:
        request: Analysis request with project path and issues
        background_tasks: FastAPI background tasks

    Returns:
        Queue ID for tracking progress
    """
    # Validate Ollama is available
    client = get_ollama_client()
    health = await client.health_check()

    if health["status"] != "healthy":
        raise HTTPException(
            status_code=503,
            detail={
                "error": "Ollama service is not available",
                "suggestion": "Please run 'ollama serve' and ensure the service is running"
            }
        )

    # Ensure model is selected
    if client.model is None:
        selected_model = await client.select_best_model()
        if selected_model is None:
            raise HTTPException(
                status_code=404,
                detail={
                    "error": "No suitable model found",
                    "suggestion": "Please install a code model: ollama pull codellama:7b"
                }
            )

    # Create analysis queue
    queue = get_analysis_queue()
    issues_dict = [issue.model_dump() for issue in request.issues]

    queue_id = queue.create_queue(
        project_path=request.project_path,
        issues=issues_dict
    )

    # Start processing in background
    background_tasks.add_task(queue.process_queue, queue_id)

    return {
        "queue_id": queue_id,
        "total_issues": len(issues_dict),
        "status": "analyzing",
        "message": "AI analysis started"
    }


@router.get("/queue/{queue_id}/status")
async def get_queue_status(queue_id: str) -> Dict[str, Any]:
    """
    Get analysis queue status

    Args:
        queue_id: Queue identifier

    Returns:
        Queue status with progress and results
    """
    queue = get_analysis_queue()
    status = queue.get_queue_status(queue_id)

    if status is None:
        raise HTTPException(
            status_code=404,
            detail={"error": f"Queue not found: {queue_id}"}
        )

    return status


@router.get("/result/{result_id}")
async def get_ai_result(result_id: str) -> Dict[str, Any]:
    """
    Get specific AI analysis result

    Args:
        result_id: Result identifier

    Returns:
        Analysis result details
    """
    queue = get_analysis_queue()

    # Search all queues for the result
    for queue_data in queue.queues.values():
        for result in queue_data.get('results', []):
            if result.get('issue_id') == result_id:
                return result

    raise HTTPException(
        status_code=404,
        detail={"error": f"Result not found: {result_id}"}
    )


@router.post("/queue/{queue_id}/cancel")
async def cancel_ai_analysis(queue_id: str) -> Dict[str, Any]:
    """
    Cancel an ongoing AI analysis queue

    Args:
        queue_id: Queue identifier

    Returns:
        Cancellation status
    """
    queue = get_analysis_queue()
    success = queue.cancel_queue(queue_id)

    if not success:
        raise HTTPException(
            status_code=404,
            detail={"error": f"Queue not found or already completed: {queue_id}"}
        )

    return {
        "success": True,
        "queue_id": queue_id,
        "message": "Analysis cancelled successfully"
    }
