import os
import asyncio
from dotenv import load_dotenv
from collections import defaultdict

# 1. Load Environment Variables
# Try to load from frontend/.env first (standard pixel-pop structure)
current_dir = os.path.dirname(os.path.abspath(__file__))
frontend_env = os.path.join(os.path.dirname(current_dir), 'frontend', '.env')
frontend_local_env = os.path.join(os.path.dirname(current_dir), 'frontend', '.env.local')

if os.path.exists(frontend_env):
    load_dotenv(frontend_env)
if os.path.exists(frontend_local_env):
    print(f"Loading local env from {frontend_local_env}")
    load_dotenv(frontend_local_env, override=True)

# 2. Initialize Supabase
from supabase import create_client
SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("VITE_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY") or os.getenv("VITE_SUPABASE_KEY") or os.getenv("VITE_SUPABASE_ANON_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ Supabase Credentials Missing")
    print(f"URL: {SUPABASE_URL}")
    print(f"KEY: {SUPABASE_KEY is not None}")
    exit(1)

print(f"🔌 Connecting to Supabase: {SUPABASE_URL}")
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def calculate_balances():
    print("\n📊 Fetching Data...")
    
    # Fetch Users
    try:
        users_res = supabase.table("users").select("id, username, first_name").execute()
        users = users_res.data
        print(f"  Found {len(users)} users")
    except Exception as e:
        print(f"❌ Failed to fetch users: {e}")
        return

    # Fetch Current Balances
    try:
        bal_res = supabase.table("user_balances").select("*").execute()
        balances = {b["user_id"]: b for b in bal_res.data}
        print(f"  Found {len(balances)} balance records")
    except Exception as e:
        print(f"❌ Failed to fetch balances: {e}")
        return

    # Fetch Transactions
    try:
        # Note: If transactions > 1000, supabase might paginate. 
        # For a "Mini App", likely < 1000 for now. Using a high limit just in case.
        tx_res = supabase.table("user_transactions").select("*").limit(10000).execute()
        transactions = tx_res.data
        print(f"  Found {len(transactions)} transactions")
    except Exception as e:
        print(f"❌ Failed to fetch transactions: {e}")
        return

    # Calculate Aggregates
    calc_credits = defaultdict(int)
    calc_premium = defaultdict(int)
    
    for tx in transactions:
        uid = tx["user_id"]
        c_change = tx.get("credits_change") or 0
        p_change = tx.get("premium_credits_change") or 0
        
        calc_credits[uid] += c_change
        calc_premium[uid] += p_change

    print("\n⚖️  BALANCE AUDIT REPORT")
    print("=" * 60)
    print(f"{'User':<20} | {'Stored (C/P)':<15} | {'Calc (C/P)':<15} | {'Status':<10}")
    print("-" * 60)

    mismatch_count = 0
    
    for user in users:
        uid = user["id"]
        username = user.get("username") or user.get("first_name") or f"User {uid}"
        
        # Get Stored
        stored = balances.get(uid, {})
        s_c = stored.get("credits", 0)
        s_p = stored.get("premium_credits", 0)
        
        # Get Calculated
        c_c = calc_credits[uid]
        c_p = calc_premium[uid]
        
        stored_str = f"{s_c} / {s_p}"
        calc_str = f"{c_c} / {c_p}"
        
        if s_c == c_c and s_p == c_p:
            status = "✅ OK"
        else:
            status = "❌ DIFF"
            mismatch_count += 1
            
        print(f"{str(username)[:20]:<20} | {stored_str:<15} | {calc_str:<15} | {status:<10}")
        
        if status == "❌ DIFF":
            diff_c = s_c - c_c
            diff_p = s_p - c_p
            # If Stored > Calc, we have extra credits not in transactions (maybe manual edit?)
            # If Stored < Calc, we are missing credits (maybe failed update?)
            print(f"   ↳ Diff: {diff_c:+d} Credits, {diff_p:+d} Premium")

    print("=" * 60)
    print(f"Audit Complete. {mismatch_count} mismatches found.")

if __name__ == "__main__":
    calculate_balances()
