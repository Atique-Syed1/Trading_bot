import json
import os
from sqlmodel import Session, select
from app.database import engine, create_db_and_tables
from app.models import Transaction, Alert

def migrate():
    print("🚀 Starting Migration (JSON -> SQLite)...")
    
    # 1. Create Tables
    create_db_and_tables()
    
    with Session(engine) as session:
        # 2. Migrate Portfolio
        portfolio_file = os.path.join("data", "portfolio.json")
        if os.path.exists(portfolio_file):
            print("Found portfolio.json, migrating...")
            try:
                with open(portfolio_file, 'r') as f:
                    data = json.load(f)
                    transactions = data.get("transactions", [])
                    
                    count = 0
                    for txn in transactions:
                        # Check if already exists (naive check by date + symbol)
                        # Actually, just insert all since DB is fresh usually
                        db_txn = Transaction(
                            symbol=txn["symbol"],
                            type=txn["type"],
                            quantity=txn["quantity"],
                            price=txn["price"],
                            date=txn["date"]
                        )
                        session.add(db_txn)
                        count += 1
                    
                    print(f"✅ Migrated {count} transactions.")
            except Exception as e:
                print(f"❌ Error migrating portfolio: {e}")
        
        # 3. Migrate Alerts
        alerts_file = os.path.join("data", "alerts.json")
        if os.path.exists(alerts_file):
            print("Found alerts.json, migrating...")
            try:
                with open(alerts_file, 'r') as f:
                    alerts = json.load(f)
                    
                    count = 0
                    for a in alerts:
                        db_alert = Alert(
                            symbol=a["symbol"],
                            condition=a["condition"],
                            target_price=a.get("price", 0.0), # Schema changed from price -> target_price
                            active=a.get("active", True),
                            triggered_at=a.get("triggered_at")
                        )
                        session.add(db_alert)
                        count += 1
                        
                    print(f"✅ Migrated {count} alerts.")
            except Exception as e:
                print(f"❌ Error migrating alerts: {e}")
        
        session.commit()
        print("💾 Database committed.")
    
    print("\nMigration Complete! You can now delete JSON files in /data if verified.")

if __name__ == "__main__":
    migrate()
