#!/bin/bash
cd "$(dirname "$0")"

echo ""
echo "============================================================"
echo "  Esto va a borrar la carpeta node_modules y el archivo"
echo "  package-lock.json, y luego reinstalar todo desde cero."
echo "  Usa esto si la tienda no arranca o da errores raros."
echo "============================================================"
echo ""
read -p "Presiona Enter para continuar..."

if ! command -v node >/dev/null 2>&1; then
  echo ""
  echo "No se encontró Node.js instalado. Ve a https://nodejs.org"
  echo "e instala la versión LTS, luego vuelve a intentar."
  echo ""
  read -p "Presiona Enter para salir..."
  exit 1
fi

echo ""
echo "Versión de Node.js instalada:"
node -v
echo ""

if [ -d "node_modules" ]; then
  echo "Borrando node_modules..."
  rm -rf node_modules
fi

if [ -f "package-lock.json" ]; then
  echo "Borrando package-lock.json..."
  rm -f package-lock.json
fi

echo ""
echo "Instalando dependencias de nuevo, esto puede tardar un poco..."
npm install
if [ $? -ne 0 ]; then
  echo ""
  echo "============================================================"
  echo "  La instalación falló. Copia el mensaje de arriba y"
  echo "  compártelo para poder ayudarte."
  echo "============================================================"
  echo ""
  read -p "Presiona Enter para salir..."
  exit 1
fi

if [ -f "db/kernelsac.db" ]; then
  echo "Borrando base de datos anterior para recrearla limpia..."
  rm -f "db/kernelsac.db"
fi

echo "Creando base de datos con productos de ejemplo..."
npm run seed

echo "Descargando imágenes de productos..."
node db/download_all_images.js

echo ""
echo "============================================================"
echo "  Listo. Ahora puedes usar iniciar.command para abrir la tienda."
echo "============================================================"
echo ""
read -p "Presiona Enter para salir..."
