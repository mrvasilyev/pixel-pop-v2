import os
import time
import json
print(f"DEBUG ENV KEYS: {[k for k in os.environ.keys() if 'SUPA' in k or 'VITE' in k]}")
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
SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("VITE_SUPABASE_URL")
# WORKER AUDIT: Must use Service Role (SUPABASE_KEY) in production for reliability
if os.getenv("APP_ENV") == "development":
    SUPABASE_KEY = os.getenv("SUPABASE_KEY") or os.getenv("VITE_SUPABASE_KEY") or os.getenv("VITE_SUPABASE_ANON_KEY")
    if not os.getenv("SUPABASE_KEY"):
        print("⚠️  DEV WARN: Helper using ANON KEY. Some admin tasks might fail.")
else:
    # Production Strictness
    SUPABASE_KEY = os.getenv("SUPABASE_KEY")
    if not SUPABASE_KEY:
        print("❌ CRITICAL: SUPABASE_KEY (Service Role) missing in Production!")
supabase: Client = None
if SUPABASE_URL and SUPABASE_KEY:
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    except Exception as e:
        print(f"⚠️ Failed to init Supabase: {e}")
else:
    print(f"⚠️ Supabase env vars missing! URL={SUPABASE_URL is not None}, KEY={SUPABASE_KEY is not None}")

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

