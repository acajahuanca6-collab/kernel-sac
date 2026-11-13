@echo off
title Kernel SAC - Reparar instalacion
cd /d "%~dp0"

echo.
echo ============================================================
echo   Esto va a borrar la carpeta "node_modules" y el archivo
echo   "package-lock.json", y luego reinstalar todo desde cero.
echo   Usa esto si la tienda no arranca o da errores raros.
echo ============================================================
echo.
pause

where node >nul 2>nul
if %errorlevel% neq 0 (
  echo.
  echo No se encontro Node.js instalado. Ve a https://nodejs.org
  echo e instala la version "LTS", luego vuelve a intentar.
  echo.
  pause
  exit /b
)

echo.
echo Version de Node.js instalada:
node -v
echo.

if exist "node_modules" (
  echo Borrando node_modules...
  rmdir /s /q "node_modules"
)

if exist "package-lock.json" (
  echo Borrando package-lock.json...
  del /f /q "package-lock.json"
)

echo.
echo Instalando dependencias de nuevo, esto puede tardar un poco...
call npm install
if %errorlevel% neq 0 (
  echo.
  echo ============================================================
  echo   La instalacion fallo. Copia el mensaje de arriba y
  echo   compartelo para poder ayudarte. Causas comunes:
  echo    - Antivirus bloqueando la instalacion.
  echo    - Falta conexion a internet.
  echo    - Version de Node.js muy nueva o muy vieja.
  echo ============================================================
  echo.
  pause
  exit /b
)

if exist "db\kernelsac.db" (
  echo Borrando base de datos anterior para recrearla limpia...
  del /f /q "db\kernelsac.db"
)

echo Creando base de datos con productos de ejemplo...
call npm run seed

echo.
echo ============================================================
echo   Listo. Ahora puedes usar "iniciar.bat" para abrir la tienda.
echo ============================================================
echo.
pause
