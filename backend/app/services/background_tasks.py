"""
Background Tasks Service
Runs background loops for price updates and alerts.
"""
import asyncio
from sqlmodel import Session
from ..config import WS_UPDATE_INTERVAL
from ..database import engine
from ..services.stock_service import fetch_live_prices, cached_stock_data
from ..services import alert_service, telegram_service
from ..services.websocket_manager import manager

async def _process_alerts(prices: dict, session: Session):
    """Check and process alerts"""
    try:
        triggered = alert_service.check_alerts(prices, session)
        for alert in triggered:
            print(f"🔔 ALERT TRIGGERED: {alert.symbol} {alert.condition} {alert.target_price}")
            
            # Get stock data for RSI alerts if needed
            stock_data = None
            if getattr(alert, "metric", "PRICE") == "RSI":
                clean_symbol = alert.symbol.replace('.NS', '')
                stock_data = cached_stock_data.get(clean_symbol) or cached_stock_data.get(alert.symbol)
            
            # Send notification
            await telegram_service.format_and_send_alert(alert, prices.get(alert.symbol, 0), stock_data)
            
    except Exception as alert_err:
        print(f"[Alert] Check failed: {alert_err}")

async def _broadcast_prices(prices: dict):
    """Broadcast price updates to connected clients"""
    if manager.active_connections:
        await manager.broadcast({
            "type": "price_update",
            "data": prices
        })

async def price_updater():
    """Background task to fetch prices, check alerts, and broadcast updates"""
    print(f"[Background] Starting price updater task (Interval: {WS_UPDATE_INTERVAL}s)")
    
    while True:
        try:
            # Fetch live prices even if no clients connected (for alerts)
            prices = await fetch_live_prices()
            
            if prices:
                with Session(engine) as session:
                    await _process_alerts(prices, session)
                
                await _broadcast_prices(prices)
                
        except Exception as e:
            print(f"[Data] Update cycle error: {e}")
        
        await asyncio.sleep(WS_UPDATE_INTERVAL)
