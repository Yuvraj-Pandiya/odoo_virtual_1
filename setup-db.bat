@echo off
echo ============================================
echo  TransitOps - Database Setup Script
echo ============================================
echo.
echo This script will create the PostgreSQL database and run migrations.
echo Please make sure PostgreSQL is running and your password is correct in backend/.env
echo.
set PGPATH="C:\Program Files\PostgreSQL\18\bin"

echo Step 1: Creating database 'transitops'...
%PGPATH%\psql.exe -U postgres -c "CREATE DATABASE transitops;" 2>NUL
echo Done (or database already exists).

echo.
echo Step 2: Running migrations...
cd backend
call npm run migrate
echo.

echo Step 3: Seeding demo data...
call npm run seed

echo.
echo ============================================
echo  Setup complete! 
echo  Backend:  npm run dev  (in /backend)
echo  Frontend: npm run dev  (in /frontend)
echo ============================================
pause
