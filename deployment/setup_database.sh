#!/bin/bash

# ===========================================
# BusCare Fleet Management System
# Database Setup Script
# ===========================================

set -e

echo "=========================================="
echo "BusCare Database Setup"
echo "=========================================="

# Configuration
DB_NAME="buscare"
DB_USER="buscare_user"
DB_PASSWORD="buscare_secure_password_123"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

print_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

# Check if MySQL is installed
if ! command -v mysql &> /dev/null; then
    print_error "MySQL is not installed. Please install MySQL/MariaDB first."
    exit 1
fi

# Check if MySQL service is running
if ! systemctl is-active --quiet mariadb && ! systemctl is-active --quiet mysql; then
    echo "Starting MySQL/MariaDB service..."
    sudo systemctl start mariadb || sudo systemctl start mysql
fi

print_success "MySQL service is running"

# Prompt for root password
read -sp "Enter MySQL root password (press Enter if no password): " ROOT_PASS
echo

# Set MySQL command
if [ -z "$ROOT_PASS" ]; then
    MYSQL_CMD="mysql -u root"
else
    MYSQL_CMD="mysql -u root -p$ROOT_PASS"
fi

# Create database
echo "Creating database..."
$MYSQL_CMD -e "CREATE DATABASE IF NOT EXISTS $DB_NAME CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
print_success "Database '$DB_NAME' created"

# Create user
echo "Creating database user..."
$MYSQL_CMD -e "CREATE USER IF NOT EXISTS '$DB_USER'@'localhost' IDENTIFIED BY '$DB_PASSWORD';"
$MYSQL_CMD -e "GRANT ALL PRIVILEGES ON $DB_NAME.* TO '$DB_USER'@'localhost';"
$MYSQL_CMD -e "FLUSH PRIVILEGES;"
print_success "User '$DB_USER' created with full privileges"

# Import schema
echo "Importing database schema..."
$MYSQL_CMD $DB_NAME < ../database/schema.sql
print_success "Schema imported successfully"

# Import seed data
echo "Importing seed data..."
$MYSQL_CMD $DB_NAME < ../database/seed_data.sql
print_success "Seed data imported successfully"

# Verify tables
echo ""
echo "Verifying database tables..."
TABLE_COUNT=$($MYSQL_CMD -N -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='$DB_NAME';")
echo "Total tables created: $TABLE_COUNT"

echo ""
echo "=========================================="
echo "Database setup completed successfully!"
echo "=========================================="
echo ""
echo "Database: $DB_NAME"
echo "Username: $DB_USER"
echo "Password: $DB_PASSWORD"
echo ""
echo "Update your backend/.env file with these credentials."
echo ""
