from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from sqlmodel import Session
from ..database import get_session
from ..services import telegram_service
from ..services.stock_service import cached_stock_data

router = APIRouter(prefix="/api/telegram", tags=["telegram"])

class TelegramConfig(BaseModel):
    bot_token: str
    chat_id: str
    enabled: bool = True

@router.get("/config")
def get_config(session: Session = Depends(get_session)):
    """Get current Telegram configuration"""
    return telegram_service.get_telegram_config(session)

@router.post("/config")
def set_config(config: TelegramConfig, session: Session = Depends(get_session)):
    """Configure Telegram bot"""
    telegram_service.configure_telegram(config.bot_token, config.chat_id, config.enabled, session)
    return {
        "success": True,
        "enabled": config.enabled,
        "configured": True
    }

@router.post("/test")
async def test_telegram(session: Session = Depends(get_session)):
    """Send a test message to verify Telegram setup"""
    result = await telegram_service.send_test_message(session)
    return result

@router.post("/alert/{symbol}")
async def send_alert(symbol: str, session: Session = Depends(get_session)):
    """Send an alert for a specific stock"""
    if not telegram_service.is_telegram_enabled(session):
        return {"success": False, "error": "Telegram not configured or disabled"}
    
    # Get stock data from cache
    stock = cached_stock_data.get(symbol)
    if not stock:
        return {"success": False, "error": f"Stock {symbol} not found. Run a scan first."}
    
    result = await telegram_service.send_stock_alert(
        symbol=stock["symbol"],
        name=stock["name"],
        price=stock["price"],
        signal=stock["technicals"]["signal"],
        rsi=stock["technicals"]["rsi"],
        target=stock["technicals"].get("tp"),
        stop_loss=stock["technicals"].get("sl"),
        session=session
    )
    
    return result

@router.post("/disable")
def disable_telegram(session: Session = Depends(get_session)):
    """Disable Telegram alerts"""
    telegram_service.configure_telegram("", "", False, session)
    return {"success": True, "enabled": False}

