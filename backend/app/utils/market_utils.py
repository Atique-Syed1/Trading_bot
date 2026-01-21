"""
Market Utils
Utilities for checking market status and hours (NSE India).
"""
from datetime import datetime
from typing import Dict

def get_market_status() -> Dict:
    """Check if Indian market is open"""
    now = datetime.now()
    weekday = now.weekday()
    hour = now.hour
    minute = now.minute
    
    # Market hours: 9:15 AM - 3:30 PM IST, Monday-Friday
    is_weekday = weekday < 5
    current_time = hour * 60 + minute
    market_open = 9 * 60 + 15  # 9:15 AM
    market_close = 15 * 60 + 30  # 3:30 PM
    
    is_open = is_weekday and market_open <= current_time <= market_close
    
    if is_open:
        status = "open"
        message = "Market is Open"
    elif is_weekday and current_time < market_open:
        status = "pre-market"
        message = f"Opens at 9:15 AM"
    elif is_weekday and current_time > market_close:
        status = "closed"
        message = "Market Closed"
    else:
        status = "closed"
        message = "Weekend - Market Closed"
    
    return {
        "status": status,
        "message": message,
        "time": now.strftime("%H:%M:%S"),
        "date": now.strftime("%Y-%m-%d")
    }
