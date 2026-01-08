"""
Technical Indicators for Trading Analysis
"""
import numpy as np
import pandas as pd


def calculate_rsi(prices: pd.Series, period: int = 14) -> pd.Series:
    """
    Calculate Relative Strength Index (RSI)
    
    Args:
        prices: Series of closing prices
        period: RSI period (default 14)
    
    Returns:
        Series of RSI values
    """
    delta = prices.diff()
    gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
    
    rs = gain / loss
    rsi = 100 - (100 / (1 + rs))
    return rsi


def calculate_sma(prices: pd.Series, period: int = 50) -> pd.Series:
    """
    Calculate Simple Moving Average (SMA)
    
    Args:
        prices: Series of closing prices
        period: SMA period (default 50)
    
    Returns:
        Series of SMA values
    """
    return prices.rolling(window=period).mean()


def calculate_ema(prices: pd.Series, period: int = 12) -> pd.Series:
    """
    Calculate Exponential Moving Average (EMA)
    
    Args:
        prices: Series of closing prices
        period: EMA period (default 12)
    
    Returns:
        Series of EMA values
    """
    return prices.ewm(span=period, adjust=False).mean()


def calculate_macd(
    prices: pd.Series,
    fast: int = 12,
    slow: int = 26,
    signal: int = 9
) -> tuple[pd.Series, pd.Series, pd.Series]:
    """
    Calculate MACD (Moving Average Convergence Divergence)
    
    Args:
        prices: Series of closing prices
        fast: Fast EMA period (default 12)
        slow: Slow EMA period (default 26)
        signal: Signal line period (default 9)
    
    Returns:
        Tuple of (macd_line, signal_line, histogram)
    """
    ema_fast = prices.ewm(span=fast, adjust=False).mean()
    ema_slow = prices.ewm(span=slow, adjust=False).mean()
    macd_line = ema_fast - ema_slow
    signal_line = macd_line.ewm(span=signal, adjust=False).mean()
    histogram = macd_line - signal_line
    return macd_line, signal_line, histogram


def calculate_bollinger_bands(
    prices: pd.Series,
    period: int = 20,
    std_dev: float = 2.0
) -> tuple[pd.Series, pd.Series, pd.Series]:
    """
    Calculate Bollinger Bands
    
    Args:
        prices: Series of closing prices
        period: SMA period (default 20)
        std_dev: Standard deviation multiplier (default 2.0)
    
    Returns:
        Tuple of (middle_band, upper_band, lower_band)
    """
    sma = prices.rolling(window=period).mean()
    std = prices.rolling(window=period).std()
    upper = sma + (std_dev * std)
    lower = sma - (std_dev * std)
    return sma, upper, lower


def generate_rsi_signal(
    price: float,
    rsi: float,
    sma: float,
    oversold: int = 30,
    overbought: int = 70
) -> str:
    """
    Generate trading signal based on RSI + SMA strategy
    
    Args:
        price: Current price
        rsi: Current RSI value
        sma: Current SMA value
        oversold: RSI oversold threshold
        overbought: RSI overbought threshold
    
    Returns:
        'Buy', 'Sell', or 'Hold'
    """
    if price > sma and rsi < oversold:
        return 'Buy'
    elif rsi > overbought or price < sma:
        return 'Sell'
    return 'Hold'


def calculate_stop_loss(price: float, rsi: float) -> float:
    """Calculate stop loss based on RSI"""
    sl_pct = 3 if rsi < 35 else 5
    return round(price * (1 - sl_pct / 100), 2)


def calculate_take_profit(price: float, rsi: float) -> float:
    """Calculate take profit target based on RSI"""
    tp_pct = 10 if rsi < 30 else 7
    return round(price * (1 + tp_pct / 100), 2)


def calculate_potential_gain(price: float, target: float) -> float:
    """Calculate potential gain percentage"""
    return round(((target - price) / price) * 100, 2)


def calculate_volume_ma(volume: pd.Series, period: int = 20) -> pd.Series:
    """
    Calculate Volume Moving Average
    
    Args:
        volume: Series of volume data
        period: MA period (default 20)
    
    Returns:
        Series of Volume MA
    """
    return volume.rolling(window=period).mean()
