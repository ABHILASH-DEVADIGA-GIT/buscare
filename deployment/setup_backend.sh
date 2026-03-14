#!/bin/bash

# ===========================================
# BusCare Fleet Management System
# Backend Setup Script
# ===========================================

set -e

echo "=========================================="
echo "BusCare Backend Setup"
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

# Navigate to backend directory
cd "$(dirname "$0")/../backend"

# Check Python version
echo "Checking Python installation..."
if command -v python3 &> /dev/null; then
    PYTHON_VERSION=$(python3 --version)
    print_success "Python installed: $PYTHON_VERSION"
else
    print_error "Python 3 is not installed"
    exit 1
fi

# Create virtual environment
echo "Creating virtual environment..."
if [ ! -d "venv" ]; then
    python3 -m venv venv
    print_success "Virtual environment created"
else
    print_warning "Virtual environment already exists"
fi

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate
print_success "Virtual environment activated"

# Upgrade pip
echo "Upgrading pip..."
pip install --upgrade pip > /dev/null 2>&1
print_success "Pip upgraded"

# Install dependencies
echo "Installing Python dependencies..."
pip install -r requirements.txt > /dev/null 2>&1
print_success "Dependencies installed"

# Check for .env file
if [ ! -f ".env" ]; then
    print_warning ".env file not found"
    echo "Copying .env.example to .env..."
    cp .env.example .env
    print_warning "Please update .env with your database credentials"
fi

# Create uploads directory
echo "Creating uploads directories..."
mkdir -p uploads/images uploads/audio uploads/videos
print_success "Upload directories created"

echo ""
echo "=========================================="
echo "Backend setup completed!"
echo "=========================================="
echo ""
echo "To start the backend server:"
echo "  cd backend"
echo "  source venv/bin/activate"
echo "  uvicorn server:app --host 0.0.0.0 --port 8001 --reload"
echo ""
