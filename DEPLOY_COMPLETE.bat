@echo off
REM ===========================================
REM BusCare Fleet Management System
REM Complete Windows Deployment Script
REM ===========================================

echo ==========================================
echo BusCare Fleet Management System
echo Complete Local Deployment
echo ==========================================

REM Colors for output
set "GREEN=[32m"
set "RED=[31m"
set "YELLOW=[33m"
set "NC=[0m"

echo.
echo %YELLOW%This script will set up BusCare on your local machine%NC%
echo.
echo Prerequisites:
echo - MySQL Server 8.0+ installed
echo - Node.js 18+ installed  
echo - Python 3.10+ installed
echo.
echo Press any key to continue...
pause > nul

REM Step 1: Database Setup
echo.
echo %YELLOW%Step 1: Database Setup%NC%
echo.
echo You will be prompted for your MySQL root password.
echo If you don't have a password, just press Enter.
echo.

set /p ROOT_PASS="Enter MySQL root password (or press Enter if none): "

if "%ROOT_PASS%"=="" (
    set MYSQL_CMD=mysql -u root
) else (
    set MYSQL_CMD=mysql -u root -p%ROOT_PASS%
)

echo Creating database...
%MYSQL_CMD% -e "CREATE DATABASE IF NOT EXISTS buscare CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" 2>nul
if %ERRORLEVEL% neq 0 (
    echo %RED%[ERROR] Failed to create database. Please check your MySQL credentials.%NC%
    pause
    exit /b 1
)

echo Creating database user...
%MYSQL_CMD% -e "CREATE USER IF NOT EXISTS 'buscare_user'@'localhost' IDENTIFIED BY 'buscare_secure_password_123';" 2>nul
%MYSQL_CMD% -e "GRANT ALL PRIVILEGES ON buscare.* TO 'buscare_user'@'localhost';" 2>nul
%MYSQL_CMD% -e "FLUSH PRIVILEGES;" 2>nul

echo Importing database schema...
mysql -u buscare_user -pbuscare_secure_password_123 buscare < database\schema.sql 2>nul
if %ERRORLEVEL% neq 0 (
    echo %RED%[ERROR] Failed to import schema. Please check database setup.%NC%
    pause
    exit /b 1
)

echo Importing seed data...
mysql -u buscare_user -pbuscare_secure_password_123 buscare < database\seed_data.sql 2>nul
if %ERRORLEVEL% neq 0 (
    echo %RED%[ERROR] Failed to import seed data.%NC%
    pause
    exit /b 1
)

echo %GREEN%[SUCCESS] Database setup completed!%NC%

REM Step 2: Backend Setup
echo.
echo %YELLOW%Step 2: Starting Backend Server%NC%
echo.

cd backend
echo Starting backend on port 8001...
start "BusCare Backend" cmd /k "title BusCare Backend && venv\Scripts\python.exe -m uvicorn server:app --host 0.0.0.0 --port 8001 --reload"

echo Waiting for backend to start...
timeout /t 8 /nobreak > nul

REM Test backend connection
echo Testing backend connection...
curl -s http://localhost:8001/docs > nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo %GREEN%[SUCCESS] Backend is running on http://localhost:8001%NC%
    echo %GREEN%[SUCCESS] API Documentation: http://localhost:8001/docs%NC%
) else (
    echo %YELLOW%[WARNING] Backend may still be starting...%NC%
)

cd ..

REM Step 3: Frontend Setup
echo.
echo %YELLOW%Step 3: Frontend Setup%NC%
echo.

cd frontend
echo Installing frontend dependencies...
call npm.cmd install --legacy-peer-deps --force

echo.
echo Starting frontend server...
echo %YELLOW%Note: If frontend fails to start, backend is still available at http://localhost:8001%NC%
echo.

REM Try to start frontend
start "BusCare Frontend" cmd /k "title BusCare Frontend && cd /d %CD% && npm.cmd start"

echo.
echo ==========================================
echo %GREEN%DEPLOYMENT COMPLETED%NC%
echo ==========================================
echo.
echo %GREEN%Services:%NC%
echo - Backend API: http://localhost:8001
echo - API Docs: http://localhost:8001/docs
echo - Frontend: http://localhost:3000 (if started successfully)
echo.
echo %YELLOW%Test Credentials:%NC%
echo - Admin Email: admin@demo.com
echo - Admin Password: admin123
echo - Client ID: demo-client-001
echo.
echo %YELLOW%Troubleshooting:%NC%
echo - If frontend doesn't open, use the API directly at http://localhost:8001/docs
echo - Check that MySQL service is running
echo - Make sure ports 3000 and 8001 are available
echo.
echo Press any key to exit...
pause > nul
