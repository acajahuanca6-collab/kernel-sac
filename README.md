# KERNEL SAC — Tienda de Tecnología

Tienda web (Hardware, Redes, Videovigilancia, Accesorios, Cables, Adaptadores, Laptops y PCs, Componentes, Monitores, Smart Home e Impresoras) con:

- **Backend**: Node.js + Express + API REST.
- **Base de datos**: SQLite (archivo local `db/kernelsac.db`), usando `better-sqlite3`.
- **Frontend**: HTML/CSS/JS puro (sin frameworks), con un diseño **"liquid glass"** (paneles translúcidos con desenfoque, bordes con brillo y acentos en rojo), barra de anuncios, mega menú y carrito lateral.
- **Login con 3 tipos de cuenta**: **Admin** (gestiona productos y categorías), **Cliente registrado** (puede ver su historial de pedidos) e **Invitado** (compra sin crear cuenta).
- **Chatbot integrado con n8n**: burbuja de chat flotante que conversa con tus clientes a través de un flujo de n8n.

## 🚀 Inicio súper fácil (recomendado)

Solo necesitas tener **Node.js** instalado una vez en tu computadora (es como instalar cualquier programa):

1. Descarga e instala Node.js desde **https://nodejs.org** (elige la versión "LTS").
2. Descomprime esta carpeta del proyecto en cualquier lugar de tu computadora.
3. Haz **doble clic** en:
   - `iniciar.bat` si usas **Windows**
   - `iniciar.command` si usas **Mac** (la primera vez puede pedirte permiso: clic derecho → Abrir)
4. Se abrirá una ventana negra que instala todo automáticamente y abre la tienda solita en tu navegador en **http://localhost:3000**.
5. Para apagar el servidor, simplemente cierra esa ventana negra.

¡Eso es todo! No necesitas escribir ningún comando. Las secciones de abajo explican lo mismo paso a paso por si prefieres hacerlo manualmente desde la terminal.

## 1. Instalar dependencias (manual)

Dentro de la carpeta del proyecto, ejecuta:

```bash
npm install
```

## 2. Crear y poblar la base de datos

Este comando crea el archivo `db/kernelsac.db`, lo llena con categorías/productos de ejemplo y crea 2 usuarios de prueba:

```bash
npm run seed
```

Puedes volver a correrlo cuando quieras: siempre reinicia los datos desde cero.

**Credenciales de prueba creadas por el seed:**

| Rol      | Email                  | Contraseña   |
|----------|-------------------------|--------------|
| Admin    | admin@kernelsac.com     | Admin123!    |
| Cliente  | cliente@kernelsac.com   | Cliente123!  |

⚠️ Cambia estas credenciales (o crea las tuyas desde `db/seed.js`) antes de usar el proyecto en un entorno real.

## 3. Iniciar el servidor

```bash
npm start
```

Abre **http://localhost:3000**: es la misma página para la tienda y, si inicias sesión con una cuenta admin, el menú de cuenta muestra "Panel de administración" para entrar al panel dentro de la misma interfaz.

> Para desarrollo, `npm run dev` reinicia el servidor automáticamente al guardar cambios.

## 4. Conectar el chatbot a n8n

El botón de chat flotante de la tienda envía cada mensaje a tu backend (`POST /api/chatbot`), y el backend lo reenvía a un **Webhook de n8n**. Así la URL del webhook nunca queda expuesta en el navegador.

Pasos para conectarlo:

1. En n8n, crea un flujo nuevo con un nodo **Webhook** (método `POST`, modo "Respond immediately" desactivado si usarás un nodo "Respond to Webhook" al final).
2. Agrega la lógica que quieras (IA, base de conocimiento, derivar a un agente, etc.) usando como entrada el campo `mensaje` que llega en el body.
3. Al final del flujo, agrega un nodo **Respond to Webhook** que devuelva un JSON con la respuesta, por ejemplo:
   ```json
   { "respuesta": "¡Hola! Claro, contamos con routers desde S/ 140..." }
   ```
   (también acepta los campos `output`, `mensaje`, `text` o `reply` en vez de `respuesta`).
4. Copia la URL de producción del nodo Webhook (algo como `https://tu-instancia.app.n8n.cloud/webhook/kernel-sac-chat`).
5. En tu archivo `.env` (crea uno a partir de `.env.example` si no lo tienes), pega la URL:
   ```
   N8N_WEBHOOK_URL=https://tu-instancia.app.n8n.cloud/webhook/kernel-sac-chat
   ```
6. Reinicia el servidor (`npm start`). El chat ya quedará conectado a tu flujo de n8n.

