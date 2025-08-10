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
    production_url = 'https://gexfme.onrender.com'
    
    # In production, allow both the production URL and any configured frontend URL
    allowed_origins = [frontend_url, production_url] if frontend_url != production_url else [production_url]
    logger.info(f"Configuring CORS for origins: {allowed_origins}")
    
    # Use Flask-CORS for proper CORS handling
    CORS(app, 
         origins=allowed_origins,
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

    # Serve React static files - handle nested static directory structure
    @app.route('/static/<path:filename>')
    def serve_static(filename):
        """Serve static files from React build."""
        static_dir = os.path.join(os.path.dirname(app.root_path), 'static')
        
        # React build puts assets in static/static/, so we need to handle this properly
        # First try the nested static directory (where CSS/JS files are)
        nested_static_path = os.path.join(static_dir, 'static', filename)
        if os.path.exists(nested_static_path):
            return send_from_directory(os.path.join(static_dir, 'static'), filename)
        
        # Fallback to direct static directory (for manifest.json, favicon.ico, etc.)
        direct_static_path = os.path.join(static_dir, filename)
        if os.path.exists(direct_static_path):
            return send_from_directory(static_dir, filename)
        
        # If file not found, return 404
        logger.warning(f"Static file not found: {filename}")
        return {'error': 'Static file not found'}, 404
    
    # Debug route to test static file serving
    @app.route('/debug/static/<path:filename>')
    def debug_static(filename):
        """Debug static file serving."""
        static_dir = os.path.join(os.path.dirname(app.root_path), 'static')
        nested_static_path = os.path.join(static_dir, 'static', filename)
        direct_static_path = os.path.join(static_dir, filename)
        
        return {
            'filename': filename,
            'static_dir': static_dir,
            'nested_path': nested_static_path,
            'direct_path': direct_static_path,
            'nested_exists': os.path.exists(nested_static_path),
            'direct_exists': os.path.exists(direct_static_path),
            'app_root_path': app.root_path,
            'dirname_app_root': os.path.dirname(app.root_path)
        }
    
    # Health check endpoint for database connectivity
    @app.route('/health')
    def health():
        try:
            # Test database connection
            db.session.execute(db.text('SELECT 1'))
            db.session.commit()
            
            # Debug: Check file structure with more details
            import glob
            static_files = glob.glob('/app/static/**/*', recursive=True)
            css_files = glob.glob('/app/static/static/css/*', recursive=True)
            js_files = glob.glob('/app/static/static/js/*', recursive=True)
            app_files = glob.glob('/app/app/**/*', recursive=True)[:10]
            
            # Check specific file paths
            static_dir = os.path.join(os.path.dirname(app.root_path), 'static')
            test_css_path = os.path.join(static_dir, 'static', 'css', 'main.4fa125d7.css')
            test_js_path = os.path.join(static_dir, 'static', 'js', 'main.a8e0dfe4.js')
            
            return {
                'status': 'ok', 
                'database': 'connected',
                'debug': {
                    'app_root_path': app.root_path,
                    'static_dir_calculated': static_dir,
                    'all_static_files': static_files,
                    'css_files': css_files,
                    'js_files': js_files,
                    'files_in_app_app': app_files,
                    'cwd': os.getcwd(),
                    'test_css_exists': os.path.exists(test_css_path),
                    'test_js_exists': os.path.exists(test_js_path),
                    'test_css_path': test_css_path,
                    'test_js_path': test_js_path
                }
            }, 200
        except Exception as e:
            logger.error(f"Health check failed: {str(e)}")
            return {'status': 'error', 'database': 'disconnected', 'details': str(e)}, 500

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