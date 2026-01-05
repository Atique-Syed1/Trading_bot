"""
Backtest Service - Strategy backtesting engine
"""
import numpy as np
import pandas as pd
import yfinance as yf
from typing import Optional

from ..config import (
    RSI_OVERSOLD, RSI_OVERBOUGHT,
    MACD_FAST, MACD_SLOW, MACD_SIGNAL,
    BOLLINGER_PERIOD, BOLLINGER_STD,
    MA_FAST, MA_SLOW
)
from ..utils.indicators import (
    calculate_rsi, calculate_macd, calculate_bollinger_bands
)


def run_backtest(
    symbol: str,
    period: str = "1y",
    strategy: str = "rsi_sma",
    initial_capital: float = 100000,
    params: Optional[dict] = None
) -> dict:
    """
    Run a backtest simulation with multiple strategy options
    
    Args:
        symbol: Stock symbol
        period: Historical period (1mo, 3mo, 6mo, 1y, 2y, 5y)
        strategy: Strategy type (rsi_sma, macd, bollinger, ma_crossover)
        initial_capital: Starting capital
        params: Strategy-specific parameters
    
    Returns:
        Backtest results with trades, equity curve, and metrics
    """
    if params is None:
        params = get_default_params()
    
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
            sma, upper, lower = calculate_bollinger_bands(
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
        
        # Run simulation
        trades, equity_curve = simulate_trades(
            hist, strategy, params, initial_capital
        )
        
        # Calculate metrics
        metrics = calculate_metrics(trades, equity_curve, initial_capital, hist)
        
        return {
            "success": True,
            "symbol": symbol.replace(".NS", ""),
            "period": period,
            "strategy": strategy,
            "strategyName": strategy_name,
            "summary": metrics,
            "trades": trades[-20:],  # Last 20 trades
            "equityCurve": equity_curve[::max(1, len(equity_curve)//50)]  # Sample 50 points
        }
        
    except Exception as e:
        return {"success": False, "error": str(e)}


def simulate_trades(
    hist: pd.DataFrame,
    strategy: str,
    params: dict,
    initial_capital: float
) -> tuple[list, list]:
    """Run trade simulation on historical data"""
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
        buy_signal, sell_signal, signal_info = generate_signals(
            row, hist, i, strategy, params
        )
        
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
    
    return trades, equity_curve


def generate_signals(
    row: pd.Series,
    hist: pd.DataFrame,
    idx: int,
    strategy: str,
    params: dict
) -> tuple[bool, bool, str]:
    """Generate buy/sell signals based on strategy"""
    buy_signal = False
    sell_signal = False
    signal_info = ""
    current_price = row['Close']
    
    if strategy == "rsi_sma":
        rsi = row['RSI']
        sma50 = row['SMA50']
        buy_signal = current_price > sma50 and rsi < params['rsi_oversold']
        sell_signal = rsi > params['rsi_overbought'] or current_price < sma50
        signal_info = f"RSI: {rsi:.1f}"
        
    elif strategy == "macd":
        hist_val = row['MACD_Hist']
        if idx > 0:
            prev_hist = hist['MACD_Hist'].iloc[idx-1]
            buy_signal = prev_hist < 0 and hist_val > 0
            sell_signal = prev_hist > 0 and hist_val < 0
        signal_info = f"MACD: {row['MACD']:.2f}"
        
    elif strategy == "bollinger":
        lower = row['BB_Lower']
        upper = row['BB_Upper']
        mid = row['BB_Mid']
        buy_signal = current_price <= lower
        sell_signal = current_price >= upper or current_price < mid
        bb_pct = ((current_price - lower) / (upper - lower) * 100) if upper != lower else 50
        signal_info = f"BB%: {bb_pct:.1f}"
        
    elif strategy == "ma_crossover":
        ma_fast = row['MA_Fast']
        ma_slow = row['MA_Slow']
        if idx > 0:
            prev_fast = hist['MA_Fast'].iloc[idx-1]
            prev_slow = hist['MA_Slow'].iloc[idx-1]
            buy_signal = prev_fast <= prev_slow and ma_fast > ma_slow
            sell_signal = prev_fast >= prev_slow and ma_fast < ma_slow
        signal_info = f"Fast: {ma_fast:.1f}"
    
    return buy_signal, sell_signal, signal_info


def calculate_metrics(
    trades: list,
    equity_curve: list,
    initial_capital: float,
    hist: pd.DataFrame
) -> dict:
    """Calculate backtest performance metrics"""
    final_capital = equity_curve[-1]['equity'] if equity_curve else initial_capital
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
    peak = equity_values[0] if equity_values else initial_capital
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
    }


def get_default_params() -> dict:
    """Get default strategy parameters"""
    return {
        "rsi_oversold": RSI_OVERSOLD,
        "rsi_overbought": RSI_OVERBOUGHT,
        "macd_fast": MACD_FAST,
        "macd_slow": MACD_SLOW,
        "macd_signal": MACD_SIGNAL,
        "bb_period": BOLLINGER_PERIOD,
        "bb_std": BOLLINGER_STD,
        "ma_fast": MA_FAST,
        "ma_slow": MA_SLOW
    }


def get_available_strategies() -> list:
    """Get list of available trading strategies"""
    return [
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
