"""
HalalTrade Pro - Backend API
Main entry point for FastAPI application
"""
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from .config import API_HOST, API_PORT, CORS_ORIGINS, WS_UPDATE_INTERVAL
from .services.stock_service import load_csv_stocks, fetch_live_prices
from .routers import scan, stocks, backtest, telegram, portfolio, alerts, news, ai


# ====================================================================
# WEBSOCKET CONNECTION MANAGER
# ====================================================================
class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        print(f"[WS] Client connected. Total: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        print(f"[WS] Client disconnected. Total: {len(self.active_connections)}")

    async def broadcast(self, message: dict):
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception:
                disconnected.append(connection)
        
        for conn in disconnected:
            self.disconnect(conn)


manager = ConnectionManager()


# ====================================================================
# BACKGROUND PRICE UPDATER
# ====================================================================
async def price_updater():
    """Background task to fetch prices, check alerts, and broadcast updates"""
    from .services import alert_service, telegram_service
    
    while True:
        try:
            # Fetch live prices even if no clients connected (for alerts)
            # But optimize: if no clients and no alerts, maybe snooze?
            # For now, keep running
            prices = await fetch_live_prices()
            
            if prices:
                # 1. Check Alerts
                try:
                    triggered = alert_service.check_alerts(prices)
                    for alert in triggered:
                        print(f"🔔 ALERT TRIGGERED: {alert['symbol']} {alert['condition']} {alert['price']}")
                        # Send telegram notification
                        try:
                            msg = (f"🔔 *PRICE ALERT*\n\n"
                                   f"*{alert['symbol']}* is {alert['condition']}\n"
                                   f"Target: ₹{alert['price']}\n"
                                   f"Current: ₹{prices.get(alert['symbol'], 0)}")
                            await telegram_service.send_telegram_alert(msg)
                        except Exception as tg_err:
                            print(f"[Alert] Telegram failed: {tg_err}")
                except Exception as alert_err:
                    print(f"[Alert] Check failed: {alert_err}")

                # 2. Broadcast to WebSocket clients
                if manager.active_connections:
                    await manager.broadcast({
                        "type": "price_update",
                        "data": prices
                    })
                    print(f"[WS] Broadcasted updates")
        except Exception as e:
            print(f"[Data] Update cycle error: {e}")
        
        await asyncio.sleep(WS_UPDATE_INTERVAL)


# ====================================================================
# APP LIFECYCLE
# ====================================================================
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("=" * 60)
    print("🕌 HalalTrade Pro API Starting...")
    print("=" * 60)
    
    # Load CSV stocks
    load_csv_stocks()
    
    # Start background price updater
    updater_task = asyncio.create_task(price_updater())
    
    print(f"✅ Server ready at http://{API_HOST}:{API_PORT}")
    print("=" * 60)
    
    yield
    
    # Shutdown
    updater_task.cancel()
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

# Include Routers
app.include_router(scan.router)
app.include_router(stocks.router)
app.include_router(backtest.router)
app.include_router(telegram.router)
app.include_router(portfolio.router)
app.include_router(alerts.router)
app.include_router(news.router)
app.include_router(ai.router)


# ====================================================================
# HEALTH & ROOT ENDPOINTS
# ====================================================================
@app.get("/")
def root():
    return {
        "app": "HalalTrade Pro API",
        "version": "2.0.0",
        "status": "running"
    }


@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "websocket_clients": len(manager.active_connections)
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
    uvicorn.run(app, host=API_HOST, port=API_PORT)