El body que el servidor envía a n8n en cada mensaje es:
```json
{
  "mensaje": "texto escrito por el cliente",
  "sessionId": "id estable durante la pestaña del navegador",
  "usuario": null,
  "origen": "kernel-sac-web",
  "fecha": "2026-09-15T12:00:00.000Z"
}
```
Puedes usar `sessionId` en n8n (por ejemplo con el nodo "Window Buffer Memory" de un agente de IA) para mantener el contexto de la conversación.

Si `N8N_WEBHOOK_URL` no está configurada, el chat sigue funcionando visualmente pero muestra un aviso pidiendo completar la configuración.

## Estructura del proyecto

```
kernel-sac/
├── db/
│   ├── database.js      # Conexión + creación de tablas
│   ├── seed.js           # Datos de ejemplo (categorías, productos, usuarios)
│   └── kernelsac.db      # Se crea al correr "npm run seed"
├── public/
│   ├── index.html         # Tienda (catálogo, carrito, login, checkout)
├── server.js              # API Express + autenticación
├── package.json
└── .env (opcional, PORT, SESSION_SECRET)
```

## Cuentas y permisos

- **Admin**: inicia sesión normalmente en la tienda (`/`) con una cuenta con rol `admin` y abre "Panel de administración" desde el menú de cuenta. Puede crear, editar y eliminar productos y categorías (secciones), y ver/actualizar el estado de todos los pedidos, todo dentro del mismo `index.html`.
- **Cliente registrado**: se crea una cuenta desde la tienda (botón "Cuenta" → "Crear cuenta"). Puede comprar y ver su historial en "Mis pedidos".
- **Invitado**: puede comprar sin crear cuenta, sólo completando nombre, teléfono y dirección al finalizar el pedido.

## Endpoints principales de la API

| Método | Ruta                              | Descripción                                          | Acceso |
|--------|------------------------------------|-------------------------------------------------------|--------|
| GET    | `/api/categorias`                  | Lista categorías con conteo de productos              | Público |
| POST   | `/api/categorias`                  | Crea una categoría                                     | Admin |
| DELETE | `/api/categorias/:id`              | Elimina una categoría (si no tiene productos)          | Admin |
| GET    | `/api/productos`                   | Lista productos. Filtros: `?categoria=`, `?destacado=1`, `?buscar=` | Público |
| GET    | `/api/productos/:id`               | Detalle de un producto                                 | Público |
| POST   | `/api/productos`                   | Crea un producto                                       | Admin |
| PUT    | `/api/productos/:id`               | Edita un producto                                       | Admin |
| DELETE | `/api/productos/:id`               | Elimina un producto                                     | Admin |
| POST   | `/api/pedidos`                     | Crea un pedido (funciona con o sin sesión)             | Público |
| GET    | `/api/mis-pedidos`                 | Historial de pedidos del usuario autenticado            | Cliente |
| GET    | `/api/admin/pedidos`               | Lista todos los pedidos con sus items                   | Admin |
| PUT    | `/api/admin/pedidos/:id/estado`    | Cambia el estado de un pedido                           | Admin |
| POST   | `/api/auth/registro`               | Crea una cuenta de cliente                              | Público |
| POST   | `/api/auth/login`                  | Inicia sesión                                           | Público |
| POST   | `/api/auth/logout`                 | Cierra sesión                                           | — |
| GET    | `/api/auth/me`                     | Devuelve el usuario autenticado (o null)                | — |
| POST   | `/api/chatbot`                     | Reenvía un mensaje al Webhook de n8n y devuelve la respuesta | Público |

## Personalizar productos

Puedes editar productos y categorías directamente desde el **panel de administración** (dentro de `index.html`, sección "Panel de administración" del menú de cuenta), o editando el arreglo `productos`/`categorias` en `db/seed.js` y volviendo a correr:

```bash
npm run seed
```

## Notas

- Los productos y precios de ejemplo están inspirados en el catálogo real de Kernel SAC (Hardware, Redes, Videovigilancia, Accesorios, Cables, Adaptadores); los precios son referenciales y puedes ajustarlos desde el panel de administración.
- Los íconos son ilustraciones SVG propias (no fotos), así el sitio no depende de imágenes externas ni de derechos de terceros. Si prefieres fotos reales de producto, agrega un campo `imagen_url` en la tabla `productos` y muéstralas en `public/index.html` en vez del ícono.
- El carrito se guarda en `sessionStorage` del navegador (se mantiene mientras la pestaña esté abierta).
- Las sesiones de login se guardan en una cookie de servidor (`express-session`); en producción define `SESSION_SECRET` en tu `.env` y activa `cookie.secure` si usas HTTPS.
- El stock se descuenta de verdad en la base de datos al confirmar un pedido, y una transacción evita vender más unidades de las disponibles.
- Recuerda cambiar el número de WhatsApp del botón flotante (`public/index.html`, atributo `href`) por el número real de tu negocio.
