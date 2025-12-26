
import os
import asyncio
from supabase import create_client, Client

# Hardcoded from .env.local
SUPABASE_URL="https://iatagwwkyojuufbsyfmi.supabase.co"
SUPABASE_KEY="sb_secret_5dZQaUAmQBGcdUOyARwwQg_3ztrU8rk"

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

USER_ID = "51576055"

def delete_user_data():
    print(f"🗑️ Deleting data for user: {USER_ID}")
    
    # Tables to clean in order of dependencies (child -> parent)
    tables = [
        "generations",
        "user_transactions",
        "user_balances",
        "users"
    ]
    
    for table in tables:
        try:
            print(f"Cleaning {table}...")
            # Note: supabase-py delete usage: table(..).delete().eq(..).execute()
            # For 'users' table, assuming the ID column is 'id' or 'user_id' depending on schema.
            # Usually 'users' table in supabase public schema is just a profile table. 
            # If it's auth.users, we can't delete via client easily without service role key, 
            # but we likely mean the public profile.
            
            col = "user_id"
            if table == "users":
                col = "id"
                
            res = supabase.table(table).delete().eq(col, USER_ID).execute()
            print(f"✅ Deleted from {table}: {len(res.data) if res.data else 0} records")
            
        except Exception as e:
            print(f"⚠️ Error cleaning {table}: {e}")

if __name__ == "__main__":
    delete_user_data()
