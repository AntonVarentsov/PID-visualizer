from functools import lru_cache
from pydantic_settings import BaseSettings
import os


class Settings(BaseSettings):
    database_url: str = "sqlite:///./pid_visualizer.db"
    api_base_url: str = "http://localhost:8000"
    data_dir: str = "./data"
    debug: bool = False
    log_level: str = "INFO"
    
    # Дополнительные переменные окружения
    google_application_credentials: str = ""
    vite_api_base_url: str = "http://localhost:8000"

    class Config:
        env_file = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")
        # Позволяет pydantic автоматически читать переменные окружения
        # с именами в верхнем регистре (DATABASE_URL, API_BASE_URL, etc.)
        env_prefix = ""
        case_sensitive = False
        # Разрешаем дополнительные поля из .env файла
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
