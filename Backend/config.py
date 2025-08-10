import os
from datetime import timedelta
from dotenv import load_dotenv

load_dotenv()

class Config:
    # Database
    @staticmethod
    def get_database_uri():
        db_url = os.getenv("DATABASE_URL")
        if db_url:
            # Ensure SSL is required for production (Neon.tech requirement)
            if 'sslmode' not in db_url:
                db_url += '?sslmode=require'
            return db_url
        # Fallback for local development
        return "sqlite:///app.db"
    
    SQLALCHEMY_DATABASE_URI = get_database_uri()
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # Application
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key-change-it")
    
    # JWT Configuration
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-secret-key-change-it")
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=1)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)
    JWT_ERROR_MESSAGE_KEY = "message"
    JWT_TOKEN_LOCATION = ["headers"]
    JWT_HEADER_NAME = "Authorization"
    JWT_HEADER_TYPE = "Bearer"
    
    # CORS Configuration
    CORS_HEADERS = 'Content-Type'

    # Configuration du dossier des ressources
    RESSOURCES_FOLDER = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "Ressources"
)
