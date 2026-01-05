"""
HalalTrade Pro - Configuration Settings
"""
import os
from pathlib import Path

# ====================================================================
# PATHS
# ====================================================================
BASE_DIR = Path(__file__).resolve().parent.parent.parent
DATA_DIR = BASE_DIR / "data"
CSV_FILE = DATA_DIR / "nse_stocks.csv"

# ====================================================================
# API SETTINGS
# ====================================================================
API_HOST = os.getenv("API_HOST", "0.0.0.0")
API_PORT = int(os.getenv("API_PORT", "8000"))

# CORS Origins
CORS_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
]

# ====================================================================
# WEBSOCKET SETTINGS
# ====================================================================
WS_UPDATE_INTERVAL = 30  # seconds between price updates
WS_BATCH_SIZE = 25       # stocks per batch to avoid rate limiting

# ====================================================================
# SHARIAH COMPLIANCE THRESHOLDS
# ====================================================================
MAX_DEBT_RATIO = 33.0    # Maximum debt to market cap ratio (%)
MAX_CASH_RATIO = 33.0    # Maximum cash & interest to revenue ratio (%)

# ====================================================================
# TRADING STRATEGIES DEFAULT PARAMS
# ====================================================================
RSI_PERIOD = 14
RSI_OVERSOLD = 30
RSI_OVERBOUGHT = 70

SMA_PERIOD = 50

MACD_FAST = 12
MACD_SLOW = 26
MACD_SIGNAL = 9

BOLLINGER_PERIOD = 20
BOLLINGER_STD = 2.0

MA_FAST = 10
MA_SLOW = 50

# ====================================================================
# DEFAULT STOCK LIST (fallback if no CSV)
# ====================================================================
DEFAULT_STOCKS = [
    "RELIANCE.NS", "TCS.NS", "HDFCBANK.NS", "INFY.NS", "ITC.NS",
    "HINDUNILVR.NS", "BAJFINANCE.NS", "ASIANPAINT.NS", "MARUTI.NS",
    "TITAN.NS", "SUNPHARMA.NS"
]

# ====================================================================
# TELEGRAM SETTINGS
# ====================================================================
TELEGRAM_CONFIG = {
    "enabled": False,
    "bot_token": None,
    "chat_id": None
}
