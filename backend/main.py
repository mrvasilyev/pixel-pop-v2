import os
import sys
from fastapi import FastAPI, HTTPException, Request, Depends, Header
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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
