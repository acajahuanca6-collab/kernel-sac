@echo off
title Kernel SAC
cd /d "%~dp0"

if exist "C:\Program Files\nodejs\node.exe" set "PATH=C:\Program Files\nodejs;%PATH%"
if exist "%LOCALAPPDATA%\Programs\nodejs\node.exe" set "PATH=%LOCALAPPDATA%\Programs\nodejs;%PATH%"

where node >nul 2>nul
if %errorlevel% neq 0 (
  echo.
  echo ============================================================
  echo   No se encontro Node.js instalado en esta computadora.
  echo   1. Ve a https://nodejs.org
  echo   2. Descarga e instala la version "LTS"
  echo   3. Vuelve a hacer doble clic en este archivo
  echo ============================================================
  echo.
  pause
  exit /b
)

if not exist "node_modules" (
  echo Instalando dependencias por primera vez, espera un momento...
  call npm install
  if %errorlevel% neq 0 (
    echo.
    echo ============================================================
    echo   Hubo un problema instalando las dependencias.
    echo   Ejecuta "reparar.bat" para intentar arreglarlo.
    echo ============================================================
    pause
    exit /b
  )
)

if not exist "node_modules\express" (
  echo.
  echo ============================================================
  echo   La instalacion de dependencias esta incompleta.
  echo   Ejecuta "reparar.bat" para arreglarlo automaticamente.
  echo ============================================================
  pause
  exit /b
)

if not exist "db\kernelsac.db" (
  echo Creando base de datos con productos de ejemplo...
  call npm run seed
)

echo.
echo ============================================================
echo   Kernel SAC se esta iniciando...
echo   Se abrira solo en tu navegador en unos segundos.
echo   NO CIERRES esta ventana negra mientras uses la tienda.
echo   Para apagar el servidor: cierra esta ventana o presiona Ctrl+C
echo ============================================================
echo.

start "" http://localhost:3000
call npm start

pause
