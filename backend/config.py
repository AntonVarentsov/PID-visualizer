from functools import lru_cache
from pydantic import BaseSettings
import os


class Settings(BaseSettings):
    database_url: str = "sqlite:///./pid_visualizer.db"
    api_base_url: str = "http://localhost:8000"
    data_dir: str = "./data"
    debug: bool = False
    log_level: str = "INFO"

    class Config:
        env_file = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")


@lru_cache()
def get_settings() -> Settings:
    return Settings()
