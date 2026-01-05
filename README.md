# HalalTrade Pro 🕌

A Shariah-compliant stock scanner with real-time price streaming, technical analysis, and backtesting.

![HalalTrade Pro](https://img.shields.io/badge/Made%20with-React%20%2B%20FastAPI-blue?style=flat-square)

## ✨ Features

| Feature | Description |
|---------|-------------|
| 📊 **Real-time Scanning** | Live price updates via WebSocket |
| 🕌 **Shariah Compliance** | Automatic Halal/Non-Halal classification |
| 📈 **Technical Analysis** | RSI, MACD, Bollinger Bands signals |
| 📝 **Backtesting** | Test 4 different trading strategies |
| ⭐ **Watchlist** | Save favorite stocks locally |
| 📱 **Telegram Alerts** | Get notified on buy signals |
| 📋 **CSV Import** | Load custom stock lists |
| 📄 **Export** | Download reports as CSV/PDF |

---

## 🚀 Quick Start

### Prerequisites
- Python 3.10+
- Node.js 18+

### 1. Clone & Install

```bash
# Clone the repo
git clone <your-repo-url>
cd tradebot

# Install backend dependencies
cd backend
pip install -r requirements.txt

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Run the App

**Terminal 1 - Backend:**
```bash
cd backend
python -m app.main
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

### 3. Open Browser
Navigate to: **http://localhost:5173**

---

## 📁 Project Structure

```
tradebot/
├── backend/                 # Python FastAPI backend
│   ├── app/
│   │   ├── main.py         # Server entry point
│   │   ├── config.py       # Settings & constants
│   │   ├── routers/        # API endpoints
│   │   ├── services/       # Business logic
│   │   └── utils/          # Indicators & helpers
│   └── requirements.txt
│
├── frontend/               # React Vite frontend
│   ├── src/
│   │   ├── components/     # UI components
│   │   │   ├── common/     # Shared components
│   │   │   ├── scanner/    # Scanner components
│   │   │   ├── backtest/   # Backtest modal
│   │   │   └── settings/   # Settings modals
│   │   ├── config/         # API configuration
│   │   ├── hooks/          # Custom React hooks
│   │   └── utils/          # Export utilities
│   └── package.json
│
├── data/
│   └── nse_stocks.csv      # Default stock list
│
└── README.md
```

---

## 📡 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/scan` | GET | Scan all stocks |
| `/api/stocks/list` | GET | Get current stock list |
| `/api/stocks/upload` | POST | Upload CSV file |
| `/api/backtest` | POST | Run backtest |
| `/api/strategies` | GET | List strategies |
| `/api/telegram/config` | POST | Configure Telegram |
| `/ws/prices` | WS | Live price stream |

---

## 🧪 Trading Strategies

| Strategy | Description |
|----------|-------------|
| **RSI + SMA50** | Buy when RSI < 30 and price > SMA50 |
| **MACD Crossover** | Buy on bullish histogram crossover |
| **Bollinger Bands** | Buy at lower band, sell at upper |
| **MA Crossover** | Golden cross (fast > slow) = buy |

---

## 📱 Telegram Setup

1. Message [@BotFather](https://t.me/BotFather) on Telegram
2. Send `/newbot` and follow prompts
3. Copy the Bot Token
4. Message [@userinfobot](https://t.me/userinfobot) to get your Chat ID
5. Enter both in the app's Telegram Settings

---

## 🔧 Environment Variables

Create a `.env.local` file in `/frontend`:

```env
VITE_API_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000
```

---

## 📄 License

MIT License - Feel free to use and modify!

---

Made with ❤️ for the Muslim trading community