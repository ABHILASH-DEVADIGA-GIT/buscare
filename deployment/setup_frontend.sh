#!/bin/bash

# ===========================================
# BusCare Fleet Management System
# Frontend Setup Script
# ===========================================

set -e

echo "=========================================="
echo "BusCare Frontend Setup"
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

# Navigate to frontend directory
cd "$(dirname "$0")/../frontend"

# Check Node.js version
echo "Checking Node.js installation..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    print_success "Node.js installed: $NODE_VERSION"
else
    print_error "Node.js is not installed"
    exit 1
fi

# Check npm/yarn
echo "Checking package manager..."
if command -v yarn &> /dev/null; then
    PACKAGE_MANAGER="yarn"
    print_success "Yarn installed: $(yarn --version)"
else
    PACKAGE_MANAGER="npm"
    print_success "Using npm: $(npm --version)"
fi

# Install dependencies
echo "Installing dependencies (this may take a few minutes)..."
if [ "$PACKAGE_MANAGER" = "yarn" ]; then
    yarn install
else
    npm install
fi
print_success "Dependencies installed"

# Check for .env file
if [ ! -f ".env" ]; then
    print_warning ".env file not found"
    echo "Copying .env.example to .env..."
    cp .env.example .env
    print_warning "Please update .env with your backend URL"
fi

echo ""
echo "=========================================="
echo "Frontend setup completed!"
echo "=========================================="
echo ""
echo "To start the development server:"
echo "  cd frontend"
echo "  yarn start (or npm start)"
echo ""
echo "To build for production:"
echo "  yarn build (or npm run build)"
echo ""
