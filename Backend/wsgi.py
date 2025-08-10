"""
WSGI entry point for the Flask application.
Used by gunicorn and other WSGI servers.
"""

import os
import sys
from app import create_app

# Add the current directory to Python path
sys.path.insert(0, os.path.dirname(__file__))

# Create the Flask application
app = create_app()

if __name__ == "__main__":
    # For development only
    app.run(host="0.0.0.0", port=5000, debug=False)
