import httpx
from typing import Optional
from sqlmodel import Session
from . import settings_service
from ..database import engine

def configure_telegram(bot_token: str, chat_id: str, enabled: bool, session: Session):
    """Configure Telegram bot settings"""
    settings_service.set_setting("tg_bot_token", bot_token, session)
    settings_service.set_setting("tg_chat_id", chat_id, session)
    settings_service.set_setting("tg_enabled", "true" if enabled else "false", session)

def get_telegram_config(session: Session) -> dict:
    """Get current Telegram configuration (masked)"""
    token = settings_service.get_setting("tg_bot_token", session)
    chat_id = settings_service.get_setting("tg_chat_id", session)
    enabled = settings_service.get_setting("tg_enabled", session) == "true"
    
    return {
        "enabled": enabled,
        "configured": bool(token and chat_id),
        "chat_id": chat_id[-4:] if chat_id else None
    }

async def send_telegram_message(message: str, session: Optional[Session] = None) -> dict:
    """Send a message via Telegram Bot API"""
    if session:
        token = settings_service.get_setting("tg_bot_token", session)
        chat_id = settings_service.get_setting("tg_chat_id", session)
        enabled = settings_service.get_setting("tg_enabled", session) == "true"
    else:
        # Fallback to creating a one-off session if none provided
        with Session(engine) as session:
            token = settings_service.get_setting("tg_bot_token", session)
            chat_id = settings_service.get_setting("tg_chat_id", session)
            enabled = settings_service.get_setting("tg_enabled", session) == "true"

    if not enabled or not token or not chat_id:
        return {"success": False, "error": "Telegram not configured or disabled"}
    
    url = f"https://api.telegram.org/bot{token}/sendMessage"
    payload = {
        "chat_id": chat_id,
        "text": message,
        "parse_mode": "HTML"
    }
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=payload, timeout=10)
            result = response.json()
            
            if result.get("ok"):
                return {"success": True, "message_id": result["result"]["message_id"]}
            else:
                return {"success": False, "error": result.get("description", "Unknown error")}
                
    except Exception as e:
        return {"success": False, "error": str(e)}

async def send_test_message(session: Session) -> dict:
    """Send a test message to verify Telegram setup"""
    message = """
🔔 <b>HalalTrade Pro Alert Test</b>

✅ Your Telegram integration is working!

You will receive alerts when:
• Halal stocks hit Buy signals
• RSI enters oversold territory
• Important market events occur

<i>Configured from HalalTrade Pro Dashboard</i>
"""
    return await send_telegram_message(message.strip(), session)

async def send_stock_alert(
    symbol: str,
    name: str,
    price: float,
    signal: str,
    rsi: float,
    target: Optional[float] = None,
    stop_loss: Optional[float] = None,
    session: Optional[Session] = None
) -> dict:
    """Send a stock alert via Telegram"""
    emoji = "🟢" if signal == "Buy" else "🔴" if signal == "Sell" else "🟡"
    
    message = f"""
{emoji} <b>HalalTrade Alert: {symbol}</b>

📊 <b>{name}</b>
💰 Price: ₹{price}
📈 Signal: <b>{signal}</b>
📉 RSI: {rsi}
"""
    
    if target:
        message += f"🎯 Target: ₹{target}\n"
    if stop_loss:
        message += f"🛑 Stop Loss: ₹{stop_loss}\n"
    
    message += "\n<i>— HalalTrade Pro</i>"
    
    return await send_telegram_message(message.strip(), session)

async def send_telegram_alert(message: str, session: Optional[Session] = None) -> dict:
    """Explicitly send a telegram alert (alias for send_telegram_message)"""
    return await send_telegram_message(message, session)

def is_telegram_enabled(session: Session) -> bool:

    """Check if Telegram is enabled and configured"""
    token = settings_service.get_setting("tg_bot_token", session)
    chat_id = settings_service.get_setting("tg_chat_id", session)
    enabled = settings_service.get_setting("tg_enabled", session) == "true"
    return enabled and bool(token) and bool(chat_id)

