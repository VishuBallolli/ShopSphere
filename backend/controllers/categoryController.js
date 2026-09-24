const pool = require('../config/db');

const getCategoryId = (value) => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};

const getCategoryInput = (body) => {
  body = body && typeof body === 'object' ? body : {};
  const name = typeof body.name === 'string' ? body.name.trim() : '';

  if (!name) {
    return null;
  }

  return {
    name,
    description: body.description ?? null,
  };
};

const getCategories = async (req, res) => {
  try {
    const [categories] = await pool.query(
      'SELECT id, name, description, created_at, updated_at FROM categories ORDER BY id'
    );
    res.status(200).json(categories);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
};

const getCategoryById = async (req, res) => {
  const id = getCategoryId(req.params.id);

  if (!id) {
    return res.status(400).json({ error: 'Invalid category id' });
  }

  try {
    const [categories] = await pool.query(
      'SELECT id, name, description, created_at, updated_at FROM categories WHERE id = ?',
      [id]
    );

    if (categories.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.status(200).json(categories[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch category' });
  }
};

const createCategory = async (req, res) => {
  const category = getCategoryInput(req.body);

  if (!category) {
    return res.status(400).json({ error: 'Category name is required' });
  }

  try {
    const [result] = await pool.query(
      'INSERT INTO categories (name, description) VALUES (?, ?)',
      [category.name, category.description]
    );

    const [categories] = await pool.query(
      'SELECT id, name, description, created_at, updated_at FROM categories WHERE id = ?',
      [result.insertId]
    );
    res.status(201).json(categories[0]);
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Category name already exists' });
    }

    res.status(500).json({ error: 'Failed to create category' });
  }
};

const updateCategory = async (req, res) => {
  const id = getCategoryId(req.params.id);
  const category = getCategoryInput(req.body);

  if (!id) {
    return res.status(400).json({ error: 'Invalid category id' });
  }

  if (!category) {
    return res.status(400).json({ error: 'Category name is required' });
  }

  try {
    const [result] = await pool.query(
      'UPDATE categories SET name = ?, description = ? WHERE id = ?',
      [category.name, category.description, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    const [categories] = await pool.query(
      'SELECT id, name, description, created_at, updated_at FROM categories WHERE id = ?',
      [id]
    );
    res.status(200).json(categories[0]);
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Category name already exists' });
    }

    res.status(500).json({ error: 'Failed to update category' });
  }
};

const deleteCategory = async (req, res) => {
  const id = getCategoryId(req.params.id);

  if (!id) {
    return res.status(400).json({ error: 'Invalid category id' });
  }

  try {
    const [result] = await pool.query('DELETE FROM categories WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.status(200).json({ message: 'Category deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete category' });
  }
};

module.exports = {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
};