from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    SECRET_KEY: str = "changez_cette_cle_en_production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480

    class Config:
        env_file = ".env"

settings = Settings()