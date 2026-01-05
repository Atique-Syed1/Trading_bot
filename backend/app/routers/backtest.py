"""
Backtest Router - Strategy backtesting endpoints
"""
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional

from ..services.backtest_service import (
    run_backtest,
    get_default_params,
    get_available_strategies
)

router = APIRouter(prefix="/api", tags=["backtest"])


class BacktestRequest(BaseModel):
    symbol: str
    period: str = "1y"
    strategy: str = "rsi_sma"
    initial_capital: float = 100000
    # RSI+SMA params
    rsi_oversold: int = 30
    rsi_overbought: int = 70
    # MACD params
    macd_fast: int = 12
    macd_slow: int = 26
    macd_signal: int = 9
    # Bollinger params
    bb_period: int = 20
    bb_std: float = 2.0
    # MA Crossover params
    ma_fast: int = 10
    ma_slow: int = 50


@router.post("/backtest")
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
    return run_backtest(
        request.symbol,
        request.period,
        request.strategy,
        request.initial_capital,
        params
    )


@router.get("/backtest/{symbol}")
def quick_backtest(symbol: str, period: str = "1y", strategy: str = "rsi_sma"):
    """Quick backtest with default parameters"""
    return run_backtest(symbol, period, strategy, 100000, get_default_params())


@router.get("/strategies")
def list_strategies():
    """Get available trading strategies"""
    return {"strategies": get_available_strategies()}
