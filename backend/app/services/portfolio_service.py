import json
import os
from datetime import datetime
from typing import List, Dict, Optional
from pydantic import BaseModel

# Data models
class Transaction(BaseModel):
    symbol: str
    type: str  # BUY or SELL
    quantity: int
    price: float
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

# File path for storing portfolio data (mock database)
PORTFOLIO_FILE = os.path.join("data", "portfolio.json")

# Ensure data directory exists
os.makedirs("data", exist_ok=True)

def _load_data() -> Dict:
    if os.path.exists(PORTFOLIO_FILE):
        try:
            with open(PORTFOLIO_FILE, 'r') as f:
                return json.load(f)
        except:
            return {"transactions": [], "holdings": {}}
    return {"transactions": [], "holdings": {}}

def _save_data(data: Dict):
    with open(PORTFOLIO_FILE, 'w') as f:
        json.dump(data, f, indent=2)

def add_transaction(transaction: Transaction) -> bool:
    data = _load_data()
    
    # Add transaction record
    data["transactions"].append(transaction.dict())
    
    # Update holdings
    symbol = transaction.symbol
    holdings = data.get("holdings", {})
    
    if symbol not in holdings:
        holdings[symbol] = {"quantity": 0, "total_cost": 0.0}
    
    current = holdings[symbol]
    
    if transaction.type == "BUY":
        current["quantity"] += transaction.quantity
        current["total_cost"] += (transaction.quantity * transaction.price)
    elif transaction.type == "SELL":
        # FIFO or Weighted Avg logic could go here, for now simple reduction
        if current["quantity"] >= transaction.quantity:
            cost_per_share = current["total_cost"] / current["quantity"] if current["quantity"] > 0 else 0
            current["quantity"] -= transaction.quantity
            current["total_cost"] -= (transaction.quantity * cost_per_share)
        else:
            return False # Cannot sell more than owned
            
    # Clean up empty holdings
    if current["quantity"] <= 0:
        del holdings[symbol]
    
    data["holdings"] = holdings
    _save_data(data)
    return True

def get_portfolio(current_prices: Dict[str, float]) -> PortfolioSummary:
    data = _load_data()
    holdings_dict = data.get("holdings", {})
    
    summary = PortfolioSummary()
    
    for symbol, info in holdings_dict.items():
        qty = info["quantity"]
        total_cost = info["total_cost"]
        avg_price = total_cost / qty if qty > 0 else 0
        
        # Get live price or fallback to avg price (no gain/loss)
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

def get_transactions() -> List[Dict]:
    data = _load_data()
    return data.get("transactions", [])
