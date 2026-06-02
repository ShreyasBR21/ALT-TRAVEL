from typing import List, Optional

from pydantic import BaseSettings, Field, validator


class Settings(BaseSettings):
    host: str = Field("127.0.0.1", env="HOST")
    port: int = Field(8000, env="PORT")
    environment: str = Field("development", env="ENVIRONMENT")
    debug: bool = Field(False, env="DEBUG")
    allowed_origins: List[str] = Field(default_factory=lambda: ["*"], env="ALLOWED_ORIGINS")
    admin_dashboard_password: str = Field("alt-travel-admin-pass-2026", env="ADMIN_DASHBOARD_PASSWORD")
    database_url: Optional[str] = Field(None, env="DATABASE_URL")
    redis_url: Optional[str] = Field(None, env="REDIS_URL")
    mapbox_secret_token: Optional[str] = Field(None, env="MAPBOX_SECRET_TOKEN")
    amadeus_client_id: Optional[str] = Field(None, env="AMADEUS_CLIENT_ID")
    amadeus_client_secret: Optional[str] = Field(None, env="AMADEUS_CLIENT_SECRET")
    radar_secret_key: Optional[str] = Field(None, env="RADAR_SECRET_KEY")
    brightdata_proxy_url: Optional[str] = Field(None, env="BRIGHTDATA_PROXY_URL")
    gemini_api_key: Optional[str] = Field(None, env="GEMINI_API_KEY")
    google_api_key: Optional[str] = Field(None, env="GOOGLE_API_KEY")

    @validator("allowed_origins", pre=True)
    def split_origins(cls, value):
        if not value:
            return ["*"]
        if isinstance(value, str):
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False
