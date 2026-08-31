# 🛍️ GalleryStore - Tienda de Ropa Online & Panel Administrativo

Plataforma e-commerce minimalista y moderna para marcas de ropa independiente y emprendimientos, con gestión ágil de pedidos directamente hacia WhatsApp y panel de administración **mobile-first** para control de catálogo, portada, banners y medios de pago.

---

## ✨ Características Principales

### 🛒 Tienda Pública (Client-Facing)
- **Portada (Hero) & Banners Administrables:** Anuncio superior de ofertas, portadas en alta definición y tarjetas de colecciones (Hombre, Mujer, Accesorios).
- **Catálogo Interactivo:** Búsqueda en tiempo real, filtros por categoría y filtros de tallas (XS, S, M, L, XL, etc.).
- **Detalle de Producto & Selección:** Selector de tallas, colores, selector de cantidad y modal responsive.
- **Carrito Drawer Lateral:** Persistente en `localStorage`, cálculo automático de subtotal y cantidad.
- **Checkout Minimalista & Pedido por WhatsApp:** Formulario de entrega validado y generación automática del mensaje formateado para enviar el pedido a WhatsApp con un solo toque.

### 🛠️ Panel Administrativo Mobile-First (`/admin`)
- **📦 Gestión de Productos:** Crear, editar y eliminar prendas con carga de imágenes (subida desde celular/PC o URLs), control de stock, etiquetas (ej. *Más Vendido*, *Tendencia*) y opción de destacar en Home.
- **🎨 Editor de Banners & Portada:** Cambiar textos, colores y fotos de anuncios, hero y colecciones con vista previa en vivo.
- **⚙️ Configuración del Negocio:** Modificar nombre de la tienda, número de WhatsApp para recibir pedidos y moneda (`S/ PEN`, `$ USD`, etc.).
- **Seguridad & Acceso:** Autenticación protegida por contraseña y tokens de sesión.

### ☁️ Base de Datos & Persistencia Híbrida
- **Neon Cloud PostgreSQL:** Conexión nativa con SSL y migración automática de tablas y datos.
- **Fallback Local JSON:** Si no se define base de datos en la nube, el sistema funciona de forma autónoma con archivos JSON locales (`data/products.json` y `data/settings.json`).

---

## 🚀 Instalación y Puesta en Marcha

### 1. Clonar el repositorio
```bash
git clone https://github.com/TU_USUARIO/GalleryStore.git
cd GalleryStore
```

### 2. Instalar dependencias
```bash
npm install
```

### 3. Configurar Variables de Entorno
Copia el archivo `.env.example` a `.env` y configura tus variables:
```bash
cp .env.example .env
```

Contenido de `.env`:
```env
PORT=3000
STORE_NAME="GALLERY | Studio & Apparel"
WHATSAPP_NUMBER="988182681"
CURRENCY_SYMBOL="S/"
CURRENCY_CODE="SOL"

# PostgreSQL en la nube (ej. Neon)
DATABASE_URL="postgresql://usuario:clave@ep-xyz.neon.tech/neondb?sslmode=require"

# Clave para /admin
ADMIN_PASSWORD="admin@123"
```

### 4. Iniciar el Servidor
```bash
npm start
# o para desarrollo con auto-reload:
npm run dev
```

* **Tienda pública:** `http://localhost:3000`
* **Panel de administración:** `http://localhost:3000/admin` (Clave configurada en `.env`)

---

## 📁 Estructura del Proyecto

```
Tienda de Ropa/
├── data/                      # Almacenamiento local fallback
│   ├── products.json
│   └── settings.json
├── public/                    # Archivos estáticos frontend
│   ├── admin/                 # Panel de administración mobile-first
│   │   ├── index.html
│   │   ├── admin.css
│   │   └── admin.js
│   ├── css/
│   │   └── styles.css         # Estilos de la tienda pública
│   ├── js/                    # Módulos JS (Vanilla ES Modules)
│   │   ├── api.js
│   │   ├── app.js
│   │   ├── cart.js
│   │   ├── catalog.js
│   │   ├── checkout.js
│   │   └── ui.js
│   ├── uploads/               # Imágenes subidas por los usuarios
│   └── index.html             # Página principal de la tienda
├── .env.example
├── .gitignore
├── db.js                      # Capa de datos (Postgres & JSON)
├── package.json
├── server.js                  # Servidor Express & API REST
└── README.md
```

---

## 📄 Licencia
MIT License.
