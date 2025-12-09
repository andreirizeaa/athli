from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
import uvicorn
from contextlib import asynccontextmanager
import logging
from datetime import datetime, timezone
from config import settings
from lib.supabase_client import init_supabase_clients, close_supabase_clients
from api.lifts import lifts_router

YELLOW = "\033[93m"
RESET = "\033[0m"

logging.basicConfig(
    format=f"{YELLOW}LOG{RESET}: %(asctime)s - %(name)s - %(levelname)s - %(message)s",
    level=logging.INFO
)

# Create logger for this module
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifespan events."""
    # Startup
    logger.info("Starting FormAI Service...")
    
    try:
        # Initialize Supabase clients
        logger.info("Initializing Supabase connections...")
        await init_supabase_clients(app)
        
        logger.info("FormAI Service started successfully")
    except Exception as e:
        logger.error(f"Failed to start FormAI Service: {e}")
        raise
    
    yield
    
    # Shutdown
    logger.info("Shutting down FormAI Service...")
    
    try:
        # Cleanup Supabase connections
        await close_supabase_clients(app)
        logger.info("Supabase connections closed")
        
        logger.info("FormAI Service shutdown completed")
    except Exception as e:
        logger.error(f"Error during shutdown: {e}")

# Create FastAPI app instance
app = FastAPI(
    title=settings.PROJECT_NAME,
    description="A FastAPI backend service for FormAI (Mobile API)",
    version=settings.VERSION,
    # For mobile APIs, you can keep docs enabled in production for debugging
    # or disable them for security
    docs_url="/docs" if settings.RELOAD else "/docs",  # Keep docs for mobile devs
    redoc_url="/redoc" if settings.RELOAD else "/redoc",  # Keep redoc for mobile devs
    lifespan=lifespan,
    # Mobile API settings
    openapi_url="/openapi.json",  # Keep OpenAPI spec for mobile devs
)

# Add CORS middleware for maximum compatibility
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    max_age=3600,  # Cache preflight requests for 1 hour
)

# Add trusted host middleware for security
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=["*"]  # Configure this properly for production
)

# Include routers
app.include_router(lifts_router)

@app.get("/")
async def root():
    """Root endpoint for health check"""
    logger.info("Root endpoint accessed")
    return {
        "message": f"{settings.PROJECT_NAME} is running",
        "version": settings.VERSION,
        "status": "healthy",
        "docs_url": "/docs",
        "environment": "development" if settings.RELOAD else "production"
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    logger.info("Health check endpoint accessed")
    return {
        "status": "healthy",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "version": settings.VERSION,
        "environment": "development" if settings.RELOAD else "production"
    }

@app.get("/api/info")
async def api_info():
    """Mobile API information endpoint"""
    logger.info("API info endpoint accessed")
    return {
        "api_name": "FormAI Mobile API",
        "version": settings.VERSION,
        "status": "active",
        "features": [
            "User authentication and management",
            "Lift analysis and tracking",
            "Check-in system",
            "Async Supabase integration"
        ],
        "documentation": "/docs",
        "health_check": "/health",
        "environment": "development" if settings.RELOAD else "production"
    }

if __name__ == "__main__":
    # Development server configuration
    # For production with mobile APIs, use Gunicorn with Uvicorn workers:
    # gunicorn -k uvicorn.workers.UvicornWorker main:app --workers 4 --bind 0.0.0.0:8000
    
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.RELOAD,
        log_level="info",
        access_log=True,
        # Production-ready settings for mobile APIs - MAXIMUM CONCURRENCY
        workers=1 if settings.RELOAD else 8,  # Increased workers for maximum concurrency
        loop="uvloop",  # Fastest event loop available
        http="httptools",  # Faster HTTP parsing for mobile requests
        # Additional performance optimizations
        limit_concurrency=1000,  # Allow up to 1000 concurrent connections
        limit_max_requests=10000,  # Restart workers after 10k requests to prevent memory leaks
        timeout_keep_alive=30,  # Keep connections alive for 30 seconds
        timeout_graceful_shutdown=30,  # Graceful shutdown timeout
    ) 