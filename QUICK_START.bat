@echo off
echo ==========================================
echo Quick BusCare Database Setup
echo ==========================================

echo.
echo Please enter your MySQL root password when prompted
echo If you don't remember it, you may need to reset MySQL root password
echo.

set /p ROOT_PASS="MySQL root password: "

echo.
echo Creating database and user...

mysql -u root -p%ROOT_PASS% -e "CREATE DATABASE IF NOT EXISTS buscare CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
if %ERRORLEVEL% neq 0 (
    echo ERROR: Could not connect to MySQL with provided password
    pause
    exit /b 1
)

mysql -u root -p%ROOT_PASS% -e "DROP USER IF EXISTS 'buscare_user'@'localhost';"
mysql -u root -p%ROOT_PASS% -e "CREATE USER 'buscare_user'@'localhost' IDENTIFIED BY 'buscare_secure_password_123';"
mysql -u root -p%ROOT_PASS% -e "GRANT ALL PRIVILEGES ON buscare.* TO 'buscare_user'@'localhost';"
mysql -u root -p%ROOT_PASS% -e "FLUSH PRIVILEGES;"

echo.
echo Importing database schema...
mysql -u buscare_user -pbuscare_secure_password_123 buscare < database\schema.sql

echo.
echo Importing seed data...
mysql -u buscare_user -pbuscare_secure_password_123 buscare < database\seed_data.sql

echo.
echo SUCCESS: Database setup completed!
echo.
echo Starting backend server...
cd backend
start "Backend Server" cmd /k "venv\Scripts\python.exe -m uvicorn server:app --host 0.0.0.0 --port 8001 --reload"

echo.
echo Backend should be available at: http://localhost:8001
echo API Documentation: http://localhost:8001/docs
echo.
pause
