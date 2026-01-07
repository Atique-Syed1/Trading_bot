from typing import Optional
from sqlmodel import Field, SQLModel
from datetime import datetime

class Transaction(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    symbol: str = Field(index=True)
    type: str  # "BUY" or "SELL"
    quantity: int
    price: float
    date: str = Field(default_factory=lambda: datetime.now().isoformat())

class Alert(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    symbol: str = Field(index=True)
    condition: str  # "Above" or "Below"
    target_price: float
    active: bool = Field(default=True)
    triggered_at: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now().isoformat())

class WatchlistItem(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    symbol: str = Field(index=True, unique=True)
    added_at: str = Field(default_factory=lambda: datetime.now().isoformat())


class Setting(SQLModel, table=True):
    key: str = Field(primary_key=True)
    value: str
