import os
import sys
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

try:
    from app import db, create_app
    from app.models.user import User
    from app.models.folder import Folder
    
    logger.info("Starting database initialization...")
    
    # Create application context
    app = create_app()
    
    with app.app_context():
        logger.info("Creating database tables...")
        
        # Drop tables if they exist to ensure clean state
        try:
            logger.info("Dropping existing tables if they exist...")
            db.drop_all()
            logger.info("Existing tables dropped successfully")
        except Exception as e:
            logger.warning(f"Error dropping tables: {str(e)}")
        
        # Create all tables
        try:
            db.create_all()
            logger.info("Tables created successfully!")
            
            # Verify tables were created
            tables = db.engine.table_names()
            logger.info(f"Tables in database: {tables}")
            
            if 'folder' in tables and 'user' in tables:
                logger.info("Database initialization successful!")
            else:
                logger.error(f"Missing required tables. Found: {tables}")
        except Exception as e:
            logger.error(f"Error creating tables: {str(e)}")
            sys.exit(1)
            
except Exception as e:
    logger.error(f"Unexpected error: {str(e)}")
    sys.exit(1)

print("\nDatabase initialization complete. You can now start the application.")

