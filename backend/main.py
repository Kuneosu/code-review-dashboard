"""
Smart Code Review - Backend Main Application
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.phase1 import router as phase1_router

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


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "name": "Smart Code Review API",
        "version": "0.1.0",
        "status": "running",
        "phase": "Phase 1: Project Upload & File Filtering"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
