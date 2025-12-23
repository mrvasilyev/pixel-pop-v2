import hashlib
import hmac
import urllib.parse
import json

def generate_test_init_data(token: str, user_data: dict):
    """
    Generates a valid Telegram initData string signed with the given token.
    """
    # 1. Construct data-check-string
    # Key-value pairs sorted alphabetically
    # user_data must be a JSON string for the 'user' key
    user_json = json.dumps(user_data, separators=(',', ':'))
    
    # We only assume 'user', 'query_id', 'auth_date' for simplicity
    params = {
        "auth_date": "1700000000",
        "query_id": "test_query_id",
        "user": user_json
    }
    
    # Sort and join with \n
    data_check_string = "\n".join([f"{k}={v}" for k, v in sorted(params.items())])
    
    # 2. Compute Secret Key
    secret_key = hmac.new(b"WebAppData", token.encode(), hashlib.sha256).digest()
    
    # 3. Compute Hash
    hash_value = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()
    
    # 4. Construct Final Query String
    # Note: parameters in the final interaction string are usually URL-encoded
    # But for the hash check, the raw values are used.
    # We need to construct the search params string.
    
    # Add hash
    params["hash"] = hash_value
    
    # Encode
    # ordering in the final string doesn't strictly matter for parsing, 
    # but the validator parses it into a map.
    return urllib.parse.urlencode(params)

if __name__ == "__main__":
    # Example Usage
    token = "7751667220:AAEqF_a9T2AZ0TlUqo1LnCiYXLl4yLvEhXU"
    user = {"id": 123456, "first_name": "TestUser", "username": "tester"}
    print(generate_test_init_data(token, user))
