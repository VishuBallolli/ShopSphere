const pool = require('../config/db');

const getProductId = (value) => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};

const getProductInput = (body) => {
  body = body && typeof body === 'object' ? body : {};
  const categoryId = getProductId(body.category_id);
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const price = body.price;
  const stock = body.stock;

  if (
    !categoryId ||
    !name ||
    typeof price !== 'number' ||
    !Number.isFinite(price) ||
    price < 0 ||
    !Number.isInteger(stock) ||
    stock < 0
  ) {
    return null;
  }

  return {
    categoryId,
    name,
    description: body.description ?? null,
    price,
    stock,
    imageUrl: body.image_url ?? null,
  };
};

const productSelect = `
  SELECT
    products.id,
    products.category_id,
    products.name,
    products.description,
    products.price,
    products.stock,
    products.image_url,
    products.created_at,
    products.updated_at,
    categories.name AS category_name
  FROM products
  INNER JOIN categories ON products.category_id = categories.id`;

const getProducts = async (req, res) => {
  try {
    const [products] = await pool.query(`${productSelect} ORDER BY products.id`);
    res.status(200).json(products);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch products' });
  }
};

const getProductById = async (req, res) => {
  const id = getProductId(req.params.id);

  if (!id) {
    return res.status(400).json({ error: 'Invalid product id' });
  }

  try {
    const [products] = await pool.query(`${productSelect} WHERE products.id = ?`, [id]);

    if (products.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.status(200).json(products[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch product' });
  }
};

const categoryExists = async (categoryId) => {
  const [categories] = await pool.query('SELECT id FROM categories WHERE id = ?', [categoryId]);
  return categories.length > 0;
};

const createProduct = async (req, res) => {
  const product = getProductInput(req.body);

  if (!product) {
    return res.status(400).json({ error: 'Invalid product data' });
  }

  try {
    if (!(await categoryExists(product.categoryId))) {
      return res.status(404).json({ error: 'Category not found' });
    }

    const [result] = await pool.query(
      `INSERT INTO products
        (category_id, name, description, price, stock, image_url)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        product.categoryId,
        product.name,
        product.description,
        product.price,
        product.stock,
        product.imageUrl,
      ]
    );

    const [products] = await pool.query(`${productSelect} WHERE products.id = ?`, [result.insertId]);
    res.status(201).json(products[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create product' });
  }
};

const updateProduct = async (req, res) => {
  const id = getProductId(req.params.id);
  const product = getProductInput(req.body);

  if (!id) {
    return res.status(400).json({ error: 'Invalid product id' });
  }

  if (!product) {
    return res.status(400).json({ error: 'Invalid product data' });
  }

  try {
    if (!(await categoryExists(product.categoryId))) {
      return res.status(404).json({ error: 'Category not found' });
    }

    const [result] = await pool.query(
      `UPDATE products
       SET category_id = ?, name = ?, description = ?, price = ?, stock = ?, image_url = ?
       WHERE id = ?`,
      [
        product.categoryId,
        product.name,
        product.description,
        product.price,
        product.stock,
        product.imageUrl,
        id,
      ]
    );

    if (result.affectedRows === 0) {
      const [existingProducts] = await pool.query('SELECT id FROM products WHERE id = ?', [id]);

      if (existingProducts.length === 0) {
        return res.status(404).json({ error: 'Product not found' });
      }
    }

    const [products] = await pool.query(`${productSelect} WHERE products.id = ?`, [id]);
    res.status(200).json(products[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update product' });
  }
};

const deleteProduct = async (req, res) => {
  const id = getProductId(req.params.id);

  if (!id) {
    return res.status(400).json({ error: 'Invalid product id' });
  }

  try {
    const [result] = await pool.query('DELETE FROM products WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.status(200).json({ message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete product' });
  }
};

module.exports = {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
};