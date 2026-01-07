from typing import List, Optional
from sqlmodel import Session, select
from ..models import WatchlistItem
from .stock_service import stock_metadata


def get_watchlist(session: Session) -> List[dict]:
    """Get all items in watchlist with full details from stock_metadata"""
    items = session.exec(select(WatchlistItem)).all()
    results = []
    
    for item in items:
        # Get metadata
        meta = stock_metadata.get(item.symbol, {})
        if not meta and not item.symbol.endswith('.NS'):
            meta = stock_metadata.get(f"{item.symbol}.NS", {})
            
        results.append({
            "symbol": item.symbol,
            "id": item.id,
            "added_at": item.added_at,
            "name": meta.get("name", "Unknown"),
            "sector": meta.get("sector", "N/A"),
            "shariahStatus": meta.get("shariah_compliance", {}).get("status", "Unknown"),
            # Placeholder for live price, frontend will still use its live price if available
            "addedPrice": 0.0 
        })
    return results


def add_to_watchlist(symbol: str, session: Session) -> bool:
    """Add a symbol to watchlist if not already there"""
    # Check if already exists
    existing = session.exec(select(WatchlistItem).where(WatchlistItem.symbol == symbol)).first()
    if existing:
        return True
    
    item = WatchlistItem(symbol=symbol)
    session.add(item)
    session.commit()
    return True

def remove_from_watchlist(symbol: str, session: Session) -> bool:
    """Remove a symbol from watchlist"""
    item = session.exec(select(WatchlistItem).where(WatchlistItem.symbol == symbol)).first()
    if item:
        session.delete(item)
        session.commit()
        return True
    return False

def clear_watchlist(session: Session):
    """Remove all items from watchlist"""
    items = session.exec(select(WatchlistItem)).all()
    for item in items:
        session.delete(item)
    session.commit()
