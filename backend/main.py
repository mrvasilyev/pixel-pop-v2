import os
import sys
from fastapi import FastAPI, HTTPException, Request, Depends, Header, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
# Load .env FIRST
dotenv_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'frontend', '.env')
load_dotenv(dotenv_path=dotenv_path)

dotenv_local_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'frontend', '.env.local')
if os.path.exists(dotenv_local_path):
    print(f"Loading local env from {dotenv_local_path}")
    load_dotenv(dotenv_path=dotenv_local_path, override=True)

# Fix for ModuleNotFoundError when running from root (uvicorn backend.main:app)
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from auth import validate_telegram_data, create_jwt_token, verify_jwt_token, get_or_create_user
from job_manager import JobManager
from worker import worker_loop
import asyncio

app = FastAPI()

# Allow CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Job Manager (Global)
job_manager = JobManager()
JWT_SECRET = os.getenv("JWT_SECRET", "super-secret-key-change-me")
BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")

@app.on_event("startup")
async def startup_event():
    print("🚀 Starting Background Worker...")
    asyncio.create_task(worker_loop(job_manager))

# Initialize Supabase
from supabase import create_client, Client
SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("VITE_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY") or os.getenv("VITE_SUPABASE_KEY") or os.getenv("VITE_SUPABASE_ANON_KEY")

supabase: Client = None
if SUPABASE_URL and SUPABASE_KEY:
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    except Exception as e:
        print(f"⚠️ Failed to init Supabase in Main: {e}")

@app.post("/api/auth/login")
async def login(request: Request):
    """
    Exchanges Telegram initData for a secure JWT.
    """
    body = await request.json()
    init_data = body.get("initData")
    
    if not init_data:
        raise HTTPException(status_code=400, detail="Missing initData")

    # Validate Telegram Signature
    user = validate_telegram_data(init_data, BOT_TOKEN)
    
    # Sync with DB (Create if new + Gift)
    if supabase:
        try:
            get_or_create_user(user, supabase)
        except Exception as e:
            print(f"⚠️ DB Sync Failed: {e}")
            # Decide if block login or allow? Allow for robustness, but log error.
            # If DB is down, user can still login via JWT but can't generate?
    
    # Issue JWT
    token = create_jwt_token(user["id"], JWT_SECRET)
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user
    }

@app.get("/api/user/me")
async def get_current_user(authorization: str = Header(...)):
    # Force Redeploy
    """
    Get current user profile and balance.
    """
    user_id = verify_jwt_token(authorization, JWT_SECRET)
    
    # Import locally to avoid issues
    from worker import supabase
    if not supabase:
        raise HTTPException(status_code=503, detail="Database unavailable")
        
    try:
        # Fetch balance
        res = supabase.table("user_balances").select("*").eq("user_id", user_id).execute()
        balance_data = res.data[0] if res.data else {"credits": 0, "balance": 0.0}
        
        # User details (optional, client might have them, but good to refresh)
        user_res = supabase.table("users").select("*").eq("id", user_id).execute()
        user_data = user_res.data[0] if user_res.data else {}
        
        return {
            "id": user_id,
            "credits": balance_data.get("credits", 0),
            "premium_credits": balance_data.get("premium_credits", 0),
            "balance": balance_data.get("balance", 0.0),
            "username": user_data.get("username"),
            "first_name": user_data.get("first_name"),
            "is_premium": user_data.get("is_premium", False)
        }
    except Exception as e:
        print(f"❌ Get User Failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/debug/purchase")
async def debug_purchase(
    request: Request,
    authorization: str = Header(...)
):
    """
    DEBUG: Simulates a purchase by directly adding credits.
    """
    user_id = verify_jwt_token(authorization, JWT_SECRET)
    
    body = await request.json()
    plan_id = body.get("plan_id")
    basic_credits = body.get("basic_credits", 0)
    premium_credits = body.get("premium_credits", 0)
    
    # Import locally
    from worker import supabase
    if not supabase:
        raise HTTPException(status_code=503, detail="Database unavailable")

    print(f"💰 DEBUG PURCHASE: User {user_id} bought {plan_id} (+{basic_credits} basic, +{premium_credits} prem)")
    
    try:
        # Get current balance
        res = supabase.table("user_balances").select("*").eq("user_id", user_id).execute()
        
        current_basic = 0
        current_prem = 0
        
        if res.data:
            current_basic = res.data[0].get("credits", 0)
            current_prem = res.data[0].get("premium_credits", 0)
            
            # Update
            supabase.table("user_balances").update({
                "credits": current_basic + basic_credits,
                "premium_credits": current_prem + premium_credits
            }).eq("user_id", user_id).execute()
        else:
            # Create
            supabase.table("user_balances").insert({
                "user_id": user_id,
                "credits": basic_credits,
                "premium_credits": premium_credits,
                "balance": 0.0
            }).execute()
            
        return {"status": "success", "message": f"Added {basic_credits} basic and {premium_credits} premium credits"}
        
    except Exception as e:
        print(f"❌ Debug Purchase Failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/generation", status_code=202)
