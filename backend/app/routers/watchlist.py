from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session
from typing import List
from ..database import get_session
from ..services import watchlist_service

router = APIRouter(prefix="/api/watchlist", tags=["watchlist"])

@router.get("")
def get_watchlist(session: Session = Depends(get_session)):
    return watchlist_service.get_watchlist(session)

@router.post("/{symbol}")
def add_to_watchlist(symbol: str, session: Session = Depends(get_session)):
    return {"success": watchlist_service.add_to_watchlist(symbol.upper(), session)}

@router.delete("/{symbol}")
def remove_from_watchlist(symbol: str, session: Session = Depends(get_session)):
    success = watchlist_service.remove_from_watchlist(symbol.upper(), session)
    if not success:
        raise HTTPException(status_code=404, detail="Symbol not in watchlist")
    return {"success": True}

@router.delete("")
def clear_watchlist(session: Session = Depends(get_session)):
    watchlist_service.clear_watchlist(session)
    return {"success": True}
