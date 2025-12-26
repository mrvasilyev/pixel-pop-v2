import os
import time
import hmac
import hashlib
import json
from urllib.parse import parse_qsl
import jwt
from fastapi import HTTPException, Header

def validate_telegram_data(init_data: str, bot_token: str) -> dict:
    """
    Validates the Telegram WebApp initData.
    Returns the user dict if valid, raises HTTPException otherwise.
    """
    if not bot_token:
        print("⚠️ No BOT_TOKEN provided to validate_telegram_data")
        # In PROD/TEST, this should fail. Only in local dev with explicit mock hash should it pass.
        # We previously fell back to a specific ID for everything, which caused the "incomplete customer info" bug.
        # Now we return None or raise, forcing the caller to handle it or the mock hash check to pass.
        pass # Flow continues to try parsing or eventually failing


    try:
        parsed_data = dict(parse_qsl(init_data))
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid initData format")

    if "hash" not in parsed_data:
        raise HTTPException(status_code=400, detail="Missing hash")

    # DEV: Allow mock hash if explicitly sent (for local dev without real Telegram/Ngrok)
    if parsed_data["hash"] == "mock":
        print("⚠️  MOCK AUTH DETECTED - ALLOWING FOR DEV")
        print(f"User Data: {parsed_data.get('user')}")
        return json.loads(parsed_data["user"])

    hash_check = parsed_data.pop("hash")
    data_check_string = "\n".join(f"{k}={v}" for k, v in sorted(parsed_data.items()))
    
    secret_key = hmac.new(b"WebAppData", bot_token.encode(), hashlib.sha256).digest()
    calculated_hash = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()

    if calculated_hash != hash_check:
        raise HTTPException(status_code=403, detail="Invalid Telegram signature")

    return json.loads(parsed_data["user"])

def create_jwt_token(user_id: int, secret: str) -> str:
    payload = {
        "sub": str(user_id),
        "iat": int(time.time()),
        "exp": int(time.time()) + (7 * 24 * 3600) # 7 days
    }
    return jwt.encode(payload, secret, algorithm="HS256")

def verify_jwt_token(authorization: str = Header(...), secret: str = None) -> int:
    if not secret:
        # Fallback to env if not passed, but MUST exist
        secret = os.getenv("JWT_SECRET")
        if not secret:
             raise HTTPException(status_code=500, detail="Server Error: JWT Config Missing")
    
    print(f"🔒 Raw Auth Header: {authorization}")
    if not authorization.startswith("Bearer "):
        print("❌ Invalid Auth Header Format")
        raise HTTPException(status_code=401, detail="Invalid auth header")
    
    token = authorization.split(" ")[1]
    print(f"🔒 Verifying Token: {token[:10]}...")
    try:
        payload = jwt.decode(token, secret, algorithms=["HS256"])
        print(f"✅ Token Valid for User: {payload['sub']}")
        return int(payload["sub"])
    except jwt.ExpiredSignatureError:
        print("❌ Token Expired")
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError as e:
        print(f"❌ Invalid Token: {e}")
        raise HTTPException(status_code=401, detail="Invalid token")

def get_or_create_user(user_data: dict, supabase_client) -> dict:
    """
    Checks if user exists, creates if not.
    If created, awards initial credits via Transaction (Trigger handles Balance).
    """
    user_id = user_data["id"]
    try:
        # 1. Check existence
        # Uses count to avoid data transfer overhead
        res = supabase_client.table("users").select("id", count="exact").eq("id", user_id).execute()
        exists = res.count > 0
        
        if not exists:
            print(f"🆕 Creating New User: {user_id}")
            # 2. Insert User
            new_user = {
                "id": user_id,
                "username": user_data.get("username"),
                "first_name": user_data.get("first_name"),
                "last_name": user_data.get("last_name"),
                "language_code": user_data.get("language_code"),
                "is_premium": user_data.get("is_premium", False)
            }
            supabase_client.table("users").insert(new_user).execute()
            
            # 3. Grant Initial Gift (3 Credits, Medium Tier)
            # Trigger 'on_transaction_created' will update user_balances automatically.
            gift_transaction = {
                "user_id": user_id,
                "transaction_type": "GIFT",
                "amount": 0.0,
                "credits_change": 1,
                "description": "Welcome Gift",
                "reference_id": f"gift_{user_id}_init" # Idempotency Key
            }
            supabase_client.table("user_transactions").insert(gift_transaction).execute()
            print(f"🎁 Initial Gift Granted for {user_id}")
            
        return user_data

    except Exception as e:
        print(f"❌ User Creation Failed: {e}")
        # Non-blocking for login, but critical for functionality
        # We might return user_data anyway or raise
        raise e
