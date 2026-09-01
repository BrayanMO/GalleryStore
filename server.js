const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
require('dotenv').config();

const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

// 1. Configuración de Cloudinary (Almacenamiento Permanente en la Nube)
const isCloudinaryConfigured = Boolean(
  process.env.CLOUDINARY_URL || 
  (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET)
);

if (isCloudinaryConfigured) {
  if (process.env.CLOUDINARY_URL) {
    cloudinary.config();
  } else {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true
    });
  }
  console.log('☁️  [Cloudinary] Almacenamiento permanente en la nube activo');
} else {
  console.log('ℹ️  [Uploads] Usando almacenamiento local (/uploads)');
}

// Asegurar existencia del directorio de uploads local (temporal o fallback)
const uploadsDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configuración de Multer para recepción de imágenes
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
  limits: { fileSize: 15 * 1024 * 1024 }, // Máximo 15MB por imagen
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
app.use(express.json({ limit: '10mb' }));
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
      storeName: settings.storeName || process.env.STORE_NAME || 'GALLERY | Store',
      whatsappNumber: settings.whatsappNumber || process.env.WHATSAPP_NUMBER || '51988182681',
      currencySymbol: settings.currencySymbol || process.env.CURRENCY_SYMBOL || 'S/',
      currencyCode: settings.currencyCode || process.env.CURRENCY_CODE || 'SOL',
      dbStatus: db.isDatabaseConnected() ? 'neon-postgresql' : 'local-json',
      storageStatus: isCloudinaryConfigured ? 'cloudinary' : 'local'
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
      dbStatus: db.isDatabaseConnected() ? 'neon-postgresql' : 'local-json',
      storageStatus: isCloudinaryConfigured ? 'cloudinary' : 'local'
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

// API: Categorías (Lista completa o nombres)
app.get('/api/categories', async (req, res) => {
  try {
    if (req.query.names === 'true') {
      const names = await db.getCategories();
      return res.json(names);
    }
    const categories = await db.getAllCategories();
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener categorías' });
  }
});

// API: Crear Categoría (Admin)
app.post('/api/categories', requireAdminAuth, async (req, res) => {
  try {
    const { nombre, descripcion, imagen } = req.body;
    if (!nombre || !nombre.trim()) {
      return res.status(400).json({ error: 'El nombre de la categoría es obligatorio' });
    }
    const created = await db.createCategory({ nombre, descripcion, imagen });
    res.status(201).json(created);
  } catch (error) {
    console.error('Error al crear categoría:', error);
    res.status(400).json({ error: error.message || 'Error al crear categoría' });
  }
});

// API: Editar Categoría (Admin)
app.put('/api/categories/:id', requireAdminAuth, async (req, res) => {
  try {
    const { nombre, descripcion, imagen } = req.body;
    if (!nombre || !nombre.trim()) {
      return res.status(400).json({ error: 'El nombre de la categoría es obligatorio' });
    }
    const updated = await db.updateCategory(req.params.id, { nombre, descripcion, imagen });
    if (!updated) {
      return res.status(404).json({ error: 'Categoría no encontrada' });
    }
    res.json(updated);
  } catch (error) {
    console.error('Error al actualizar categoría:', error);
    res.status(400).json({ error: error.message || 'Error al actualizar categoría' });
  }
});

// API: Eliminar Categoría (Admin)
app.delete('/api/categories/:id', requireAdminAuth, async (req, res) => {
  try {
    const deleted = await db.deleteCategory(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Categoría no encontrada' });
    }
    res.json({ success: true, message: 'Categoría eliminada correctamente' });
  } catch (error) {
    console.error('Error al eliminar categoría:', error);
    res.status(500).json({ error: 'Error al eliminar categoría' });
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

// Subida de imagen permanente (Cloudinary con fallback local)
app.post('/api/admin/upload', requireAdminAuth, upload.single('imagen'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se recibió ningún archivo de imagen' });
    }

    // 1. Si Cloudinary está activo, subir permanentemente a Cloudinary CDN
    if (isCloudinaryConfigured) {
      try {
        const result = await cloudinary.uploader.upload(req.file.path, {
          folder: 'gallery_store',
          resource_type: 'image',
          transformation: [
            { quality: 'auto:good' },
            { fetch_format: 'auto' }
          ]
        });

        // Limpiar archivo temporal del disco
        try { fs.unlinkSync(req.file.path); } catch (e) {}

        console.log(`✅ [Cloudinary] Foto subida exitosamente: ${result.secure_url}`);
        return res.json({
          success: true,
          url: result.secure_url,
          public_id: result.public_id,
          storage: 'cloudinary'
        });
      } catch (cloudErr) {
        console.error('⚠️ [Cloudinary] Fallo al subir a Cloudinary, usando almacenamiento local:', cloudErr.message);
      }
    }

    // 2. Fallback: Almacenamiento local
    const publicUrl = `/uploads/${req.file.filename}`;
    res.json({
      success: true,
      url: publicUrl,
      filename: req.file.filename,
      storage: 'local'
    });
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
    res.status(500).json({ error: error.message || 'Error al crear producto' });
  }
});

// Editar Producto
app.put('/api/products/:id', requireAdminAuth, async (req, res) => {
  try {
    const updated = await db.updateProduct(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ error: 'Producto no encontrado para actualizar' });
    }
    res.json(updated);
  } catch (error) {
    console.error('Error al actualizar producto:', error);
    res.status(500).json({ error: error.message || 'Error al actualizar producto' });
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

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    dbConnected: db.isDatabaseConnected(),
    cloudinaryConnected: isCloudinaryConfigured
  });
});

// Rutas de cliente (SPA fallback)
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin', 'index.html'));
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Iniciar Servidor
async function startServer() {
  await db.initDb();
  app.listen(PORT, () => {
    console.log(`🚀 [Server] Tienda online corriendo en http://localhost:${PORT}`);
    console.log(`🔐 [Admin] Panel de administración en http://localhost:${PORT}/admin`);
  });
}

startServer();
