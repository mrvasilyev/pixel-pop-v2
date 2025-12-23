import os
import time
import json
import asyncio
import boto3
import requests
from io import BytesIO
from tenacity import retry, stop_after_attempt, wait_exponential
from openai import AsyncOpenAI
from job_manager import JobManager

# Initialize Services
s3_client = boto3.client(
    's3',
    aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
    aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
    region_name=os.getenv("AWS_REGION", "us-east-1")
)
BUCKET_NAME = os.getenv("AWS_BUCKET_NAME", "pixelpop")

openai_client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# Mock DB Update for MVP (Replace with SQLAlchemy later)
async def update_db_status(job_id, status, result_url=None):
    # In real imp, execute SQL update
    print(f"📦 DB UPDATE: Job {job_id} -> {status} (URL: {result_url})")

@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=4, max=10))
async def generate_with_retry(prompt, model_config):
    quality = model_config.get('quality', 'standard')
    # gpt-image-1.5 supports: low, medium, high, auto
    quality_param = "high" if quality == "high" else "medium"
    
    print(f"🎨 Calling OpenAI: {prompt[:30]}...")
    try:
        response = await openai_client.images.generate(
            model="gpt-image-1.5",
            prompt=prompt,
            n=1,
            size="1024x1024",
            quality=quality_param
        return response.data[0]
    except Exception as e:
        print(f"❌ OpenAI API Error: {e}")
        # If available, print full response info
        if hasattr(e, 'response') and e.response:
             print(f"❌ Error Response Body: {e.response.text}")
        raise e

async def process_job(job_manager: JobManager, job: dict):
    job_id = job["id"]
    try:
        await job_manager.update_job(job_id, {"status": "PROCESSING"})
        await update_db_status(job_id, "PROCESSING")

        # 1. Generate
        image_data_obj = await generate_with_retry(job["prompt"], job.get("model_config", {}))
        
        # 2. Extract Image Data (URL or Base64)
        image_url = getattr(image_data_obj, 'url', None)
        b64_json = getattr(image_data_obj, 'b64_json', None)
        
        import base64
        if b64_json:
            print("📦 Processing Base64 Image Data...")
            img_data = base64.b64decode(b64_json)
        elif image_url:
            print(f"⬇️ Downloading from OpenAI: {image_url}")
            img_data = requests.get(image_url).content
        else:
             raise ValueError(f"No image data found (url={image_url}, b64_json={'YES' if b64_json else 'None'})")

        # 3. Upload to S3
        s3_key = f"generations/{job['user_id']}/{job_id}.png"
        print(f"⬆️ Uploading to S3: {s3_key}")
        
        try:
            s3_client.upload_fileobj(
                BytesIO(img_data), 
                BUCKET_NAME, 
                s3_key, 
                ExtraArgs={'ContentType': "image/png"} # 'ACL': 'public-read' if needed
            )
            # Construct public URL (assuming not using pre-signed for public assets)
            # Or use CloudFront domain if configured
            public_url = f"https://{BUCKET_NAME}.s3.amazonaws.com/{s3_key}"
        except Exception as e:
            print(f"⚠️ S3 Upload Failed: {e}. Falling back to Data URI.")
            if 'img_data' in locals() and img_data:
                import base64
                b64_str = base64.b64encode(img_data).decode('utf-8')
                public_url = f"data:image/png;base64,{b64_str}"
            else:
                public_url = image_url

        # 4. Save Result
        await job_manager.update_job(job_id, {"status": "COMPLETED", "result": {"image_url": public_url}})
        await update_db_status(job_id, "COMPLETED", public_url)
        print(f"✅ Job {job_id} Completed")

    except Exception as e:
        print(f"❌ Job {job_id} Failed: {e}")
        await job_manager.update_job(job_id, {"status": "FAILED", "error": str(e)})
        await update_db_status(job_id, "FAILED")

async def worker_loop(job_manager_instance=None):
    print("👷 Worker started. Waiting for jobs...")
    job_manager = job_manager_instance or JobManager()
    while True:
        job = await job_manager.pop_job()
        if job:
            await process_job(job_manager, job)
        else:
            await asyncio.sleep(1) # Poll interval
