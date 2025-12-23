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

from supabase import create_client, Client

# Initialize Services
# Supabase
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
supabase: Client = None
if SUPABASE_URL and SUPABASE_KEY:
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    except Exception as e:
        print(f"⚠️ Failed to init Supabase: {e}")

s3_client = boto3.client(
    's3',
    aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
    aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
    region_name=os.getenv("AWS_REGION", "us-east-1")
)
print(f"🔑 AWS Key ID in Env: {os.getenv('AWS_ACCESS_KEY_ID')[:4] if os.getenv('AWS_ACCESS_KEY_ID') else 'NONE'}")
print(f"🪣 AWS Bucket: {os.getenv('AWS_BUCKET_NAME')}")

BUCKET_NAME = os.getenv("AWS_BUCKET_NAME", "pixelpop")

openai_client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))

async def update_db_status(job_id, status, result_url=None, job_details=None, cost=None):
    """
    Updates the generation status in Supabase.
    If job_details is provided, it attempts to UPSERT the full record (useful for initial creation).
    """
    print(f"📦 DB UPDATE: Job {job_id} -> {status} (URL: {result_url})")
    
    if not supabase:
        return

    try:
        data = {
            "id": job_id,
            "status": status,
            "updated_at": "now()"
        }
        if result_url:
            data["image_url"] = result_url
            
        # If we have full details (user_id, prompt), merge them for UPSERT
        if job_details:
            data["user_id"] = job_details.get("user_id")
            # Use 'slug' for the DB prompt column if available, else full prompt
            data["prompt"] = job_details.get("slug") or job_details.get("prompt")
            # created_at is automatic usually, or we can pass it
        
        if cost is not None:
            data["cost"] = cost
            
        # Supabase-py is synchronous
        supabase.table("generations").upsert(data).execute()
        
    except Exception as e:
        print(f"❌ Supabase Update Failed: {e}")

