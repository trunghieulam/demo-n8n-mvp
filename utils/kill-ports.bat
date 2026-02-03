@echo off
REM Batch script to kill processes on ports 3000 and 3001
REM Usage: kill-ports.bat

echo Killing processes on ports 3000 and 3001...
echo.

for %%p in (3000 3001) do (
    echo Checking port %%p...
    
    REM Find PID listening on the port
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":%%p.*LISTENING"') do (
        echo   Found process with PID: %%a
        taskkill /PID %%a /F >nul 2>&1
        if !errorlevel! equ 0 (
            echo   [OK] Killed process %%a
        ) else (
            echo   [ERROR] Could not kill process %%a
        )
    )
)

echo.
echo Done! Checking if ports are free...
timeout /t 1 /nobreak >nul

for %%p in (3000 3001) do (
    netstat -ano | findstr ":%%p.*LISTENING" >nul
    if !errorlevel! equ 0 (
        echo   Port %%p is still in use
    ) else (
        echo   Port %%p is free
    )
)

pause
