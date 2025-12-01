# Production Deployment Checklist

## Pre-Deployment Requirements

### 1. Environment Variables (REQUIRED)

```bash
# Database - PostgreSQL connection string
DATABASE_URL=postgresql://user:password@host:5432/dbname

# Gemini API - Get from https://makersuite.google.com/app/apikey
GEMINI_API_KEY=your-gemini-api-key

# Session security - Generate with: openssl rand -hex 32
SESSION_SECRET=your-64-char-random-string

# Environment
NODE_ENV=production

# Optional
MAX_IMAGE_SIZE_MB=10
PORT=3000
```

### 2. Database Setup

```bash
# Apply schema migrations
npx drizzle-kit push:pg

# Verify tables exist
psql $DATABASE_URL -c "\dt"
# Should show: users, sessions, generations
```

### 3. File System

```bash
# Create uploads directory with proper permissions
mkdir -p uploads
chmod 755 uploads

# Verify write permissions
touch uploads/test.txt && rm uploads/test.txt
```

---

## Deployment Steps

### Option A: Direct Node.js (PM2)

```bash
# Install PM2
npm install -g pm2

# Build TypeScript
npm run build

# Start with PM2
pm2 start dist/server/index.js --name "ads-agent" -i max

# Save PM2 config
pm2 save
pm2 startup
```

### Option B: Docker

```dockerfile
# Dockerfile
FROM node:20-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
COPY uploads ./uploads

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "dist/server/index.js"]
```

```bash
# Build and run
docker build -t ads-agent .
docker run -d \
  -p 3000:3000 \
  -e DATABASE_URL=$DATABASE_URL \
  -e GEMINI_API_KEY=$GEMINI_API_KEY \
  -e SESSION_SECRET=$SESSION_SECRET \
  -v $(pwd)/uploads:/app/uploads \
  ads-agent
```

---

## Post-Deployment Verification

### Health Check
```bash
curl http://localhost:3000/api/health
# Expected: {"status":"ok","timestamp":"..."}
```

### Auth Flow Test
```bash
# Register
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"SecurePass123!"}'

# Login (save cookie)
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"SecurePass123!"}' \
  -c cookies.txt

# Test protected endpoint
curl http://localhost:3000/api/auth/me -b cookies.txt
```

### Image Generation Test
```bash
curl -X POST http://localhost:3000/api/transform \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"prompt":"A professional product photo of a laptop"}'

# Expected: {"success":true,"generationId":"...","imageUrl":"/uploads/...","canEdit":true}
```

---

## Security Checklist

- [ ] HTTPS enabled (required for secure cookies)
- [ ] `SESSION_SECRET` is unique and random (64+ chars)
- [ ] `DATABASE_URL` uses SSL in production
- [ ] Firewall blocks direct DB access
- [ ] Rate limiting verified working
- [ ] No `.env` files in deployment
- [ ] `uploads/` not publicly browsable (only specific files)

---

## Monitoring

### Logs
```bash
# PM2 logs
pm2 logs ads-agent

# Docker logs
docker logs -f <container-id>
```

### Key Metrics to Watch
- Response times on `/api/transform` (Gemini can be slow)
- 429 errors (rate limiting triggered)
- 500 errors (check logs for details)
- Disk usage in `uploads/` directory

---

## Rollback Plan

```bash
# PM2
pm2 stop ads-agent
git checkout <previous-commit>
npm run build
pm2 restart ads-agent

# Docker
docker stop <container>
docker run <previous-image-tag>
```

---

## Summary

| Component | Status | Verified |
|-----------|--------|----------|
| Database connection | | [ ] |
| Gemini API key | | [ ] |
| Session secret | | [ ] |
| Uploads directory | | [ ] |
| Health endpoint | | [ ] |
| Auth flow | | [ ] |
| Image generation | | [ ] |
| HTTPS | | [ ] |

**Deploy only when all boxes are checked.**
