#!/bin/bash
cd "$(dirname "$0")"

if ! command -v node >/dev/null 2>&1; then
  echo ""
  echo "============================================================"
  echo "  No se encontró Node.js instalado en esta computadora."
  echo "  1. Ve a https://nodejs.org"
  echo "  2. Descarga e instala la versión \"LTS\""
  echo "  3. Vuelve a hacer doble clic en este archivo"
  echo "============================================================"
  echo ""
  read -p "Presiona Enter para salir..."
  exit 1
fi

if [ ! -d "node_modules" ]; then
  echo "Instalando dependencias por primera vez, espera un momento..."
  npm install
  if [ $? -ne 0 ]; then
    echo ""
    echo "============================================================"
    echo "  Hubo un problema instalando las dependencias."
    echo "  Ejecuta reparar.command para intentar arreglarlo."
    echo "============================================================"
    read -p "Presiona Enter para salir..."
    exit 1
  fi
fi

if [ ! -d "node_modules/express" ]; then
  echo ""
  echo "============================================================"
  echo "  La instalación de dependencias está incompleta."
  echo "  Ejecuta reparar.command para arreglarlo automáticamente."
  echo "============================================================"
  read -p "Presiona Enter para salir..."
  exit 1
fi

if [ ! -f "db/kernelsac.db" ]; then
  echo "Creando base de datos con productos de ejemplo..."
  npm run seed
fi

if [ ! -f "public/uploads/productos/prod_1.jpg" ]; then
  echo "Descargando imágenes de productos..."
  node db/download_all_images.js
fi

echo ""
echo "============================================================"
echo "  Kernel SAC se está iniciando..."
echo "  Se abrirá solo en tu navegador en unos segundos."
echo "  NO CIERRES esta ventana mientras uses la tienda."
echo "  Para apagar el servidor: cierra esta ventana o presiona Ctrl+C"
echo "============================================================"
echo ""

( sleep 2 && (open http://localhost:3000 2>/dev/null || xdg-open http://localhost:3000 2>/dev/null) ) &
npm start
