# Deployment Guide: Google Cloud Run + Vercel

## Prerequisites

1. **Google Cloud**
   - Create a project at https://console.cloud.google.com
   - Enable Cloud Run API
   - Create a Service Account with "Cloud Run Admin" and "Container Registry Service Agent" roles
   - Generate and download a JSON key

2. **Vercel**
   - Create account at https://vercel.com
   - Invite repository
   - Get Vercel Token from https://vercel.com/account/tokens

## GitHub Secrets Setup

Add these secrets to your GitHub repository settings (Settings → Secrets and variables → Actions):

### Google Cloud Secrets

- **GCP_PROJECT_ID**: Your Google Cloud project ID (e.g., `my-alttravel-project`)
- **GCP_SA_KEY**: Contents of the Service Account JSON key file (full JSON)
- **ALLOWED_ORIGINS**: Comma-separated list of allowed origins
  - Example: `https://alttravel.vercel.app,https://your-domain.com`

### Google Secret Manager (for sensitive env vars)

Before deploying, create these secrets in Google Secret Manager:

```bash
gcloud secrets create admin-pass --replication-policy='automatic' --data-file=- <<< 'your-secure-password'
gcloud secrets create gemini-key --replication-policy='automatic' --data-file=- <<< 'your-gemini-api-key'
```

Grant Cloud Run service account access:
```bash
gcloud secrets add-iam-policy-binding admin-pass \
  --member=serviceAccount:YOUR_SA_EMAIL \
  --role=roles/secretmanager.secretAccessor

gcloud secrets add-iam-policy-binding gemini-key \
  --member=serviceAccount:YOUR_SA_EMAIL \
  --role=roles/secretmanager.secretAccessor
```

### Vercel Secrets

- **VERCEL_TOKEN**: Personal access token from Vercel account
- **VERCEL_ORG_ID**: Your Vercel organization/team ID
- **VERCEL_PROJECT_ID**: Project ID (found in Vercel project settings)

## Environment Variables in Vercel

Set the backend URL in Vercel dashboard:
- Variable: `BACKEND_URL`
- Value: `https://alttravel-backend-xxxxx.run.app` (from Cloud Run output)

Or update frontend `app.js` to read from `window.location.hostname` for dynamic URLs.

## Manual Deployment (if GitHub Actions fails)

### Cloud Run
```bash
gcloud run deploy alttravel-backend \
  --source backend \
  --runtime python311 \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars "ENVIRONMENT=production,ALLOWED_ORIGINS=https://alttravel.vercel.app"
```

### Vercel
```bash
cd frontend
vercel --prod --token YOUR_VERCEL_TOKEN
```

## Verify Deployment

- **Backend Health**: https://alttravel-backend-xxxxx.run.app/api/health
- **Frontend**: https://alttravel.vercel.app
- **API Docs**: https://alttravel-backend-xxxxx.run.app/docs

## Troubleshooting

- **Cloud Run builds failing**: Check `gcloud builds log [BUILD_ID]`
- **Vercel deployment stuck**: Check Vercel dashboard logs
- **CORS errors**: Update `ALLOWED_ORIGINS` in Cloud Run environment variables
- **Missing secrets**: Verify all secrets exist in GitHub and Google Secret Manager
