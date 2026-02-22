# Railway Deployment - Step-by-Step Guide

## Architecture Note

**Frontend + Backend = ONE Service**

- This is a **monolith** - the React frontend is compiled and served by the Express backend.
- You only deploy **one service** to Railway.
- The build process (`npm run build`) creates `dist/public/` with the frontend, and the backend serves it.

---

## Step 1: Push to GitHub

```bash
git add .
git commit -m "chore: railway deployment setup"
git push origin main
```

---

## Step 2: Create Railway Project

1. Go to **[railway.app](https://railway.app)**
2. Click **Login** → Sign in with GitHub
3. Click **New Project**
4. Select **Deploy from GitHub repo**
5. Choose: `Avi7702/Automated-Ads-Agent`
6. Railway will start building automatically

---

## Step 3: Add PostgreSQL Database

1. In your project dashboard, click **New**
2. Select **Database** → **Add PostgreSQL**
3. Railway auto-generates `DATABASE_URL` and links it to your app
4. ✅ Done! No manual configuration needed.

---

## Step 4: Add Redis Cache

1. Click **New** again
2. Select **Database** → **Add Redis**
3. Railway auto-generates `REDIS_URL` and links it to your app
4. ✅ Done!

---

## Step 5: Configure Environment Variables

1. Click on your **Web Service** (the `automated-ads-agent` service)
2. Go to **Variables** tab
3. Click **New Variable** and add:

| Variable Name    | Value                                                |
| ---------------- | ---------------------------------------------------- |
| `GOOGLE_API_KEY` | `your-gemini-api-key`                                |
| `NODE_ENV`       | `production`                                         |
| `SESSION_SECRET` | (Click "Generate" or use any random 32+ char string) |

> **Note**: `DATABASE_URL`, `REDIS_URL`, and `PORT` are auto-injected by Railway. Don't add them manually.

---

## Step 6: Wait for Deployment

Railway will:

1. ✅ Install dependencies (`npm install`)
2. ✅ Build the app (`npm run build` - compiles frontend + backend)
3. ✅ Start the server (`npm start`)

Watch the **Deploy Logs** tab for progress.

---

## Step 7: Access Your App

1. Once deployed, Railway provides a URL like:
   - `https://automated-ads-agent-production.up.railway.app`
2. Click **Settings** → **Generate Domain** if not auto-generated
3. Open the URL in your browser
4. ✅ You should see the login/registration page

---

## Step 8: Test the App

1. **Register an account** (or use demo mode if available)
2. **Upload a product image**
3. **Enter a transformation prompt** (e.g., "Place this product on a luxury dining table")
4. **Click Generate**
5. ✅ If successful, you'll see the AI-generated image

---

## Troubleshooting

### Build Fails

- Check **Deploy Logs** for errors
- Common issue: Missing `GOOGLE_API_KEY` → Add it in Variables

### App Loads but AI Fails

- Verify `GOOGLE_API_KEY` is correct
- Check if the key has quota/billing enabled in Google Cloud Console

### Database Connection Error

- Ensure PostgreSQL service is **healthy** (green dot)
- Railway should auto-inject `DATABASE_URL`

---

## Frontend Location

**The frontend is NOT separate.**

```
dist/
├── public/          ← Frontend (HTML, CSS, JS)
│   ├── index.html
│   ├── assets/
│   └── ...
└── index.cjs        ← Backend (Express server)
```

When you visit the Railway URL:

1. The Express backend serves `dist/public/index.html`
2. The React app loads in your browser
3. It makes API calls to the same domain (`/api/*`)

No separate frontend deployment needed!

---

## Post-Deployment

### Custom Domain (Optional)

1. Go to **Settings** → **Domains**
2. Add your custom domain
3. Update DNS records as instructed

### Monitoring

- **Logs**: Click **Observability** → **Logs**
- **Metrics**: CPU, Memory, Network usage available in Railway dashboard

### Auto-Deployments

Every `git push` to `main` triggers a new deployment automatically.

---

## Summary

✅ **One Service**: Frontend + Backend bundled together  
✅ **Three Components**: Web Service + PostgreSQL + Redis  
✅ **One Environment Variable**: `GOOGLE_API_KEY`  
✅ **Auto-Deploy**: Push to GitHub = New deployment

**Your app URL**: Check Railway dashboard after deployment completes.
