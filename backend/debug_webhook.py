import os
from dotenv import load_dotenv

# Load env from parent/frontend/.env logic similar to main.py to find the token
# Try typical paths
dotenv_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'frontend', '.env.test')
if not os.path.exists(dotenv_path):
    dotenv_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'frontend', '.env')

load_dotenv(dotenv_path)

# Test Bot Token
BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
if not BOT_TOKEN:
    print("❌ Error: TELEGRAM_BOT_TOKEN not found in environment.")
    exit(1)

WEBHOOK_URL = "https://test.pixelpop.v2.back.d-t-a.ae/api/telegram/webhook"

def set_webhook():
    url = f"https://api.telegram.org/bot{BOT_TOKEN}/setWebhook"
    params = {
        "url": WEBHOOK_URL,
        "allowed_updates": ["message", "pre_checkout_query", "successful_payment", "callback_query"],
        "drop_pending_updates": True
    }
    
    try:
        print(f"🔌 Setting Webhook for ...{BOT_TOKEN[-5:]} to {WEBHOOK_URL}")
        res = requests.post(url, json=params)
        res.raise_for_status()
        print(f"✅ Webhook Set Response: {res.json()}")
        
    except Exception as e:
        print(f"❌ Failed to set webhook: {e}")
        if hasattr(e, 'response') and e.response:
             print(f"   Details: {e.response.text}")

if __name__ == "__main__":
    set_webhook()
