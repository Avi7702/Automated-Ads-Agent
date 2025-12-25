# Deployment Options

This application is ready to deploy to multiple cloud platforms. Choose the one that fits your needs:

## ☁️ Recommended: Render.com (Autopilot)
**Best for**: Users who want zero-config deployment.

- **File**: [`render.yaml`](./render.yaml)
- **Guide**: [`DEPLOY_TO_RENDER.md`](./DEPLOY_TO_RENDER.md)
- **Why**: One-click Blueprint deployment. Render reads the config and provisions everything.
- **Steps**: Connect repo → Render detects `render.yaml` → Add API key → Deploy.

---

## 🚂 Alternative: Railway.app (Fast & Simple)
**Best for**: Users who want a simpler UI and faster builds.

- **File**: [`railway.json`](./railway.json)
- **Guide**: [`DEPLOY_TO_RAILWAY.md`](./DEPLOY_TO_RAILWAY.md)
- **Why**: Better free tier, simpler interface, faster deployments.
- **Steps**: Connect repo → Manually add Postgres/Redis → Add API key → Deploy.

---

## 🐳 Docker (Local or Self-Hosted)
**Best for**: Users who want full control or local testing.

- **Files**: [`Dockerfile`](./Dockerfile), [`docker-compose.yml`](./docker-compose.yml)
- **Guide**: [`DOCKER_PLAN.md`](./DOCKER_PLAN.md)
- **Why**: Run the full stack locally or deploy to any Docker-compatible host (AWS ECS, DigitalOcean, etc.).
- **Requirements**: Docker Desktop installed.
- **Steps**:
  ```bash
  # Create .env file with GOOGLE_API_KEY
  docker-compose up --build
  # Access at http://localhost:5000
  ```

---

## 🔑 Required Environment Variable

All deployment options require:

| Variable | Description | Where to Get It |
|----------|-------------|-----------------|
| `GOOGLE_API_KEY` | Your Google Gemini API Key | [Google AI Studio](https://aistudio.google.com/) |

### Getting Your API Key:
1. Visit **[Google AI Studio](https://aistudio.google.com/)**.
2. Click **Get API Key** → **Create API Key**.
3. Copy the key (starts with `AIza...`).
4. Add it to your deployment platform's environment variables.

---

## 📊 Comparison

| Feature | Render | Railway | Docker |
|---------|--------|---------|--------|
| **Setup Difficulty** | ⭐ Easiest (Blueprint) | ⭐⭐ Easy | ⭐⭐⭐ Moderate |
| **Free Tier** | 750 hrs/month | $5 credits/month | Free (local) |
| **Auto-Deploy** | ✅ Yes | ✅ Yes | ❌ Manual |
| **Database Included** | ✅ Auto-provisioned | ⚠️ Manual add | ✅ docker-compose |
| **Best For** | Production | Prototypes | Development |

---

## ✅ What's Included

All deployment options come with:
- ✅ **Multi-stage Docker build** (optimized image size)
- ✅ **PostgreSQL database** (for generations, users, products)
- ✅ **Redis cache** (for rate limiting and sessions)
- ✅ **Auto-scaling** (on Render/Railway)
- ✅ **Environment validation** (fails fast if API key missing)

---

## 🚀 Quick Start

### For Render (Recommended):
```bash
git push  # Push to GitHub
# Then: Render → New Blueprint → Select repo → Add GOOGLE_API_KEY → Deploy
```

### For Railway:
```bash
git push  # Push to GitHub
# Then: Railway → New Project → Select repo → Add Postgres/Redis → Add GOOGLE_API_KEY
```

### For Docker (Local):
```bash
# Create .env file
echo "GOOGLE_API_KEY=your-key-here" > .env
echo "DATABASE_URL=postgres://postgres:postgres@postgres:5432/automated_ads" >> .env

# Start the stack
docker-compose up --build
```

---

## 🔧 Post-Deployment

After deployment, verify:
1. **Frontend loads**: Visit your app URL.
2. **Database connection**: Check logs for "Database connected" message.
3. **AI features work**: Try generating an image.

---

## 📝 Notes

- **Cloudinary** (product library) is optional. If not configured, product library features will be disabled.
- **OpenTelemetry** (monitoring) is optional. Configure `OTEL_*` env vars if you want observability.
- **Custom Domain**: Both Render and Railway support custom domains in paid plans.
