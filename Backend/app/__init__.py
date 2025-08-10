# app/__init__.py
from flask import Flask, request, send_from_directory, render_template_string
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_restx import Api
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from config import Config
import logging
import os

# Configuration du logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

db = SQLAlchemy()
jwt = JWTManager()

def create_app():
    """Crée et configure l'application Flask."""
    app = Flask(__name__)
    app.config.from_object(Config)
    logger.info("Flask app created with config loaded")

    # Configure CORS with environment-based origins
    frontend_url = os.getenv('FRONTEND_URL', 'http://localhost:3000')
    logger.info(f"Configuring CORS for frontend URL: {frontend_url}")
    
    # Use Flask-CORS for proper CORS handling
    CORS(app, 
         origins=[frontend_url],
         allow_headers=['Content-Type', 'Authorization'],
         methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
         supports_credentials=True)
    
    logger.info("CORS configured with Flask-CORS")

    # JWT configuration is handled in Config class
    logger.info("JWT configured from Config class")

    # Initialisation des extensions
    db.init_app(app)
    jwt.init_app(app)
    migrate = Migrate(app, db, directory='migrations')
    logger.info("Extensions (DB, JWT, Migrate) initialized")

    # Initialisation de l'API avec Swagger - confined to /api/ path
    api = Api(app, title="GexFME API", version="1.0", description="API d'authentification", 
              doc='/api/', prefix='/api')
    logger.info("API initialized with Swagger")

    # Importation et enregistrement des Blueprints
    from app.controllers.file_controller import file_blueprint
    from app.controllers.user_folders import user_folders_blueprint
    from app.controllers.folder_service_routes import folder_service_blueprint
    
    app.register_blueprint(file_blueprint)
    app.register_blueprint(user_folders_blueprint)
    app.register_blueprint(folder_service_blueprint)
    logger.info("File, User Folders, and Folder Service blueprints registered")

    # Importation et enregistrement des Namespaces pour Flask-RESTx
    from app.controllers.user_controller import ns as user_ns
    from app.controllers.auth_controller import auth_ns
    from app.controllers.folder_controller import ns as folder_ns

    api.add_namespace(user_ns, path="/users")
    api.add_namespace(auth_ns, path="/auth")
    api.add_namespace(folder_ns, path="/folders")
    
    # Ne pas enregistrer le namespace user_folder_ns pour éviter les conflits
    # avec le blueprint user_folder_blueprint
    # from app.controllers.user_folder_controller import ns as user_folder_ns
    # api.add_namespace(user_folder_ns, path="/api/user-folder")
    logger.info("API namespaces registered")

    # Health check endpoint for database connectivity
    @app.route('/health')
    def health():
        try:
            # Test database connection
            db.session.execute(db.text('SELECT 1'))
            db.session.commit()
            return {'status': 'ok', 'database': 'connected'}, 200
        except Exception as e:
            logger.error(f"Health check failed: {str(e)}")
            return {'status': 'error', 'database': 'disconnected', 'details': str(e)}, 500

    # Serve React static files
    @app.route('/static/<path:filename>')
    def serve_static(filename):
        """Serve static files from React build."""
        static_dir = os.path.join(os.path.dirname(app.root_path), 'static')
        return send_from_directory(static_dir, filename)
    
    # Serve React app for all non-API routes
    @app.route('/', defaults={'path': ''})
    @app.route('/<path:path>')
    def serve_react_app(path):
        """Serve React app for frontend routes."""
        # Don't serve React for API routes
        if path.startswith('api/'):
            return {'error': 'API endpoint not found'}, 404
        
        # Serve index.html for all frontend routes
        static_dir = os.path.join(os.path.dirname(app.root_path), 'static')
        index_path = os.path.join(static_dir, 'index.html')
        
        if os.path.exists(index_path):
            return send_from_directory(static_dir, 'index.html')
        else:
            # Fallback if React build not found
            return render_template_string('''
            <!DOCTYPE html>
            <html>
            <head>
                <title>GexFME - Build Not Found</title>
            </head>
            <body>
                <h1>GexFME Backend</h1>
                <p>React frontend build not found. Please build the frontend first.</p>
                <p><a href="/health">Health Check</a></p>
            </body>
            </html>
            ''')

    return app