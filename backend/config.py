import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    # Firebase
    FIREBASE_CREDENTIALS: str = os.getenv("FIREBASE_CREDENTIALS", "firebase-service-account.json")
    
    # Cloudflare R2
    R2_ACCOUNT_ID: str = os.getenv("R2_ACCOUNT_ID", "")
    R2_ACCESS_KEY_ID: str = os.getenv("R2_ACCESS_KEY_ID", "")
    R2_SECRET_ACCESS_KEY: str = os.getenv("R2_SECRET_ACCESS_KEY", "")
    R2_BUCKET_NAME: str = os.getenv("R2_BUCKET_NAME", "civic-voice-complaints")
    R2_PUBLIC_URL_BASE: str = os.getenv("R2_PUBLIC_URL_BASE", "")
    
    NVIDIA_API_KEY: str = "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"
    
    # Server
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", 8000))

settings = Settings()
