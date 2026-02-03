@echo off
REM Initialize database tables for N8N MVP
REM This script creates all necessary database tables using TypeORM synchronize

echo Initializing database tables...

docker compose exec backend node -e "const { AppDataSource } = require('./dist/config/database.js'); AppDataSource.initialize().then(() => { console.log('Database connected'); return AppDataSource.synchronize(); }).then(() => { console.log('✓ Database tables created successfully'); process.exit(0); }).catch((error) => { console.error('✗ Error initializing database:', error.message); process.exit(1); });"

if %ERRORLEVEL% EQU 0 (
    echo Database initialization complete!
) else (
    echo Database initialization failed!
    exit /b %ERRORLEVEL%
)
