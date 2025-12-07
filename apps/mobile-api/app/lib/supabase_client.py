"""
Async Supabase client manager for FormAI Service.
Manages per-worker httpx.AsyncClient instances via FastAPI lifespan.
"""

import httpx
from fastapi import FastAPI, Request
from config import settings


def create_supabase_client(api_key: str) -> httpx.AsyncClient:
    """Factory to create an Async Supabase client with connection pooling."""
    return httpx.AsyncClient(
        base_url=settings.SUPABASE_URL,
        headers={
            "apikey": api_key,
            "Authorization": f"Bearer {api_key}",
            "X-Client-Info": "formai-service/1.0.0",
        },
        timeout=httpx.Timeout(10.0, connect=5.0),
        limits=httpx.Limits(
            max_connections=100,  # tune based on expected concurrency
            max_keepalive_connections=20,
            keepalive_expiry=30.0,
        ),
    )


async def init_supabase_clients(app: FastAPI):
    """Initialize Supabase clients and attach them to app.state."""
    app.state.supabase_user = create_supabase_client(settings.SUPABASE_API_KEY)
    app.state.supabase_admin = create_supabase_client(settings.SUPABASE_SERVICE_ROLE_KEY)


async def close_supabase_clients(app: FastAPI):
    """Close Supabase clients on shutdown."""
    if hasattr(app.state, "supabase_user"):
        await app.state.supabase_user.aclose()
    if hasattr(app.state, "supabase_admin"):
        await app.state.supabase_admin.aclose()


# Dependency helpers for routes
async def get_supabase_user_client(request: Request) -> httpx.AsyncClient:
    """FastAPI dependency to get the Supabase user client from app.state."""
    return request.app.state.supabase_user


async def get_supabase_admin_client(request: Request) -> httpx.AsyncClient:
    """FastAPI dependency to get the Supabase admin client from app.state."""
    return request.app.state.supabase_admin
