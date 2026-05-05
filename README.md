# booking-app-demo-2025

## Backend: PostgreSQL + Prisma

The backend has been migrated from SQLite to PostgreSQL using Prisma ORM.

### Setup

1. Copy `.env.example` to `.env`:
   ```bash
   cd backend
   cp .env.example .env
   ```
2. Update `DATABASE_URL` in `backend/.env` with your PostgreSQL credentials.
3. Install backend dependencies:
   ```bash
   npm install
   ```
4. Start the local PostgreSQL container:
   ```bash
   cd backend
   docker compose up -d
   ```
5. Generate the Prisma client:
   ```bash
   npx prisma generate
   ```
6. Run migrations:
   ```bash
   npx prisma migrate dev --name init
   ```
7. Start the backend:
   ```bash
   npm run dev
   ```

### Notes

- Default `JWT_SECRET` is set in `.env`.
- The local PostgreSQL connection string in `.env` is a placeholder and must be updated to match your environment.
- The old `bookings.db` SQLite file has been removed.

## GitHub Self-hosted Runner

This repository can run on a GitHub self-hosted runner. Follow these steps to set it up and test it.

### 1. เตรียมเครื่อง self-hosted runner

1. เลือกเครื่องที่จะใช้เป็น runner (Linux/macOS/Windows).
2. ติดตั้ง Git และ Node.js.
3. ถ้าจะใช้ Docker ให้ติดตั้ง Docker ด้วย.

### 2. สร้าง runner ใน GitHub

1. ไปที่ GitHub repository ของคุณ.
2. เลือก `Settings` > `Actions` > `Runners`.
3. คลิก `New self-hosted runner`.
4. เลือกระบบปฏิบัติการที่ใช้งาน.
5. คัดลอกคำสั่ง `config` และ `run` ที่ GitHub ให้มา.

### 3. ติดตั้ง runner บนเครื่อง

ตัวอย่างบน Linux / macOS:

```bash
mkdir actions-runner && cd actions-runner
curl -o actions-runner.tar.gz -L https://github.com/actions/runner/releases/download/v2.308.0/actions-runner-linux-x64-2.308.0.tar.gz
tar xzf actions-runner.tar.gz
./config.sh --url https://github.com/<owner>/<repo> --token <TOKEN>
```

บน Windows:

```powershell
mkdir actions-runner
cd actions-runner
Invoke-WebRequest -Uri https://github.com/actions/runner/releases/download/v2.308.0/actions-runner-win-x64-2.308.0.zip -OutFile actions-runner.zip
Expand-Archive actions-runner.zip
.\\config.cmd --url https://github.com/<owner>/<repo> --token <TOKEN>
```

### 4. เริ่ม runner

- Linux/macOS:
  ```bash
  ./run.sh
  ```
- Windows:
  ```powershell
  .\run.cmd
  ```

ถ้าต้องการให้เป็น service บน Linux/macOS:

```bash
sudo ./svc.sh install
sudo ./svc.sh start
```

### 5. สร้าง workflow ให้ใช้ self-hosted runner

สร้างไฟล์ `.github/workflows/ci.yml` ใน repository:

```yaml
name: CI

on:
  push:
    branches: [ main ]
  pull_request:

jobs:
  build:
    runs-on: self-hosted
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      - name: Install backend dependencies
        run: |
          cd backend
          npm install
      - name: Start PostgreSQL with Docker Compose
        run: |
          cd backend
          docker compose up -d
      - name: Generate Prisma client
        run: |
          cd backend
          npx prisma generate
      - name: Run backend migrations
        run: |
          cd backend
          npx prisma migrate dev --name init
      - name: Install frontend dependencies
        run: |
          cd frontend
          npm install
      - name: Build frontend
        run: |
          cd frontend
          npm run build
```

> ตัวอย่าง workflow นี้อยู่ที่ `.github/workflows/ci.yml`

### 6. ทดสอบ workflow

1. เพิ่มไฟล์ workflow แล้ว commit และ push ขึ้น GitHub.
2. เข้า `Actions` ใน repository ดูสถานะ workflow.
3. ถ้า runner ทำงานได้สำเร็จ แสดงว่า setup ถูกต้อง.

> หมายเหตุ: ถ้าใช้ Docker ใน runner ให้ตรวจสอบว่า Docker service ทำงานได้บนเครื่อง self-hosted.

## CI/CD Deployment

