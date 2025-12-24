import yfinance as yf
import pandas as pd
import numpy as np
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import asyncio
import json
import os
from typing import List, Optional
import httpx
from pydantic import BaseModel

app = FastAPI()

# Allow your React app to connect to this server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- CONFIGURATION ---
# Default watchlist (can be overridden by CSV import)
DEFAULT_WATCHLIST = [
    "RELIANCE.NS", "TCS.NS", "HDFCBANK.NS", "INFY.NS", "ITC.NS",
    "HINDUNILVR.NS", "BAJFINANCE.NS", "ASIANPAINT.NS", "MARUTI.NS",
    "TITAN.NS", "SUNPHARMA.NS", "ULTRACEMCO.NS", "POWERGRID.NS",
    "NTPC.NS", "M&M.NS", "CIPLA.NS", "SBIN.NS", "ADANIENT.NS",
    "WIPRO.NS", "APOLLOHOSP.NS", "TATAMOTORS.NS", "TECHM.NS",
    "ONGC.NS", "COALINDIA.NS", "BRITANNIA.NS"
]

# Active stock list (can be changed via API)
active_stock_list = {
    "name": "Default",
    "symbols": DEFAULT_WATCHLIST.copy(),
    "source": "default"
}

# Stock metadata from CSV (symbol -> {name, sector})
stock_metadata = {}

# Load CSV on startup if exists
CSV_PATH = "nse_stocks.csv"
def load_csv_stocks(filepath: str = CSV_PATH):
    """Load stocks from CSV file"""
    global stock_metadata
    try:
        if os.path.exists(filepath):
            df = pd.read_csv(filepath)
            symbols = []
            for _, row in df.iterrows():
                symbol = row['symbol'].strip()
                if not symbol.endswith('.NS'):
                    symbol = f"{symbol}.NS"
                symbols.append(symbol)
                # Store metadata
                stock_metadata[symbol.replace('.NS', '')] = {
                    'name': row.get('name', symbol),
                    'sector': row.get('sector', 'Unknown')
                }
            print(f"[CSV] Loaded {len(symbols)} stocks from {filepath}")
            return symbols
    except Exception as e:
        print(f"[CSV] Error loading: {e}")
    return None

# Try to load CSV on startup
csv_stocks = load_csv_stocks()
if csv_stocks:
    active_stock_list = {
        "name": "NSE Stocks (CSV)",
        "symbols": csv_stocks,
        "source": "csv"
    }

# AAOIFI Thresholds
MAX_DEBT_RATIO = 0.30
MAX_CASH_RATIO = 0.30
PROHIBITED_KEYWORDS = [
    'bank', 'insurance', 'breweries', 'distilleries', 'tobacco', 
    'gambling', 'casino', 'alcohol', 'defense', 'interest'
]

# Store last known stock data for WebSocket streaming
cached_stock_data = {}

# Telegram configuration (in-memory, set via API)
telegram_config = {
    "bot_token": "",
    "chat_id": "",
    "enabled": False,
    "alert_on_buy": True,
    "alert_on_watchlist_only": False
}

# Store previously alerted stocks to avoid duplicate alerts
alerted_stocks = set()

# Pydantic models for request validation
class TelegramConfig(BaseModel):
    bot_token: str
    chat_id: str
    enabled: bool = True
    alert_on_buy: bool = True
    alert_on_watchlist_only: bool = False

class TelegramTestMessage(BaseModel):
    message: str = "🔔 HalalTrade Pro is connected! Alerts are working."

