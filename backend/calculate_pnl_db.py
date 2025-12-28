
import os
import psycopg2
from urllib.parse import urlparse

# Connection details
DB_URL = "postgresql://postgres.iatagwwkyojuufbsyfmi:JobToBeDone.2023@aws-1-ap-south-1.pooler.supabase.com:5432/postgres"

def calculate_pnl(telegram_id):
    print(f"📊 Connecting to Database to calculate P&L for: {telegram_id}...")
    
    try:
        conn = psycopg2.connect(DB_URL)
        cur = conn.cursor()

        # DEBUG: Check columns in users table
        print("🔍 checking schema for 'users' table...")
        cur.execute("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users';")
        cols = cur.fetchall()
        print("Columns:", cols)
        
        # 1. Get User ID (Assuming id IS the telegram_id based on auth.py inspection)
        # Try both ways to be sure
        target_id = 51576055
        
        # Try querying by ID directly
        print(f"🔍 Checking if user exists with ID {target_id}...")
        cur.execute("SELECT id FROM users WHERE id = %s;", (target_id,))
        user_row = cur.fetchone()
        
        if not user_row:
            print(f"❌ User with ID {target_id} not found.")
            # Fallback: maybe it IS a UUID and there IS a telegram_id column? 
            # (columns print above will clarify)
            return

        user_uid = user_row[0]
        print(f"✅ Found User: {user_uid}")
        
        # 2. Get Transactions
        print(f"🔍 Fetching transactions for user_id={user_uid}...")
        cur.execute("SELECT amount, transaction_type, created_at FROM user_transactions WHERE user_id = %s;", (user_uid,))
        rows = cur.fetchall()
        
        print(f"📝 Found {len(rows)} transactions.")

        # 3. Get Current Balance
        print(f"🔍 Fetching balance for user_id={user_uid}...")
        cur.execute("SELECT * FROM user_balances WHERE user_id = %s;", (user_uid,))
        balance_row = cur.fetchone()
        
        # Get column names to map properly
        colnames = [desc[0] for desc in cur.description]
        balance_dict = dict(zip(colnames, balance_row)) if balance_row else {}
        
        print(f"💰 Balance Data: {balance_dict}")

        credits = balance_dict.get('credits', 0)
        premium_credits = balance_dict.get('premium_credits', 0)
        
        total_purchases = 0.0
        total_gen_cost = 0.0
        
        purchases_count = 0
        generations_count = 0
        
        for row in rows:
            amount = float(row[0]) if row[0] is not None else 0.0
            tx_type = row[1]
            
            if amount > 0:
                total_purchases += amount
                purchases_count += 1
            elif amount < 0:
                total_gen_cost += abs(amount)
                generations_count += 1
                
        profit = total_purchases - total_gen_cost
        margin = 0
        if total_purchases > 0:
            margin = (profit / total_purchases) * 100

        # Forecast
        COST_PER_CREDIT = 0.04
        gens_left_cost = credits * COST_PER_CREDIT
        start_premium_credits_cost = premium_credits * COST_PER_CREDIT # Assuming same base cost for now? Or higher? 
        # Actually user asked "64x 0.04", so let's stick to credits * 0.04 for now.
        # If premium credits exist, we should probably account for them too, but let's assume standard credits for the main metric.
        
        forecast_total_cost = total_gen_cost + gens_left_cost
        forecast_net_profit = total_purchases - forecast_total_cost
        forecast_gross_margin = 0
        if total_purchases > 0:
            forecast_gross_margin = (forecast_net_profit / total_purchases) * 100

        # ROI Calculations
        # 1. Current ROI
        current_roi = 0
        if total_gen_cost > 0:
            current_roi = ((total_purchases - total_gen_cost) / total_gen_cost) * 100
            
        # 2. Forecast ROI
        forecast_roi = 0
        if forecast_total_cost > 0:
            forecast_roi = ((total_purchases - forecast_total_cost) / forecast_total_cost) * 100

        print("\n" + "="*40)
        print(f"💰 P&L & ROI REPORT FOR {target_id}")
        print("="*40)
        print("| Metric | Value |")
        print("| :--- | :--- |")
        print(f"| Purchases (Revenue) | ${total_purchases:.2f} |")
        print(f"| Generations (Cost) | ${total_gen_cost:.6f} |")
        print(f"| Current Net Profit | ${profit:.6f} |")
        print(f"| Current ROI | {current_roi:.2f}% |")
        print("| | |")
        print(f"| Forecast Cost (w/ remaining) | ${forecast_total_cost:.6f} |")
        print(f"| Forecast Net Profit | ${forecast_net_profit:.6f} |")
        print(f"| Forecast ROI | {forecast_roi:.2f}% |")
        print("="*40 + "\n")
        
        cur.close()
        conn.close()
        
    except Exception as e:
        print(f"❌ DB Error: {e}")

if __name__ == "__main__":
    calculate_pnl(51576055)
