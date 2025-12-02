import asyncio
import aiohttp
import os
import time
import base64
from dotenv import load_dotenv
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.backends import default_backend

load_dotenv()

API_KEY = os.getenv("PERFECTCORP_API_KEY")
SECRET_KEY = os.getenv("PERFECTCORP_SECRET_KEY")
API_URL = os.getenv("PERFECTCORP_API_URL", "https://yce-api-01.makeupar.com/s2s/v2.0")
AUTH_URL = API_URL.replace("/v2.0", "/v1.0") + "/client/auth"

def generate_id_token(client_id, client_secret):
    try:
        # 1. Prepare data
        timestamp = int(time.time() * 1000)
        data = f"client_id={client_id}&timestamp={timestamp}".encode('utf-8')
        print(f"📝 Data to encrypt: {data}")

        # 2. Load Public Key
        # Add headers if missing
        if not client_secret.startswith("-----BEGIN PUBLIC KEY-----"):
            client_secret = f"-----BEGIN PUBLIC KEY-----\n{client_secret}\n-----END PUBLIC KEY-----"
            
        public_key = serialization.load_pem_public_key(
            client_secret.encode('utf-8'),
            backend=default_backend()
        )

        # 3. Encrypt
        # Trying PKCS1v15 padding first
        encrypted = public_key.encrypt(
            data,
            padding.PKCS1v15()
        )

        # 4. Base64 Encode
        id_token = base64.b64encode(encrypted).decode('utf-8')
        return id_token
    except Exception as e:
        print(f"❌ Encryption error: {e}")
        return None

async def test_auth():
    print(f"🔗 Auth URL: {AUTH_URL}")
    
    id_token = generate_id_token(API_KEY, SECRET_KEY)
    if not id_token:
        return

    payload = {
        "client_id": API_KEY,
        "id_token": id_token
    }
    
    print("🚀 Sending auth request...")
    async with aiohttp.ClientSession() as session:
        async with session.post(AUTH_URL, json=payload) as response:
            print(f"📥 Status: {response.status}")
            text = await response.text()
            print(f"📄 Response: {text}")

if __name__ == "__main__":
    asyncio.run(test_auth())
