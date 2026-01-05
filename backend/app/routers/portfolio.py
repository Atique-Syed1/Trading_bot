from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

from ..services import portfolio_service
from ..services.stock_service import get_all_stocks

router = APIRouter(
    prefix="/api/portfolio",
    tags=["portfolio"]
)

class TransactionRequest(BaseModel):
    symbol: str
    type: str
    quantity: int
    price: float
    date: Optional[str] = None

@router.get("/")
async def get_portfolio():
    # Get current prices from stock service to calculate realtime P&L
    stocks = get_all_stocks()
    price_map = {s["symbol"]: s["price"] for s in stocks}
    
    return portfolio_service.get_portfolio(price_map)

@router.post("/transaction")
async def add_transaction(tx: TransactionRequest):
    if not tx.date:
        tx.date = datetime.now().isoformat()
        
    transaction = portfolio_service.Transaction(
        symbol=tx.symbol,
        type=tx.type,
        quantity=tx.quantity,
        price=tx.price,
        date=tx.date
    )
    
    success = portfolio_service.add_transaction(transaction)
    if not success:
        raise HTTPException(status_code=400, detail="Invalid transaction")
        
    return {"success": True}

@router.get("/transactions")
async def get_transactions():
    return portfolio_service.get_transactions()
