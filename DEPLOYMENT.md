# GexFME Deployment Guide

Built for the corporate **Gexpertise**.

## PHASE 1: Single Render Service Deployment ✅

This guide covers deploying both frontend and backend as a single service on Render with S3-compatible storage.

### Architecture Overview

- **Frontend**: React app built and served as static files by Flask
- **Backend**: Flask API with S3 storage integration
- **Database**: Neon.tech PostgreSQL (cloud-hosted)
- **Storage**: S3-compatible (Cloudflare R2 or AWS S3)
- **Deployment**: Single Docker container on Render

### Files Created/Modified

#### ✅ Storage Abstraction
- `Backend/app/storage.py` - S3-compatible storage service
- Updated `Backend/requirements.txt` - Added boto3, botocore

#### ✅ Controllers Refactored for S3
- `Backend/app/controllers/file_controller.py` - File operations use S3
- `Backend/app/controllers/user_folders.py` - Folder management uses S3
- `Backend/folder_service.py` - Added S3 helper functions (partial)

#### ✅ Deployment Configuration
- `Dockerfile` - Multi-stage build (React + Flask)
- `Backend/wsgi.py` - WSGI entry point for gunicorn
- `render.yaml` - Render deployment configuration
- `.dockerignore` - Optimized Docker builds

#### ✅ Flask App Updates
- `Backend/app/__init__.py` - CORS + static file serving
- `Backend/config.py` - Neon database configuration
- `Backend/.env.example` - Complete environment template

### Environment Variables Required

#### Database
```bash
DATABASE_URL=postgresql://neondb_owner:npg_fejUnu9I8qBl@ep-gentle-waterfall-a2no54oi-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
```

#### Security
```bash
SECRET_KEY=your-production-secret-key
JWT_SECRET_KEY=your-production-jwt-key
```

#### CORS
```bash
FRONTEND_URL=https://your-app.onrender.com
```

#### S3 Storage (Cloudflare R2 Example)
```bash
S3_BUCKET=your-gexfme-bucket
S3_ENDPOINT_URL=https://your-account-id.r2.cloudflarestorage.com
S3_ACCESS_KEY_ID=your-access-key-id
S3_SECRET_ACCESS_KEY=your-secret-access-key
S3_REGION=auto
```

### Local Development Setup

1. **Install Dependencies**
   ```bash
   # Backend
   cd Backend
   pip install -r requirements.txt
   
   # Frontend
   cd ../Frontend
   npm install
   ```

2. **Configure Environment**
   ```bash
   # Copy and edit environment file
   cp Backend/.env.example Backend/.env
   # Edit Backend/.env with your local settings
   ```

3. **Database Setup**
   ```bash
   cd Backend
   python manage.py init-db
   ```

4. **Run Development Servers**
   ```bash
   # Backend (Terminal 1)
   cd Backend
   python wsgi.py
   
   # Frontend (Terminal 2)
   cd Frontend
   npm start
   ```

### Production Deployment on Render

#### Step 1: Setup S3 Storage

**Option A: Cloudflare R2 (Recommended)**
1. Create Cloudflare account
2. Go to R2 Object Storage
3. Create bucket: `gexfme-production`
4. Generate API tokens with R2 permissions
5. Note your account ID for endpoint URL

**Option B: AWS S3**
1. Create AWS account
2. Create S3 bucket: `gexfme-production`
3. Create IAM user with S3 permissions
4. Generate access keys

#### Step 2: Deploy to Render

1. **Connect GitHub Repository**
   - Push code to GitHub
   - Connect repository to Render

2. **Create Web Service**
   - Choose "Docker" as environment
   - Use `render.yaml` configuration
   - Or manually configure:
     - Build Command: (empty - Docker handles it)
     - Start Command: (empty - Docker handles it)
     - Dockerfile Path: `./Dockerfile`

3. **Set Environment Variables**
   ```bash
   DATABASE_URL=<your-neon-connection-string>
   SECRET_KEY=<generate-secure-key>
   JWT_SECRET_KEY=<generate-secure-key>
   FRONTEND_URL=https://your-app-name.onrender.com
   S3_BUCKET=your-bucket-name
   S3_ENDPOINT_URL=<your-s3-endpoint>
   S3_ACCESS_KEY_ID=<your-access-key>
   S3_SECRET_ACCESS_KEY=<your-secret-key>
   S3_REGION=auto
   ```

4. **Deploy**
   - Render will automatically build and deploy
   - Monitor build logs for any issues
   - Test health endpoint: `https://your-app.onrender.com/health`

### Testing Deployment

#### Health Checks
- **Database**: `GET /health` should return `{"status": "ok", "database": "connected"}`
- **Static Files**: Root URL should serve React app
- **API**: `GET /api/auth/login` should return proper error for missing credentials

#### File Operations
- **Upload**: Test file upload to verify S3 integration
- **List**: Test folder listing to verify S3 file enumeration
- **Download**: Test file download from S3

### Troubleshooting

#### Common Issues

1. **Build Failures**
   - Check Dockerfile syntax
   - Verify all dependencies in requirements.txt
   - Ensure Frontend builds successfully

2. **Database Connection**
   - Verify DATABASE_URL format
   - Check SSL requirements (sslmode=require)
   - Test connection with health endpoint

3. **S3 Storage Issues**
   - Verify bucket exists and is accessible
   - Check access keys and permissions
   - Test endpoint URL format

4. **CORS Issues**
   - Ensure FRONTEND_URL matches your Render domain
   - Check Flask-CORS configuration

#### Logs and Monitoring
- **Render Logs**: Check deployment and runtime logs in Render dashboard
- **Application Logs**: Use `logger.info()` statements for debugging
- **Health Monitoring**: Set up monitoring for `/health` endpoint

### Next Steps (Future Phases)

- **Phase 2**: Separate frontend/backend services
- **Phase 3**: CDN integration for static assets
- **Phase 4**: Advanced monitoring and scaling

### Support

For deployment issues related to the corporate Gexpertise implementation, refer to the main README.md for project details and architecture information.
