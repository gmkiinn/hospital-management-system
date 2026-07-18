from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Application
    app_name: str = "HMS Backend"
    environment: str = "development"
    debug: bool = True
    api_v1_prefix: str = "/api/v1"
    # Database
    database_url: str


settings = Settings()
