"""
Rate Limiting Middleware for FastAPI
Protects API from abuse with configurable limits per IP
"""
import time
from collections import defaultdict
from typing import Callable, Dict, Tuple
from fastapi import Request, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Token bucket rate limiter middleware.
    Limits requests per IP address with configurable rates.
    """
    
    def __init__(
        self,
        app,
        requests_per_minute: int = 60,
        requests_per_second: int = 10,
        burst_size: int = 20,
        exclude_paths: list = None
    ):
        super().__init__(app)
        self.requests_per_minute = requests_per_minute
        self.requests_per_second = requests_per_second
        self.burst_size = burst_size
        self.exclude_paths = exclude_paths or ["/health", "/docs", "/openapi.json"]
        
        # Token buckets per IP: {ip: (tokens, last_update_time)}
        self.buckets: Dict[str, Tuple[float, float]] = defaultdict(lambda: (burst_size, time.time()))
        
        # Per-minute tracking: {ip: [(timestamp, ...]}
        self.minute_requests: Dict[str, list] = defaultdict(list)
        
    def _get_client_ip(self, request: Request) -> str:
        """Extract client IP from request"""
        from ..utils.network_utils import get_client_ip
        return get_client_ip(request)
    
    def _check_rate_limit(self, ip: str) -> Tuple[bool, str, int]:
        """
        Check if request is allowed using token bucket algorithm.
        Returns: (allowed, reason, retry_after_seconds)
        """
        now = time.time()
        
        # 1. Check per-minute limit
        minute_ago = now - 60
        self.minute_requests[ip] = [t for t in self.minute_requests[ip] if t > minute_ago]
        
        if len(self.minute_requests[ip]) >= self.requests_per_minute:
            oldest = min(self.minute_requests[ip])
            retry_after = int(oldest + 60 - now) + 1
            return False, "Too many requests. Rate limit exceeded.", retry_after
        
        # 2. Token bucket for burst control
        tokens, last_update = self.buckets[ip]
        
        # Refill tokens based on time passed
        time_passed = now - last_update
        tokens = min(self.burst_size, tokens + time_passed * self.requests_per_second)
        
        if tokens < 1:
            retry_after = int((1 - tokens) / self.requests_per_second) + 1
            return False, "Rate limit exceeded. Please slow down.", retry_after
        
        # Consume a token
        tokens -= 1
        self.buckets[ip] = (tokens, now)
        self.minute_requests[ip].append(now)
        
        return True, "", 0
    
    def _cleanup_old_entries(self):
        """Periodically clean up old tracking data"""
        now = time.time()
        cutoff = now - 120  # 2 minutes
        
        # Clean minute requests
        for ip in list(self.minute_requests.keys()):
            self.minute_requests[ip] = [t for t in self.minute_requests[ip] if t > cutoff]
            if not self.minute_requests[ip]:
                del self.minute_requests[ip]
        
        # Clean buckets older than 5 minutes
        bucket_cutoff = now - 300
        for ip in list(self.buckets.keys()):
            if self.buckets[ip][1] < bucket_cutoff:
                del self.buckets[ip]
    
    async def dispatch(self, request: Request, call_next: Callable):
        # Skip rate limiting for excluded paths
        path = request.url.path
        if any(path.startswith(excluded) for excluded in self.exclude_paths):
            return await call_next(request)
        
        # Skip WebSocket connections
        if request.headers.get("upgrade", "").lower() == "websocket":
            return await call_next(request)
        
        # Get client IP
        client_ip = self._get_client_ip(request)
        
        # Check rate limit
        allowed, reason, retry_after = self._check_rate_limit(client_ip)
        
        if not allowed:
            # Cleanup occasionally
            self._cleanup_old_entries()
            
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={
                    "error": "rate_limit_exceeded",
                    "message": reason,
                    "retry_after": retry_after
                },
                headers={
                    "Retry-After": str(retry_after),
                    "X-RateLimit-Limit": str(self.requests_per_minute),
                    "X-RateLimit-Remaining": "0"
                }
            )
        
        # Process request
        response = await call_next(request)
        
        # Add rate limit headers
        remaining = self.requests_per_minute - len(self.minute_requests[client_ip])
        response.headers["X-RateLimit-Limit"] = str(self.requests_per_minute)
        response.headers["X-RateLimit-Remaining"] = str(max(0, remaining))
        
        return response


class EndpointRateLimiter:
    """
    Decorator-based rate limiter for specific endpoints.
    Use when you need different limits for different endpoints.
    """
    
    def __init__(self, requests: int = 10, window_seconds: int = 60):
        self.requests = requests
        self.window = window_seconds
        self.requests_log: Dict[str, list] = defaultdict(list)
    
    def _get_key(self, request: Request, endpoint: str) -> str:
        """Create a unique key per IP + endpoint"""
        from ..utils.network_utils import get_client_ip
        ip = get_client_ip(request)
        return f"{ip}:{endpoint}"
    
    def check(self, request: Request, endpoint: str) -> bool:
        """Check if request is allowed"""
        key = self._get_key(request, endpoint)
        now = time.time()
        cutoff = now - self.window
        
        # Clean old entries
        self.requests_log[key] = [t for t in self.requests_log[key] if t > cutoff]
        
        if len(self.requests_log[key]) >= self.requests:
            return False
        
        self.requests_log[key].append(now)
        return True
    
    def get_retry_after(self, request: Request, endpoint: str) -> int:
        """Get seconds until next request is allowed"""
        key = self._get_key(request, endpoint)
        if not self.requests_log[key]:
            return 0
        oldest = min(self.requests_log[key])
        return int(oldest + self.window - time.time()) + 1


# Create singleton instances for specific endpoints
ai_rate_limiter = EndpointRateLimiter(requests=10, window_seconds=60)  # 10 AI requests per minute
scan_rate_limiter = EndpointRateLimiter(requests=30, window_seconds=60)  # 30 scans per minute
