# Multi-stage Dockerfile for GexFME full-stack deployment
# Stage 1: Build React frontend
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

# Copy package files
COPY Frontend/package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy frontend source
COPY Frontend/ ./

# Build the React app
RUN npm run build

# Stage 2: Build Python backend with React static files
FROM python:3.11-slim AS backend

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
ENV FLASK_ENV=production

# Install system dependencies for Shapely/GEOS and other requirements
RUN apt-get update && apt-get install -y \
    libgeos-dev \
    libgeos-c1v5 \
    libproj-dev \
    proj-data \
    proj-bin \
    libspatialindex-dev \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /app

# Copy backend requirements and install Python dependencies
COPY Backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source code
COPY Backend/ ./

# Copy React build from frontend stage
COPY --from=frontend-builder /app/frontend/build ./app/static

# Create non-root user for security
RUN useradd --create-home --shell /bin/bash app && \
    chown -R app:app /app
USER app

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:5000/health || exit 1

# Start the application with gunicorn
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "2", "--timeout", "120", "wsgi:app"]