async def create_generation_job(
    request: Request, 
    authorization: str = Header(...)
):
    """
    Protected Endpoint: Enqueues a generation job.
    """
    # 1. Verify Auth
    user_id = verify_jwt_token(authorization, JWT_SECRET)
    
    # 2. Parse Request
    body = await request.json()
    prompt = body.get('prompt')
    model_config = body.get('model_config', {})
    
    print(f"📥 Job Request from User {user_id}: {prompt[:30]}...")

    # 3. Check Balance & Determine Watermark
    # Import locally to use supabase
    from worker import supabase
    if not supabase:
        raise HTTPException(status_code=503, detail="Database unavailable")
    
    # Get current balance
    bal_res = supabase.table("user_balances").select("credits, premium_credits").eq("user_id", user_id).execute()
    if not bal_res.data:
         raise HTTPException(status_code=403, detail="User balance not found")
    
    balance = bal_res.data[0]
    basic_creds = balance.get("credits", 0)
    prem_creds = balance.get("premium_credits", 0)

    quality = model_config.get("quality", "standard")
    should_watermark = True

    if quality == "high":
        # Check Premium Credits
        if prem_creds < 1:
             raise HTTPException(status_code=402, detail="Insufficient Premium Credits. Please upgrade your plan.")
        should_watermark = False
    else:
        # Check Basic Credits
        if basic_creds < 1:
             raise HTTPException(status_code=402, detail="Insufficient Basic Credits. Please top up.")
        should_watermark = True

    # 4. Enqueue Job
    # We pass should_watermark to the worker via model_config or top-level job args?
    # JobManager enqueue accepts model_config. Let's put it there for now or separate.
    # JobManager.enqueue_job just stores the dict. We can add it to model_config.
    model_config["should_watermark"] = should_watermark
    
    job_id = await job_manager.enqueue_job(prompt, model_config, user_id)
    
    return {
        "job_id": job_id,
        "status": "PENDING",
        "message": "Job enqueued successfully"
    }

@app.get("/api/generation/{job_id}")
async def get_generation_status(
    job_id: str,
    authorization: str = Header(...)
):
    """
    Protected Endpoint: Poll for job status.
    """
    # 1. Verify Auth
    verify_jwt_token(authorization, JWT_SECRET)
    
    # 2. Get Job
    job = await job_manager.get_job(job_id)
    
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
        
    return {
        "job_id": job["id"],
        "status": job["status"],
        "result": job.get("result"),
        "error": job.get("error")
    }

@app.get("/api/generations")
async def list_generations(authorization: str = Header(...)):
    """
    Protected Endpoint: List list user's processed generations.
    """
    # 1. Verify Auth
    user_id = verify_jwt_token(authorization, JWT_SECRET)
    
    # 2. Query Supabase directly
    if not job_manager.supabase: # Access supabase client from job_manager or import
        # We need access to supabase client. 
        # In worker.py it is global. In main.py we can import it or re-init?
        # Better: Import from worker or create valid client here.
        # But worker.py imports main? No.
        pass

    # Quick fix: Import supabase client from worker
    from worker import supabase
    
    if not supabase:
        return []

    try:
        response = supabase.table("generations")\
            .select("*")\
            .eq("user_id", user_id)\
            .order("created_at", desc=True)\
            .execute()
        
        # Map to frontend format
        results = []
        for item in response.data:
            if item.get("status") == "COMPLETED" and item.get("image_url"):
                 results.append({
                     "id": item["id"],
                     "src": item["image_url"],
                     "prompt": item.get("prompt"),
                     "cost": item.get("cost")
                 })
        return results

    except Exception as e:
        print(f"❌ Failed to fetch generations: {e}")
        raise HTTPException(status_code=500, detail=str(e))

    except Exception as e:
        print(f"❌ Failed to fetch generations: {e}")
        raise HTTPException(status_code=500, detail=str(e))

from base64 import b64encode, b64decode

