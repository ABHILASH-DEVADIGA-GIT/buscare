#!/bin/bash

# ===========================================
# BusCare Fleet Management System
# Production Deployment Script
# ===========================================

set -e

echo "=========================================="
echo "BusCare Production Deployment"
echo "=========================================="

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

PROJECT_DIR="$(dirname "$0")/.."
cd "$PROJECT_DIR"

# ========================================
# STEP 1: Install PM2 if not installed
# ========================================
echo ""
echo "Step 1: Checking PM2 installation..."
if ! command -v pm2 &> /dev/null; then
    echo "Installing PM2 globally..."
    npm install -g pm2
fi
print_success "PM2 is installed"

# ========================================
# STEP 2: Setup Backend
# ========================================
echo ""
echo "Step 2: Setting up Backend..."
cd backend

# Activate virtual environment
if [ -d "venv" ]; then
    source venv/bin/activate
else
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
fi
print_success "Backend environment ready"

cd ..

# ========================================
# STEP 3: Build Frontend for Production
# ========================================
echo ""
echo "Step 3: Building Frontend for Production..."
cd frontend

if command -v yarn &> /dev/null; then
    yarn build
else
    npm run build
fi
print_success "Frontend production build completed"

cd ..

# ========================================
# STEP 4: Create PM2 Ecosystem File
# ========================================
echo ""
echo "Step 4: Creating PM2 ecosystem configuration..."

cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'buscare-backend',
      cwd: './backend',
      script: 'venv/bin/uvicorn',
      args: 'server:app --host 0.0.0.0 --port 8001',
      interpreter: 'none',
      env: {
        NODE_ENV: 'production'
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: './logs/backend-error.log',
      out_file: './logs/backend-out.log',
    },
    {
      name: 'buscare-frontend',
      cwd: './frontend',
      script: 'node_modules/.bin/serve',
      args: '-s build -l 3000',
      interpreter: 'none',
      env: {
        NODE_ENV: 'production'
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: './logs/frontend-error.log',
      out_file: './logs/frontend-out.log',
    }
  ]
};
EOF

print_success "PM2 ecosystem file created"

# Create logs directory
mkdir -p logs
print_success "Logs directory created"

# ========================================
# STEP 5: Install serve for frontend
# ========================================
echo ""
echo "Step 5: Installing serve for frontend..."
cd frontend
npm install serve --save-dev 2>/dev/null || yarn add serve --dev 2>/dev/null
cd ..
print_success "Serve installed"

# ========================================
# STEP 6: Start with PM2
# ========================================
echo ""
echo "Step 6: Starting application with PM2..."
pm2 delete all 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 save
print_success "Application started with PM2"

# ========================================
# COMPLETION
# ========================================
echo ""
echo "=========================================="
echo "Production Deployment Complete!"
echo "=========================================="
echo ""
echo "Services running:"
pm2 list
echo ""
echo "Useful PM2 commands:"
echo "  pm2 status          - Check status"
echo "  pm2 logs            - View logs"
echo "  pm2 restart all     - Restart all services"
echo "  pm2 stop all        - Stop all services"
echo ""
echo "Backend running at: http://localhost:8001"
echo "Frontend running at: http://localhost:3000"
echo ""
