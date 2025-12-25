# Deployment Plan: Render.com

Since you prefer a dedicated cloud service over Replit, we will use **Render**. It provides a "Blueprint" feature that reads our `render.yaml` and automatically provisions the Web Service, Database, and Redis cache.

## Prerequisites
1.  **GitHub Account**: You must be able to push this code to a repository you own.
2.  **Render Account**: Create one at [render.com](https://render.com).
3.  **Google Gemini API Key**: You need a valid key from [Google AI Studio](https://aistudio.google.com/).

## Step-by-Step Instructions

### 1. Push Code to GitHub
We need to sync your local changes (including the new `render.yaml` and `Dockerfile`) to GitHub.

```bash
git add .
git commit -m "chore: setup render deployment"
git push
```

### 2. Deploy on Render
1.  Log in to **Render.com**.
2.  Click **New +** -> **Blueprint**.
3.  Connect your GitHub repository.
4.  Render will detect `render.yaml`.
5.  **CRITICAL**: It will ask for environment variables. You will see `GOOGLE_API_KEY`. Paste your Gemini API Key there.
6.  Click **Apply**.

### 3. Verify
Render will:
1.  Spin up a Postgres Database.
2.  Spin up a Redis instance.
3.  Build and deploy the Node.js app.

Once the "Web Service" is green/live, click the URL provided by Render.

## Why this approach?
- **Professional**: Uses standard infrastructure (Managed DB/Redis).
- **Automated**: `render.yaml` defines everything. No manual clicking around.
- **Production-Ready**: The app is built in production mode (`npm run build`).
