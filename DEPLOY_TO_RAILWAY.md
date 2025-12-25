# Deployment Plan: Railway.app

**Railway** is an alternative to Render with similar simplicity but more generous free tier limits.

## Prerequisites
1. **GitHub Account**: Push code to your repository.
2. **Railway Account**: Create one at [railway.app](https://railway.app).
3. **Google Gemini API Key**: From [Google AI Studio](https://aistudio.google.com/).

## Step-by-Step Instructions

### 1. Push Code to GitHub
```bash
git add .
git commit -m "chore: setup railway deployment"
git push
```

### 2. Deploy on Railway
1. Log in to **Railway.app**.
2. Click **New Project** -> **Deploy from GitHub repo**.
3. Select your repository: `Automated-Ads-Agent`.
4. Railway will auto-detect the project and start building.

### 3. Add Services
Railway doesn't auto-provision databases from config files. You need to add them manually:

#### Add PostgreSQL:
1. In your project, click **New** -> **Database** -> **Add PostgreSQL**.
2. Railway will generate `DATABASE_URL` automatically.

#### Add Redis:
1. Click **New** -> **Database** -> **Add Redis**.
2. Railway will generate `REDIS_URL` automatically.

### 4. Configure Environment Variables
1. Click on your **Web Service** (the Node.js app).
2. Go to **Variables** tab.
3. Add the following:
   - `GOOGLE_API_KEY`: Your Gemini API Key
   - `NODE_ENV`: `production`
   - `SESSION_SECRET`: Generate a random string (Railway can generate this)
   - `PORT`: Railway auto-injects this, but you can set `5000` as a backup

### 5. Deploy
Railway will automatically build and deploy on every push to GitHub.

## Advantages of Railway
- **Simpler UI**: Less overwhelming than Render.
- **Auto-Deployments**: Every git push triggers a new deployment.
- **Better Free Tier**: $5/month of free credits (vs Render's limits).
- **Fast Builds**: Often faster than Render.

## URL
Once deployed, Railway provides a public URL like: `https://your-app.railway.app`
