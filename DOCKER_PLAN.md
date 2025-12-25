# Dockerization Implementation Plan

## Goal
Containerize the Automated Ads Agent application to ensure a consistent, production-ready environment that runs regardless of the host OS (bypassing current Windows build issues).

## Architecture
We will use a **Multi-Stage Docker Setup**:
1.  **Build Stage**: install dependencies and compile the TypeScript application (Frontend + Backend).
2.  **Runtime Stage**: A lightweight Node.js image running the optimized production build.

## Detailed Steps

### 1. Preparation & Configuration
- [ ] **Create `.dockerignore`**: Exclude `node_modules`, `.git`, `coverage`, and other unnecessary files to speed up build context.
- [ ] **Create `Dockerfile`**:
    - Base: `node:20-alpine`
    - Workdir: `/app`
    - Dependency Installation: Copy `package.json` & `package-lock.json`, run `npm ci` (or `npm install`).
    - Build: Run `npm run build` (Vite + Esbuild).
    - Runtime: Start with fresh image, copy `dist` and `node_modules`, set command to `npm start`.

### 2. Docker Compose Integration
- [ ] **Update `docker-compose.yml`**:
    - Add `app` service.
    - Map ports (`5000` for app).
    - Link to `postgres` and `redis` services.
    - Set environment variables (`DATABASE_URL`, `REDIS_URL`, `PORT`).

### 3. Verification
- [ ] **Build Containers**: `docker-compose build`
- [ ] **Start Stack**: `docker-compose up`
- [ ] **Functional Check**: Access `http://localhost:5000`, verify storage connection, verify database connection.

## Rollback Plan
If Dockerization fails, we will revert to debugging the local Windows environment or configuring a Replit environment directly.