This repository supports CI/CD deployment with frontend on Vercel and backend on cloud platforms.

### Frontend Deployment on Vercel

1. **Connect Repository to Vercel**:
   - Sign up/login to [Vercel](https://vercel.com)
   - Click "New Project" and import your GitHub repository
   - Select the repository and configure:

2. **Vercel Configuration**:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

3. **Environment Variables**:
   Add these environment variables in Vercel dashboard:
   ```
   VITE_API_URL=https://your-backend-domain.com
   ```

4. **Deploy**:
   - Vercel will automatically deploy on every push to `main` branch
   - Get the frontend URL from Vercel dashboard

### Backend Deployment Options

Choose one of the following platforms for backend deployment:

#### Option 1: Render

1. **Create Render Account**:
   - Sign up at [Render](https://render.com)

2. **Create PostgreSQL Database**:
   - Go to Dashboard > New > PostgreSQL
   - Create database and note the connection string

3. **Deploy Backend**:
   - New > Web Service
   - Connect GitHub repository
   - Configure:
     - **Runtime**: Node
     - **Build Command**: `npm install && npx prisma generate`
     - **Start Command**: `npm start`
     - **Root Directory**: `backend`

4. **Environment Variables**:
   ```
   DATABASE_URL=postgresql://user:password@host:5432/database
   JWT_SECRET=your-secret-key
   NODE_ENV=production
   ```

#### Option 2: Railway

1. **Create Railway Account**:
   - Sign up at [Railway.app](https://railway.app)

2. **Create Project**:
   - New Project > Deploy from GitHub
   - Select repository

3. **Database Setup**:
   - Add PostgreSQL plugin
   - Railway will provide `DATABASE_URL` automatically

4. **Environment Variables**:
   ```
   JWT_SECRET=your-secret-key
   NODE_ENV=production
   ```

#### Option 3: Digital Ocean App Platform

1. **Create Digital Ocean Account**:
   - Sign up at [Digital Ocean](https://digitalocean.com)

2. **Create App**:
   - Apps > Create App
   - Connect GitHub repository
   - **Source Directory**: `backend`

3. **Database Setup**:
   - Create PostgreSQL database in Digital Ocean
   - Add database connection string

4. **Environment Variables**:
   ```
   DATABASE_URL=postgresql://user:password@host:5432/database
   JWT_SECRET=your-secret-key
   NODE_ENV=production
   ```

### Nginx Reverse Proxy Configuration

For production deployment with custom domain, use Nginx as reverse proxy:

1. **Install Nginx**:
   ```bash
   sudo apt update
   sudo apt install nginx
   ```

2. **Create Nginx Configuration**:
   Create `/etc/nginx/sites-available/booking-app`:

   ```nginx
   server {
       listen 80;
       server_name your-domain.com;

       # Frontend (served by Vercel or static files)
       location / {
           proxy_pass https://your-vercel-app.vercel.app;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }

       # Backend API
       location /api/ {
           proxy_pass http://localhost:3001;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;

           # CORS headers
           add_header 'Access-Control-Allow-Origin' 'https://your-vercel-app.vercel.app' always;
           add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
           add_header 'Access-Control-Allow-Headers' 'Authorization, Content-Type' always;

           if ($request_method = 'OPTIONS') {
               return 204;
           }
       }
   }
   ```

3. **Enable Site**:
   ```bash
   sudo ln -s /etc/nginx/sites-available/booking-app /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl reload nginx
   ```

4. **SSL with Let's Encrypt** (optional):
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d your-domain.com
   ```

### Environment Variables Configuration

#### Frontend (.env.local for local development):
```
VITE_API_URL=http://localhost:3001
```

#### Frontend (Vercel environment variables):
```
VITE_API_URL=https://your-backend-domain.com
```

#### Backend (.env for all environments):
```
DATABASE_URL=postgresql://user:password@host:5432/database
JWT_SECRET=your-secure-jwt-secret
NODE_ENV=production
```

### Deployment Checklist

- [ ] Frontend deployed on Vercel
- [ ] Backend deployed on chosen platform (Render/Railway/Digital Ocean)
- [ ] Database configured and migrated
- [ ] Environment variables set correctly
- [ ] Nginx reverse proxy configured (if using custom domain)
- [ ] SSL certificate configured
- [ ] Test API endpoints from frontend
- [ ] Verify CORS configuration

