import os
import json
import uuid
import asyncio
import redis
from typing import Optional

class JobManager:
    def __init__(self):
        self.redis_url = os.getenv("REDIS_URL")
        self.redis = None
        self.memory_queue = asyncio.Queue()
        self.memory_jobs = {} # id -> data

        if self.redis_url:
            try:
                self.redis = redis.from_url(self.redis_url)
                print(f"✅ Connected to Redis at {self.redis_url}")
            except Exception as e:
                print(f"⚠️ Failed to connect to Redis: {e}. Falling back to In-Memory.")

    async def enqueue_job(self, prompt: str, model_config: dict, user_id: int, style_slug: str = None) -> str:
        print(f"DEBUG: JobManager({id(self)}) Enqueueing job for user {user_id}")
        job_id = str(uuid.uuid4())
        job_data = {
            "id": job_id,
            "user_id": user_id,
            "prompt": prompt,
            "style_slug": style_slug,
            "model_config": model_config,
            "status": "PENDING",
            "created_at": str(asyncio.get_event_loop().time())
        }

        if self.redis:
            # Use Redis List as queue
            self.redis.rpush("generation_queue", json.dumps(job_data))
            # Use Redis Hash for state
            self.redis.set(f"job:{job_id}", json.dumps(job_data), ex=86400) # 24h expire
        else:
            print(f"DEBUG: Storing job {job_id} in memory. Total jobs: {len(self.memory_jobs) + 1}")
            self.memory_jobs[job_id] = job_data
            await self.memory_queue.put(job_data)
        
        return job_id

    async def get_job(self, job_id: str) -> Optional[dict]:
        print(f"DEBUG: JobManager({id(self)}) Getting job {job_id}")
        if self.redis:
            data = self.redis.get(f"job:{job_id}")
            return json.loads(data) if data else None
        else:
            job = self.memory_jobs.get(job_id)
            print(f"DEBUG: Memory lookup for {job_id}: {'Found' if job else 'NOT FOUND'}. Keys: {list(self.memory_jobs.keys())}")
            return job

    async def update_job(self, job_id: str, updates: dict):
        if self.redis:
            raw = self.redis.get(f"job:{job_id}")
            if raw:
                data = json.loads(raw)
                data.update(updates)
                self.redis.set(f"job:{job_id}", json.dumps(data), ex=86400)
        else:
            if job_id in self.memory_jobs:
                self.memory_jobs[job_id].update(updates)

    # For Worker
    async def pop_job(self):
        if self.redis:
            # Blocking pop (simulated with standard client for now, or use loop)
            # In real async worker, we might loop or use aioredis. 
            # For simplicity with sync redis client:
            res = self.redis.blpop("generation_queue", timeout=1)
            if res:
                return json.loads(res[1])
            return None
        else:
            try:
                # Non-blocking get for poll loop compatibility
                return self.memory_queue.get_nowait()
            except asyncio.QueueEmpty:
                return None
