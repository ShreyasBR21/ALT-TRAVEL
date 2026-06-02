# Deployment Guide: Render + Vercel

Deploy AltTravel backend to **Render** and frontend to **Vercel** with a few clicks.

## Quick Start

### Backend (Render)

1. Go to https://render.com → Sign up or login
2. Click **"New"** → **"Web Service"**
3. Select your GitHub repository
4. Configure:
   - **Name**: `alttravel-backend`
   - **Root Directory**: `backend`
   - **Runtime**: Python 3.11
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `python main.py`
   - **Plan**: Free

5. Add **Environment Variables**:
   ```
   PORT=8000
   ENVIRONMENT=production
   DEBUG=false
   HOST=0.0.0.0
   ALLOWED_ORIGINS=https://YOUR_VERCEL_DOMAIN.vercel.app
   GEMINI_API_KEY=your-api-key
   ADMIN_DASHBOARD_PASSWORD=your-secure-password
   ```

6. Click **"Create Web Service"** → Done! Backend auto-deploys on `main` push

### Frontend (Vercel)

1. Go to https://vercel.com → Sign up or login
2. Click **"Add New..."** → **"Project"**
3. Import your GitHub repository
4. Configure:
   - **Framework Preset**: Other/Static
   - **Build Command**: (leave empty)
   - **Output Directory**: `./` (root of frontend folder)
5. Click **"Deploy"** → Done!

## Environment Variables

### Render Backend

Set these in Render dashboard (Settings → Environment):

```
PORT=8000
ENVIRONMENT=production
DEBUG=false
HOST=0.0.0.0
ALLOWED_ORIGINS=https://your-vercel-url.vercel.app
GEMINI_API_KEY=<your-key>
ADMIN_DASHBOARD_PASSWORD=<secure-password>
```

### Vercel Frontend

Set these in Vercel dashboard (Settings → Environment Variables):

```
BACKEND_URL=https://your-render-backend-name.onrender.com
```

## GitHub Secrets (Optional)

For GitHub Actions notifications, add to your repo Settings → Secrets:

```
VERCEL_TOKEN=<from https://vercel.com/account/tokens>
VERCEL_ORG_ID=<your-org-id>
VERCEL_PROJECT_ID=<from Vercel project settings>
```

## After Deployment

- **Backend API**: `https://your-backend.onrender.com`
- **Backend Health**: `https://your-backend.onrender.com/api/health`
- **API Docs**: `https://your-backend.onrender.com/docs`
- **Frontend**: `https://your-frontend.vercel.app`

## Updating Code

Just push to `main` branch:
- **Backend**: Render auto-redeploys within 2 minutes
- **Frontend**: Vercel auto-redeploys within 1 minute

## Custom Domain

### Render (Backend)
1. Render dashboard → Select service
2. Settings → Custom Domain
3. Add your domain (e.g., `api.yourdomain.com`)
4. Follow DNS setup instructions

### Vercel (Frontend)
1. Vercel dashboard → Select project
2. Settings → Domains
3. Add your domain (e.g., `yourdomain.com`)
4. Follow DNS setup instructions

## Database (Optional)

If you need persistent storage for reports/analytics:

**Option 1: Render PostgreSQL**
1. Render dashboard → "New" → "PostgreSQL"
2. Copy connection string
3. Add to backend `DATABASE_URL`

**Option 2: Neon (free tier)**
1. Go to https://neon.tech
2. Create PostgreSQL project
3. Copy connection string
4. Add to backend `DATABASE_URL`

## Troubleshooting

### Backend won't deploy
- Check Render logs: Dashboard → Service → Logs
- Verify `requirements.txt` exists in `backend/` folder
- Check `render.yaml` or manual service config

### Frontend showing old content
- Clear browser cache (Ctrl+Shift+Del)
- Vercel → Deployments → Redeploy

### CORS errors
- Update `ALLOWED_ORIGINS` in Render backend settings
- Wait for redeploy (check Render dashboard)
- Clear frontend cache

### Backend can't reach database
- Verify `DATABASE_URL` environment variable is set
- Test connection string locally first
- Check database is running

## Scaling

**Free tier limits:**
- Render: 0.5 vCPU, 512MB RAM (auto-pauses after 15 mins inactivity)
- Vercel: Static hosting (unlimited bandwidth)

**When you need to scale:**
- Render → Upgrade to Starter plan (runs 24/7)
- Vercel → Pro plan for larger projects

## Costs

- **Render Backend**: Free (paused), $7+/month (starter)
- **Vercel Frontend**: Free
- **Database**: $7/month (if using Postgres)

**Free tier estimated**: $0-7/month
