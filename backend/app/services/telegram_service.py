"""
Telegram Service - Telegram bot integration for alerts
"""
import httpx
from typing import Optional

from ..config import TELEGRAM_CONFIG


def configure_telegram(bot_token: str, chat_id: str, enabled: bool = True):
    """Configure Telegram bot settings"""
    TELEGRAM_CONFIG["bot_token"] = bot_token
    TELEGRAM_CONFIG["chat_id"] = chat_id
    TELEGRAM_CONFIG["enabled"] = enabled


def get_telegram_config() -> dict:
    """Get current Telegram configuration (masked)"""
    return {
        "enabled": TELEGRAM_CONFIG["enabled"],
        "configured": bool(TELEGRAM_CONFIG["bot_token"] and TELEGRAM_CONFIG["chat_id"]),
        "chat_id": TELEGRAM_CONFIG["chat_id"][-4:] if TELEGRAM_CONFIG["chat_id"] else None
    }


async def send_telegram_message(message: str) -> dict:
    """Send a message via Telegram Bot API"""
    if not TELEGRAM_CONFIG["bot_token"] or not TELEGRAM_CONFIG["chat_id"]:
        return {"success": False, "error": "Telegram not configured"}
    
    url = f"https://api.telegram.org/bot{TELEGRAM_CONFIG['bot_token']}/sendMessage"
    payload = {
        "chat_id": TELEGRAM_CONFIG["chat_id"],
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


async def send_test_message() -> dict:
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
    return await send_telegram_message(message.strip())


async def send_stock_alert(
    symbol: str,
    name: str,
    price: float,
    signal: str,
    rsi: float,
    target: Optional[float] = None,
    stop_loss: Optional[float] = None
) -> dict:
    """Send a stock alert via Telegram"""
    if not TELEGRAM_CONFIG["enabled"]:
        return {"success": False, "error": "Telegram alerts disabled"}
    
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
    
    return await send_telegram_message(message.strip())


def is_telegram_enabled() -> bool:
    """Check if Telegram is enabled and configured"""
    return (
        TELEGRAM_CONFIG["enabled"] and
        bool(TELEGRAM_CONFIG["bot_token"]) and
        bool(TELEGRAM_CONFIG["chat_id"])
    )
