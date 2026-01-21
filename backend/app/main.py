"""
HalalTrade Pro - Backend API
Main entry point for FastAPI application
"""
import asyncio
import time
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse

from .config import API_HOST, API_PORT, CORS_ORIGINS, WS_UPDATE_INTERVAL
from .services.stock_service import load_csv_stocks, fetch_live_prices
from .services.performance_service import performance_tracker
from .routers import scan, stocks, backtest, telegram, portfolio, alerts, news, ai, watchlist, dashboard, market, ipo, analytics
from .database import create_db_and_tables
from .middleware import RateLimitMiddleware

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Track application start time for uptime calculation
start_time = time.time()


# ====================================================================
# WEBSOCKET CONNECTION MANAGER
# ====================================================================
from .services.websocket_manager import manager


# ====================================================================
# BACKGROUND PRICE UPDATER
# ====================================================================
from .services.background_tasks import price_updater


# ====================================================================
# APP LIFECYCLE
# ====================================================================
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("=" * 60)
    print("🕌 HalalTrade Pro API Starting...")
    print("=" * 60)
    
    try:
        # Create DB tables
        create_db_and_tables()
        
        # Load CSV stocks
        load_csv_stocks()
        
        # Start background price updater
        updater_task = asyncio.create_task(price_updater())
        
        print(f"✅ Server ready at http://{API_HOST}:{API_PORT}")
        print("=" * 60)
        
        yield
    except Exception as e:
        print(f"❌ CRITICAL ERROR DURING STARTUP: {e}")
        import traceback
        traceback.print_exc()
        raise e
    finally:
        if 'updater_task' in locals() and not updater_task.done():
            updater_task.cancel()
    
    # Shutdown (if not handled by finally block for some reason)
    try:
        if 'updater_task' in locals() and not updater_task.done():
            updater_task.cancel()
    except Exception:
        pass
        
    print("\n👋 HalalTrade Pro API Shutting down...")


# ====================================================================
# CREATE APP
# ====================================================================
app = FastAPI(
    title="HalalTrade Pro API",
    description="Shariah-compliant stock scanner with technical analysis and backtesting",
    version="2.0.0",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# GZip Compression (instant 70% size reduction)
app.add_middleware(GZipMiddleware, minimum_size=1000)

# Request Logging & Performance Tracking
@app.middleware("http")
async def log_requests(request: Request, call_next):
    request_id = str(time.time())
    start_time = time.time()
    
    # Log incoming request
    logger.info(f"[{request_id}] → {request.method} {request.url.path}")
    
    try:
        response = await call_next(request)
        duration = (time.time() - start_time) * 1000  # Convert to ms
        
        # Track performance metrics
        performance_tracker.record_request(
            endpoint=f"{request.method} {request.url.path}",
            duration_ms=duration,
            status_code=response.status_code
        )
        
        # Add performance headers
        response.headers["X-Request-ID"] = request_id
        response.headers["X-Response-Time"] = f"{duration:.2f}ms"
        
        # Log response
        status_emoji = "✅" if response.status_code < 400 else "❌"
        logger.info(f"[{request_id}] {status_emoji} {request.method} {request.url.path} - {response.status_code} - {duration:.2f}ms")
        
        return response
    except Exception as e:
        duration = (time.time() - start_time) * 1000
        
        # Track error
        performance_tracker.record_request(
            endpoint=f"{request.method} {request.url.path}",
            duration_ms=duration,
            status_code=500
        )
        
        logger.error(f"[{request_id}] ❌ {request.method} {request.url.path} - ERROR - {duration:.2f}ms - {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal server error", "request_id": request_id}
        )

# Rate Limiting Middleware
app.add_middleware(
    RateLimitMiddleware,
    requests_per_minute=120,  # 120 requests per minute per IP
    requests_per_second=10,   # Max 10 requests per second burst
    burst_size=20,            # Allow bursts of up to 20 requests
    exclude_paths=["/health", "/docs", "/openapi.json", "/api/ws"]
)

# Include Routers
app.include_router(scan.router)
app.include_router(stocks.router)
app.include_router(backtest.router)
app.include_router(telegram.router)
app.include_router(portfolio.router)
app.include_router(alerts.router)
app.include_router(news.router)
app.include_router(ai.router)
app.include_router(watchlist.router)
app.include_router(dashboard.router)
app.include_router(market.router)
app.include_router(ipo.router)
app.include_router(analytics.router)


# ====================================================================
# HEALTH & ROOT ENDPOINTS
# ====================================================================
@app.get("/")
def root():
    return {
        "app": "HalalTrade Pro API",
        "version": "2.0.0",
        "status": "running",
        "features": ["rate_limiting", "websocket", "alerts", "ai_analysis", "compression", "logging"]
    }


@app.get("/health")
@app.get("/api/health")
def health_check():
    import psutil
    import sys
    from datetime import datetime
    
    # Get system metrics
    cpu_percent = psutil.cpu_percent(interval=0.1)
    memory = psutil.virtual_memory()
    disk = psutil.disk_usage('/')
    
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "version": "2.0.0",
        "uptime_seconds": int(time.time() - start_time),
        "websocket": {
            "active_connections": len(manager.active_connections),
            "status": "operational"
        },
        "system": {
            "cpu_percent": cpu_percent,
            "memory_percent": memory.percent,
            "memory_available_mb": memory.available / (1024 * 1024),
            "disk_percent": disk.percent,
            "python_version": sys.version.split()[0]
        },
        "features": {
            "rate_limiting": "enabled",
            "compression": "gzip",
            "logging": "enabled",
            "websocket": "enabled"
        }
    }


@app.get("/api/metrics")
def get_metrics():
    """Get performance metrics for all endpoints"""
    return {
        "all_endpoints": performance_tracker.get_all_stats(),
        "slow_queries": performance_tracker.get_slow_queries(limit=20),
        "top_slow_endpoints": performance_tracker.get_top_slow_endpoints(limit=10),
        "error_summary": performance_tracker.get_error_summary()
    }


@app.get("/api/metrics/{endpoint:path}")
def get_endpoint_metrics(endpoint: str):
    """Get performance metrics for a specific endpoint"""
    return performance_tracker.get_endpoint_stats(f"GET /{endpoint}")


@app.get("/api/cache-stats")
def get_cache_stats():
    """Get cache performance statistics"""
    from app.utils.cache import stock_data_cache, history_cache, ai_cache
    
    return {
        "stock_data": stock_data_cache.get_stats(),
        "history": history_cache.get_stats(),
        "ai_responses": ai_cache.get_stats(),
        "total_memory_items": (
            stock_data_cache.get_stats()["size"] +
            history_cache.get_stats()["size"] +
            ai_cache.get_stats()["size"]
        )
    }


# ====================================================================
# WEBSOCKET ENDPOINT
# ====================================================================
@app.websocket("/ws/prices")
async def websocket_prices(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Keep connection alive
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception:
        manager.disconnect(websocket)


# ====================================================================
# RUN SERVER
# ====================================================================
if __name__ == "__main__":
    import uvicorn
    import sys
    try:
        print(f"🚀 Attempting to start server on {API_HOST}:{API_PORT}...")
        uvicorn.run(app, host=API_HOST, port=API_PORT, log_level="info")
    except Exception as e:
        print(f"❌ FAILED TO START SERVER: {e}")
        if "10048" in str(e):
            print(f"⚠️ PORT {API_PORT} IS ALREADY IN USE!")
            print("Please kill the existing process or change API_PORT in config.py")
        sys.exit(1)
