import json
import os
from typing import List, Dict
from pydantic import BaseModel

class Alert(BaseModel):
    id: str
    symbol: str
    condition: str  # ABOVE or BELOW
    price: float
    active: bool = True
    triggered_at: str = None
    
# File storage
ALERTS_FILE = os.path.join("data", "alerts.json")

def _load_alerts() -> List[Dict]:
    if os.path.exists(ALERTS_FILE):
        try:
            with open(ALERTS_FILE, 'r') as f:
                return json.load(f)
        except:
            return []
    return []

def _save_alerts(alerts: List[Dict]):
    with open(ALERTS_FILE, 'w') as f:
        json.dump(alerts, f, indent=2)

def add_alert(alert: Alert):
    alerts = _load_alerts()
    # Simple ID generation
    import uuid
    alert.id = str(uuid.uuid4())
    alerts.append(alert.dict())
    _save_alerts(alerts)
    return alert

def get_alerts() -> List[Dict]:
    return _load_alerts()

def delete_alert(alert_id: str):
    alerts = _load_alerts()
    alerts = [a for a in alerts if a["id"] != alert_id]
    _save_alerts(alerts)

def check_alerts(current_prices: Dict[str, float]) -> List[Dict]:
    """Check if any alerts are triggered by current prices"""
    alerts = _load_alerts()
    triggered = []
    
    updated = False
    for alert in alerts:
        if not alert["active"]:
            continue
            
        symbol = alert["symbol"]
        if symbol not in current_prices:
            continue
            
        current = current_prices[symbol]
        target = alert["price"]
        condition = alert["condition"]
        
        is_triggered = False
        if condition == "ABOVE" and current >= target:
            is_triggered = True
        elif condition == "BELOW" and current <= target:
            is_triggered = True
            
        if is_triggered:
            from datetime import datetime
            alert["active"] = False # Disable after trigger
            alert["triggered_at"] = datetime.now().isoformat()
            triggered.append(alert)
            updated = True
            
    if updated:
        _save_alerts(alerts)
        
    return triggered
