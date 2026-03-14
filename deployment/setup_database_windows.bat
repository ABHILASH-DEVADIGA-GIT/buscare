@echo off
REM ===========================================
REM BusCare Fleet Management System
REM Windows Database Setup Script
REM ===========================================

echo ==========================================
echo BusCare Database Setup (Windows)
echo ==========================================

REM Configuration
set DB_NAME=buscare
set DB_USER=buscare_user
set DB_PASSWORD=buscare_secure_password_123

echo.
echo Creating database and user...
echo.

REM Create database (you may be prompted for MySQL root password)
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS %DB_NAME% CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Failed to create database
    pause
    exit /b 1
)

echo [SUCCESS] Database '%DB_NAME%' created

REM Create user
mysql -u root -p -e "CREATE USER IF NOT EXISTS '%DB_USER%'@'localhost' IDENTIFIED BY '%DB_PASSWORD%';"
mysql -u root -p -e "GRANT ALL PRIVILEGES ON %DB_NAME%.* TO '%DB_USER%'@'localhost';"
mysql -u root -p -e "FLUSH PRIVILEGES;"
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Failed to create user
    pause
    exit /b 1
)

echo [SUCCESS] User '%DB_USER%' created with full privileges

REM Import schema
echo Importing database schema...
mysql -u %DB_USER% -p%DB_PASSWORD% %DB_NAME% < database\schema.sql
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Failed to import schema
    pause
    exit /b 1
)

echo [SUCCESS] Schema imported successfully

REM Import seed data
echo Importing seed data...
mysql -u %DB_USER% -p%DB_PASSWORD% %DB_NAME% < database\seed_data.sql
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Failed to import seed data
    pause
    exit /b 1
)

echo [SUCCESS] Seed data imported successfully

echo.
echo ==========================================
echo Database setup completed successfully!
echo ==========================================
echo.
echo Database: %DB_NAME%
echo Username: %DB_USER%
echo Password: %DB_PASSWORD%
echo.
echo Update your backend\.env file with these credentials.
echo.
pause
