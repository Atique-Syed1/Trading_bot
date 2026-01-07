from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from sqlmodel import Session

from ..services import portfolio_service
from ..services.stock_service import get_all_stocks
from ..database import get_session

router = APIRouter(
    prefix="/api/portfolio",
    tags=["portfolio"]
)

class TransactionRequest(BaseModel):
    symbol: str
    type: str # "BUY" or "SELL"
    quantity: int
    price: float
    date: Optional[str] = None

@router.get("")
async def get_portfolio(session: Session = Depends(get_session)):
    # Get all symbols in portfolio to ensure we have prices for them
    txns = portfolio_service.get_transactions(session)
    portfolio_symbols = list(set([t.symbol for t in txns]))
    
    from ..services.stock_service import live_prices, fetch_live_prices
    
    # Identify symbols missing from our live price cache
    missing = [s for s in portfolio_symbols if s not in live_prices]
    if missing:
        # Fetch prices for missing symbols explicitly
        # Note: fetch_live_prices expects symbols with .NS suffix or handles it
        try:
            formatted_missing = [s if s.endswith('.NS') else f"{s}.NS" for s in missing]
            await fetch_live_prices(formatted_missing)
        except Exception as e:
            print(f"Error fetching missing portfolio prices: {e}")
            
    # Combine live_prices with scan results
    stocks = get_all_stocks()
    price_map = live_prices.copy()
    for s in stocks:
        if s["symbol"] not in price_map:
            price_map[s["symbol"]] = s["price"]
    
    return portfolio_service.get_portfolio(price_map, session)


@router.post("/transaction")
async def add_transaction(tx: TransactionRequest, session: Session = Depends(get_session)):
    if not tx.date:
        tx.date = datetime.now().isoformat()
        
    transaction = portfolio_service.TransactionCreate(
        symbol=tx.symbol,
        type=tx.type,
        quantity=tx.quantity,
        price=tx.price,
        date=tx.date
    )
    
    success = portfolio_service.add_transaction(transaction, session)
    if not success:
        raise HTTPException(status_code=400, detail="Invalid transaction (insufficient holdings)")
        
    return {"success": True}

@router.get("/transactions")
async def get_transactions(session: Session = Depends(get_session)):
    return portfolio_service.get_transactions(session)

@router.delete("/transaction/{transaction_id}")
async def delete_transaction(transaction_id: int, session: Session = Depends(get_session)):
    success = portfolio_service.delete_transaction(transaction_id, session)
    if not success:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return {"success": True}
