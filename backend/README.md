# HalalTrade Pro - Backend

FastAPI-based backend for Shariah-compliant stock scanning and analysis.

## Features

- 📊 Real-time stock scanning with RSI/SMA analysis
- 🕌 Shariah compliance checking
- 📈 Multi-strategy backtesting (RSI+SMA, MACD, Bollinger, MA Crossover)
- 📱 Telegram alerts integration
- 🔌 WebSocket for live price streaming

## Quick Start

```bash
# Install dependencies
pip install -r requirements.txt

# Run server
python -m app.main

# Or with uvicorn directly
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## Project Structure

```
backend/
├── app/
│   ├── main.py           # FastAPI entry point
│   ├── config.py         # Settings & constants
│   ├── routers/          # API endpoints
│   │   ├── scan.py       # Stock scanning
│   │   ├── stocks.py     # Stock list management
│   │   ├── backtest.py   # Backtesting
│   │   └── telegram.py   # Telegram alerts
│   ├── services/         # Business logic
│   │   ├── stock_service.py
│   │   ├── backtest_service.py
│   │   └── telegram_service.py
│   └── utils/
│       └── indicators.py # Technical indicators
└── requirements.txt
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/scan` | GET | Scan all stocks |
| `/api/stocks/list` | GET | Get active stock list |
| `/api/stocks/upload` | POST | Upload CSV |
| `/api/backtest` | POST | Run backtest |
| `/api/strategies` | GET | List strategies |
| `/api/telegram/config` | POST | Configure Telegram |
| `/ws/prices` | WebSocket | Live price stream |
