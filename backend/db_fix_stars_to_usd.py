import os
import asyncio
from dotenv import load_dotenv

# Load .env from frontend logic (parent/frontend/.env)
dotenv_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'frontend', '.env')
load_dotenv(dotenv_path=dotenv_path)

dotenv_local_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'frontend', '.env.local')
if os.path.exists(dotenv_local_path):
    print(f"Values loaded from {dotenv_local_path}")
    load_dotenv(dotenv_path=dotenv_local_path, override=True)

# Initialize Supabase
from supabase import create_client
SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("VITE_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY") or os.getenv("VITE_SUPABASE_KEY") or os.getenv("VITE_SUPABASE_ANON_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ Supabase Credentials Missing")
    exit(1)

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# Conversion Map (Stars -> Net USD)
# Based on Unit Economics V2.2 ($0.013/star approx)
STARS_TO_USD = {
    75: 0.98,
    250: 3.25,
    750: 9.75,
    1500: 19.50, # Legacy
    2500: 32.50  # Legacy
}

def fix_transactions():
    print("🔍 Scanning user_transactions for Star values (amount > 50)...")
    
    # 1. Fetch transactions that look like Stars (amount > 10 just to be safe, max price is $9.75 so >10 is definitely stars)
    # Note: Using > 10 because valid USD amounts are 0.98, 3.25, 9.75. 
    # Valid star amounts are 75, 250, 750+.
    try:
        res = supabase.table("user_transactions").select("*").gt("amount", 10).eq("transaction_type", "PURCHASE").execute()
        txs = res.data
        
        print(f"📊 Found {len(txs)} transactions to fix.")
        
        for tx in txs:
            old_amount = tx["amount"]
            tx_id = tx["id"]
            
            # Determine new amount
            new_amount = STARS_TO_USD.get(old_amount)
            
            # Fallback calculation if exact match not found (e.g. custom amounts?)
            if not new_amount:
                new_amount = round(old_amount * 0.013, 2)
                print(f"⚠️ Unknown Star amount {old_amount}. Calculated estimate: ${new_amount}")
            
            print(f"🛠 Fixing Tx {tx_id}: {old_amount} Stars -> ${new_amount} USD")
            
            # Update the record
            update_res = supabase.table("user_transactions").update({"amount": new_amount}).eq("id", tx_id).execute()
            
        print("✅ Fix Complete.")
        
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    fix_transactions()
