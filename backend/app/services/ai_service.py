import os
import random
from typing import Dict
from .stock_service import cached_stock_data, get_full_stock_data
import yfinance as yf
import google.generativeai as genai
from dotenv import load_dotenv
import json

# Load environment variables
load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

async def analyze_stock(symbol: str) -> Dict:
    """
    Generate an AI-style analysis of the stock.
    Prioritizes Gemini LLM if configured, otherwise falls back to Expert System.
    """
    # 1. Get Data
    stock = cached_stock_data.get(symbol)
    if not stock:
        try:
            ticker = yf.Ticker(symbol if symbol.endswith('.NS') else f"{symbol}.NS")
            stock = get_full_stock_data(symbol, ticker)
        except:
            pass
    
    if not stock:
        return {
            "summary": "Data Unavailable",
            "details": f"I couldn't retrieve enough data for {symbol} to perform an analysis. Please try again later.",
            "sentiment": "NEUTRAL"
        }

    # 2. Decide Analysis Method
    if GEMINI_API_KEY:
        try:
             return await generate_gemini_analysis(stock, symbol)
        except Exception as e:
             print(f"Gemini API failed, falling back to expert system: {e}")
             return generate_expert_analysis(stock)
    else:
        return generate_expert_analysis(stock)


async def generate_gemini_analysis(stock: Dict, symbol: str) -> Dict:
    """Use Google Gemini to generate investment analysis"""
    
    price = stock.get('price', 0)
    technicals = stock.get('technicals', {})
    shariah = stock.get('shariah', {})
    analysis = stock.get('analysis', {})

    # Construct Prompt
    prompt = f"""
    You are an expert Islamic Investment Analyst for 'HalalTrade Pro'. 
    Analyze the stock {symbol} based on the following technical and fundamental data.

    **Market Data:**
    - Price: {price}
    - RSI (14): {technicals.get('rsi', 'N/A')}
    - MACD: {analysis.get('macd', 'N/A')} (Signal: {analysis.get('macd_signal', 'N/A')})
    - 50 SMA: {analysis.get('sma50', 'N/A')}
    - 200 SMA: {analysis.get('sma200', 'N/A')}
    - Volume: {analysis.get('volume', 'N/A')}

    **Shariah Compliance:**
    - Status: {stock.get('shariahStatus', 'Unknown')}
    - Debt Ratio: {shariah.get('debtRatio', 'N/A')}%
    - Non-Halal Income: {shariah.get('impureRatio', 'N/A')}%
    - Reason: {stock.get('shariahReason', '')}

    **Task:**
    1. Provide a "Verdict" (BUY, SELL, or HOLD).
    2. Write a concise "Executive Summary" (2-3 sentences).
    3. Provide "Detailed Analysis" in markdown bullet points, covering Trend, Momentum, and Shariah Safety. Used bolding for key terms.
    4. Maintain a professional, objective, yet helpful tone.
    5. Be explicit about Shariah compliance.

    **Output Format (JSON):**
    {{
        "sentiment": "BUY/SELL/HOLD",
        "summary": "...",
        "details": "..."
    }}
    """

    model = genai.GenerativeModel('gemini-pro')
    response = model.generate_content(prompt)
    
    try:
        text = response.text.replace('```json', '').replace('```', '')
        data = json.loads(text)
        return data
    except Exception as e:
        return {
            "sentiment": "NEUTRAL", 
            "summary": "AI Generated Analysis", 
            "details": response.text
        }


def generate_expert_analysis(stock: Dict) -> Dict:
    """Legacy Rule-Based Logic (The 'Expert System')"""
    
    price = stock.get('price', 0)
    technicals = stock.get('technicals', {})
    analysis = stock.get('analysis', {})
    shariah_status = stock.get('shariahStatus', 'Unknown')
    
    rsi = technicals.get('rsi', 50)
    sma20 = analysis.get('sma20', price)
    sma50 = analysis.get('sma50', price)
    sma200 = analysis.get('sma200', price)
    macd_val = analysis.get('macd', 0)
    macd_signal = analysis.get('macd_signal', 0)
    bb_upper = analysis.get('bb_upper', price * 1.1)
    bb_lower = analysis.get('bb_lower', price * 0.9)
    
    points = []
    sentiment_score = 0
    
    trend_msg = ""
    if price > sma200:
        trend_msg = "The stock is in a **Long-Term Uptrend** (Price > 200 SMA)."
        sentiment_score += 1
        if price > sma50 and sma50 > sma200:
            trend_msg += " Ideally positioned with a strong bullish structure."
            sentiment_score += 1
    elif price < sma200:
        trend_msg = "The stock is in a **Long-Term Downtrend** (Price < 200 SMA)."
        sentiment_score -= 1
        if price < sma50:
            trend_msg += " Short-term weakness is also visible."
            sentiment_score -= 1
            
    points.append(f"📉 **Trend**: {trend_msg}")
    
    momentum_msg = []
    if rsi > 70:
        momentum_msg.append(f"RSI is **Overbought** ({rsi}), suggesting a potential pullback.")
        sentiment_score -= 0.5
    elif rsi < 30:
        momentum_msg.append(f"RSI is **Oversold** ({rsi}), suggesting the stock is undervalued.")
        sentiment_score += 1
    else:
        momentum_msg.append(f"RSI is Neutral ({rsi}).")
        
    if macd_val > macd_signal:
        momentum_msg.append("MACD is **Bullish** (above signal line).")
        sentiment_score += 0.5
    else:
        momentum_msg.append("MACD is **Bearish** (below signal line).")
        sentiment_score -= 0.5
        
    points.append(f"🚀 **Momentum**: {' '.join(momentum_msg)}")
    
    if price >= bb_upper * 0.99:
        points.append("⚠️ Price near **Upper Bollinger Band** (Resistance).")
    elif price <= bb_lower * 1.01:
        points.append("✅ Price near **Lower Bollinger Band** (Support).")
    else:
        points.append(f"📊 **Volatility**: Price is trading within the normal volatility bands.")

    # Shariah Check in Expert Logic
    if shariah_status == 'Non-Halal':
        points.append("❌ **Shariah**: This stock is Non-Halal. Trading is prohibited.")
        sentiment_score = -10
    elif shariah_status == 'Halal':
        points.append("✅ **Compliance**: This stock passes all Shariah screening criteria.")

    if sentiment_score >= 1.5:
        verdict = "BUY"
        summary_text = "Strong technicals suggest a buying opportunity."
    elif sentiment_score <= -1.5:
        verdict = "SELL"
        summary_text = "Technical weakness suggests avoiding or selling."
    else:
        verdict = "HOLD"
        summary_text = "Mixed signals. Wait for clearer direction."

    return {
        "summary": summary_text,
        "details": "\n\n".join(points),
        "sentiment": verdict,
        "score": sentiment_score
    }
