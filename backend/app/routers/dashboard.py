"""
Dashboard Router - Dashboard analytics endpoints
"""
from fastapi import APIRouter, Depends
from sqlmodel import Session, select
from typing import Dict, List
from datetime import datetime, timedelta
import random

from ..database import get_session
from ..models import Transaction, Alert, WatchlistItem
from ..services.stock_service import (
    live_prices, cached_stock_data, stock_metadata, active_stock_list
)
from ..services.portfolio_service import get_portfolio

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


from ..utils.market_utils import get_market_status


def get_top_movers(limit: int = 5) -> Dict:
    """Get top gainers and losers from cached data"""
    stocks = list(cached_stock_data.values())
    
    if not stocks:
        return {"gainers": [], "losers": []}
    
    # Sort by price change percent
    sorted_stocks = sorted(
        stocks, 
        key=lambda x: x.get('priceChangePercent', 0), 
        reverse=True
    )
    
    gainers = [
        {
            "symbol": s.get('symbol', '').replace('.NS', ''),
            "name": s.get('name', s.get('symbol', '')),
            "price": s.get('price', 0),
            "change": s.get('priceChange', 0),
            "changePercent": s.get('priceChangePercent', 0)
        }
        for s in sorted_stocks[:limit]
        if s.get('priceChangePercent', 0) > 0
    ]
    
    losers = [
        {
            "symbol": s.get('symbol', '').replace('.NS', ''),
            "name": s.get('name', s.get('symbol', '')),
            "price": s.get('price', 0),
            "change": s.get('priceChange', 0),
            "changePercent": s.get('priceChangePercent', 0)
        }
        for s in reversed(sorted_stocks[-limit:])
        if s.get('priceChangePercent', 0) < 0
    ]
    
    return {"gainers": gainers, "losers": losers}


def get_halal_picks(limit: int = 5) -> List[Dict]:
    """Get top Halal stocks with buy signals"""
    stocks = list(cached_stock_data.values())
    
    halal_buys = [
        {
            "symbol": s.get('symbol', '').replace('.NS', ''),
            "name": s.get('name', s.get('symbol', '')),
            "price": s.get('price', 0),
            "signal": s.get('signal', 'HOLD'),
            "rsi": s.get('technicals', {}).get('rsi', 0),
            "shariahStatus": s.get('shariahStatus', 'Unknown')
        }
        for s in stocks
        if s.get('shariahStatus') == 'Halal' and s.get('signal') in ['BUY', 'STRONG BUY']
    ]
    
    return halal_buys[:limit]


def get_sector_breakdown() -> List[Dict]:
    """Get sector-wise breakdown of stocks"""
    sector_map = {}
    
    for symbol, meta in stock_metadata.items():
        sector = meta.get('sector', 'Unknown')
        if sector not in sector_map:
            sector_map[sector] = {"sector": sector, "count": 0, "stocks": []}
        sector_map[sector]["count"] += 1
        sector_map[sector]["stocks"].append(symbol)
    
    sectors = list(sector_map.values())
    sectors.sort(key=lambda x: x["count"], reverse=True)
    
    return sectors


@router.get("")
async def get_dashboard(session: Session = Depends(get_session)):
    """Get complete dashboard data"""
    
    # Portfolio summary
    current_prices = {
        s.get('symbol', '').replace('.NS', ''): s.get('price', 0)
        for s in cached_stock_data.values()
    }
    portfolio = get_portfolio(current_prices, session)
    
    # Watchlist count
    watchlist_items = session.exec(select(WatchlistItem)).all()
    watchlist_count = len(watchlist_items)
    
    # Active alerts count
    active_alerts = session.exec(
        select(Alert).where(Alert.active == True)
    ).all()
    
    # Recent triggered alerts
    triggered_alerts = session.exec(
        select(Alert).where(Alert.triggered_at != None)
    ).all()
    
    # Market status
    market = get_market_status()
    
    # Top movers
    movers = get_top_movers(5)
    
    # Halal picks
    halal_picks = get_halal_picks(5)
    
    # Sector breakdown
    sectors = get_sector_breakdown()
    
    # Stats summary
    total_stocks = len(active_stock_list.get('symbols', []))
    halal_count = sum(
        1 for s in cached_stock_data.values() 
        if s.get('shariahStatus') == 'Halal'
    )
    
    return {
        "portfolio": {
            "totalValue": portfolio.current_value,
            "totalInvested": portfolio.total_invested,
            "todayPnL": portfolio.total_pnl,
            "todayPnLPercent": portfolio.total_pnl_percent,
            "holdingsCount": len(portfolio.holdings)
        },
        "market": market,
        "stats": {
            "totalStocks": total_stocks,
            "halalStocks": halal_count,
            "watchlistCount": watchlist_count,
            "activeAlerts": len(active_alerts),
            "triggeredAlerts": len(triggered_alerts)
        },
        "topMovers": movers,
        "halalPicks": halal_picks,
        "sectors": sectors,
        "alerts": [
            {
                "id": a.id,
                "symbol": a.symbol,
                "condition": a.condition,
                "targetPrice": a.target_price,
                "active": a.active,
                "triggeredAt": a.triggered_at
            }
            for a in (active_alerts + triggered_alerts)[:5]
        ]
    }


@router.get("/performance")
async def get_portfolio_performance(
    period: str = "1m",
    session: Session = Depends(get_session)
):
    """Get portfolio performance over time (simulated for now)"""
    
    # Get all transactions
    transactions = session.exec(select(Transaction)).all()
    
    # Calculate period days
    period_days = {
        "1w": 7,
        "1m": 30,
        "3m": 90,
        "6m": 180,
        "1y": 365
    }.get(period, 30)
    
    # Generate performance data points
    data_points = []
    base_value = 100000  # Starting value
    
    # Get current portfolio value
    current_prices = {
        s.get('symbol', '').replace('.NS', ''): s.get('price', 0)
        for s in cached_stock_data.values()
    }
    portfolio = get_portfolio(current_prices, session)
    current_value = portfolio.current_value if portfolio.current_value > 0 else base_value
    
    # Generate historical curve (simulated)
    import random
    random.seed(42)  # Consistent results
    
    for i in range(period_days):
        date = datetime.now() - timedelta(days=period_days - i)
        # Simulate growth pattern
        progress = i / period_days
        volatility = random.uniform(-0.02, 0.025)
        value = base_value + (current_value - base_value) * progress + base_value * volatility
        
        data_points.append({
            "date": date.strftime("%Y-%m-%d"),
            "value": round(value, 2)
        })
    
    # Add current value
    data_points.append({
        "date": datetime.now().strftime("%Y-%m-%d"),
        "value": round(current_value, 2)
    })
    
    return {
        "period": period,
        "dataPoints": data_points,
        "startValue": base_value,
        "currentValue": current_value,
        "change": current_value - base_value,
        "changePercent": ((current_value - base_value) / base_value) * 100 if base_value > 0 else 0
    }