@app.get("/api/gallery")
async def get_gallery(
    authorization: str = Header(...),
    limit: int = 20,
    cursor: str = None
):
    """
    Cursor-based pagination for infinite scroll.
    Cursor = Base64 encoded 'created_at' timestamp of the last item.
    """
    user_id = verify_jwt_token(authorization, JWT_SECRET)
    
    # Import locally to avoid circular dep issues if any
    from worker import supabase
    if not supabase: return {"items": [], "next_cursor": None, "has_more": False}

    try:
        query = supabase.table("generations")\
            .select("*")\
            .eq("user_id", user_id)\
            .eq("status", "COMPLETED")\
            .order("created_at", desc=True)\
            .limit(limit + 1) # Fetch one extra to check if there's more

        if cursor:
            try:
                # Decode cursor to timestamp
                last_created_at = b64decode(cursor).decode('utf-8')
                query = query.lt("created_at", last_created_at)
            except:
                pass # Invalid cursor, ignore or error

        response = query.execute()
        data = response.data
        
        has_more = len(data) > limit
        if has_more:
            data = data[:limit] # Remove the extra item
            # Create next cursor from the last item
            last_item = data[-1]
            next_cursor = b64encode(last_item["created_at"].encode('utf-8')).decode('utf-8')
        else:
            next_cursor = None

        # Map to frontend format
        items = []
        for item in data:
             if item.get("image_url"):
                 items.append({
                     "id": item["id"],
                     "src": item["image_url"],
                     "prompt": item.get("prompt"),
                     "cost": item.get("cost"),
                     "created_at": item["created_at"]
                 })

        return {
            "items": items,
            "next_cursor": next_cursor,
            "has_more": has_more
        }

    except Exception as e:
        print(f"❌ Gallery Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))



@app.post("/api/upload")
async def upload_file(
    file: UploadFile = File(...),
    authorization: str = Header(...)
):
    """
    Uploads an image to S3/Supabase Storage and returns the URL.
    """
    user_id = verify_jwt_token(authorization, JWT_SECRET)
    
    # Placeholder for allow_origins, as per instruction.
    # This list would typically be used in a CORS middleware configuration.
    allow_origins_domains = [
        "https://pixel-pop-v2.vercel.app",
        "https://pixelpop.v2.frnt.d-t-a.ae",
        "https://test.pixelpop.v2.frnt.d-t-a.ae",
        "http://localhost:5173",
        "http://localhost:5174",
    ]
    
    import boto3
    import time
    from io import BytesIO
    
    # Use explicit env vars to ensure correctness
    aws_key = os.getenv("AWS_ACCESS_KEY_ID")
    aws_secret = os.getenv("AWS_SECRET_ACCESS_KEY")
    aws_region = os.getenv("AWS_REGION", "us-east-1")
    bucket_name = os.getenv("AWS_BUCKET_NAME", "pixelpop")
    
    if not aws_key or not aws_secret:
        raise HTTPException(status_code=500, detail="S3 Credentials missing on server")

    try:
        # 1. Read file
        contents = await file.read()
        
        # 2. Generate Key
        filename = file.filename or f"upload_{int(time.time())}.png"
        s3_key = f"uploads/{user_id}/{int(time.time())}_{filename}"
        
        # 3. Create Client Locally (Thread-safe)
        s3 = boto3.client(
            's3',
            aws_access_key_id=aws_key,
            aws_secret_access_key=aws_secret,
            region_name=aws_region
        )

        print(f"⬆️ Uploading User File to S3 ({bucket_name}): {s3_key}")
        
        # 4. Upload (Run in Executor to verify blocking behavior)
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(
            None, 
            lambda: s3.upload_fileobj(
                BytesIO(contents), 
                bucket_name, 
                s3_key, 
                ExtraArgs={'ContentType': file.content_type or 'image/png'}
            )
        )
        
        # 5. Return URL
        public_url = f"https://{bucket_name}.s3.amazonaws.com/{s3_key}"
        return {"url": public_url}

    except Exception as e:
        print(f"❌ Upload Failed Details: {str(e)}")
        # Check connectivity
        try:
             import socket
             ip = socket.gethostbyname(f"{bucket_name}.s3.amazonaws.com")
             print(f"🔍 DNS Check: {bucket_name}.s3.amazonaws.com -> {ip}")
        except Exception as dns_err:
             print(f"❌ DNS Check Failed: {dns_err}")
             
        raise HTTPException(status_code=500, detail=str(e))


# --- Static Files (Must be last) ---
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

# Check if dist exists (Production)
dist_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend", "dist")
if os.path.exists(dist_path):
    app.mount("/assets", StaticFiles(directory=os.path.join(dist_path, "assets")), name="assets")
    
    # Serve index.html for all other routes (Client-side routing)
    @app.get("/{full_path:path}")
    async def serve_react_app(full_path: str):
        # API routes are already handled above, this catches non-api
        if full_path.startswith("api/"):
            raise HTTPException(status_code=404, detail="Not Found")
        
        # Check if specific file exists in dist (e.g. favicon.ico)
        file_path = os.path.join(dist_path, full_path)
        if os.path.exists(file_path) and os.path.isfile(file_path):
             return FileResponse(file_path)
             
        return FileResponse(os.path.join(dist_path, "index.html"))
else:
    print("⚠️ 'dist' directory not found. Frontend will not be served (OK for local dev if using Vite server).")

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)

