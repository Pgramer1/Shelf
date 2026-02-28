# Shelf — Deployment Guide

Full deployment guide for the Shelf media tracking app using:
- **Railway** — Spring Boot backend + PostgreSQL (free tier)
- **Vercel** — React/Vite frontend (free tier)

## Architecture

```
Browser
  │
  ├─ https://shelf.vercel.app  (Vercel — static React/Nginx)
  │     │  VITE_API_URL points to Railway backend
  │     │
  └─ https://shelf-backend.up.railway.app  (Railway — Spring Boot)
         │
         └─ PostgreSQL (Railway managed database)
```

---

## Phase 1 — Docker (Local Testing)

Done. Verify everything works locally before deploying:

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running

### Steps

**1. Copy and fill in the env template:**
```bash
cp .env.docker.example .env.docker
```
Edit `.env.docker` with your real values (DB password, Google OAuth credentials, API keys, JWT secret).

**Generate a JWT secret (PowerShell):**
```powershell
[Convert]::ToBase64String((1..64 | ForEach-Object { [byte](Get-Random -Maximum 256) }))
```

**2. Build and start all services:**
```bash
docker compose --env-file .env.docker up --build
```

**3. Open the app:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:8080/api
- H2 Console (if using H2): http://localhost:8080/api/h2-console

**4. Stop everything:**
```bash
docker compose down
```
To also delete the database volume:
```bash
docker compose down -v
```

---

## Phase 2 — Deploy Backend + Database to Railway

