"""
Stock Service - Stock data fetching and processing
"""
import random
import pandas as pd
import yfinance as yf
import numpy as np
from typing import Optional

from ..config import (
    MAX_DEBT_RATIO, MAX_CASH_RATIO, DEFAULT_STOCKS,
    CSV_FILE, WS_BATCH_SIZE
)
from ..utils.indicators import (
    calculate_rsi, calculate_sma, generate_rsi_signal,
    calculate_stop_loss, calculate_take_profit, calculate_potential_gain
)


# In-memory state
active_stock_list = {
    "name": "Default Watchlist",
    "symbols": DEFAULT_STOCKS.copy(),
    "source": "default"
}
stock_metadata = {}
cached_stock_data = {}
live_prices = {} # New: global cache for live prices



def load_csv_stocks() -> bool:
    """Load stocks from CSV file on startup"""
    global active_stock_list, stock_metadata
    
    if not CSV_FILE.exists():
        print(f"[CSV] File not found: {CSV_FILE}")
        return False
    
    try:
        df = pd.read_csv(CSV_FILE)
        if 'symbol' not in df.columns:
            print("[CSV] Invalid format: 'symbol' column required")
            return False
        
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
        
        if symbols:
            active_stock_list = {
                "name": CSV_FILE.stem,
                "symbols": symbols,
                "source": "csv"
            }
            print(f"[CSV] Loaded {len(symbols)} stocks from {CSV_FILE.name}")
            return True
            
    except Exception as e:
        print(f"[CSV] Error loading: {e}")
    
    return False


def get_shariah_status(symbol: str) -> dict:
    """
    Generate Shariah compliance check (mock data)
    In production, this would use actual financial data
    """
    random.seed(hash(symbol))
    debt_ratio = round(random.uniform(10, 50), 1)
    cash_ratio = round(random.uniform(5, 40), 1)
    
    is_halal = debt_ratio < MAX_DEBT_RATIO and cash_ratio < MAX_CASH_RATIO
    
    return {
        "status": "Halal" if is_halal else "Non-Halal",
        "debtRatio": debt_ratio,
        "cashRatio": cash_ratio,
        "passed": is_halal
    }


def get_full_stock_data(symbol: str, ticker) -> Optional[dict]:
    """Get complete stock data with technicals and Shariah status"""
    try:
        hist = ticker.history(period="3mo")
        if hist.empty or len(hist) < 20:
            return None
        
        current_price = float(hist['Close'].iloc[-1])
        
        # Calculate indicators
        rsi_series = calculate_rsi(hist['Close'])
        sma_series = calculate_sma(hist['Close'])
        
        rsi = float(rsi_series.iloc[-1]) if not pd.isna(rsi_series.iloc[-1]) else 50
        sma = float(sma_series.iloc[-1]) if not pd.isna(sma_series.iloc[-1]) else current_price
        
        # Get Shariah status
        shariah = get_shariah_status(symbol)
        
        # Technical analysis
        signal = generate_rsi_signal(current_price, rsi, sma)
        sl = calculate_stop_loss(current_price, rsi)
        tp = calculate_take_profit(current_price, rsi)
        gain = calculate_potential_gain(current_price, tp)
        
        # Price history for sparkline
        price_history = [
            {"price": round(float(p), 2)}
            for p in hist['Close'].tail(20).values
        ]
        
        # Get metadata
        clean_symbol = symbol.replace('.NS', '')
        meta = stock_metadata.get(clean_symbol, {})
        
        return {
            "symbol": clean_symbol,
            "name": meta.get('name', clean_symbol),
            "sector": meta.get('sector', 'Unknown'),
            "price": round(current_price, 2),
            "shariahStatus": shariah["status"],
            "shariah": {
                "debtRatio": shariah["debtRatio"],
                "cashRatio": shariah["cashRatio"]
            },
            "technicals": {
                "rsi": round(rsi, 1),
                "signal": signal if shariah["passed"] else "N/A",
                "sl": sl if signal == 'Buy' else None,
                "tp": tp if signal == 'Buy' else None,
                "gain": gain if signal == 'Buy' else None
            },
            "priceHistory": price_history
        }
        
    except Exception as e:
        print(f"Error processing {symbol}: {e}")
        return None


def scan_stocks() -> list:
    """Scan all stocks in active list"""
    global cached_stock_data
    
    symbols = active_stock_list["symbols"]
    print(f"Scanning {len(symbols)} stocks ({active_stock_list['name']})...")
    
    results = []
    tickers = yf.Tickers(" ".join(symbols))
    
    for symbol in symbols:
        try:
            ticker = tickers.tickers.get(symbol)
            if ticker:
                stock_data = get_full_stock_data(symbol, ticker)
                if stock_data:
                    results.append(stock_data)
                    cached_stock_data[stock_data["symbol"]] = stock_data
        except Exception as e:
            print(f"Error processing {symbol}: {e}")
            continue
    
    return results


async def fetch_live_prices(custom_symbols: list = None) -> dict:
    """Fetch live prices for all active stocks or custom list"""
    global live_prices
    import asyncio
    
    input_symbols = custom_symbols if custom_symbols is not None else active_stock_list["symbols"]
    prices = {}
    
    # Batch processing
    for i in range(0, len(input_symbols), WS_BATCH_SIZE):
        batch = input_symbols[i:i + WS_BATCH_SIZE]
        try:
            tickers = yf.Tickers(" ".join(batch))
            for symbol in batch:
                try:
                    ticker = tickers.tickers.get(symbol)
                    if ticker:
                        hist = ticker.history(period="1d")
                        if not hist.empty:
                            clean = symbol.replace('.NS', '')
                            price = round(float(hist['Close'].iloc[-1]), 2)
                            prices[clean] = price
                            live_prices[clean] = price # Update global cache
                except Exception:
                    continue
        except Exception as e:
            print(f"Batch error: {e}")
        
        # Small delay between batches
        if i + WS_BATCH_SIZE < len(input_symbols):
            await asyncio.sleep(0.5)
    
    return prices



def get_stock_list_info() -> dict:
    """Get current active stock list info"""
    return {
        "name": active_stock_list["name"],
        "count": len(active_stock_list["symbols"]),
        "source": active_stock_list["source"],
        "symbols": [s.replace(".NS", "") for s in active_stock_list["symbols"]]
    }


def set_stock_list(name: str, symbols: list, source: str = "custom"):
    """Set active stock list"""
    global active_stock_list
    formatted = [s if s.endswith('.NS') else f"{s}.NS" for s in symbols]
    active_stock_list = {
        "name": name,
        "symbols": formatted,
        "source": source
    }


def reset_stock_list():
    """Reset to default stock list"""
    global active_stock_list
    active_stock_list = {
        "name": "Default Watchlist",
        "symbols": DEFAULT_STOCKS.copy(),
        "source": "default"
    }


def get_all_stocks() -> list:
    """Get all cached stock data for portfolio valuation"""
    return list(cached_stock_data.values())

