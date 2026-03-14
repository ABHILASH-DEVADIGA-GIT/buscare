# BusCare Fleet Management System
## Complete Deployment Package

**Version:** 1.0.0  
**Last Updated:** March 2026

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Project Structure](#project-structure)
3. [System Requirements](#system-requirements)
4. [Quick Start Guide](#quick-start-guide)
5. [Detailed Setup Instructions](#detailed-setup-instructions)
6. [Database Setup](#database-setup)
7. [Backend Setup](#backend-setup)
8. [Frontend Setup](#frontend-setup)
9. [Production Deployment](#production-deployment)
10. [API Documentation](#api-documentation)
11. [File Upload Configuration](#file-upload-configuration)
12. [Test Credentials](#test-credentials)
13. [Troubleshooting](#troubleshooting)

---

## System Overview

BusCare is a multi-tenant SaaS fleet compliance and management platform designed for bus transport companies. 

### Key Features

- **Driver Inspections**: Pre-trip checklists with pass/fail tracking, media capture (image/audio/video)
- **Mechanic Assignments**: Issue assignment and tracking workflow
- **Supervisor Verification**: Quality control for resolved issues
- **Passenger Feedback**: QR-code based feedback collection
- **Compliance Alerts**: Document expiry tracking (Insurance, Permits, etc.)
- **Financial Management**: Collections, expenses, and profit/loss tracking
- **Analytics Dashboards**: Fleet performance overview with charts
- **Multi-language Support**: English and Kannada

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

### Technology Stack

| Component | Technology |
|-----------|------------|
| Frontend | React 18, Tailwind CSS, Shadcn/UI |
| Backend | Python 3.11+, FastAPI, SQLAlchemy |
| Database | MySQL 8.0+ / MariaDB 10.5+ |
| Authentication | JWT (JSON Web Tokens) |
| File Storage | Base64 encoded in database |

---

## Project Structure

```
buscare-deployment/
├── backend/                      # FastAPI Backend
│   ├── server.py                 # Main application entry point
│   ├── models.py                 # Pydantic models for validation
│   ├── database_mysql.py         # SQLAlchemy database configuration
│   ├── auth.py                   # Authentication utilities
│   ├── requirements.txt          # Python dependencies
│   └── .env.example              # Environment variables template
│
├── frontend/                     # React Frontend
│   ├── src/
│   │   ├── components/           # UI components
│   │   │   ├── ui/               # Shadcn/UI components
│   │   │   ├── Layout.js         # Main layout wrapper
│   │   │   └── LanguageSwitcher.js
│   │   ├── pages/                # Page components
│   │   │   ├── LoginPage.js
│   │   │   ├── DashboardPage.js
│   │   │   ├── InspectionPage.js
│   │   │   ├── BusesPage.js
│   │   │   ├── BusMasterPage.js
│   │   │   ├── AlertsPage.js
│   │   │   ├── FeedbackPage.js
│   │   │   ├── PublicFeedbackPage.js
│   │   │   ├── FinancialPage.js
│   │   │   ├── MechanicPage.js
│   │   │   ├── UserMasterPage.js
│   │   │   └── ClientManagementPage.js
│   │   ├── lib/                  # Utilities
│   │   │   ├── api.js            # API service functions
│   │   │   ├── auth.js           # Authentication helpers
│   │   │   ├── translations.js   # Language translations
│   │   │   └── LanguageContext.js
│   │   ├── hooks/                # React hooks
│   │   ├── App.js                # Main React component
│   │   └── index.js              # Entry point
│   ├── public/                   # Static assets
│   ├── package.json              # Node.js dependencies
│   ├── tailwind.config.js        # Tailwind CSS config
│   └── .env.example              # Environment variables template
│
├── database/                     # Database Scripts
│   ├── schema.sql                # Complete database schema
│   └── seed_data.sql             # Demo/seed data
│
├── uploads/                      # File Upload Directory
│   ├── images/                   # Image uploads
│   ├── audio/                    # Audio recordings
│   └── videos/                   # Video recordings
│
├── deployment/                   # Deployment Scripts
│   ├── setup_database.sh         # Database setup script
│   ├── setup_backend.sh          # Backend setup script
│   ├── setup_frontend.sh         # Frontend setup script
│   ├── deploy_production.sh      # Production deployment
│   └── nginx.conf                # Nginx configuration
│
├── docs/                         # Documentation
│   ├── API_DOCUMENTATION.md      # Full API reference
│   └── DEPLOYMENT_GUIDE.md       # Detailed deployment guide
│
└── README.md                     # This file
```

---

## System Requirements

### Minimum Hardware
- **CPU**: 2 cores
- **RAM**: 4GB minimum
- **Storage**: 20GB free space

### Software Requirements

| Software | Minimum Version | Recommended |
|----------|-----------------|-------------|
| Node.js | 18.x | 20.x |
| Python | 3.10 | 3.11+ |
| MySQL/MariaDB | 10.5 | 10.11+ |
| npm | 9.x | 10.x |
| yarn | 1.22 | Latest |

### Operating System Support
- Ubuntu 20.04+ / Debian 11+
- CentOS 8+ / RHEL 8+
- macOS 11+
- Windows 10+ (with WSL2)

---

## Quick Start Guide

### 1. Clone/Extract the Package
```bash
cd /path/to/deployment
unzip buscare-deployment.zip
cd buscare-deployment
```

### 2. Run Setup Scripts
```bash
# Make scripts executable
chmod +x deployment/*.sh

# Setup database
./deployment/setup_database.sh

# Setup backend
./deployment/setup_backend.sh

# Setup frontend
./deployment/setup_frontend.sh
```

### 3. Start Services
```bash
# Terminal 1 - Start Backend
cd backend
source venv/bin/activate
uvicorn server:app --host 0.0.0.0 --port 8001 --reload

# Terminal 2 - Start Frontend
cd frontend
yarn start
```

### 4. Access Application
- Frontend: http://localhost:3000
- Backend API: http://localhost:8001
- API Docs: http://localhost:8001/docs

---

## Detailed Setup Instructions

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

# Install Yarn
npm install -g yarn

# Verify installations
node --version
python3 --version
mysql --version
yarn --version
```

#### macOS (Homebrew)
```bash
brew install node@20 python@3.11 mariadb yarn
brew services start mariadb
```

---

## Database Setup

### Create Database and User
```sql
-- Login as root
mysql -u root -p

-- Create database
CREATE DATABASE buscare CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create user
CREATE USER 'buscare_user'@'localhost' IDENTIFIED BY 'your_secure_password';
GRANT ALL PRIVILEGES ON buscare.* TO 'buscare_user'@'localhost';
FLUSH PRIVILEGES;

-- Exit
EXIT;
```

### Import Schema
```bash
mysql -u buscare_user -p buscare < database/schema.sql
```

### Import Seed Data
```bash
mysql -u buscare_user -p buscare < database/seed_data.sql
```

### Database Tables

| Table | Description |
|-------|-------------|
| `clients` | Multi-tenant client organizations |
| `users` | System users with roles |
| `buses` | Fleet vehicle records |
| `checklist_questions` | Inspection checklist items |
| `inspections` | Inspection records |
| `inspection_details` | Individual inspection responses |
| `feedback` | Passenger feedback entries |
| `alerts` | Compliance alerts and reminders |
| `collections` | Daily revenue collections |
| `expense_master` | Expense categories |
| `expenses` | Daily expenses |
| `alert_configurations` | Client-specific alert settings |

---

## Backend Setup

### 1. Create Virtual Environment
```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # Linux/macOS
# OR
.\venv\Scripts\activate   # Windows
```

### 2. Install Dependencies
```bash
pip install --upgrade pip
pip install -r requirements.txt
```

### 3. Configure Environment
```bash
cp .env.example .env
nano .env  # Edit with your settings
```

**Required Environment Variables:**
```env
MYSQL_URL=mysql+aiomysql://buscare_user:password@localhost/buscare
MYSQL_URL_SYNC=mysql+pymysql://buscare_user:password@localhost/buscare
CORS_ORIGINS=http://localhost:3000
JWT_SECRET=your-secure-secret-key-here
```

### 4. Start Backend
```bash
# Development
uvicorn server:app --host 0.0.0.0 --port 8001 --reload

# Production
uvicorn server:app --host 0.0.0.0 --port 8001 --workers 4
```

---

## Frontend Setup

### 1. Install Dependencies
```bash
cd frontend
yarn install
# OR
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
nano .env
```

**Required Environment Variables:**
```env
REACT_APP_BACKEND_URL=http://localhost:8001
```

### 3. Start Frontend
```bash
# Development
yarn start

# Production Build
yarn build
```

---

## Production Deployment

### Option 1: Using PM2

```bash
# Install PM2 globally
npm install -g pm2

# Run production deployment script
./deployment/deploy_production.sh

# View status
pm2 status

# View logs
pm2 logs

# Restart all services
pm2 restart all
```

### Option 2: Using Systemd

Create service files:

**Backend Service** (`/etc/systemd/system/buscare-backend.service`):
```ini
[Unit]
Description=BusCare Backend API
After=network.target mysql.service

[Service]
User=www-data
WorkingDirectory=/var/www/buscare/backend
ExecStart=/var/www/buscare/backend/venv/bin/uvicorn server:app --host 0.0.0.0 --port 8001
Restart=always

[Install]
WantedBy=multi-user.target
```

### Option 3: Using Docker

```bash
# Build and start containers
docker-compose up -d

# View logs
docker-compose logs -f

# Stop containers
docker-compose down
```

### Nginx Configuration

```bash
# Copy nginx config
sudo cp deployment/nginx.conf /etc/nginx/sites-available/buscare

# Enable site
sudo ln -s /etc/nginx/sites-available/buscare /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx
```

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

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "user_id": "...",
    "email": "admin@demo.com",
    "name": "Admin User",
    "role": "ADMIN"
  }
}
```

### Main API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | User authentication |
| POST | `/api/auth/register` | Register new user |
| GET | `/api/buses` | List buses (client-filtered) |
| POST | `/api/buses` | Create new bus |
| GET | `/api/inspections` | List inspections |
| POST | `/api/inspections` | Create inspection |
| GET | `/api/feedback` | List feedback |
| POST | `/api/feedback` | Submit feedback (public) |
| GET | `/api/alerts` | List alerts |
| POST | `/api/alerts` | Create alert |
| GET | `/api/collections` | List collections |
| POST | `/api/collections` | Add collection |
| GET | `/api/expenses` | List expenses |
| POST | `/api/expenses` | Add expense |
| GET | `/api/dashboard/metrics` | Dashboard metrics |

Full API documentation available at: `/docs/API_DOCUMENTATION.md`

---

## File Upload Configuration

### Storage Structure
```
uploads/
├── images/          # Inspection images, feedback images
├── audio/           # Audio recordings from inspections
└── videos/          # Video recordings from inspections
```

### Configuration
- **Max File Size**: 50MB
- **Allowed Types**: jpg, jpeg, png, gif, mp3, mp4, wav, webm
- **Storage Method**: Base64 encoded in database (LONGTEXT columns)

### Database Columns for Media
- `inspection_details.image_url` - LONGTEXT
- `inspection_details.audio_url` - LONGTEXT
- `inspection_details.video_url` - LONGTEXT
- `feedback.image_url` - LONGTEXT

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

## Troubleshooting

### Database Connection Error
```
Error: Can't connect to MySQL server
```
**Solution:**
```bash
sudo systemctl start mariadb
sudo systemctl status mariadb
```

### CORS Error
```
Access blocked by CORS policy
```
**Solution:** Update `CORS_ORIGINS` in backend `.env`:
```env
CORS_ORIGINS=http://localhost:3000,https://yourdomain.com
```

### Module Not Found
```
ModuleNotFoundError: No module named 'xxx'
```
**Solution:**
```bash
source venv/bin/activate
pip install -r requirements.txt
```

### Port Already in Use
```
Error: Port 8001 is already in use
```
**Solution:**
```bash
lsof -i :8001
kill -9 <PID>
```

### Frontend Build Fails
```
Error: Cannot find module
```
**Solution:**
```bash
rm -rf node_modules
yarn install
```

---

## Support

For issues or questions:
- Check the `/docs` folder for detailed documentation
- Review troubleshooting section above
- Check application logs

---

## License

Copyright © 2026 BSP Tech Solutions. All rights reserved.
