import os
import pytest
from auth import validate_telegram_data, create_jwt_token, verify_jwt_token
from fastapi import HTTPException
from util_telegram_signer import generate_test_init_data

# Use the token from .env or a fixed test token
TEST_BOT_TOKEN = "7751667220:AAEqF_a9T2AZ0TlUqo1LnCiYXLl4yLvEhXU"

def test_jwt_creation_and_validation():
    secret = "test-secret"
    user_id = 123456
    
    token = create_jwt_token(user_id, secret)
    assert isinstance(token, str)
    
    decoded_id = verify_jwt_token(f"Bearer {token}", secret)
    assert decoded_id == user_id

def test_jwt_invalid_token():
    secret = "test-secret"
    with pytest.raises(HTTPException) as exc:
        verify_jwt_token("Bearer invalid-token", secret)
    assert exc.value.status_code == 401

def test_jwt_missing_header():
    secret = "test-secret"
    with pytest.raises(HTTPException) as exc:
        verify_jwt_token("invalid-header", secret)
    assert exc.value.status_code == 401

def test_telegram_real_validation():
    # 1. Generate valid signed initData using our helper
    user_data = {"id": 999888, "first_name": "RealTest", "username": "real_tester"}
    init_data = generate_test_init_data(TEST_BOT_TOKEN, user_data)
    
    # 2. Validate it using the auth module
    # We pass the SAME token that signed it
    user = validate_telegram_data(init_data, TEST_BOT_TOKEN)
    
    assert user["id"] == 999888
    assert user["first_name"] == "RealTest"
