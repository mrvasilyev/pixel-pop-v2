import os
from supabase import create_client
from dotenv import load_dotenv

env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'frontend', '.env.local')
load_dotenv(env_path, override=True)

url = os.getenv("VITE_SUPABASE_URL")
key = os.getenv("VITE_SUPABASE_ANON_KEY")

print(f"URL: {url}")
print(f"KEY: {key}")

if not url or not key:
    print("❌ Missing Creds")
    exit(1)

try:
    print("🔌 Connecting...")
    supabase = create_client(url, key)
    
    print("🔍 Selecting users...")
    # Try to read users (REQUIRES Service Role usually, or strict RLS)
    # If Anon key, RLS might block SELECT if not owner.
    # But get_or_create_user uses select("id", count="exact").eq("id", user_id)
    
    user_id = 51576055
    res = supabase.table("users").select("id", count="exact").eq("id", user_id).execute()
    print(f"✅ Connection OK. Found: {res.count} users.")
    
    print("🧹 Force Deleting user 51576055...")
    supabase.table("users").delete().eq("id", user_id).execute()
    print("✅ Deleted. Ready for fresh login.")
        
except Exception as e:
    print(f"❌ Failed: {e}")