### Prerequisites
- [Railway account](https://railway.app) (sign up with GitHub)
- GitHub repo connected

### Steps

**1. Create a new Railway project**
- Go to https://railway.app/new
- Click **"Deploy from GitHub repo"**
- Select the `Shelf` repository

**2. Add a PostgreSQL database service**
- Inside the project, click **"+ New Service"** → **"Database"** → **"PostgreSQL"**
- Railway will provision a Postgres instance and auto-set `DATABASE_URL`

**3. Configure the backend service**
- Click the service Railway created from your repo
- Go to **Settings** → **Build**:
  - Set **Root Directory** to: `backend`
  - Set **Builder** to: `Dockerfile`
  - Set **Dockerfile Path** to: `Dockerfile`
- Go to **Settings** → **Deploy**:
  - Set **Start Command** (leave empty — Dockerfile ENTRYPOINT handles it)
  - Set **Port** to: `8080`

**4. Set environment variables**

Go to the backend service → **Variables** tab → add each one:

| Variable | Value |
|---|---|
| `DB_URL` | Copy from PostgreSQL service's `DATABASE_URL` (change `postgresql://` → `jdbc:postgresql://`) |
| `DB_USERNAME` | From PostgreSQL service variables |
| `DB_PASSWORD` | From PostgreSQL service variables |
| `JWT_SECRET` | Your generated base64 secret |
| `GOOGLE_CLIENT_ID` | From Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | From Google Cloud Console |
| `OAUTH2_REDIRECT_URI` | `https://YOUR-VERCEL-URL.vercel.app/oauth/callback` (update after Phase 3) |
| `CORS_ALLOWED_ORIGINS` | `https://YOUR-VERCEL-URL.vercel.app` (update after Phase 3) |
| `SPRING_PROFILES_ACTIVE` | `prod` |

> **Tip:** In Railway, go to the PostgreSQL service → **Variables** → copy the individual `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER`, `PGPASSWORD` values to build the JDBC URL:
> `jdbc:postgresql://PGHOST:PGPORT/PGDATABASE`

**5. Deploy**
- Click **Deploy** — Railway will build the Docker image and start the container
- Watch the logs in the **Deploy** tab
- Once live, Railway gives you a URL like `https://shelf-backend-production.up.railway.app`
- Test it: `https://YOUR-RAILWAY-URL.up.railway.app/api/auth/health` (or any public endpoint)

---

## Phase 3 — Deploy Frontend to Vercel

### Prerequisites
- [Vercel account](https://vercel.com) (sign up with GitHub)

### Steps

**1. Import the project**
- Go to https://vercel.com/new
- Click **"Import Git Repository"** → select `Shelf`
- Set **Root Directory** to: `frontend`
- Vercel auto-detects Vite — confirm:
  - **Build Command**: `npm run build`
  - **Output Directory**: `dist`

**2. Set environment variables**

In the Vercel project → **Settings** → **Environment Variables**:

| Variable | Value |
|---|---|
| `VITE_API_URL` | `https://YOUR-RAILWAY-URL.up.railway.app/api` |
| `VITE_TMDB_API_KEY` | Your TMDB API key |
| `VITE_RAWG_API_KEY` | Your RAWG API key |

**3. Deploy**
- Click **Deploy**
- Vercel builds the static files and deploys to a CDN
- You get a URL like `https://shelf-abc123.vercel.app`

> **Optional:** Add a custom domain in Vercel → **Settings** → **Domains**

---

## Phase 4 — Wire Frontend ↔ Backend

After both are live you need to update cross-origin settings.

### 1. Update Railway backend env vars

Back in Railway → your backend service → **Variables**:

| Variable | New Value |
|---|---|
| `CORS_ALLOWED_ORIGINS` | `https://YOUR-APP.vercel.app` |
| `OAUTH2_REDIRECT_URI` | `https://YOUR-APP.vercel.app/oauth/callback` |

Click **Deploy** to redeploy with the new values.

### 2. Update Google OAuth2 redirect URIs

- Go to [Google Cloud Console](https://console.cloud.google.com/) → **APIs & Services** → **Credentials**
- Click your OAuth 2.0 Client ID
- Under **Authorized redirect URIs**, add:
  ```
  https://YOUR-RAILWAY-URL.up.railway.app/api/login/oauth2/code/google
  ```
- Under **Authorized JavaScript origins**, add:
  ```
  https://YOUR-APP.vercel.app
  ```
- Click **Save**

### 3. Redeploy both services

- In Railway: trigger a redeploy from the **Deploy** tab
- In Vercel: the `VITE_API_URL` is baked in at build time, so go to **Deployments** → **Redeploy**

---

## Phase 5 — Ongoing: Auto-Deploy on Push

Both platforms auto-deploy when you push to `main`:

- **Railway**: watches the GitHub repo — any push to `main` triggers a new backend build
- **Vercel**: watches the GitHub repo — any push to `main` triggers a new frontend build

### Custom domain (optional)

**Vercel:**
1. Go to project → **Settings** → **Domains** → add your domain
2. Update DNS with the CNAME Vercel gives you

**Railway:**
1. Go to backend service → **Settings** → **Networking** → **Custom Domain**
2. Add domain and update DNS

---

## Environment Variables Reference

### Backend (Railway)

| Variable | Description | Example |
|---|---|---|
| `DB_URL` | JDBC connection URL | `jdbc:postgresql://host:5432/dbname` |
| `DB_USERNAME` | PostgreSQL username | `postgres` |
| `DB_PASSWORD` | PostgreSQL password | `strong_password` |
| `JWT_SECRET` | Base64 min-256-bit key | `vD+Y36X...==` |
| `GOOGLE_CLIENT_ID` | Google OAuth2 client ID | `123456.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | Google OAuth2 client secret | `GOCSPX-...` |
| `OAUTH2_REDIRECT_URI` | OAuth2 callback URL | `https://app.vercel.app/oauth/callback` |
| `CORS_ALLOWED_ORIGINS` | Comma-separated allowed origins | `https://app.vercel.app` |

### Frontend (Vercel)

| Variable | Description | Example |
|---|---|---|
| `VITE_API_URL` | Backend base URL | `https://backend.up.railway.app/api` |
| `VITE_TMDB_API_KEY` | TMDB API key | `e9203ccc...` |
| `VITE_RAWG_API_KEY` | RAWG API key | `a3030c9c...` |

---

## Local Development (without Docker)

```bash
# Terminal 1 — Backend (requires PostgreSQL on localhost:5433)
cd backend
./mvnw spring-boot:run

# Terminal 2 — Frontend
cd frontend
npm install
npm run dev        # http://localhost:3000
```

---

## Troubleshooting

### Backend fails to start on Railway
- Check the **Deploy logs** in Railway
- Most common cause: `DB_URL` is wrong — make sure it uses `jdbc:postgresql://` not `postgresql://`
- Verify all required env vars are set (Railway shows missing vars as warnings)

### CORS errors in browser
- Ensure `CORS_ALLOWED_ORIGINS` on Railway exactly matches the Vercel URL (no trailing slash)
- After updating, trigger a redeploy in Railway

### OAuth2 login fails
- Verify `OAUTH2_REDIRECT_URI` matches what's registered in Google Cloud Console exactly
- Google Console URIs are case-sensitive and must include the full path

### Vercel build fails
- Check that all `VITE_*` env vars are set in Vercel project settings
- Env vars are baked in at build time — changing them requires a redeploy

### Railway restarts in a loop
- Free tier has a 512 MB RAM limit — Spring Boot uses ~300 MB, should be fine
- Check logs for `OutOfMemoryError`; if present, add: `JAVA_TOOL_OPTIONS=-Xmx400m` as a Railway env var
