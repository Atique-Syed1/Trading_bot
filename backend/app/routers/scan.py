"""
Scan Router - Stock scanning endpoints
"""
from fastapi import APIRouter

from ..services.stock_service import scan_stocks, cached_stock_data

router = APIRouter(prefix="/api", tags=["scan"])


@router.get("/scan")
def scan_market():
    """Scan all stocks in active list for trading signals"""
    results = scan_stocks()
    return results


@router.get("/stock/{symbol}")
def get_stock(symbol: str):
    """Get cached data for a specific stock"""
    if symbol in cached_stock_data:
        return cached_stock_data[symbol]
    return {"error": f"Stock {symbol} not found. Run a scan first."}
