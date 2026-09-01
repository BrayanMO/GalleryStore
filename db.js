const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

const JSON_PRODUCTS_PATH = path.join(__dirname, 'data', 'products.json');
const JSON_SETTINGS_PATH = path.join(__dirname, 'data', 'settings.json');
const JSON_CATEGORIES_PATH = path.join(__dirname, 'data', 'categories.json');

let pool = null;
let isDbConnected = false;

// 1. Inicializar conexión a PostgreSQL si DATABASE_URL está configurada
async function initDb() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl || databaseUrl.trim() === '') {
    console.log('ℹ️  [DB] DATABASE_URL no definida. Usando almacenamiento local (data/*.json)');
    return;
  }

  try {
    pool = new Pool({
      connectionString: databaseUrl,
      ssl: {
        rejectUnauthorized: false
      }
    });

    const client = await pool.connect();
    console.log('✅ [DB] Conectado exitosamente a PostgreSQL (Neon Cloud)');
    isDbConnected = true;

    // Crear tabla de categorías
    await client.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id VARCHAR(60) PRIMARY KEY,
        nombre VARCHAR(100) UNIQUE NOT NULL,
        descripcion TEXT,
        imagen TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Crear tabla de productos
    await client.query(`
      CREATE TABLE IF NOT EXISTS products (
        id VARCHAR(60) PRIMARY KEY,
        nombre VARCHAR(255) NOT NULL,
        precio NUMERIC(12, 2) NOT NULL,
        categoria VARCHAR(100) NOT NULL,
        tallas JSONB NOT NULL DEFAULT '[]',
        colores JSONB NOT NULL DEFAULT '[]',
        imagenes JSONB NOT NULL DEFAULT '[]',
        descripcion TEXT,
        stock INT DEFAULT 0,
        destacado BOOLEAN DEFAULT false,
        tag VARCHAR(100),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Crear tabla de configuración del sitio (banners, hero, etc.)
    await client.query(`
      CREATE TABLE IF NOT EXISTS site_settings (
        id VARCHAR(50) PRIMARY KEY,
        data JSONB NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Comprobar si categories está vacía y migrar desde JSON
    const catCountRes = await client.query('SELECT COUNT(*) FROM categories');
    const totalCategories = parseInt(catCountRes.rows[0].count, 10);

    if (totalCategories === 0 && fs.existsSync(JSON_CATEGORIES_PATH)) {
      console.log('🏷️ [DB] Inicializando categorías en PostgreSQL...');
      const localCats = JSON.parse(fs.readFileSync(JSON_CATEGORIES_PATH, 'utf-8'));
      for (const c of localCats) {
        await client.query(`
          INSERT INTO categories (id, nombre, descripcion, imagen)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (id) DO NOTHING
        `, [c.id, c.nombre, c.descripcion || '', c.imagen || '']);
      }
      console.log(`✅ [DB] ${localCats.length} categorías migradas a PostgreSQL.`);
    }

    // Comprobar si products está vacía y migrar desde JSON
    const countRes = await client.query('SELECT COUNT(*) FROM products');
    const total = parseInt(countRes.rows[0].count, 10);

    if (total === 0 && fs.existsSync(JSON_PRODUCTS_PATH)) {
      console.log('📦 [DB] Base de datos vacía. Migrando catálogo inicial desde data/products.json...');
      const localProducts = JSON.parse(fs.readFileSync(JSON_PRODUCTS_PATH, 'utf-8'));
      for (const p of localProducts) {
        await client.query(`
          INSERT INTO products (id, nombre, precio, categoria, tallas, colores, imagenes, descripcion, stock, destacado, tag)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          ON CONFLICT (id) DO NOTHING
        `, [
          p.id,
          p.nombre,
          p.precio,
          p.categoria,
          JSON.stringify(p.tallas || []),
          JSON.stringify(p.colores || []),
          JSON.stringify(p.imagenes || []),
          p.descripcion || '',
          p.stock || 0,
          !!p.destacado,
          p.tag || ''
        ]);
      }
      console.log(`✅ [DB] ${localProducts.length} productos migrados a PostgreSQL.`);
    }

    // Comprobar si site_settings está vacía y migrar desde JSON
    const settingsCountRes = await client.query('SELECT COUNT(*) FROM site_settings');
    const totalSettings = parseInt(settingsCountRes.rows[0].count, 10);

    if (totalSettings === 0 && fs.existsSync(JSON_SETTINGS_PATH)) {
      console.log('⚙️ [DB] Inicializando configuración del sitio en PostgreSQL...');
      const localSettings = JSON.parse(fs.readFileSync(JSON_SETTINGS_PATH, 'utf-8'));
      await client.query(`
        INSERT INTO site_settings (id, data)
        VALUES ('main_settings', $1)
        ON CONFLICT (id) DO NOTHING
      `, [JSON.stringify(localSettings)]);
      console.log('✅ [DB] Configuración del sitio migrada a PostgreSQL.');
    }

    client.release();
  } catch (error) {
    console.error('⚠️ [DB] No se pudo conectar a PostgreSQL:', error.message);
    console.log('ℹ️  [DB] Continuando con almacenamiento local (data/*.json)');
    isDbConnected = false;
  }
}

// -------------------------------------------------------------
// OPERACIONES AUXILIARES LOCALES (JSON)
// -------------------------------------------------------------
function readJsonProducts() {
  if (!fs.existsSync(JSON_PRODUCTS_PATH)) return [];
  return JSON.parse(fs.readFileSync(JSON_PRODUCTS_PATH, 'utf-8') || '[]');
}

function writeJsonProducts(products) {
  fs.writeFileSync(JSON_PRODUCTS_PATH, JSON.stringify(products, null, 2), 'utf-8');
}

function readJsonSettings() {
  if (!fs.existsSync(JSON_SETTINGS_PATH)) {
    return {
      storeName: process.env.STORE_NAME || 'AURA | Studio & Apparel',
      whatsappNumber: process.env.WHATSAPP_NUMBER || '5491123456789',
      currencySymbol: process.env.CURRENCY_SYMBOL || '$',
      currencyCode: process.env.CURRENCY_CODE || 'ARS'
    };
  }
  return JSON.parse(fs.readFileSync(JSON_SETTINGS_PATH, 'utf-8'));
}

function writeJsonSettings(settings) {
  fs.writeFileSync(JSON_SETTINGS_PATH, JSON.stringify(settings, null, 2), 'utf-8');
}

function mapDbProduct(row) {
  if (!row) return null;
  return {
    id: row.id,
    nombre: row.nombre,
    precio: parseFloat(row.precio),
    categoria: row.categoria,
    tallas: typeof row.tallas === 'string' ? JSON.parse(row.tallas) : row.tallas || [],
    colores: typeof row.colores === 'string' ? JSON.parse(row.colores) : row.colores || [],
    imagenes: typeof row.imagenes === 'string' ? JSON.parse(row.imagenes) : row.imagenes || [],
    descripcion: row.descripcion || '',
    stock: parseInt(row.stock, 10) || 0,
    destacado: Boolean(row.destacado),
    tag: row.tag || '',
    created_at: row.created_at
  };
}

// -------------------------------------------------------------
// GESTIÓN DE CONFIGURACIÓN DEL SITIO (BANNERS, HERO, ETC.)
// -------------------------------------------------------------
async function getSettings() {
  let settingsData = null;
  if (isDbConnected && pool) {
    try {
      const res = await pool.query("SELECT data FROM site_settings WHERE id = 'main_settings'");
      if (res.rows.length > 0) {
        const data = res.rows[0].data;
        settingsData = typeof data === 'string' ? JSON.parse(data) : data;
      }
    } catch (err) {
      console.error('Error al leer site_settings de PostgreSQL:', err.message);
    }
  }

  if (!settingsData) {
    settingsData = readJsonSettings();
  }

  return {
    ...settingsData,
    storeName: settingsData.storeName || process.env.STORE_NAME || 'Gallery | Store',
    whatsappNumber: settingsData.whatsappNumber || process.env.WHATSAPP_NUMBER || '',
    currencySymbol: settingsData.currencySymbol || process.env.CURRENCY_SYMBOL || '',
    currencyCode: settingsData.currencyCode || process.env.CURRENCY_CODE || ''
  };
}

async function updateSettings(newSettings) {
  const current = await getSettings();
  const merged = {
    ...current,
    ...newSettings,
    banner: { ...(current.banner || {}), ...(newSettings.banner || {}) },
    hero: { ...(current.hero || {}), ...(newSettings.hero || {}) },
    featuredSection: { ...(current.featuredSection || {}), ...(newSettings.featuredSection || {}) },
    paymentMethods: newSettings.paymentMethods !== undefined ? newSettings.paymentMethods : (current.paymentMethods || {}),
    categoryCards: newSettings.categoryCards !== undefined ? newSettings.categoryCards : current.categoryCards
  };

  if (isDbConnected && pool) {
    try {
      await pool.query(`
        INSERT INTO site_settings (id, data, updated_at)
        VALUES ('main_settings', $1, CURRENT_TIMESTAMP)
        ON CONFLICT (id) DO UPDATE SET data = $1, updated_at = CURRENT_TIMESTAMP
      `, [JSON.stringify(merged)]);
      writeJsonSettings(merged); // Sincronizar archivo local también
      return merged;
    } catch (err) {
      console.error('Error al actualizar site_settings en PostgreSQL:', err.message);
    }
  }

  writeJsonSettings(merged);
  return merged;
}

// -------------------------------------------------------------
// CRUD DE PRODUCTOS
// -------------------------------------------------------------
async function getAllProducts(filters = {}) {
  const { category, size, search, featured } = filters;

  if (isDbConnected && pool) {
    let query = 'SELECT * FROM products WHERE 1=1';
    const values = [];
    let paramIndex = 1;

    if (category && category.toLowerCase() !== 'todos') {
      query += ` AND LOWER(categoria) = LOWER($${paramIndex++})`;
      values.push(category);
    }

    if (featured === 'true' || featured === true) {
      query += ` AND destacado = true`;
    }

    if (search) {
      query += ` AND (LOWER(nombre) LIKE $${paramIndex} OR LOWER(descripcion) LIKE $${paramIndex})`;
      values.push(`%${search.toLowerCase()}%`);
      paramIndex++;
    }

    query += ' ORDER BY created_at DESC';

    const res = await pool.query(query, values);
    let products = res.rows.map(mapDbProduct);

    if (size) {
      products = products.filter(p => p.tallas.includes(size));
    }

    return products;
  }

  // Fallback local
  let products = readJsonProducts();

  if (category && category.toLowerCase() !== 'todos') {
    products = products.filter(p => p.categoria.toLowerCase() === category.toLowerCase());
  }

  if (size) {
    products = products.filter(p => p.tallas && p.tallas.includes(size));
  }

  if (search) {
    const term = search.toLowerCase();
    products = products.filter(p =>
      p.nombre.toLowerCase().includes(term) ||
      (p.descripcion && p.descripcion.toLowerCase().includes(term))
    );
  }

  if (featured === 'true' || featured === true) {
    products = products.filter(p => p.destacado);
  }

  return products;
}

async function getProductById(id) {
  if (isDbConnected && pool) {
    const res = await pool.query('SELECT * FROM products WHERE id = $1', [id]);
    return res.rows[0] ? mapDbProduct(res.rows[0]) : null;
  }

  const products = readJsonProducts();
  return products.find(p => p.id === id) || null;
}

function readJsonCategories() {
  if (!fs.existsSync(JSON_CATEGORIES_PATH)) return [];
  return JSON.parse(fs.readFileSync(JSON_CATEGORIES_PATH, 'utf-8') || '[]');
}

function writeJsonCategories(categories) {
  fs.writeFileSync(JSON_CATEGORIES_PATH, JSON.stringify(categories, null, 2), 'utf-8');
}

async function getAllCategories() {
  if (isDbConnected && pool) {
    const res = await pool.query(`
      SELECT c.*, COUNT(p.id)::int AS "totalProductos"
      FROM categories c
      LEFT JOIN products p ON LOWER(p.categoria) = LOWER(c.nombre)
      GROUP BY c.id, c.nombre, c.descripcion, c.imagen, c.created_at
      ORDER BY c.nombre ASC
    `);
    return res.rows;
  }

  const localCats = readJsonCategories();
  const products = readJsonProducts();
  return localCats.map(c => ({
    ...c,
    totalProductos: products.filter(p => (p.categoria || '').toLowerCase() === (c.nombre || '').toLowerCase()).length
  }));
}

async function getCategories() {
  const all = await getAllCategories();
  const names = all.map(c => c.nombre);
  return ['Todos', ...names];
}

async function createCategory(data) {
  const nombre = (data.nombre || '').trim();
  if (!nombre) throw new Error('El nombre de la categoría es obligatorio');
  const id = data.id || `cat-${Date.now()}-${Math.round(Math.random() * 1e4)}`;
  const descripcion = data.descripcion || '';
  const imagen = data.imagen || '';

  if (isDbConnected && pool) {
    const res = await pool.query(`
      INSERT INTO categories (id, nombre, descripcion, imagen)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [id, nombre, descripcion, imagen]);
    return res.rows[0];
  }

  const cats = readJsonCategories();
  const exists = cats.find(c => c.nombre.toLowerCase() === nombre.toLowerCase());
  if (exists) throw new Error('Ya existe una categoría con ese nombre');
  const newCat = { id, nombre, descripcion, imagen };
  cats.push(newCat);
  writeJsonCategories(cats);
  return newCat;
}

async function updateCategory(id, data) {
  const nombre = (data.nombre || '').trim();
  if (!nombre) throw new Error('El nombre de la categoría es obligatorio');
  const descripcion = data.descripcion !== undefined ? data.descripcion : '';
  const imagen = data.imagen !== undefined ? data.imagen : '';

  if (isDbConnected && pool) {
    const currentRes = await pool.query('SELECT * FROM categories WHERE id = $1', [id]);
    if (currentRes.rows.length === 0) return null;
    const oldName = currentRes.rows[0].nombre;

    const res = await pool.query(`
      UPDATE categories
      SET nombre = $2, descripcion = $3, imagen = $4
      WHERE id = $1
      RETURNING *
    `, [id, nombre, descripcion, imagen]);

    if (oldName.toLowerCase() !== nombre.toLowerCase()) {
      await pool.query('UPDATE products SET categoria = $1 WHERE LOWER(categoria) = LOWER($2)', [nombre, oldName]);
    }
    return res.rows[0];
  }

  const cats = readJsonCategories();
  const index = cats.findIndex(c => c.id === id);
  if (index === -1) return null;
  const oldName = cats[index].nombre;

  cats[index] = { ...cats[index], nombre, descripcion, imagen };
  writeJsonCategories(cats);

  if (oldName.toLowerCase() !== nombre.toLowerCase()) {
    const products = readJsonProducts();
    let updated = false;
    products.forEach(p => {
      if ((p.categoria || '').toLowerCase() === oldName.toLowerCase()) {
        p.categoria = nombre;
        updated = true;
      }
    });
    if (updated) writeJsonProducts(products);
  }

  return cats[index];
}

async function deleteCategory(id) {
  if (isDbConnected && pool) {
    const res = await pool.query('DELETE FROM categories WHERE id = $1 RETURNING *', [id]);
    return res.rowCount > 0;
  }

  const cats = readJsonCategories();
  const filtered = cats.filter(c => c.id !== id);
  if (filtered.length !== cats.length) {
    writeJsonCategories(filtered);
    return true;
  }
  return false;
}

async function createProduct(data) {
  const newId = data.id || `prod-${Date.now()}`;
  const tallas = Array.isArray(data.tallas) ? data.tallas : [];
  const colores = Array.isArray(data.colores) ? data.colores : [];
  const imagenes = Array.isArray(data.imagenes) ? data.imagenes : [];

  const product = {
    id: newId,
    nombre: data.nombre,
    precio: parseFloat(data.precio) || 0,
    categoria: data.categoria || 'General',
    tallas,
    colores,
    imagenes,
    descripcion: data.descripcion || '',
    stock: parseInt(data.stock, 10) || 0,
    destacado: Boolean(data.destacado),
    tag: data.tag || ''
  };

  if (isDbConnected && pool) {
    const query = `
      INSERT INTO products (id, nombre, precio, categoria, tallas, colores, imagenes, descripcion, stock, destacado, tag)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;
    const res = await pool.query(query, [
      product.id,
      product.nombre,
      product.precio,
      product.categoria,
      JSON.stringify(product.tallas),
      JSON.stringify(product.colores),
      JSON.stringify(product.imagenes),
      product.descripcion,
      product.stock,
      product.destacado,
      product.tag
    ]);
    return mapDbProduct(res.rows[0]);
  }

  const products = readJsonProducts();
  products.unshift(product);
  writeJsonProducts(products);
  return product;
}

async function updateProduct(id, data) {
  const tallas = Array.isArray(data.tallas) ? data.tallas : undefined;
  const colores = Array.isArray(data.colores) ? data.colores : undefined;
  const imagenes = Array.isArray(data.imagenes) ? data.imagenes : undefined;

  if (isDbConnected && pool) {
    const current = await getProductById(id);
    if (!current) return null;

    const updated = {
      nombre: data.nombre !== undefined ? data.nombre : current.nombre,
      precio: data.precio !== undefined ? parseFloat(data.precio) : current.precio,
      categoria: data.categoria !== undefined ? data.categoria : current.categoria,
      tallas: tallas !== undefined ? tallas : current.tallas,
      colores: colores !== undefined ? colores : current.colores,
      imagenes: imagenes !== undefined ? imagenes : current.imagenes,
      descripcion: data.descripcion !== undefined ? data.descripcion : current.descripcion,
      stock: data.stock !== undefined ? parseInt(data.stock, 10) : current.stock,
      destacado: data.destacado !== undefined ? Boolean(data.destacado) : current.destacado,
      tag: data.tag !== undefined ? data.tag : current.tag
    };

    const query = `
      UPDATE products
      SET nombre = $1, precio = $2, categoria = $3, tallas = $4, colores = $5,
          imagenes = $6, descripcion = $7, stock = $8, destacado = $9, tag = $10
      WHERE id = $11
      RETURNING *
    `;

    const res = await pool.query(query, [
      updated.nombre,
      updated.precio,
      updated.categoria,
      JSON.stringify(updated.tallas),
      JSON.stringify(updated.colores),
      JSON.stringify(updated.imagenes),
      updated.descripcion,
      updated.stock,
      updated.destacado,
      updated.tag,
      id
    ]);

    return res.rows[0] ? mapDbProduct(res.rows[0]) : null;
  }

  const products = readJsonProducts();
  const index = products.findIndex(p => p.id === id);
  if (index === -1) return null;

  products[index] = {
    ...products[index],
    ...data,
    id,
    precio: data.precio !== undefined ? parseFloat(data.precio) : products[index].precio,
    stock: data.stock !== undefined ? parseInt(data.stock, 10) : products[index].stock,
    destacado: data.destacado !== undefined ? Boolean(data.destacado) : products[index].destacado,
    tallas: tallas !== undefined ? tallas : products[index].tallas,
    colores: colores !== undefined ? colores : products[index].colores,
    imagenes: imagenes !== undefined ? imagenes : products[index].imagenes
  };

  writeJsonProducts(products);
  return products[index];
}

async function deleteProduct(id) {
  if (isDbConnected && pool) {
    const res = await pool.query('DELETE FROM products WHERE id = $1 RETURNING id', [id]);
    return res.rowCount > 0;
  }

  const products = readJsonProducts();
  const initialLength = products.length;
  const filtered = products.filter(p => p.id !== id);
  if (filtered.length !== initialLength) {
    writeJsonProducts(filtered);
    return true;
  }
  return false;
}

module.exports = {
  initDb,
  getSettings,
  updateSettings,
  getAllProducts,
  getProductById,
  getCategories,
  getAllCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  createProduct,
  updateProduct,
  deleteProduct,
  isDatabaseConnected: () => isDbConnected
};
