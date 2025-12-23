import pytest
import os
import jwt
import time
from fastapi.testclient import TestClient
from main import app
from unittest.mock import patch, MagicMock, AsyncMock

client = TestClient(app)

# Helper to create valid JWT
def create_valid_token(user_id=123):
    secret = os.getenv("JWT_SECRET", "super-secret-key-change-me")
    payload = {
        "sub": str(user_id),
        "iat": int(time.time()),
        "exp": int(time.time()) + 3600
    }
    return jwt.encode(payload, secret, algorithm="HS256")

def test_generation_endpoint_unauthorized():
    # If header is missing, FastAPI returns 422. 
    # If header is invalid, we return 401.
    
    # Case 1: Missing Header -> 422
    response = client.post("/api/generation", json={"prompt": "A cat"})
    assert response.status_code == 422 

    # Case 2: Invalid Token -> 401
    response = client.post("/api/generation", json={"prompt": "A cat"}, headers={"Authorization": "Bearer invalid"})
    assert response.status_code == 401

def test_generation_endpoint_success():
    # Mock the Queue/JobManager
    with patch("main.job_manager") as mock_jm:
        # MUST use AsyncMock because it is awaited
        mock_jm.enqueue_job = AsyncMock(return_value="test-job-id")
        
        token = create_valid_token()
        headers = {"Authorization": f"Bearer {token}"}
        payload = {
            "prompt": "A futuristic city",
            "model_config": {"quality": "high"}
        }
        
        response = client.post("/api/generation", json=payload, headers=headers)
        
        assert response.status_code == 202
        data = response.json()
        assert data["job_id"] == "test-job-id"
        assert data["status"] == "PENDING"


from util_telegram_signer import generate_test_init_data

TEST_BOT_TOKEN = "7751667220:AAEqF_a9T2AZ0TlUqo1LnCiYXLl4yLvEhXU"

def test_auth_login_real():
    # Use the helper to generate REAL valid data
    user_data = {"id": 555666, "first_name": "ApiTester"}
    init_data = generate_test_init_data(TEST_BOT_TOKEN, user_data)
    
    # We need to ensure the endpoint uses the SAME token.
    # We can patch the environment variable or the constant in main.py
    with patch("main.BOT_TOKEN", TEST_BOT_TOKEN):
        # We also need to patch validate_telegram_data? 
        # No! We want to test the REAL validation logic now.
        # But wait, main.py imports validate_telegram_data.
        # If we rely on the real one, it checks hash.
        
        response = client.post("/api/auth/login", json={"initData": init_data})
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["user"]["id"] == 555666
