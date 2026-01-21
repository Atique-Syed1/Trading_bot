"""
Network Utils
Common network-related utility functions.
"""
from fastapi import Request

def get_client_ip(request: Request) -> str:
    """
    Extract client IP from request, handling proxies and forwarded headers.
    """
    # Check for forwarded headers (common in production behind proxy)
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    
    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip
        
    return request.client.host if request.client else "unknown"
