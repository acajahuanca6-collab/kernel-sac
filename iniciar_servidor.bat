@echo off
title Servidor KERNEL SAC - http://localhost:3000
cd /d "%~dp0"
echo ========================================================
echo   Iniciando Servidor Web KERNEL SAC en puerto 3000...
echo   Abre tu navegador en: http://localhost:3000
echo ========================================================
echo.
node server.js
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] No se pudo iniciar el servidor.
    pause
)
