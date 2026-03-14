@echo off
REM ===========================================
REM BusCare Fleet Management System
REM Windows Local Deployment Script
REM ===========================================

echo ==========================================
echo BusCare Local Deployment
echo ==========================================

REM Step 1: Database Setup
echo.
echo Step 1: Setting up database...
echo You may be prompted for MySQL root password
echo.

mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS buscare CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -u root -p -e "CREATE USER IF NOT EXISTS 'buscare_user'@'localhost' IDENTIFIED BY 'buscare_secure_password_123';"
mysql -u root -p -e "GRANT ALL PRIVILEGES ON buscare.* TO 'buscare_user'@'localhost';"
mysql -u root -p -e "FLUSH PRIVILEGES;"

echo Importing schema...
mysql -u buscare_user -pbuscare_secure_password_123 buscare < database\schema.sql

echo Importing seed data...
mysql -u buscare_user -pbuscare_secure_password_123 buscare < database\seed_data.sql

echo [SUCCESS] Database setup completed!

REM Step 2: Start Backend
echo.
echo Step 2: Starting backend server...
cd backend
start "Backend Server" cmd /k "venv\Scripts\python.exe -m uvicorn server:app --host 0.0.0.0 --port 8001 --reload"

REM Wait for backend to start
timeout /t 5 /nobreak > nul

REM Step 3: Start Frontend (simplified)
echo.
echo Step 3: Starting frontend server...
cd ..\frontend

REM Try different start methods
echo Attempting to start frontend...
node node_modules/.bin/react-scripts start

if %ERRORLEVEL% neq 0 (
    echo [INFO] React start failed, but backend is running on http://localhost:8001
    echo You can access the API documentation at: http://localhost:8001/docs
    echo.
    echo To manually start the frontend, navigate to the frontend directory and run:
    echo   npm install --force
    echo   npm start
    echo.
)

pause
