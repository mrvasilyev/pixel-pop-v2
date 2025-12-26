
import os
import json
from supabase import create_client
from dotenv import load_dotenv

load_dotenv("backend/.env")
load_dotenv(os.path.join(os.getcwd(), "frontend", ".env"))
if os.path.exists(os.path.join(os.getcwd(), "frontend", ".env.local")):
     print("Loading frontend/.env.local...")
     load_dotenv(os.path.join(os.getcwd(), "frontend", ".env.local"), override=True)

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_KEY")
supabase = create_client(url, key)

def inspect():
    print("🔍 Fetching last 5 generations...")
    response = supabase.table("generations")\
        .select("*")\
        .order("created_at", desc=True)\
        .limit(5)\
        .execute()
    
    for gen in response.data:
        print(f"\nID: {gen['id']}")
        print(f"Created: {gen['created_at']}")
        print(f"Status: {gen['status']}")
        print(f"Params: {gen.get('parameters')}")
        print(f"Input: {gen.get('image_url')}") # This is usually the OUTPUT. Wait.
        # ideally we want to see the input image URL too. 
        # In existing schema, is init_image stored?
        # It should be in 'parameters' json if I passed it.
        # worker.py saves generation result to 'image_url' column.
        
        if gen.get('parameters'):
            params = gen['parameters']
            if isinstance(params, str):
                try:
                    params = json.loads(params)
                except:
                    pass
            print(f"Init Image: {params.get('init_image')}")
            print(f"Size: {params.get('size')}")
            
if __name__ == "__main__":
    inspect()