@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=4, max=10))
async def generate_with_retry(prompt, model_config):
    quality = model_config.get('quality', 'standard')
    # gpt-image-1.5 supports: low, medium, high, auto
    quality_param = "high" if quality == "high" else "medium"
    
    try:
        if 'init_image' in model_config:
            # Image-to-Image / Edit Mode
            image_url = model_config['init_image']
            print(f"⬇️ Downloading Init Image: {image_url}")
            import requests
            from io import BytesIO
            
            # Download the image bytes
            img_response = requests.get(image_url)
            img_response.raise_for_status()
            image_bytes = BytesIO(img_response.content)
            image_bytes.name = "input_image.png" # Required by openai client
            
            print(f"🎨 Calling OpenAI Edit (gpt-image-1.5): {prompt[:30]}...")
            response = await openai_client.images.edit(
                model="gpt-image-1.5",
                image=image_bytes,
                prompt=prompt,
                n=1,
                size="1024x1024",
                # output_format="png" # Optional, defaults to png usually
            )
        else:
            # Text-to-Image Mode
            print(f"🎨 Calling OpenAI Generate: {prompt[:30]}...")
            response = await openai_client.images.generate(
                model="gpt-image-1.5",
                prompt=prompt,
                n=1,
                size="1024x1024",
                quality=quality_param,
            )
            
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
        # Pass job details to create the row if it doesn't exist
        await update_db_status(job_id, "PROCESSING", job_details=job)

        # 1. Generate
        print(f"🖼️ Model Config: {job.get('model_config', {})}")
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

        # --- Watermark Logic ---
        try:
            from PIL import Image, ImageDraw, ImageFont
            
            print("💧 Applying Watermark...")
            # Load Image
            orig_image = Image.open(BytesIO(img_data)).convert("RGBA")
            width, height = orig_image.size
            
            # Create Watermark Layer
            txt_layer = Image.new("RGBA", orig_image.size, (255, 255, 255, 0))
            draw = ImageDraw.Draw(txt_layer)
            
            # Font Settings
            text = "Generated with PIXEL POP • @pixel_pop_bot"
            font_size = 20 # Slightly larger for visibility
            font = ImageFont.load_default() # Fallback
            
            # Try to load a nicer font if available (common linux paths)
            possible_fonts = [
                "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
                "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
                "/app/fonts/Roboto-Regular.ttf", # Custom path if needed
            ]
            
            font_path = None
            for p in possible_fonts:
                if os.path.exists(p):
                    font_path = p
                    break
            
            # Fallback: Download Roboto to /tmp if not found locally
            if not font_path:
                try:
                    font_url = "https://github.com/google/fonts/raw/main/apache/roboto/Roboto-Regular.ttf"
                    temp_font_path = "/tmp/Roboto-Regular.ttf"
                    if not os.path.exists(temp_font_path):
                        print(f"⬇️ Downloading Font from {font_url}...")
                        import requests
                        r = requests.get(font_url)
                        with open(temp_font_path, "wb") as f:
                            f.write(r.content)
                    font_path = temp_font_path
                except Exception as dl_err:
                    print(f"⚠️ Font Download Failed: {dl_err}")

            if font_path:
                try:
                    font = ImageFont.truetype(font_path, font_size)
                except:
                    print("⚠️ Failed to load TrueType font, using default")
            
            # Rotate Text: Create temporary image for text to rotate it
            # Text size
            bbox = draw.textbbox((0, 0), text, font=font)
            text_w = bbox[2] - bbox[0]
            text_h = bbox[3] - bbox[1]
            
            # Create separate image for text
            text_img = Image.new('RGBA', (text_w, text_h), (255, 255, 255, 0))
            text_draw = ImageDraw.Draw(text_img)
            text_draw.text((0, 0), text, font=font, fill=(255, 255, 255, 230)) # 90% opacity white
            
            # Rotate 90 degrees counter-clockwise (vertical up) -> V1 said -PI/2 which is 270deg (vertical up)
            # Actually V1 code: ctx.rotate(-Math.PI / 2); means counter-clockwise 90 deg. 
            # Text starts at bottom-right and goes UP.
            rotated_text = text_img.rotate(90, expand=True) # 90 degrees CCW
            
            # Position: Right edge, bottom
            padding_right = 10
            padding_bottom = 40
            
            x = width - rotated_text.width - padding_right
            y = height - rotated_text.height - padding_bottom
            
            # Draw rotated text onto layer
            txt_layer.paste(rotated_text, (x, y), rotated_text)
            
            # Composite
            watermarked = Image.alpha_composite(orig_image, txt_layer)
            
            # Save back to bytes
            out_buffer = BytesIO()
            watermarked.convert("RGB").save(out_buffer, format="PNG")
            img_data = out_buffer.getvalue()
            print("✅ Watermark Applied Successfully")
            
        except Exception as e:
            print(f"⚠️ Watermark Failed (Skipping): {e}")

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

        # 4. Calculate Cost
        # Pricing: Input $8.00/1M used, Output $32.00/1M used
        # Est. Input Tokens: ~len(prompt)/4
        # Est. Output Tokens: High ~5312 ($0.17), Medium ~1250 ($0.04)
        input_tokens = len(job.get("prompt", "")) // 4
        quality = job.get("model_config", {}).get("quality", "standard")
        output_tokens = 5312 if quality == "high" else 1250
        
        cost = ((input_tokens / 1_000_000) * 8.00) + ((output_tokens / 1_000_000) * 32.00)
        cost = round(cost, 6) # Precision
        
        # 5. Save Result
        await job_manager.update_job(job_id, {"status": "COMPLETED", "result": {"image_url": public_url, "cost": cost}})
        await update_db_status(job_id, "COMPLETED", public_url, cost=cost)
        print(f"✅ Job {job_id} Completed (Cost: ${cost:.6f})")

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