# ====================================================================
# WEBSOCKET CONNECTION MANAGER
# ====================================================================
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        print(f"[WS] Client connected. Total: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)
        print(f"[WS] Client disconnected. Total: {len(self.active_connections)}")

    async def broadcast(self, message: dict):
        """Send price update to all connected clients"""
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception:
                disconnected.append(connection)
        
        # Clean up disconnected clients
        for conn in disconnected:
            if conn in self.active_connections:
                self.active_connections.remove(conn)

manager = ConnectionManager()

# ====================================================================
# HELPER FUNCTIONS
# ====================================================================
def calculate_rsi(series, period=14):
    delta = series.diff()
    gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
    rs = gain / loss
    return 100 - (100 / (1 + rs))

def fetch_live_prices():
    """Fetch current prices for all stocks in active list with rate limit protection"""
    prices = {}
    try:
        stocks_to_fetch = active_stock_list["symbols"]
        
        # Limit batch size to avoid rate limiting (max 25 at a time)
        batch_size = 25
        for i in range(0, len(stocks_to_fetch), batch_size):
            batch = stocks_to_fetch[i:i+batch_size]
            try:
                # Fast batch download for just current price
                data = yf.download(batch, period="1d", interval="1m", progress=False)
                if 'Close' in data.columns:
                    for symbol in batch:
                        try:
                            if symbol in data['Close'].columns:
                                price = data['Close'][symbol].dropna().iloc[-1]
                                clean_symbol = symbol.replace(".NS", "")
                                prices[clean_symbol] = round(float(price), 2)
                        except Exception:
                            pass
            except Exception as batch_error:
                print(f"[WS] Batch error: {batch_error}")
                continue
    except Exception as e:
        print(f"[WS] Price fetch error: {e}")
    
    return prices

def get_full_stock_data(symbol: str, ticker) -> dict:
    """Get complete stock data including Shariah checks and technicals"""
    try:
        info = ticker.info
        
        # Shariah Checks
        sector = info.get('sector', 'Unknown')
        summary = info.get('longBusinessSummary', '').lower()
        name = info.get('shortName', symbol)
        
        sector_fail = False
        fail_reason = ""
        
        for word in PROHIBITED_KEYWORDS:
            if word in sector.lower() or word in summary:
                sector_fail = True
                fail_reason = f"Sector/Activity: {word.capitalize()}"
                break
        
        mcap = info.get('marketCap', 1) or 1
        total_debt = info.get('totalDebt', 0) or 0
        cash = info.get('totalCash', 0) or 0

        debt_ratio = total_debt / mcap
        cash_ratio = cash / mcap
        
        shariah_status = "Halal"
        if sector_fail:
            shariah_status = "Non-Halal"
        elif debt_ratio > MAX_DEBT_RATIO:
            shariah_status = "Non-Halal"
            fail_reason = f"High Debt ({(debt_ratio*100):.1f}%)"
        elif cash_ratio > MAX_CASH_RATIO:
            shariah_status = "Doubtful"
            fail_reason = f"High Cash ({(cash_ratio*100):.1f}%)"
        
        # Technical Checks
        hist = ticker.history(period="3mo")
        
        if len(hist) > 50:
            current_price = hist['Close'].iloc[-1]
            sma50 = hist['Close'].rolling(window=50).mean().iloc[-1]
            rsi = calculate_rsi(hist['Close']).iloc[-1]
            
            signal = "Neutral"
            strength = 0
            
            if current_price > sma50 and rsi < 40:
                signal = "Buy"
                strength = 85
            elif current_price > sma50 and 50 < rsi < 70:
                signal = "Buy"
                strength = 65
            elif rsi > 75 or (current_price < sma50 and rsi > 60):
                signal = "Sell"
                strength = 75
            
            atr = current_price * 0.02
            sl = current_price - (2 * atr) if signal == "Buy" else current_price + (2 * atr)
            tp = current_price + (3 * atr) if signal == "Buy" else current_price - (3 * atr)
            gain = abs((tp - current_price) / current_price) * 100

            return {
                "symbol": symbol.replace(".NS", ""),
                "name": name,
                "sector": sector,
                "price": float(current_price),
                "priceHistory": [float(p) for p in hist['Close'].tolist()[-20:]],
                "financials": {
                    "debtToMcap": debt_ratio,
                    "cashToMcap": cash_ratio
                },
                "shariahStatus": shariah_status,
                "shariahReason": fail_reason if fail_reason else "Compliant",
                "technicals": {
                    "rsi": round(float(rsi), 1),
                    "sma50": round(float(sma50), 1),
                    "signal": signal,
                    "signalStrength": strength,
                    "sl": round(float(sl), 1),
                    "tp": round(float(tp), 1),
                    "gain": round(float(gain), 2)
                }
            }
    except Exception as e:
        print(f"Error processing {symbol}: {e}")
    
    return None

# ====================================================================
# REST API ENDPOINTS
# ====================================================================
@app.get("/api/scan")
def scan_market():
    global cached_stock_data
    stocks_to_scan = active_stock_list["symbols"]
    print(f"Scanning {len(stocks_to_scan)} stocks ({active_stock_list['name']})...")
    results = []

    tickers = yf.Tickers(" ".join(stocks_to_scan))
    
    for symbol in stocks_to_scan:
        try:
            ticker = tickers.tickers[symbol]
            stock_data = get_full_stock_data(symbol, ticker)
            if stock_data:
                results.append(stock_data)
                cached_stock_data[stock_data["symbol"]] = stock_data
        except Exception as e:
            print(f"Error processing {symbol}: {e}")
            continue

    return results

@app.get("/api/health")
def health_check():
    return {
        "status": "ok", 
        "connections": len(manager.active_connections),
        "telegram_enabled": telegram_config["enabled"],
        "active_stocks": len(active_stock_list["symbols"]),
        "stock_list_name": active_stock_list["name"]
    }

# ====================================================================
# STOCK LIST MANAGEMENT ENDPOINTS
# ====================================================================
@app.get("/api/stocks/list")
def get_stock_list():
    """Get current active stock list"""
    return {
        "name": active_stock_list["name"],
        "count": len(active_stock_list["symbols"]),
        "source": active_stock_list["source"],
        "symbols": [s.replace(".NS", "") for s in active_stock_list["symbols"][:50]]  # First 50
    }

@app.post("/api/stocks/upload")
async def upload_stock_csv(file: UploadFile = File(...)):
    """Upload a CSV file with stock symbols"""
    global active_stock_list, stock_metadata
    
    try:
        contents = await file.read()
        # Save temporarily
        temp_path = "uploaded_stocks.csv"
        with open(temp_path, "wb") as f:
            f.write(contents)
        
        # Parse CSV
        df = pd.read_csv(temp_path)
        if 'symbol' not in df.columns:
            return {"success": False, "error": "CSV must have 'symbol' column"}
        
        symbols = []
        for _, row in df.iterrows():
            symbol = str(row['symbol']).strip()
            if not symbol.endswith('.NS'):
                symbol = f"{symbol}.NS"
            symbols.append(symbol)
            # Store metadata
            clean = symbol.replace('.NS', '')
            stock_metadata[clean] = {
                'name': row.get('name', clean) if 'name' in df.columns else clean,
                'sector': row.get('sector', 'Unknown') if 'sector' in df.columns else 'Unknown'
            }
        
        active_stock_list = {
            "name": file.filename,
            "symbols": symbols,
            "source": "upload"
        }
        
        return {
            "success": True,
            "name": file.filename,
            "count": len(symbols),
            "message": f"Loaded {len(symbols)} stocks from {file.filename}"
        }
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.post("/api/stocks/reset")
def reset_stock_list():
    """Reset to default stock list"""
    global active_stock_list
    active_stock_list = {
        "name": "Default",
        "symbols": DEFAULT_WATCHLIST.copy(),
        "source": "default"
    }
    return {"success": True, "message": "Reset to default stock list"}

class CustomStockList(BaseModel):
    name: str
    symbols: List[str]

@app.post("/api/stocks/custom")
def set_custom_stocks(data: CustomStockList):
    """Set a custom stock list"""
    global active_stock_list
    symbols = [s if s.endswith('.NS') else f"{s}.NS" for s in data.symbols]
    active_stock_list = {
        "name": data.name,
        "symbols": symbols,
        "source": "custom"
    }
    return {
        "success": True,
        "name": data.name,
        "count": len(symbols)
    }

# ====================================================================
# BACKTEST ENGINE - MULTI-STRATEGY
# ====================================================================
class BacktestRequest(BaseModel):
    symbol: str
    period: str = "1y"  # 1mo, 3mo, 6mo, 1y, 2y, 5y
    strategy: str = "rsi_sma"  # rsi_sma, macd, bollinger, ma_crossover
    initial_capital: float = 100000
    # RSI+SMA params
    rsi_oversold: int = 30
    rsi_overbought: int = 70
    # MACD params (default: 12, 26, 9)
    macd_fast: int = 12
    macd_slow: int = 26
    macd_signal: int = 9
    # Bollinger params
    bb_period: int = 20
    bb_std: float = 2.0
    # MA Crossover params
    ma_fast: int = 10
    ma_slow: int = 50

def calculate_macd(prices, fast=12, slow=26, signal=9):
    """Calculate MACD indicator"""
    ema_fast = prices.ewm(span=fast, adjust=False).mean()
    ema_slow = prices.ewm(span=slow, adjust=False).mean()
    macd_line = ema_fast - ema_slow
    signal_line = macd_line.ewm(span=signal, adjust=False).mean()
    histogram = macd_line - signal_line
    return macd_line, signal_line, histogram

def calculate_bollinger(prices, period=20, std_dev=2):
    """Calculate Bollinger Bands"""
    sma = prices.rolling(window=period).mean()
    std = prices.rolling(window=period).std()
    upper = sma + (std_dev * std)
    lower = sma - (std_dev * std)
    return sma, upper, lower

def run_backtest_multi(symbol: str, period: str, strategy: str, initial_capital: float, params: dict):
    """Run a backtest simulation with multiple strategy options"""
    try:
        # Fetch historical data
        ticker_symbol = symbol if symbol.endswith('.NS') else f"{symbol}.NS"
        ticker = yf.Ticker(ticker_symbol)
        hist = ticker.history(period=period)
        
        if len(hist) < 60:
            return {"success": False, "error": "Not enough historical data (need 60+ days)"}
        
        # Calculate indicators based on strategy
        strategy_name = "Unknown"
        
        if strategy == "rsi_sma":
            strategy_name = "RSI + SMA50"
            hist['SMA50'] = hist['Close'].rolling(window=50).mean()
            hist['RSI'] = calculate_rsi(hist['Close'])
            
        elif strategy == "macd":
            strategy_name = f"MACD ({params['macd_fast']},{params['macd_slow']},{params['macd_signal']})"
            macd, signal, histogram = calculate_macd(
                hist['Close'], 
                params['macd_fast'], 
                params['macd_slow'], 
                params['macd_signal']
            )
            hist['MACD'] = macd
            hist['MACD_Signal'] = signal
            hist['MACD_Hist'] = histogram
            
        elif strategy == "bollinger":
            strategy_name = f"Bollinger Bands ({params['bb_period']}, {params['bb_std']}σ)"
            sma, upper, lower = calculate_bollinger(
                hist['Close'],
                params['bb_period'],
                params['bb_std']
            )
            hist['BB_Mid'] = sma
            hist['BB_Upper'] = upper
            hist['BB_Lower'] = lower
            
        elif strategy == "ma_crossover":
            strategy_name = f"MA Crossover ({params['ma_fast']}/{params['ma_slow']})"
            hist['MA_Fast'] = hist['Close'].rolling(window=params['ma_fast']).mean()
            hist['MA_Slow'] = hist['Close'].rolling(window=params['ma_slow']).mean()
        
        else:
            return {"success": False, "error": f"Unknown strategy: {strategy}"}
        
        # Drop NaN rows
        hist = hist.dropna()
        
        if len(hist) < 10:
            return {"success": False, "error": "Not enough data after indicator calculation"}
        
        # Simulation variables
        capital = initial_capital
        shares = 0
        position_open = False
        entry_price = 0
        trades = []
        equity_curve = []
        
        for i, (date, row) in enumerate(hist.iterrows()):
            current_price = row['Close']
            
            # Record equity
            current_equity = capital + (shares * current_price)
            equity_curve.append({
                "date": date.strftime('%Y-%m-%d'),
                "equity": round(current_equity, 2),
                "price": round(current_price, 2)
            })
            
            # Generate signals based on strategy
            buy_signal = False
            sell_signal = False
            signal_info = ""
            
            if strategy == "rsi_sma":
                rsi = row['RSI']
                sma50 = row['SMA50']
                buy_signal = current_price > sma50 and rsi < params['rsi_oversold']
                sell_signal = rsi > params['rsi_overbought'] or current_price < sma50
                signal_info = f"RSI: {rsi:.1f}"
                
            elif strategy == "macd":
                macd = row['MACD']
                signal = row['MACD_Signal']
                hist_val = row['MACD_Hist']
                # Buy when MACD crosses above signal line
                if i > 0:
                    prev_hist = hist['MACD_Hist'].iloc[i-1]
                    buy_signal = prev_hist < 0 and hist_val > 0  # Histogram crosses zero from below
                    sell_signal = prev_hist > 0 and hist_val < 0  # Histogram crosses zero from above
                signal_info = f"MACD: {macd:.2f}"
                
            elif strategy == "bollinger":
                lower = row['BB_Lower']
                upper = row['BB_Upper']
                mid = row['BB_Mid']
                # Buy when price touches lower band, sell when touches upper
                buy_signal = current_price <= lower
                sell_signal = current_price >= upper or current_price < mid
                signal_info = f"BB%: {((current_price - lower) / (upper - lower) * 100):.1f}"
                
            elif strategy == "ma_crossover":
                ma_fast = row['MA_Fast']
                ma_slow = row['MA_Slow']
                if i > 0:
                    prev_fast = hist['MA_Fast'].iloc[i-1]
                    prev_slow = hist['MA_Slow'].iloc[i-1]
                    # Golden cross (buy) and death cross (sell)
                    buy_signal = prev_fast <= prev_slow and ma_fast > ma_slow
                    sell_signal = prev_fast >= prev_slow and ma_fast < ma_slow
                signal_info = f"Fast: {ma_fast:.1f}"
            
            # Execute trades
            if not position_open and buy_signal:
                shares = int(capital * 0.95 / current_price)
                if shares > 0:
                    entry_price = current_price
                    capital -= shares * current_price
                    position_open = True
                    trades.append({
                        "type": "BUY",
                        "date": date.strftime('%Y-%m-%d'),
                        "price": round(current_price, 2),
                        "shares": shares,
                        "signal": signal_info
                    })
            
            elif position_open and sell_signal:
                exit_price = current_price
                capital += shares * exit_price
                profit = (exit_price - entry_price) * shares
                profit_pct = ((exit_price - entry_price) / entry_price) * 100
                
                trades.append({
                    "type": "SELL",
                    "date": date.strftime('%Y-%m-%d'),
                    "price": round(current_price, 2),
                    "shares": shares,
                    "profit": round(profit, 2),
                    "profitPct": round(profit_pct, 2),
                    "signal": signal_info
                })
                
                shares = 0
                position_open = False
                entry_price = 0
        
        # Close any open position at the end
        if position_open:
            final_price = hist['Close'].iloc[-1]
            capital += shares * final_price
            profit = (final_price - entry_price) * shares
            profit_pct = ((final_price - entry_price) / entry_price) * 100
            trades.append({
                "type": "SELL (End)",
                "date": hist.index[-1].strftime('%Y-%m-%d'),
                "price": round(final_price, 2),
                "shares": shares,
                "profit": round(profit, 2),
                "profitPct": round(profit_pct, 2)
            })
        
        # Calculate metrics
        final_capital = capital
        total_return = ((final_capital - initial_capital) / initial_capital) * 100
        
        # Trade statistics
        sell_trades = [t for t in trades if t['type'].startswith('SELL')]
        winning_trades = [t for t in sell_trades if t.get('profit', 0) > 0]
        losing_trades = [t for t in sell_trades if t.get('profit', 0) <= 0]
        
        win_rate = (len(winning_trades) / len(sell_trades) * 100) if sell_trades else 0
        avg_win = np.mean([t['profit'] for t in winning_trades]) if winning_trades else 0
        avg_loss = np.mean([t['profit'] for t in losing_trades]) if losing_trades else 0
        
        # Max drawdown
        equity_values = [e['equity'] for e in equity_curve]
        peak = equity_values[0]
        max_drawdown = 0
        for eq in equity_values:
            if eq > peak:
                peak = eq
            drawdown = (peak - eq) / peak * 100
            if drawdown > max_drawdown:
                max_drawdown = drawdown
        
        # Buy and hold comparison
        start_price = hist['Close'].iloc[0]
        end_price = hist['Close'].iloc[-1]
        buy_hold_return = ((end_price - start_price) / start_price) * 100
        
        return {
            "success": True,
            "symbol": symbol.replace(".NS", ""),
            "period": period,
            "strategy": strategy,
            "strategyName": strategy_name,
            "summary": {
                "initialCapital": initial_capital,
                "finalCapital": round(final_capital, 2),
                "totalReturn": round(total_return, 2),
                "buyHoldReturn": round(buy_hold_return, 2),
                "outperformance": round(total_return - buy_hold_return, 2),
                "totalTrades": len(sell_trades),
                "winningTrades": len(winning_trades),
                "losingTrades": len(losing_trades),
                "winRate": round(win_rate, 1),
                "avgWin": round(avg_win, 2),
                "avgLoss": round(avg_loss, 2),
                "maxDrawdown": round(max_drawdown, 2),
                "startDate": hist.index[0].strftime('%Y-%m-%d'),
                "endDate": hist.index[-1].strftime('%Y-%m-%d')
            },
            "trades": trades[-20:],
            "equityCurve": equity_curve[::max(1, len(equity_curve)//50)]
        }
        
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.post("/api/backtest")
def backtest_strategy(request: BacktestRequest):
    """Run a backtest for a specific stock with selected strategy"""
    params = {
        "rsi_oversold": request.rsi_oversold,
        "rsi_overbought": request.rsi_overbought,
        "macd_fast": request.macd_fast,
        "macd_slow": request.macd_slow,
        "macd_signal": request.macd_signal,
        "bb_period": request.bb_period,
        "bb_std": request.bb_std,
        "ma_fast": request.ma_fast,
        "ma_slow": request.ma_slow
    }
    return run_backtest_multi(
        request.symbol,
        request.period,
        request.strategy,
        request.initial_capital,
        params
    )

@app.get("/api/backtest/{symbol}")
def quick_backtest(symbol: str, period: str = "1y", strategy: str = "rsi_sma"):
    """Quick backtest with default parameters"""
    default_params = {
        "rsi_oversold": 30, "rsi_overbought": 70,
        "macd_fast": 12, "macd_slow": 26, "macd_signal": 9,
        "bb_period": 20, "bb_std": 2.0,
        "ma_fast": 10, "ma_slow": 50
    }
    return run_backtest_multi(symbol, period, strategy, 100000, default_params)

@app.get("/api/strategies")
def get_strategies():
    """Get available trading strategies"""
    return {
        "strategies": [
            {
                "id": "rsi_sma",
                "name": "RSI + SMA50",
                "description": "Buy when RSI is oversold and price > SMA50, sell when RSI overbought",
                "params": ["rsi_oversold", "rsi_overbought"]
            },
            {
                "id": "macd",
                "name": "MACD Crossover",
                "description": "Buy on bullish MACD histogram crossover, sell on bearish crossover",
                "params": ["macd_fast", "macd_slow", "macd_signal"]
            },
            {
                "id": "bollinger",
                "name": "Bollinger Bands",
                "description": "Buy when price touches lower band, sell at upper band",
                "params": ["bb_period", "bb_std"]
            },
            {
                "id": "ma_crossover",
                "name": "Moving Average Crossover",
                "description": "Golden cross buy, death cross sell",
                "params": ["ma_fast", "ma_slow"]
            }
        ]
    }

# ====================================================================
# TELEGRAM ALERT ENDPOINTS
# ====================================================================
async def send_telegram_message(message: str) -> dict:
    """Send a message via Telegram Bot API"""
    if not telegram_config["bot_token"] or not telegram_config["chat_id"]:
        return {"success": False, "error": "Telegram not configured"}
    
    url = f"https://api.telegram.org/bot{telegram_config['bot_token']}/sendMessage"
    payload = {
        "chat_id": telegram_config["chat_id"],
        "text": message,
        "parse_mode": "HTML"
    }
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=payload, timeout=10.0)
            result = response.json()
            
            if result.get("ok"):
                return {"success": True, "message_id": result["result"]["message_id"]}
            else:
                return {"success": False, "error": result.get("description", "Unknown error")}
    except Exception as e:
        return {"success": False, "error": str(e)}

def format_stock_alert(stock: dict) -> str:
    """Format a stock alert message for Telegram"""
    emoji = "🟢" if stock.get("shariahStatus") == "Halal" else "🔴"
    signal_emoji = "📈" if stock.get("technicals", {}).get("signal") == "Buy" else "📉"
    
    message = f"""
{signal_emoji} <b>BUY SIGNAL DETECTED</b> {signal_emoji}

{emoji} <b>{stock.get('symbol')}</b> - {stock.get('name', 'N/A')}

💰 Price: ₹{stock.get('price', 0):.2f}
📊 RSI: {stock.get('technicals', {}).get('rsi', 'N/A')}
🎯 Target: ₹{stock.get('technicals', {}).get('tp', 'N/A')}
🛑 Stop Loss: ₹{stock.get('technicals', {}).get('sl', 'N/A')}
📈 Potential: +{stock.get('technicals', {}).get('gain', 0):.1f}%

✅ Shariah Status: <b>{stock.get('shariahStatus', 'Unknown')}</b>
🏢 Sector: {stock.get('sector', 'Unknown')}

⏰ {pd.Timestamp.now().strftime('%Y-%m-%d %H:%M:%S')}
"""
    return message.strip()

@app.post("/api/telegram/config")
async def set_telegram_config(config: TelegramConfig):
    """Configure Telegram bot settings"""
    telegram_config["bot_token"] = config.bot_token
    telegram_config["chat_id"] = config.chat_id
    telegram_config["enabled"] = config.enabled
    telegram_config["alert_on_buy"] = config.alert_on_buy
    telegram_config["alert_on_watchlist_only"] = config.alert_on_watchlist_only
    
    print(f"[Telegram] Config updated. Enabled: {config.enabled}")
    return {"success": True, "config": telegram_config}

@app.get("/api/telegram/config")
def get_telegram_config():
    """Get current Telegram configuration (masks token)"""
    return {
        "bot_token": "*" * 10 if telegram_config["bot_token"] else "",
        "chat_id": telegram_config["chat_id"],
        "enabled": telegram_config["enabled"],
        "alert_on_buy": telegram_config["alert_on_buy"],
        "alert_on_watchlist_only": telegram_config["alert_on_watchlist_only"]
    }

@app.post("/api/telegram/test")
async def test_telegram(test: TelegramTestMessage = None):
    """Send a test message to verify Telegram configuration"""
    if not telegram_config["enabled"]:
        return {"success": False, "error": "Telegram is not enabled"}
    
    message = test.message if test else "🔔 HalalTrade Pro is connected! Alerts are working."
    result = await send_telegram_message(message)
    return result

@app.post("/api/telegram/alert/{symbol}")
async def send_stock_alert(symbol: str):
    """Manually send an alert for a specific stock"""
    if not telegram_config["enabled"]:
        return {"success": False, "error": "Telegram is not enabled"}
    
    # Find stock in cached data
    stock = cached_stock_data.get(symbol.upper().replace(".NS", ""))
    if not stock:
        return {"success": False, "error": f"Stock {symbol} not found in cache"}
    
    message = format_stock_alert(stock)
    result = await send_telegram_message(message)
    return result

async def check_and_send_alerts():
    """Check for new buy signals and send alerts"""
    global alerted_stocks
    
    if not telegram_config["enabled"] or not telegram_config["alert_on_buy"]:
        return
    
    for symbol, stock in cached_stock_data.items():
        # Only alert on Halal + Buy signals
        if (stock.get("shariahStatus") == "Halal" and 
            stock.get("technicals", {}).get("signal") == "Buy" and
            symbol not in alerted_stocks):
            
            message = format_stock_alert(stock)
            result = await send_telegram_message(message)
            
            if result.get("success"):
                alerted_stocks.add(symbol)
                print(f"[Telegram] Alert sent for {symbol}")

# ====================================================================
# WEBSOCKET ENDPOINT - LIVE PRICE STREAMING
# ====================================================================
@app.websocket("/ws/prices")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    
    try:
        # Send initial cached data if available
        if cached_stock_data:
            await websocket.send_json({
                "type": "initial",
                "data": list(cached_stock_data.values())
            })
        
        # Keep connection alive and stream prices
        while True:
            try:
                # Fetch latest prices
                prices = fetch_live_prices()
                
                if prices:
                    # Update cached data with new prices
                    price_updates = []
                    for symbol, new_price in prices.items():
                        if symbol in cached_stock_data:
                            old_price = cached_stock_data[symbol]["price"]
                            cached_stock_data[symbol]["price"] = new_price
                            
                            price_updates.append({
                                "symbol": symbol,
                                "price": new_price,
                                "oldPrice": old_price,
                                "change": round(new_price - old_price, 2),
                                "changePercent": round(((new_price - old_price) / old_price) * 100, 2) if old_price else 0
                            })
                    
                    # Broadcast price updates to all clients
                    if price_updates:
                        await manager.broadcast({
                            "type": "price_update",
                            "timestamp": pd.Timestamp.now().isoformat(),
                            "data": price_updates
                        })
                        print(f"[WS] Broadcasted {len(price_updates)} price updates")
                
                # Wait 30 seconds before next update (to avoid rate limiting)
                await asyncio.sleep(30)
                
            except WebSocketDisconnect:
                break
            except Exception as e:
                print(f"[WS] Stream error: {e}")
                await asyncio.sleep(30)
                
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        print(f"[WS] Connection error: {e}")
        manager.disconnect(websocket)

if __name__ == "__main__":
    print("=" * 50)
    print("🚀 HalalTrade Engine v3.0 - Telegram Edition")
    print("=" * 50)
    print("  REST API:      http://localhost:8000/api/scan")
    print("  WebSocket:     ws://localhost:8000/ws/prices")
    print("  Health:        http://localhost:8000/api/health")
    print("  Telegram:      http://localhost:8000/api/telegram/...")
    print("=" * 50)
    uvicorn.run(app, host="0.0.0.0", port=8000)