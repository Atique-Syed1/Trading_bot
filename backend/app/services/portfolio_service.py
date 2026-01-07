from typing import List, Dict, Optional
from pydantic import BaseModel, Field
from sqlmodel import Session, select
from ..models import Transaction as DBTransaction
from datetime import datetime
from .stock_service import stock_metadata

# Input Models (Pydantic)
class TransactionCreate(BaseModel):
    symbol: str
    type: str  # BUY or SELL
    quantity: int = Field(..., gt=0, description="Quantity must be positive")
    price: float = Field(..., gt=0, description="Price must be positive")
    date: str

class Holding(BaseModel):
    symbol: str
    quantity: int
    average_price: float
    current_price: float = 0.0
    current_value: float = 0.0
    pnl: float = 0.0
    pnl_percent: float = 0.0

class PortfolioSummary(BaseModel):
    total_invested: float = 0.0
    current_value: float = 0.0
    total_pnl: float = 0.0
    total_pnl_percent: float = 0.0
    holdings: List[Holding] = []

def add_transaction(transaction: TransactionCreate, session: Session) -> bool:
    # Validate symbol exists in our universe
    if transaction.symbol not in stock_metadata:
        return False
        
    # Validate sell quantity
    if transaction.type == "SELL":
        # Calculate current qty to ensure we can sell
        current_qty = _get_holding_qty(transaction.symbol, session)
        if current_qty < transaction.quantity:
            return False

    db_txn = DBTransaction(
        symbol=transaction.symbol,
        type=transaction.type,
        quantity=transaction.quantity,
        price=transaction.price,
        date=transaction.date
    )
    session.add(db_txn)
    session.commit()
    session.refresh(db_txn)
    return True

def _get_holding_qty(symbol: str, session: Session) -> int:
    txns = session.exec(select(DBTransaction).where(DBTransaction.symbol == symbol)).all()
    qty = 0
    for t in txns:
        if t.type == "BUY":
            qty += t.quantity
        else:
            qty -= t.quantity
    return qty

def get_portfolio(current_prices: Dict[str, float], session: Session) -> PortfolioSummary:
    # Fetch all transactions
    txns = session.exec(select(DBTransaction)).all()
    
    # Calculate holdings in memory
    holdings_map = {} # symbol -> {qty, total_cost}
    
    for t in txns:
        if t.symbol not in holdings_map:
            holdings_map[t.symbol] = {"qty": 0, "cost": 0.0}
            
        h = holdings_map[t.symbol]
        
        if t.type == "BUY":
            h["qty"] += t.quantity
            h["cost"] += (t.quantity * t.price)
        elif t.type == "SELL":
            if h["qty"] > 0:
                avg_cost = h["cost"] / h["qty"]
                h["qty"] -= t.quantity
                h["cost"] -= (t.quantity * avg_cost)
            else:
                current_qty = h["qty"]
                # If short selling logic isn't desired, we handle 0 check above
                h["qty"] -= t.quantity 
    
    # Build Summary
    summary = PortfolioSummary()
    
    for symbol, h in holdings_map.items():
        qty = h["qty"]
        if qty <= 0:
            continue
            
        total_cost = h["cost"]
        avg_price = total_cost / qty
        
        # Get live price
        curr_price = current_prices.get(symbol, avg_price)
        
        curr_value = qty * curr_price
        pnl = curr_value - total_cost
        pnl_percent = (pnl / total_cost * 100) if total_cost > 0 else 0
        
        holding = Holding(
            symbol=symbol,
            quantity=qty,
            average_price=avg_price,
            current_price=curr_price,
            current_value=curr_value,
            pnl=pnl,
            pnl_percent=pnl_percent
        )
        
        summary.holdings.append(holding)
        summary.total_invested += total_cost
        summary.current_value += curr_value
        
    summary.total_pnl = summary.current_value - summary.total_invested
    summary.total_pnl_percent = (summary.total_pnl / summary.total_invested * 100) if summary.total_invested > 0 else 0
    
    return summary

def get_transactions(session: Session) -> List[DBTransaction]:
    return session.exec(select(DBTransaction)).all()

def delete_transaction(transaction_id: int, session: Session) -> bool:
    txn = session.get(DBTransaction, transaction_id)
    if txn:
        session.delete(txn)
        session.commit()
        return True
    return False
