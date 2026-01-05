"""
Telegram Router - Telegram bot configuration and alert endpoints
"""
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional

from ..services.telegram_service import (
    configure_telegram,
    get_telegram_config,
    send_test_message,
    send_stock_alert,
    is_telegram_enabled
)
from ..services.stock_service import cached_stock_data

router = APIRouter(prefix="/api/telegram", tags=["telegram"])


class TelegramConfig(BaseModel):
    bot_token: str
    chat_id: str
    enabled: bool = True


@router.get("/config")
def get_config():
    """Get current Telegram configuration"""
    return get_telegram_config()


@router.post("/config")
def set_config(config: TelegramConfig):
    """Configure Telegram bot"""
    configure_telegram(config.bot_token, config.chat_id, config.enabled)
    return {
        "success": True,
        "enabled": config.enabled,
        "configured": True
    }


@router.post("/test")
async def test_telegram():
    """Send a test message to verify Telegram setup"""
    result = await send_test_message()
    return result


@router.post("/alert/{symbol}")
async def send_alert(symbol: str):
    """Send an alert for a specific stock"""
    if not is_telegram_enabled():
        return {"success": False, "error": "Telegram not configured or disabled"}
    
    # Get stock data from cache
    stock = cached_stock_data.get(symbol)
    if not stock:
        return {"success": False, "error": f"Stock {symbol} not found. Run a scan first."}
    
    result = await send_stock_alert(
        symbol=stock["symbol"],
        name=stock["name"],
        price=stock["price"],
        signal=stock["technicals"]["signal"],
        rsi=stock["technicals"]["rsi"],
        target=stock["technicals"].get("tp"),
        stop_loss=stock["technicals"].get("sl")
    )
    
    return result


@router.post("/disable")
def disable_telegram():
    """Disable Telegram alerts"""
    configure_telegram("", "", False)
    return {"success": True, "enabled": False}
