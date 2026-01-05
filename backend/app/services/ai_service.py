import random
from typing import Dict
from .stock_service import cached_stock_data, get_full_stock_data
import yfinance as yf

async def analyze_stock(symbol: str) -> Dict:
    """
    Generate an AI-style analysis of the stock based on technical indicators.
    """
    # 1. Get Data
    stock = cached_stock_data.get(symbol)
    if not stock:
        # Try to fetch if not in cache (e.g. user clicked a new stock)
        try:
           ticker = yf.Ticker(symbol if symbol.endswith('.NS') else f"{symbol}.NS")
           stock = get_full_stock_data(symbol, ticker)
        except:
           pass
    
    if not stock:
        return {
            "summary": "Data Unavailable",
            "details": f"I couldn't retrieve enough data for {symbol} to perform an analysis.",
            "sentiment": "NEUTRAL"
        }

    # 2. Extract Key Metrics
    technicals = stock.get('technicals', {})
    rsi = technicals.get('rsi', 50)
    # macd = technicals.get('macd') # MACD not currently available in cache
    signal = technicals.get('signal', 'Hold')
    price = stock.get('price', 0)
    sma = technicals.get('sma', price) # Fallback if missing
    shariah = stock.get('shariahStatus', 'Unknown')
    
    # 3. Logic Engine (The "Brain")
    points = []
    sentiment = "NEUTRAL"
    score = 0
    
    # RSI Logic
    if rsi > 70:
        points.append(f"The RSI is currently at {rsi}, indicating the stock is **Overbought**. This often suggests a pullback or correction might be coming soon.")
        score -= 1
    elif rsi < 30:
        points.append(f"The RSI is very low at {rsi} (**Oversold**). This is typically a buying opportunity as the stock may be undervalued.")
        score += 1
    elif 45 < rsi < 55:
        points.append(f"The RSI is neutral ({rsi}), showing no strong momentum in either direction.")
    elif rsi >= 60:
        points.append(f"RSI is climbing ({rsi}), showing growing bullish momentum.")
        score += 0.5
    else:
        points.append(f"RSI is cooling down ({rsi}), suggesting bearish pressure.")
        score -= 0.5

    # Signal Logic
    if signal == "Buy":
        points.append("Our algo model indicates a **Buy Signal** based on trend and momentum.")
        score += 1.5
    elif signal == "Sell":
        points.append("Our algo model indicates a **Sell Signal**.")
        score -= 1.5
    else:
        points.append(f"The current signal is **{signal}**, suggesting to wait for a clearer trend.")
        
    # Shariah Logic
    if shariah == "Halal":
        points.append("✅ This stock passes all **Shariah Screening** criteria (Debt & Cash ratios are within limits).")
    else:
        points.append("❌ Warning: This stock is **Non-Halal** based on financial ratios. Muslim investors should avoid this.")
        score = -10 # Override sentiment
        
    # 4. Generate Summary
    if score >= 1.5:
        sentiment = "BULLISH"
        summary = f"Strong Buy Signal for {stock['name']}"
    elif score <= -1.5:
        sentiment = "BEARISH"
        summary = f"Sell/Avoid Signal for {stock['name']}"
    else:
        sentiment = "NEUTRAL"
        summary = f"Hold / Watch {stock['name']}"
        
    # 5. Final Formatting
    intro = f"I've analyzed the technicals for **{stock['name']} ({stock['symbol']})**."
    
    # Random "AI" flavor text
    flavor = random.choice([
        "Based on the patterns, here is my assessment:",
        "My algorithms have detected the following:",
        "Looking at the indicators, here's what stands out:"
    ])
    
    full_text = f"{intro} {flavor}\n\n• " + "\n• ".join(points)
    
    return {
        "summary": summary,
        "details": full_text,
        "sentiment": sentiment,
        "score": score
    }
