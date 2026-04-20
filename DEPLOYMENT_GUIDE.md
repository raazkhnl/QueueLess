# 🚀 QueueLess Deployment Guide

This guide covers deploying QueueLess in production using Docker (Recommended) or Bare Metal with PM2.

## 1. Prerequisites
- **Linux Server** (Ubuntu 22.04+ recommended)
- **Domain Name** (pointing to your server IP)
- **Docker & Docker Compose** (for Docker method)
- **Node.js 18+ & MongoDB 7.0+ & PM2** (for Bare Metal method)

---

## 2. Option A: Docker Compose Deployment (Recommended)

This Method is the fastest and most reliable, including Nginx reverse proxy and SSL preparation.

### 1. Clone & Setup
```bash
git clone https://github.com/raazkhnl/queueless.git
cd queueless
cp backend/.env.example backend/.env
```

### 2. Configure Environment
Edit `backend/.env` with your production values:
- `MONGO_URI`: Use `mongodb://mongo:27017/queueless` (matches docker service name)
- `JWT_SECRET`: Generate a secure one (`openssl rand -base64 32`)
- `FRONTEND_URL`: Your production domain (e.g., `https://queueless.app`)

### 3. Build and Start
```bash
docker-compose -f docker-compose.prod.yml up -d --build
```

### 4. Setup SSL (Certbot)
1. Edit `nginx/default.conf` to replace `localhost` with your actual domain.
2. Uncomment SSL blocks in `nginx/default.conf`.
3. Obtain certs:
```bash
docker run -it --rm --name certbot \
  -v "$(pwd)/certbot/conf:/etc/letsencrypt" \
  -v "$(pwd)/certbot/www:/var/www/certbot" \
  certbot/certbot certonly --webroot -w /var/www/certbot -d yourdomain.com
```

---

## 3. Option C: Vercel Deployment

This project is structured specifically to support modern serverless deployments via Vercel.

**Steps:**
1. Setup a MongoDB Atlas cluster and whitelist IP `0.0.0.0/0`.
2. Import the `backend` folder as a project in Vercel. 
   - Add `MONGODB_URI` and `JWT_SECRET` environment variables.
3. Import the `frontend` folder as a second project in Vercel.
   - Add the `VITE_API_URL` environment variable pointing to the backend Vercel URL you just deployed.
4. Go back to the Vercel backend project and set `FRONTEND_URL` to your Vercel frontend URL. Redeploy the backend.

Under the hood:
- The backend utilizes `@vercel/node` via `backend/vercel.json` acting as a serverless function proxy instead of a typical Node daemon.
- CORS dynamically supports multiple environments (commas are allowed).
- The frontend `vercel.json` handles React Router SPA rewrite rules so direct links don't return 404s.

---

## 4. Option B: Bare Metal Deployment (Manual)

### 1. Build Frontend
```bash
cd frontend
npm install
npm run build
```

### 2. Setup Backend
```bash
cd backend
npm install --production
cp .env.example .env
# Edit .env with production MongoDB and JWT secrets
```

### 3. Start with PM2
```bash
pm2 start ecosystem.config.cjs --env production
pm2 save
pm2 startup
```

### 4. Configure Nginx
Copy the content from `nginx/default.conf` to your server's Nginx configuration (`/etc/nginx/sites-available/default`) and restart Nginx.
Ensure the `root` path in Nginx points to your `frontend/dist` directory.

---

## 4. Post-Deployment Optimization
- **Indexing**: Database indexes are auto-created on startup, but verify them if you have massive data.
- **Log Rotation**: PM2 and Docker handles basic logs; consider `pm2-logrotate` for bare metal.
- **Backups**: Standardize MongoDB backups (`mongodump`).
- **Monitoring**: Use `pm2 monit` or Docker stats.

## 5. Troubleshooting
- **EADDRINUSE**: Port 80 or 443 is already taken. Stop any existing Nginx/Apache.
- **DB Connection**: Ensure `MONGO_URI` is reachable.
- **Rate Limits**: If users get 429 errors behind a proxy, ensure `app.set('trust proxy', 1)` is in `server.js` (Already implemented).
