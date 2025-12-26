import requests

# Test Bot Token (mro_flug_bot)
BOT_TOKEN = "7751667220:AAEqF_a9T2AZ0TlUqo1LnCiYXLl4yLvEhXU"
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
