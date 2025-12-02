import asyncio
import aiohttp
import os
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("PERFECTCORP_API_KEY")
SECRET_KEY = os.getenv("PERFECTCORP_SECRET_KEY")
API_URL = os.getenv("PERFECTCORP_API_URL", "https://yce-api-01.makeupar.com/s2s/v2.0")
AUTH_URL = API_URL.replace("/v2.0", "/v1.0") + "/client/auth"

async def test_auth():
    print(f"🔑 API Key: {API_KEY[:5]}...")
    print(f"🔑 Secret Key: {SECRET_KEY[:5]}...")
    print(f"🔗 Auth URL: {AUTH_URL}")
    
    payload = {
        "client_id": API_KEY,
        "client_secret": SECRET_KEY
    }
    
    print("🚀 Sending auth request...")
    async with aiohttp.ClientSession() as session:
        async with session.post(AUTH_URL, json=payload) as response:
            print(f"📥 Status: {response.status}")
            text = await response.text()
            print(f"📄 Response: {text}")

if __name__ == "__main__":
    if not API_KEY or not SECRET_KEY:
        print("❌ Missing keys in .env")
    else:
        asyncio.run(test_auth())
