# Vercel Deployment Guide

This guide walks you through deploying SocialScour to Vercel.

## Overview

Since Vercel is optimized for frontend/static sites and serverless functions, we'll deploy:
- **Frontend**: Vercel (static site)
- **Backend**: Railway, Render, or Fly.io (FastAPI server)

## Prerequisites

- GitHub account
- Vercel account ([vercel.com](https://vercel.com))
- Railway/Render/Fly.io account (for backend)
- Tavily API key
- Gemini API key

## Step 1: Deploy Backend

### Option A: Railway (Recommended - Easiest)

1. Go to [railway.app](https://railway.app) and sign up/login
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your `socialscour` repository
4. Railway will detect the project. Click on the service and configure:
   - **Root Directory**: Set to `backend`
   - **Build Command**: Leave empty (Railway auto-detects Python)
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
5. Go to "Variables" tab and add:
   ```
   TAVILY_API_KEY=your_tavily_api_key
   GEMINI_API_KEY=your_gemini_api_key
   ALLOWED_ORIGINS=https://your-app.vercel.app
   ```
   (You'll update ALLOWED_ORIGINS after deploying frontend)
6. Railway will automatically deploy. Copy your backend URL (e.g., `https://your-app.railway.app`)

### Option B: Render

1. Go to [render.com](https://render.com) and sign up/login
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure:
   - **Name**: `socialscour-backend`
   - **Root Directory**: `backend`
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
5. Add environment variables (same as Railway)
6. Click "Create Web Service"
7. Copy your backend URL

### Option C: Fly.io

1. Install Fly CLI: `curl -L https://fly.io/install.sh | sh`
2. Login: `fly auth login`
3. Create app: `fly launch` (in `backend` directory)
4. Set secrets:
   ```bash
   fly secrets set TAVILY_API_KEY=your_key
   fly secrets set GEMINI_API_KEY=your_key
   fly secrets set ALLOWED_ORIGINS=https://your-app.vercel.app
   ```
5. Deploy: `fly deploy`
6. Copy your backend URL

## Step 2: Update Backend CORS

Update `backend/main.py` to include your Vercel domain:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://your-app.vercel.app",  # Add your Vercel URL here
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

Or use environment variable for production:

```python
import os

allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## Step 3: Deploy Frontend to Vercel

### Method 1: Vercel CLI

1. Install Vercel CLI:
   ```bash
   npm install -g vercel
   ```

2. Navigate to project root:
   ```bash
   cd /path/to/socialscour
   ```

3. Login to Vercel:
   ```bash
   vercel login
   ```

4. Deploy:
   ```bash
   vercel
   ```
   Follow the prompts:
   - Link to existing project? **No**
   - Project name: `socialscour` (or your choice)
   - Directory: `frontend`
   - Override settings? **No**

5. Set environment variable:
   ```bash
   vercel env add VITE_API_URL
   ```
   Enter your backend URL (e.g., `https://your-app.railway.app`)

6. Redeploy with environment variable:
   ```bash
   vercel --prod
   ```

### Method 2: GitHub Integration (Recommended)

1. Go to [vercel.com](https://vercel.com) and sign up/login
2. Click "Add New..." → "Project"
3. Import your GitHub repository
4. Configure project:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`
5. Add environment variable:
   - **Name**: `VITE_API_URL`
   - **Value**: Your backend URL (e.g., `https://your-app.railway.app`)
6. Click "Deploy"
7. Wait for deployment to complete
8. Copy your Vercel URL (e.g., `https://your-app.vercel.app`)

## Step 4: Update Backend CORS with Vercel URL

Go back to your backend deployment (Railway/Render/Fly.io) and update the `ALLOWED_ORIGINS` environment variable to include your Vercel URL:

```
ALLOWED_ORIGINS=https://your-app.vercel.app,http://localhost:5173
```

Redeploy the backend if needed.

## Step 5: Verify Deployment

1. Visit your Vercel URL
2. Try creating a new research query
3. Check browser console for any CORS errors
4. Verify streaming responses work correctly

## Troubleshooting

### CORS Errors

- Ensure your backend `ALLOWED_ORIGINS` includes your exact Vercel URL
- Check that environment variables are set correctly
- Verify backend is accessible (try visiting `/health` endpoint)

### API Connection Issues

- Verify `VITE_API_URL` is set correctly in Vercel
- Check that backend URL doesn't have trailing slash
- Ensure backend is running and accessible

### Build Errors

- Check that all dependencies are in `package.json`
- Verify Node.js version compatibility
- Check Vercel build logs for specific errors

### Streaming Not Working

- Vercel has timeout limits (10s for Hobby, 60s for Pro)
- If streaming times out, consider upgrading Vercel plan
- Or implement chunked responses with shorter timeouts

## Environment Variables Summary

### Frontend (Vercel)
- `VITE_API_URL`: Backend API URL (e.g., `https://your-app.railway.app`)

### Backend (Railway/Render/Fly.io)
- `TAVILY_API_KEY`: Your Tavily API key
- `GEMINI_API_KEY`: Your Gemini API key
- `ALLOWED_ORIGINS`: Comma-separated list of allowed origins

## Next Steps

- Set up custom domain in Vercel
- Configure environment-specific variables
- Set up monitoring and error tracking
- Consider migrating to database storage (Supabase, MongoDB) instead of file-based storage
