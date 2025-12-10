import os
from typing import Optional, List
from pydantic import BaseModel
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class Settings(BaseModel):
    """Application settings"""
    
    # API Configuration
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "FormAI Service"
    VERSION: str = "1.0.0"
    
    # Server Configuration
    # HOST: str = "172.20.10.2"
    HOST: str = "192.168.1.224"
    # HOST: str = "192.168.1.121"
    PORT: int = 8000
    RELOAD: bool = True
    
    # Security
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # CORS
    BACKEND_CORS_ORIGINS: List[str] = ["*"]
    
    # Database (for future use)
    DATABASE_URL: Optional[str] = None
    
    # Redis (for future use)
    REDIS_URL: Optional[str] = None
    
    # Supabase Configuration
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_API_KEY: str = os.getenv("SUPABASE_API_KEY", "")
    SUPABASE_SERVICE_ROLE_KEY: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    SUPABASE_STORAGE_BUCKET: str = os.getenv("SUPABASE_STORAGE_BUCKET", "videos")

    # OpenAI Configuration
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    
    # Gemini AI Configuration
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")

# Create settings instance
settings = Settings() 