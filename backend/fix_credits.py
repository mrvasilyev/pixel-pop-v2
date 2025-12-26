
import os
import asyncio
from supabase import create_client, Client

# Hardcoded from .env.local for this script since loading env might be tricky in isolation
SUPABASE_URL="https://iatagwwkyojuufbsyfmi.supabase.co"
SUPABASE_KEY="sb_secret_5dZQaUAmQBGcdUOyARwwQg_3ztrU8rk"

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

USER_ID = "51576055"

def check_and_fix_user():
    print(f"Checking user: {USER_ID}")
    
    # 1. Check Balances
    try:
        res = supabase.table("user_balances").select("*").eq("user_id", USER_ID).execute()
        print(f"Balances: {res.data}")
    except Exception as e:
        print(f"Error checking balances: {e}")

    # 2. Check Transactions
    try:
        res = supabase.table("user_transactions").select("*").eq("user_id", USER_ID).order("created_at", desc=True).limit(5).execute()
        print(f"Recent Transactions: {res.data}")
    except Exception as e:
        print(f"Error checking transactions: {e}")

    # 3. Grant Gift if needed
    # Check if a gift grant exists
    has_gift = False
    if res.data:
        for txn in res.data:
            if txn.get('transaction_type') == 'GIFT':
                has_gift = True
                break
    
    if not has_gift:
        print("🎁 No Gift found! Granting 3 credits now...")
        gift_transaction = {
            "user_id": USER_ID,
            "transaction_type": "GIFT",
            "amount": 0.0,
            "credits_change": 3,
            "description": "Manual Fix Gift",
            "reference_id": f"gift_{USER_ID}_manual_fix" 
        }
        try:
            supabase.table("user_transactions").insert(gift_transaction).execute()
            print("✅ Gift Granted Successfully.")
        except Exception as e:
            print(f"❌ Failed to grant gift: {e}")
    else:
        print("ℹ️ User already has a gift transaction.")

if __name__ == "__main__":
    check_and_fix_user()
