"""Internal service-token auth (design §9, §17).

The pdf-service is called server-to-server by the NestJS API only; it is never exposed
publicly. Every request must carry the shared rotating internal token.
"""
from fastapi import Header, HTTPException, status
from app.config import settings


async def require_internal_token(x_internal_token: str = Header(default="")) -> None:
    if x_internal_token != settings.internal_service_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing internal service token",
        )
