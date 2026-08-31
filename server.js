const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
require('dotenv').config();

const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

// Asegurar existencia del directorio de uploads
const uploadsDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configuración de Multer para subida de imágenes
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const cleanName = path.basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9_-]/g, '')
      .substring(0, 30);
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e5)}`;
    cb(null, `${cleanName || 'imagen'}-${uniqueSuffix}${ext || '.jpg'}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 12 * 1024 * 1024 }, // Máximo 12MB por imagen
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos de imagen (JPG, PNG, WEBP, GIF, SVG)'));
    }
  }
});

// Middlewares generales
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(uploadsDir));

// Middleware de autenticación para panel de administración
const requireAdminAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'] || req.headers['x-admin-key'];
  const token = authHeader ? authHeader.replace(/^Bearer\s+/i, '') : null;

  if (!token || token !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Acceso no autorizado. Clave incorrecta o ausente.' });
  }
  next();
};

// -------------------------------------------------------------
// ENDPOINTS PÚBLICOS
// -------------------------------------------------------------

// API: Configuración básica (compatibilidad anterior)
app.get('/api/config', async (req, res) => {
  try {
    const settings = await db.getSettings();
    res.json({
      storeName: settings.storeName || process.env.STORE_NAME || 'AURA | Studio & Apparel',
      whatsappNumber: settings.whatsappNumber || process.env.WHATSAPP_NUMBER || '5491123456789',
      currencySymbol: settings.currencySymbol || process.env.CURRENCY_SYMBOL || '$',
      currencyCode: settings.currencyCode || process.env.CURRENCY_CODE || 'ARS',
      dbStatus: db.isDatabaseConnected() ? 'neon-postgresql' : 'local-json'
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener configuración' });
  }
});

// API: Configuración visual completa (Banners, Hero, Categorías, Tienda)
app.get('/api/settings', async (req, res) => {
  try {
    const settings = await db.getSettings();
    res.json({
      ...settings,
      dbStatus: db.isDatabaseConnected() ? 'neon-postgresql' : 'local-json'
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener ajustes de la tienda' });
  }
});

// API: Actualizar configuración visual y de tienda (Admin)
app.put('/api/settings', requireAdminAuth, async (req, res) => {
  try {
    const updated = await db.updateSettings(req.body);
    res.json({ success: true, settings: updated });
  } catch (error) {
    console.error('Error al actualizar settings:', error);
    res.status(500).json({ error: 'Error al guardar ajustes de la tienda' });
  }
});

// API: Categorías
app.get('/api/categories', async (req, res) => {
  try {
    const categories = await db.getCategories();
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener categorías' });
  }
});

// API: Listado de productos con filtros
app.get('/api/products', async (req, res) => {
  try {
    const products = await db.getAllProducts(req.query);
    res.json(products);
  } catch (error) {
    console.error('Error en GET /api/products:', error);
    res.status(500).json({ error: 'Error al obtener catálogo' });
  }
});

// API: Detalle de producto individual
app.get('/api/products/:id', async (req, res) => {
  try {
    const product = await db.getProductById(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener producto' });
  }
});

// -------------------------------------------------------------
// ENDPOINTS ADMINISTRATIVOS (CRUD & UPLOAD)
// -------------------------------------------------------------

// Login del Administrador
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) {
    return res.json({ success: true, token: ADMIN_PASSWORD, message: 'Autenticación exitosa' });
  }
  return res.status(401).json({ success: false, error: 'Contraseña incorrecta' });
});

// Subida de imagen (para productos, hero o categorías)
app.post('/api/admin/upload', requireAdminAuth, upload.single('imagen'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se recibió ningún archivo de imagen' });
    }
    const publicUrl = `/uploads/${req.file.filename}`;
    res.json({ success: true, url: publicUrl, filename: req.file.filename });
  } catch (error) {
    console.error('Error al subir imagen:', error);
    res.status(500).json({ error: error.message || 'Error al procesar la imagen' });
  }
});

// Crear Producto
app.post('/api/products', requireAdminAuth, async (req, res) => {
  try {
    const { nombre, precio, categoria } = req.body;
    if (!nombre || precio === undefined || !categoria) {
      return res.status(400).json({ error: 'Nombre, precio y categoría son obligatorios' });
    }

    const created = await db.createProduct(req.body);
    res.status(201).json(created);
  } catch (error) {
    console.error('Error al crear producto:', error);
    res.status(500).json({ error: 'Error al crear producto' });
  }
});

// Editar Producto
app.put('/api/products/:id', requireAdminAuth, async (req, res) => {
  try {
    const updated = await db.updateProduct(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ error: 'Producto no encontrado para editar' });
    }
    res.json(updated);
  } catch (error) {
    console.error('Error al actualizar producto:', error);
    res.status(500).json({ error: 'Error al actualizar producto' });
  }
});

// Eliminar Producto
app.delete('/api/products/:id', requireAdminAuth, async (req, res) => {
  try {
    const deleted = await db.deleteProduct(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    res.json({ success: true, message: 'Producto eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar producto:', error);
    res.status(500).json({ error: 'Error al eliminar producto' });
  }
});

// -------------------------------------------------------------
// RUTAS DE VISTAS (HTML)
// -------------------------------------------------------------

// Ruta directa para el Panel de Administración
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin', 'index.html'));
});

// Fallback general para SPA de la tienda
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Iniciar servidor y base de datos
app.listen(PORT, async () => {
  console.log(`🚀 Servidor ejecutándose en: http://localhost:${PORT}`);
  console.log(`🛠️ Panel de administración en: http://localhost:${PORT}/admin`);
  await db.initDb();
});
