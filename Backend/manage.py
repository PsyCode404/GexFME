#!/usr/bin/env python3
"""
Management script for Flask application.
Provides CLI commands for database migrations and other tasks.
"""

import os
from flask.cli import FlaskGroup
from app import create_app, db

# Create Flask app instance
app = create_app()

# Create CLI group
cli = FlaskGroup(app)

@cli.command("init-db")
def init_db():
    """Initialize the database."""
    print("Creating database tables...")
    db.create_all()
    print("Database tables created successfully!")

@cli.command("reset-db")
def reset_db():
    """Reset the database (drop and recreate all tables)."""
    print("Dropping all database tables...")
    db.drop_all()
    print("Creating database tables...")
    db.create_all()
    print("Database reset successfully!")

if __name__ == "__main__":
    cli()
