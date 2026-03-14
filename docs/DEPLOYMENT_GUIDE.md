# BusCare - Fleet Compliance & Management Platform
# Complete Deployment Guide

## Table of Contents
1. [System Overview](#system-overview)
2. [System Requirements](#system-requirements)
3. [Quick Start](#quick-start)
4. [Detailed Installation](#detailed-installation)
5. [Database Setup](#database-setup)
6. [Backend Setup](#backend-setup)
7. [Frontend Setup](#frontend-setup)
8. [Production Deployment](#production-deployment)
9. [Configuration Reference](#configuration-reference)
10. [API Documentation](#api-documentation)
11. [Troubleshooting](#troubleshooting)
12. [Test Credentials](#test-credentials)

---

## System Overview

BusCare is a multi-tenant SaaS fleet compliance and management platform designed for bus transport companies. It provides comprehensive tools for:

- **Driver Inspections**: Pre-trip checklists with pass/fail tracking
- **Mechanic Assignments**: Issue assignment and tracking workflow
- **Supervisor Verification**: Quality control for resolved issues
- **Passenger Feedback**: QR-code based feedback collection
- **Compliance Alerts**: Document expiry tracking (Insurance, Permits, etc.)
- **Financial Management**: Collections, expenses, and profit/loss tracking
- **Analytics Dashboards**: Fleet performance overview with charts

### Architecture
```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│    Frontend     │────▶│    Backend      │────▶│    MySQL DB     │
│    (React)      │     │    (FastAPI)    │     │   (MariaDB)     │
│    Port: 3000   │     │    Port: 8001   │     │   Port: 3306    │
│                 │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

---

## System Requirements

### Minimum Requirements
- **OS**: Ubuntu 20.04+ / Debian 11+ / CentOS 8+ / Windows 10+ / macOS 11+
- **RAM**: 2GB minimum, 4GB recommended
- **Storage**: 10GB free space
- **CPU**: 2 cores minimum

### Software Dependencies
- **Node.js**: v18.x or higher
- **Python**: 3.10 or higher
- **MySQL/MariaDB**: 10.5 or higher
- **npm/yarn**: Latest stable version
- **pip**: Latest stable version

---

## Quick Start

### For Development (5 minutes setup)

```bash
# 1. Clone the repository
git clone <repository-url>
cd buscare

# 2. Install and start MySQL/MariaDB
# Ubuntu/Debian:
sudo apt-get update && sudo apt-get install -y mariadb-server
sudo systemctl start mariadb
sudo systemctl enable mariadb

# 3. Setup database
mysql -u root -e "CREATE DATABASE buscare CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -u root -e "CREATE USER 'buscare_user'@'localhost' IDENTIFIED BY 'buscare_pass_123';"
mysql -u root -e "GRANT ALL PRIVILEGES ON buscare.* TO 'buscare_user'@'localhost';"
mysql -u root -e "FLUSH PRIVILEGES;"

# 4. Setup Backend
cd backend
cp .env.example .env
pip install -r requirements.txt
uvicorn server:app --host 0.0.0.0 --port 8001 --reload &

# 5. Setup Frontend (new terminal)
cd frontend
cp .env.example .env
yarn install
yarn start
```

Open http://localhost:3000 and login with demo credentials.

---

## Detailed Installation

### Step 1: Install System Dependencies

#### Ubuntu/Debian
```bash
# Update system
sudo apt-get update && sudo apt-get upgrade -y

# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Python 3.11
sudo apt-get install -y python3.11 python3.11-venv python3-pip

# Install MariaDB
sudo apt-get install -y mariadb-server mariadb-client

# Install additional tools
sudo apt-get install -y git curl wget build-essential

# Install Yarn
npm install -g yarn
```

#### macOS (using Homebrew)
```bash
# Install Homebrew if not installed
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install dependencies
brew install node@20 python@3.11 mariadb yarn git

# Start MariaDB
brew services start mariadb
```

#### Windows
```powershell
# Using winget (Windows Package Manager)
winget install OpenJS.NodeJS.LTS
winget install Python.Python.3.11
winget install MariaDB.Server

# Or download installers from:
# - Node.js: https://nodejs.org/
# - Python: https://www.python.org/downloads/
# - MariaDB: https://mariadb.org/download/
```

### Step 2: Verify Installations
```bash
node --version    # Should be v18.x or higher
python3 --version # Should be 3.10 or higher
mysql --version   # Should be 10.5 or higher
yarn --version    # Should be 1.22 or higher
```

---

## Database Setup

### Step 1: Secure MySQL Installation (Production)
```bash
sudo mysql_secure_installation
# Follow prompts to:
# - Set root password
# - Remove anonymous users
# - Disallow root login remotely
# - Remove test database
```

### Step 2: Create Database and User
```bash
# Login as root
sudo mysql -u root -p

# Execute these SQL commands:
CREATE DATABASE buscare CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'buscare_user'@'localhost' IDENTIFIED BY 'YOUR_SECURE_PASSWORD';
GRANT ALL PRIVILEGES ON buscare.* TO 'buscare_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### Step 3: Import Schema
```bash
mysql -u buscare_user -p buscare < database/schema.sql
```

### Step 4: Import Seed Data
```bash
mysql -u buscare_user -p buscare < database/seed_data.sql
```

### Step 5: Verify Database Setup
```bash
mysql -u buscare_user -p -e "USE buscare; SHOW TABLES;"
```

Expected output should show all tables:
- clients
- users
- buses
- checklist_questions
- inspections
- inspection_details
- feedback
- alerts
- collections
- expense_master
- expenses
- alert_configurations
- notification_logs

---

## Backend Setup

### Step 1: Navigate to Backend Directory
```bash
cd backend
```

### Step 2: Create Virtual Environment (Recommended)
```bash
python3 -m venv venv
source venv/bin/activate  # Linux/macOS
# OR
.\venv\Scripts\activate   # Windows
```

### Step 3: Install Python Dependencies
```bash
pip install --upgrade pip
pip install -r requirements.txt
```

### Step 4: Configure Environment Variables
```bash
cp .env.example .env
```

Edit `.env` file:
```env
# Database Configuration
MYSQL_URL=mysql+aiomysql://buscare_user:YOUR_PASSWORD@localhost/buscare
MYSQL_URL_SYNC=mysql+pymysql://buscare_user:YOUR_PASSWORD@localhost/buscare

# MongoDB (Legacy - can be ignored if not using)
MONGO_URL=mongodb://localhost:27017
DB_NAME=buscare

# CORS Configuration
CORS_ORIGINS=http://localhost:3000,https://yourdomain.com

# JWT Secret (Generate a secure random string)
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# Server Configuration
HOST=0.0.0.0
PORT=8001
```

### Step 5: Run Backend Server

#### Development Mode
```bash
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

#### Production Mode
```bash
uvicorn server:app --host 0.0.0.0 --port 8001 --workers 4
```

### Step 6: Verify Backend
```bash
curl http://localhost:8001/api/health
```

Expected response:
```json
{"status": "healthy", "database": "mysql"}
```

### Step 7: Seed Demo Data (if not done via SQL)
```bash
curl -X POST http://localhost:8001/api/seed
```

---

## Frontend Setup

### Step 1: Navigate to Frontend Directory
```bash
cd frontend
```

### Step 2: Install Dependencies
```bash
yarn install
# OR
npm install
```

### Step 3: Configure Environment Variables
```bash
cp .env.example .env
```

Edit `.env` file:
```env
REACT_APP_BACKEND_URL=http://localhost:8001
```

### Step 4: Run Frontend Server

#### Development Mode
```bash
yarn start
# OR
npm start
```

#### Production Build
```bash
yarn build
# OR
npm run build
```

### Step 5: Verify Frontend
Open http://localhost:3000 in your browser.

---

## Production Deployment

### Option 1: Docker Deployment (Recommended)

Create `docker-compose.yml`:
```yaml
version: '3.8'

services:
  db:
    image: mariadb:10.11
    container_name: buscare-db
    restart: always
    environment:
      MYSQL_ROOT_PASSWORD: root_password_change_me
      MYSQL_DATABASE: buscare
      MYSQL_USER: buscare_user
      MYSQL_PASSWORD: buscare_pass_change_me
    volumes:
      - db_data:/var/lib/mysql
      - ./database/schema.sql:/docker-entrypoint-initdb.d/01-schema.sql
      - ./database/seed_data.sql:/docker-entrypoint-initdb.d/02-seed.sql
    ports:
      - "3306:3306"
    healthcheck:
      test: ["CMD", "healthcheck.sh", "--connect", "--innodb_initialized"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: buscare-backend
    restart: always
    depends_on:
      db:
        condition: service_healthy
    environment:
      MYSQL_URL: mysql+aiomysql://buscare_user:buscare_pass_change_me@db/buscare
      MYSQL_URL_SYNC: mysql+pymysql://buscare_user:buscare_pass_change_me@db/buscare
      CORS_ORIGINS: "*"
      JWT_SECRET: your-production-jwt-secret
    ports:
      - "8001:8001"

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: buscare-frontend
    restart: always
    depends_on:
      - backend
    environment:
      REACT_APP_BACKEND_URL: http://your-domain.com
    ports:
      - "3000:3000"

volumes:
  db_data:
```

Deploy with:
```bash
docker-compose up -d
```

### Option 2: Manual Server Deployment

#### Using Nginx as Reverse Proxy

Install Nginx:
```bash
sudo apt-get install nginx
```

Create `/etc/nginx/sites-available/buscare`:
```nginx
server {
    listen 80;
    server_name yourdomain.com;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:8001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable site:
```bash
sudo ln -s /etc/nginx/sites-available/buscare /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### Using PM2 for Process Management

Install PM2:
```bash
npm install -g pm2
```

Create `ecosystem.config.js`:
```javascript
module.exports = {
  apps: [
    {
      name: 'buscare-backend',
      cwd: './backend',
      script: 'uvicorn',
      args: 'server:app --host 0.0.0.0 --port 8001',
      interpreter: 'python3',
      env: {
        MYSQL_URL: 'mysql+aiomysql://buscare_user:password@localhost/buscare',
        CORS_ORIGINS: 'https://yourdomain.com'
      }
    },
    {
      name: 'buscare-frontend',
      cwd: './frontend',
      script: 'serve',
      args: '-s build -l 3000',
      env: {
        REACT_APP_BACKEND_URL: 'https://yourdomain.com'
      }
    }
  ]
};
```

Start with PM2:
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### Option 3: Cloud Deployment

#### AWS (Elastic Beanstalk)
1. Package application
2. Create Elastic Beanstalk environment
3. Configure RDS for MySQL
4. Deploy using EB CLI

#### Google Cloud (Cloud Run)
1. Build Docker images
2. Push to Container Registry
3. Deploy to Cloud Run
4. Configure Cloud SQL for MySQL

#### Heroku
1. Create Heroku apps for backend and frontend
2. Add JawsDB MySQL addon
3. Configure environment variables
4. Deploy via Git

---

## Configuration Reference

### Backend Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `MYSQL_URL` | Async MySQL connection string | Yes | - |
| `MYSQL_URL_SYNC` | Sync MySQL connection string | Yes | - |
| `CORS_ORIGINS` | Allowed CORS origins | Yes | `*` |
| `JWT_SECRET` | Secret for JWT tokens | Yes | - |
| `HOST` | Server host | No | `0.0.0.0` |
| `PORT` | Server port | No | `8001` |

### Frontend Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `REACT_APP_BACKEND_URL` | Backend API URL | Yes | - |

---

## API Documentation

### Authentication

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "client_id": "demo-client-001",
  "email": "admin@demo.com",
  "password": "admin123"
}
```

Response:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "user_id": "...",
    "email": "admin@demo.com",
    "name": "Admin User",
    "role": "ADMIN",
    "client_id": "demo-client-001"
  },
  "client": {
    "client_id": "demo-client-001",
    "company_name": "Demo Transport Company"
  }
}
```

### Buses

#### List Buses
```http
GET /api/buses
Authorization: Bearer <token>
```

#### Create Bus
```http
POST /api/buses
Authorization: Bearer <token>
Content-Type: application/json

{
  "bus_number": "KA-01-AB-1234",
  "registration_number": "KA01AB1234",
  "model": "Ashok Leyland",
  "capacity": 50,
  "client_id": "demo-client-001"
}
```

### Inspections

#### Create Inspection
```http
POST /api/inspections
Authorization: Bearer <token>
Content-Type: application/json

{
  "bus_id": "...",
  "driver_id": "...",
  "client_id": "demo-client-001",
  "details": [
    {
      "question_id": "...",
      "question_text": "Check tire pressure",
      "question_type": "PASS_FAIL",
      "answer": "Pass"
    }
  ]
}
```

### Feedback (Public - No Auth Required)

#### Submit Feedback
```http
POST /api/feedback
Content-Type: application/json

{
  "bus_id": "...",
  "client_id": "demo-client-001",
  "description": "Great service!",
  "want_update": true,
  "email": "passenger@email.com"
}
```

### Financial

#### Add Collection
```http
POST /api/collections
Authorization: Bearer <token>
Content-Type: application/json

{
  "bus_id": "...",
  "date": "2026-03-07",
  "collected_amount": 5000.00,
  "notes": "Morning trip",
  "client_id": "demo-client-001",
  "created_by": "..."
}
```

#### Add Expense
```http
POST /api/expenses
Authorization: Bearer <token>
Content-Type: application/json

{
  "bus_id": "...",
  "date": "2026-03-07",
  "expense_id": "...",
  "amount": 1000.00,
  "notes": "Fuel expense",
  "client_id": "demo-client-001",
  "created_by": "..."
}
```

### Dashboard

#### Get Metrics
```http
GET /api/dashboard/metrics?start_date=2026-03-01&end_date=2026-03-07&bus_id=all
Authorization: Bearer <token>
```

### Full API Reference
For complete API documentation, see `/docs/API_DOCUMENTATION.md`

---

## Troubleshooting

### Common Issues

#### 1. Database Connection Error
```
Error: Can't connect to MySQL server on 'localhost'
```
**Solution:**
```bash
# Check if MySQL is running
sudo systemctl status mariadb

# Start MySQL if stopped
sudo systemctl start mariadb

# Check credentials in .env file
```

#### 2. CORS Error
```
Access to XMLHttpRequest blocked by CORS policy
```
**Solution:**
- Update `CORS_ORIGINS` in backend `.env`
- Ensure frontend URL is included

#### 3. Module Not Found
```
ModuleNotFoundError: No module named 'xxx'
```
**Solution:**
```bash
pip install -r requirements.txt
```

#### 4. Port Already in Use
```
Error: Port 8001 is already in use
```
**Solution:**
```bash
# Find process using port
lsof -i :8001

# Kill the process
kill -9 <PID>
```

#### 5. Frontend Build Fails
```
Error: Cannot find module 'xxx'
```
**Solution:**
```bash
rm -rf node_modules
yarn install
```

### Logs Location
- Backend logs: Check console output or configure logging
- Frontend logs: Browser developer console
- Database logs: `/var/log/mysql/` or `/var/log/mariadb/`

---

## Test Credentials

| Role | Client ID | Email | Password |
|------|-----------|-------|----------|
| Platform Admin | demo-client-001 | platform@admin.com | platform123 |
| Admin | demo-client-001 | admin@demo.com | admin123 |
| Supervisor | demo-client-001 | supervisor@demo.com | super123 |
| Driver | demo-client-001 | driver@demo.com | driver123 |
| Mechanic | demo-client-001 | mechanic@demo.com | mech123 |

---

## Support

For issues or questions:
- Create an issue in the repository
- Contact: support@buscare.com

---

## License

Copyright © 2026 BusCare. All rights reserved.
