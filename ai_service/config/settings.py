from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field
import os

class Settings(BaseSettings):
    groq_api_key: str = Field(..., env="GROQ_API_KEY")
    mistral_api_key: str = Field(..., env="MISTRAL_API_KEY")
    twilio_ssid: str | None = Field(None, env="TWILIO_SSID")
    twilio_auth: str | None = Field(None, env="TWILIO_AUTH")
    twilio_number: str | None = Field(None, env="TWILIO_NUMBER")
    database_url: str = Field(..., env="DATABASE_URL")
    openai_api_key: str | None = Field(None, env="OPENAI_API_KEY")
    jwt_secret: str = Field("supersecret123", env="JWT_SECRET")
    sandbox_redirect_numbers: str = Field("", env="SANDBOX_REDIRECT_NUMBERS")

    # Cloudinary CDN credentials
    cloudinary_cloud_name: str | None = Field(None, env="CLOUDINARY_CLOUD_NAME")
    cloudinary_api_key: str | None = Field(None, env="CLOUDINARY_KEY")
    cloudinary_api_secret: str | None = Field(None, env="CLOUDINARY_SECRET_KEY")

    # URL of the Node backend — set to deployed URL in production
    backend_url: str = Field("http://localhost:5000", env="BACKEND_URL")

    # Comma-separated list of allowed CORS origins — set to frontend URL in production
    allowed_origins: str = Field("http://localhost:3000,http://127.0.0.1:3000", env="ALLOWED_ORIGINS")

    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(__file__), "..", "..", ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
