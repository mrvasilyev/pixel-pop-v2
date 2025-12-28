import os
import asyncio
from supabase import create_client
from dotenv import load_dotenv

# Load env (standard auto-discovery)
load_dotenv()

# Initialize Supabase
# Try to get from env (os.getenv)
SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("VITE_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY") or os.getenv("VITE_SUPABASE_KEY") or os.getenv("VITE_SUPABASE_ANON_KEY")

print(f"DEBUG: URL present: {bool(SUPABASE_URL)}")
print(f"DEBUG: KEY present: {bool(SUPABASE_KEY)}")

if not SUPABASE_URL or not SUPABASE_KEY:
    # Fallback: Try to read from a local file explicitly if auto-discovery failed
    # and we are in backend dir
    try:
        with open("../.env", "r") as f:
             print("Found ../.env, parsing...")
             for line in f:
                if "SUPABASE_URL" in line:
                    SUPABASE_URL = line.split("=")[1].strip().strip('"')
                if "SUPABASE_KEY" in line or "VITE_SUPABASE_ANON_KEY" in line:
                    SUPABASE_KEY = line.split("=")[1].strip().strip('"')
    except:
        pass

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ Error: SUPABASE_URL and SUPABASE_KEY must be set in environment.")
    exit(1)

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

async def calculate_pnl(telegram_id):
    print(f"📊 Calculating P&L for Telegram ID: {telegram_id}")

    # 1. Get User ID (UUID)
    try:
        user_res = supabase.table("users").select("id").eq("telegram_id", str(telegram_id)).execute()
        if not user_res.data:
            print(f"❌ User with Telegram ID {telegram_id} not found.")
            return
        
        user_uid = user_res.data[0]["id"]
        print(f"✅ Found User UUID: {user_uid}")
    except Exception as e:
        print(f"❌ Error fetching user: {e}")
        return

    # 2. Get All Transactions
    try:
        # Fetch all transactions for this user
        # We need 'amount' and 'transaction_type'
        # amount > 0 usually means Deposit/Purchase
        # amount < 0 usually means Usage/Cost
        # But let's verify types.
        
        tx_res = supabase.table("user_transactions").select("*").eq("user_id", user_uid).execute()
        transactions = tx_res.data
        
        print(f"📝 Found {len(transactions)} transactions.")
        
        total_purchases = 0.0
        total_generations_cost = 0.0 # This should be positive value of sum(negative amounts)
        
        generations_count = 0
        purchases_count = 0 
        
        for tx in transactions:
            amt = float(tx.get("amount", 0))
            t_type = tx.get("transaction_type", "UNKNOWN")
            
            if amt > 0:
                # Revenue (Purchase)
                # Filter out "GIFT" or "BONUS" if they have 0 amount, but usually they might be 0.
                # If amt > 0, it's real money (unless manual credit_add without payment?)
                # Assuming 'amount' reflects USD value.
                total_purchases += amt
                purchases_count += 1
            elif amt < 0:
                # Cost (Generation)
                total_generations_cost += abs(amt)
                generations_count += 1
            
            # Debug types
            # print(f"  - {t_type}: {amt}")

        profit = total_purchases - total_generations_cost
        
        gross_margin = 0
        if total_purchases > 0:
            gross_margin = (profit / total_purchases) * 100
            
        print("\n" + "="*40)
        print(f"💰 P&L REPORT FOR {telegram_id}")
        print("="*40)
        print(f"🛒 Purchases:      ${total_purchases:.2f} ({purchases_count} txns)")
        print(f"⚡ Generations:    ${total_generations_cost:.6f} ({generations_count} txns)")
        print("-" * 40)
        print(f"💵 Net Profit:     ${profit:.6f}")
        print(f"📈 Gross Margin:   {gross_margin:.2f}%")
        print("="*40 + "\n")

    except Exception as e:
        print(f"❌ Error fetching transactions: {e}")

if __name__ == "__main__":
    asyncio.run(calculate_pnl(51576055))
