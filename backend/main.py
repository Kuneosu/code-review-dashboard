"""
Smart Code Review - Backend Main Application
"""
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.phase1 import router as phase1_router
from api.phase2 import router as phase2_router
from api.phase3 import router as phase3_router
from services.semgrep_setup import setup_semgrep

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

# Create FastAPI app
app = FastAPI(
    title="Smart Code Review API",
    description="Local AI-powered code analysis tool",
    version="0.1.0"
)

# CORS middleware for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],  # Vite default port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(phase1_router)
app.include_router(phase2_router)
app.include_router(phase3_router)


@app.on_event("startup")
async def startup_event():
    """서버 시작 시 실행되는 초기화 작업"""
    logging.info("=" * 60)
    logging.info("Smart Code Review Backend Starting...")
    logging.info("=" * 60)

    # Semgrep 규칙 자동 다운로드
    await setup_semgrep()

    logging.info("=" * 60)
    logging.info("✅ 서버 시작 완료!")
    logging.info("=" * 60)


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "name": "Smart Code Review API",
        "version": "0.1.0",
        "status": "running",
        "phase": "Phase 3: AI Analysis with Ollama"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
