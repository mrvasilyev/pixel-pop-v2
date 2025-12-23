import os
import time
import hmac
import hashlib
import json
from urllib.parse import parse_qsl
import jwt
from fastapi import HTTPException, Header

# Test User ID from user request
MOCK_USER_ID = 51576055

def validate_telegram_data(init_data: str, bot_token: str) -> dict:
    """
    Validates the Telegram WebApp initData.
    Returns the user dict if valid, raises HTTPException otherwise.
    """
    if not bot_token:
        # Mock mode if no token provided
        print("⚠️ No BOT_TOKEN found. Using Mock Auth.")
        # Parse the init data to try and find the test user, or just default to mock
        try:
            parsed = dict(parse_qsl(init_data))
            if 'user' in parsed:
                return json.loads(parsed['user'])
        except:
            pass
        return {"id": MOCK_USER_ID, "first_name": "Test User"}

    try:
        parsed_data = dict(parse_qsl(init_data))
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid initData format")

    if "hash" not in parsed_data:
        raise HTTPException(status_code=400, detail="Missing hash")

    # DEV: Allow mock hash if explicitly sent (for local dev without real Telegram/Ngrok)
    if parsed_data["hash"] == "mock":
        print("⚠️  MOCK AUTH DETECTED - ALLOWING FOR DEV")
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

def verify_jwt_token(authorization: str = Header(...), secret: str = os.getenv("JWT_SECRET", "default-secret")) -> int:
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid auth header")
    
    token = authorization.split(" ")[1]
    try:
        payload = jwt.decode(token, secret, algorithms=["HS256"])
        return int(payload["sub"])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
