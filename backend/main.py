import os
import sys
from fastapi import FastAPI, HTTPException, Request, Depends, Header, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from auth import validate_telegram_data, create_jwt_token, verify_jwt_token
from job_manager import JobManager

# Load .env
dotenv_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env')
load_dotenv(dotenv_path=dotenv_path)

app = FastAPI()

# Allow CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from worker import worker_loop
import asyncio

# Initialize Job Manager (Global)
job_manager = JobManager()
JWT_SECRET = os.getenv("JWT_SECRET", "super-secret-key-change-me")
BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")

@app.on_event("startup")
async def startup_event():
    print("🚀 Starting Background Worker...")
    asyncio.create_task(worker_loop(job_manager))

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
    
    # Issue JWT
    token = create_jwt_token(user["id"], JWT_SECRET)
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user
    }

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

    # 3. Enqueue Job
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

    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)

@app.post("/api/upload")
async def upload_file(
    file: UploadFile = File(...),
    authorization: str = Header(...)
):
    """
    Uploads an image to S3/Supabase Storage and returns the URL.
    """
    user_id = verify_jwt_token(authorization, JWT_SECRET)
    
    # Import s3 config from worker
    from worker import s3_client, BUCKET_NAME
    import time
    
    if not s3_client:
        raise HTTPException(status_code=500, detail="S3 Client not initialized")

    try:
        # 1. Read file
        contents = await file.read()
        
        # 2. Generate Key
        filename = file.filename or f"upload_{int(time.time())}.png"
        s3_key = f"uploads/{user_id}/{int(time.time())}_{filename}"
        
        # 3. Upload
        print(f"⬆️ Uploading User File to S3: {s3_key}")
        from io import BytesIO
        s3_client.upload_fileobj(
            BytesIO(contents), 
            BUCKET_NAME, 
            s3_key, 
            ExtraArgs={'ContentType': file.content_type or 'image/png'}
        )
        
        # 4. Return URL
        public_url = f"https://{BUCKET_NAME}.s3.amazonaws.com/{s3_key}"
        return {"url": public_url}

    except Exception as e:
        print(f"❌ Upload Failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# --- Static Files (Must be last) ---
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

# Check if dist exists (Production)
dist_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "dist")
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