async def update_db_status(job_id, status, result_url=None, job_details=None, cost=None, extra_stats=None):
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
            # Save parameters (model_config)
            if "model_config" in job_details:
                data["parameters"] = json.dumps(job_details["model_config"])
            # created_at is automatic usually, or we can pass it
        
        if cost is not None:
            data["cost"] = cost
            
        if extra_stats:
            data.update(extra_stats) # Merge input_tokens, output_tokens, etc.
            
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
            
            # Pre-process Image: Pad to target aspect ratio to avoid OpenAI cropping
            from PIL import Image, ImageOps
            
            target_size_str = model_config.get("size", "1024x1024")
            cw, ch = map(int, target_size_str.split('x'))
            
            # Load
            input_pil = Image.open(BytesIO(img_response.content))
            input_pil = ImageOps.exif_transpose(input_pil) # Fix Orientation
            input_pil = input_pil.convert("RGBA")
            iw, ih = input_pil.size
            print(f"📏 Input Image Size: {iw}x{ih} (Ratio: {iw/ih:.2f})")
            
            # Pad (Letterbox) to fit target size while maintaining aspect ratio
            # color=(0,0,0,0) for transparent padding, or matching content?
            # OpenAI requires PNG. Transparent padding might be interpreted.
            # DALL-E 2/3 inpainting/edit supports transparency.
            # But standard edit might expect opaque?
            # Let's use ImageOps.pad which centers the image.
            # We resize the input to FIT inside target, then pad.
            padded_pil = ImageOps.pad(input_pil, (cw, ch), color=(0, 0, 0, 0))
            pw, ph = padded_pil.size
            print(f"📏 Padded Image Size: {pw}x{ph} (Target: {cw}x{ch})")
            
            # Save to bytes
            input_byte_arr = BytesIO()
            padded_pil.save(input_byte_arr, format='PNG')
            image_bytes = input_byte_arr
            image_bytes.name = "input_image.png"

            print(f"🎨 Calling OpenAI Edit (gpt-image-1.5): {prompt[:30]}...")
            response = await openai_client.images.edit(
                model="gpt-image-1.5",
                image=image_bytes,
                prompt=prompt,
                n=1,
                size=target_size_str,
                # output_format="png" # Optional, defaults to png usually
            )
        else:
            # Text-to-Image Mode
            # Use gpt-image-1.5
            print(f"🎨 Calling OpenAI Generate (gpt-image-1.5): {prompt[:30]}...")
            response = await openai_client.images.generate(
                model="gpt-image-1.5",
                prompt=prompt,
                n=1,
                size=model_config.get("size", "1024x1024"),
                quality=quality_param,
            )
            
        return response.data[0]

    except Exception as e:
        print(f"❌ OpenAI API Error: {e}")
        # Detect Content Policy Violation (HTTP 400 from OpenAI)
        err_str = str(e).lower()
        if "content_policy_violation" in err_str or "safety_system" in err_str or (hasattr(e, 'status_code') and e.status_code == 400):
             print("⚠️ Safety Check Triggered")
             raise ValueError("SAFETY_CHECK: Your prompt was flagged by the safety system.")
             
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
        should_watermark = job.get("model_config", {}).get("should_watermark", True)
        
        if should_watermark:
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
                font_size = 24 # Increased from 20 for visibility (V1 style)
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
                
                # Fallback: Download Roboto to local dir if not found locally
                if not font_path:
                    try:
                        # Use raw.githubusercontent correct repo
                        font_url = "https://raw.githubusercontent.com/googlefonts/roboto/main/src/hinted/Roboto-Regular.ttf"
                        temp_font_path = "Roboto-Regular.ttf" # Save in CWD
                        
                        if not os.path.exists(temp_font_path) or os.path.getsize(temp_font_path) < 1000:
                            print(f"⬇️ Downloading Font from {font_url}...")
                            import requests
                            # Add headers to avoid bot blocking
                            r = requests.get(font_url, headers={'User-Agent': 'Mozilla/5.0'}, timeout=10)
                            r.raise_for_status()
                            with open(temp_font_path, "wb") as f:
                                f.write(r.content)
                            print(f"✅ Font downloaded: {os.path.getsize(temp_font_path)} bytes")
                        
                        font_path = temp_font_path
                    except Exception as dl_err:
                        print(f"⚠️ Font Download Failed: {dl_err}")
    
                if font_path:
                    try:
                        font = ImageFont.truetype(font_path, font_size)
                        print(f"✅ Loaded Font: {font_path}")
                    except Exception as font_err:
                        print(f"⚠️ Failed to load TrueType font ({font_path}): {font_err}")
                        print("⚠️ Falling back to default font (bitmap)")
                
                # Rotate Text: Create temporary image for text to rotate it
                # Text size
                bbox = draw.textbbox((0, 0), text, font=font)
                text_w = bbox[2] - bbox[0]
                text_h = bbox[3] - bbox[1]
                
                # Create separate image for text with GENEROUS padding to prevent any clipping
                safe_padding = 20 # 10px on each side
                text_img = Image.new('RGBA', (text_w + safe_padding, text_h + safe_padding), (255, 255, 255, 0)) 
                text_draw = ImageDraw.Draw(text_img)
                
                # V1 Style: No stroke, 90% opacity white, Bullet point restored
                # Use offset with padding to ensure no clipping
                draw_x = (safe_padding // 2) - bbox[0]
                draw_y = (safe_padding // 2) - bbox[1]
                text_draw.text((draw_x, draw_y), text, font=font, fill=(255, 255, 255, 230)) 
                
                # Rotate 90 degrees counter-clockwise
                rotated_text = text_img.rotate(90, expand=True) 
                
                # Position: Right edge, bottom
                padding_right = 20 
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
                print("✅ Watermark Applied Successfully (Stroked)")
            
            except Exception as e:
                print(f"⚠️ Watermark Failed (Skipping): {e}")
            
        else:
             print("✨ Premium Generation: Watermark Skipped")

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

        # 4. Calculate Tokens & Cost (DDD Pricing Logic)
        input_tokens_est = len(job.get("prompt", "")) // 4
        
        quality = job.get("model_config", {}).get("quality", "standard")
        tier_map = {
            "low": {"tokens": 281, "price_per_1m": 32.00},
            "medium": {"tokens": 1250, "price_per_1m": 32.00}, # Standard
            "high": {"tokens": 5312, "price_per_1m": 32.00}
        }
        # Determine strict tier for DB
        model_tier = "medium"
        if quality == "low": model_tier = "low"
        if quality == "high": model_tier = "high"
        
        output_tokens_est = tier_map[model_tier]["tokens"]
        
        # Formula: (Input * 8 + Output * 32) / 1M
        input_cost = (input_tokens_est / 1_000_000) * 8.00
        output_cost = (output_tokens_est / 1_000_000) * 32.00
        cost = round(input_cost + output_cost, 6)
        
        # 5. Record Transaction (Billing Domain)
        # The Trigger will handle balance update
        transaction_id = None
        if supabase:
            try:
                tx_data = {
                    "user_id": job.get("user_id"),
                    "amount": -cost, # Negative for usage
                    "transaction_type": "GENERATION_USAGE",
                    "description": f"Gen {model_tier.upper()}",
                    "reference_id": job_id # Idempotency Key
                }
                
                # Determine which credit to deduct based on what was authorized in main.py
                # Re-check quality/watermark config
                qual_check = job.get("model_config", {}).get("quality", "standard")
                if qual_check == "high":
                    tx_data["premium_credits_change"] = -1
                    tx_data["credits_change"] = 0
                else:
                    tx_data["premium_credits_change"] = 0
                    tx_data["credits_change"] = -1

                tx_res = supabase.table("user_transactions").insert(tx_data).execute()
                if tx_res.data:
                    transaction_id = tx_res.data[0]["id"]
            except Exception as e:
                print(f"⚠️ Billing Transaction Failed: {e}")

        # 6. Save Result (Generation Domain)
        # Update job_details with new stats for update_db_status
        extra_stats = {
            "input_tokens": input_tokens_est,
            "output_tokens": output_tokens_est,
            "model_tier": model_tier,
            "transaction_id": transaction_id
        }
        
        await job_manager.update_job(job_id, {"status": "COMPLETED", "result": {"image_url": public_url, "cost": cost}})
        await update_db_status(job_id, "COMPLETED", public_url, cost=cost, job_details=job, extra_stats=extra_stats)
        print(f"✅ Job {job_id} Completed (Cost: ${cost:.6f}, Tier: {model_tier})")

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
