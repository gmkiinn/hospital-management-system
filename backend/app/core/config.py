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
    # database_url: app runtime, connects as restricted `hms_app` (RLS applies)
    # migration_database_url: Alembic, connects as `hms` owner (DDL, bypasses RLS)
    database_url: str
    migration_database_url: str
    # Auth / JWT
    jwt_secret_key: str
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7

    # AI scribe (OpenAI). Empty key => the service returns realistic mock output,
    # so the full flow is demoable without a key; set the key for real AI.
    openai_api_key: str = ""
    openai_transcription_model: str = "whisper-1"
    openai_summary_model: str = "gpt-4o-mini"

    # Audio uploads
    upload_dir: str = "uploads"
    max_upload_bytes: int = 26_214_400  # 25 MB


settings = Settings()
