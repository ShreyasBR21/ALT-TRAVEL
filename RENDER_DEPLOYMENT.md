# Render Deployment Guide

## Overview

This guide covers deploying AltTravel to Render, a modern cloud platform with free tier support for web services and static sites.

## Prerequisites

1. **Render Account**
   - Create account at https://render.com
   - Connect GitHub repository

2. **PostgreSQL Database (Optional)**
   - Render provides free PostgreSQL instances
   - Recommended for production data storage

## Quick Start: Deploy with Render Dashboard

### Option 1: Using render.yaml (recommended)

1. Go to https://dashboard.render.com
2. Click "New" → "Blueprint"
3. Select your GitHub repository
4. Render will detect `render.yaml` and auto-configure services
5. Set environment variables in dashboard
6. Click "Deploy"

### Option 2: Manual Setup

#### Backend (Web Service)
1. Go to https://dashboard.render.com
2. Click "New+" → "Web Service"
3. Connect your GitHub repository
4. Configure:
   - **Name**: `alttravel-backend`
   - **Root Directory**: `backend`
   - **Runtime**: Python 3.11
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `python main.py`
   - **Plan**: Free (or Starter)

5. Set **Environment Variables**:
   ```
   PORT=8000
   ENVIRONMENT=production
   DEBUG=false
   HOST=0.0.0.0
   ALLOWED_ORIGINS=https://alttravel-frontend.onrender.com
   GEMINI_API_KEY=<your-key>
   ADMIN_DASHBOARD_PASSWORD=<secure-password>
   DATABASE_URL=postgresql://user:pass@host:5432/db (if using Postgres)
   ```

6. Click "Create Web Service"

#### Frontend (Static Site)
1. Go to https://dashboard.render.com
2. Click "New+" → "Static Site"
3. Connect your GitHub repository
4. Configure:
   - **Name**: `alttravel-frontend`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm install && npm run build || echo 'No build needed'` (or leave blank)
   - **Publish Directory**: `.` (current directory)
   - **Plan**: Free

5. Set **Environment Variable**:
   ```
   BACKEND_URL=https://alttravel-backend.onrender.com
   ```

6. Click "Create Static Site"

#### Database (Optional)
1. Go to https://dashboard.render.com
2. Click "New+" → "PostgreSQL"
3. Configure:
   - **Name**: `alttravel-db`
   - **Plan**: Free
4. Copy connection string to backend `DATABASE_URL`

## GitHub Actions Auto-Deploy

### Setup

1. Go to your Render dashboard
2. Get your **API Key**: Account → API Keys
3. Get **Service IDs**: Click on each service, check Settings

### Add GitHub Secrets

Add to your GitHub repository (Settings → Secrets and variables → Actions):

```
RENDER_API_KEY=<your-render-api-key>
RENDER_BACKEND_SERVICE_ID=srv-xxxxx
RENDER_FRONTEND_SERVICE_ID=srv-xxxxx
```

### Trigger Deployment

Push to `main` branch → GitHub Actions automatically deploys to Render.

## Environment Variables

Set these in Render dashboard under each service's **Environment**:

**Backend:**
- `ENVIRONMENT=production`
- `DEBUG=false`
- `HOST=0.0.0.0`
- `PORT=8000`
- `ALLOWED_ORIGINS=https://alttravel-frontend.onrender.com`
- `ADMIN_DASHBOARD_PASSWORD=<secure-random-password>`
- `GEMINI_API_KEY=<your-google-ai-key>`
- `DATABASE_URL=postgresql://...` (if using Postgres)
- `REDIS_URL=redis://...` (optional)

**Frontend:**
- `BACKEND_URL=https://alttravel-backend.onrender.com`

## After Deployment

1. **Backend Health Check**:
   ```
   https://alttravel-backend.onrender.com/api/health
   ```

2. **API Documentation**:
   ```
   https://alttravel-backend.onrender.com/docs
   ```

3. **Frontend**:
   ```
   https://alttravel-frontend.onrender.com
   ```

## Update CORS

If your frontend URL changes, update `ALLOWED_ORIGINS` in the backend:

1. Go to backend service in Render dashboard
2. Settings → Environment
3. Edit `ALLOWED_ORIGINS` to include your new frontend URL
4. Save & redeploy

## Updating Code

Just push to `main` branch. Render automatically redeploys both services.

## Troubleshooting

### Backend won't start
- Check "Logs" in Render dashboard
- Verify `PYTHON_VERSION=3.11` if needed
- Ensure `requirements.txt` is in backend root

### Frontend not loading
- Check Static Site build logs
- Verify `BACKEND_URL` environment variable is set
- Clear browser cache

### CORS errors
- Update `ALLOWED_ORIGINS` in backend settings
- Redeploy backend after changes

### Database connection failed
- Verify `DATABASE_URL` is correct
- Check database is running in Render dashboard
- Test connection string locally first

## Scaling

When upgrading from free tier:
- Backend: Starter+ plan
- Frontend: Standard plan
- Database: Standard plan

## Cost Estimation (Free Tier)

- **Backend**: Free (auto-pauses after 15 mins inactivity)
- **Frontend**: Free
- **PostgreSQL**: $7/month for persistent tier

Upgrade to paid plans for production workloads.
