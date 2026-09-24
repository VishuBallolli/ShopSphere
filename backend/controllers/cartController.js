const pool = require('../config/db');

const getPositiveInteger = (value) => {
  return Number.isInteger(value) && value > 0 ? value : null;
};

const getCartItem = async (connection, userId, cartItemId) => {
  const [rows] = await connection.query(
    `SELECT
      ci.id,
      ci.product_id,
      p.name AS product_name,
      p.price,
      ci.quantity,
      (p.price * ci.quantity) AS subtotal
    FROM cart_items ci
    JOIN products p ON ci.product_id = p.id
    WHERE ci.id = ? AND ci.user_id = ?`,
    [cartItemId, userId]
  );

  return rows[0];
};

const getCart = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT
        ci.id,
        ci.product_id,
        p.name AS product_name,
        p.price,
        ci.quantity,
        (p.price * ci.quantity) AS subtotal
      FROM cart_items ci
      JOIN products p ON ci.product_id = p.id
      WHERE ci.user_id = ?
      ORDER BY ci.created_at DESC`,
      [req.user.id]
    );

    const total = rows.reduce(
      (sum, item) => sum + Number(item.subtotal),
      0
    );

    res.json({
      items: rows,
      total: Number(total.toFixed(2)),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch cart' });
  }
};

const addToCart = async (req, res) => {
  const productId = getPositiveInteger(req.body?.product_id);
  const quantity = getPositiveInteger(req.body?.quantity);

  if (!productId || !quantity) {
    return res.status(400).json({ error: 'product_id and quantity must be positive integers' });
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [products] = await connection.query(
      'SELECT id, name, price, stock FROM products WHERE id = ? FOR UPDATE',
      [productId]
    );

    if (products.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Product not found' });
    }

    const product = products[0];
    const [cartItems] = await connection.query(
      'SELECT id, quantity FROM cart_items WHERE user_id = ? AND product_id = ? FOR UPDATE',
      [req.user.id, productId]
    );
    const existingItem = cartItems[0];
    const newQuantity = (existingItem?.quantity || 0) + quantity;

    if (newQuantity > product.stock) {
      await connection.rollback();
      return res.status(409).json({ error: 'Requested quantity exceeds product stock' });
    }

    let cartItemId;
    if (existingItem) {
      await connection.query(
        'UPDATE cart_items SET quantity = ? WHERE id = ? AND user_id = ?',
        [newQuantity, existingItem.id, req.user.id]
      );
      cartItemId = existingItem.id;
    } else {
      const [result] = await connection.query(
        'INSERT INTO cart_items (user_id, product_id, quantity) VALUES (?, ?, ?)',
        [req.user.id, productId, quantity]
      );
      cartItemId = result.insertId;
    }

    const cartItem = await getCartItem(connection, req.user.id, cartItemId);
    await connection.commit();
    res.status(existingItem ? 200 : 201).json(cartItem);
  } catch (error) {
    await connection.rollback();
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Cart item already exists' });
    }
    res.status(500).json({ error: 'Failed to add item to cart' });
  } finally {
    connection.release();
  }
};

const updateCartItem = async (req, res) => {
  const cartItemId = getPositiveInteger(Number(req.params.id));
  const quantity = getPositiveInteger(req.body?.quantity);

  if (!cartItemId) {
    return res.status(400).json({ error: 'Invalid cart item id' });
  }

  if (!quantity) {
    return res.status(400).json({ error: 'quantity must be a positive integer' });
  }

  try {
    const [cartItems] = await pool.query(
      `SELECT ci.id, p.stock
       FROM cart_items ci
       JOIN products p ON ci.product_id = p.id
       WHERE ci.id = ? AND ci.user_id = ?`,
      [cartItemId, req.user.id]
    );

    if (cartItems.length === 0) {
      return res.status(404).json({ error: 'Cart item not found' });
    }

    if (quantity > cartItems[0].stock) {
      return res.status(409).json({ error: 'Requested quantity exceeds product stock' });
    }

    await pool.query(
      'UPDATE cart_items SET quantity = ? WHERE id = ? AND user_id = ?',
      [quantity, cartItemId, req.user.id]
    );

    res.status(200).json(await getCartItem(pool, req.user.id, cartItemId));
  } catch (error) {
    res.status(500).json({ error: 'Failed to update cart item' });
  }
};

const deleteCartItem = async (req, res) => {
  const cartItemId = getPositiveInteger(Number(req.params.id));

  if (!cartItemId) {
    return res.status(400).json({ error: 'Invalid cart item id' });
  }

  try {
    const [result] = await pool.query(
      'DELETE FROM cart_items WHERE id = ? AND user_id = ?',
      [cartItemId, req.user.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Cart item not found' });
    }

    res.status(200).json({ message: 'Cart item deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete cart item' });
  }
};

const clearCart = async (req, res) => {
  try {
    await pool.query('DELETE FROM cart_items WHERE user_id = ?', [req.user.id]);
    res.status(200).json({ message: 'Cart cleared successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to clear cart' });
  }
};

module.exports = {
  getCart,
  addToCart,
  updateCartItem,
  deleteCartItem,
  clearCart,
};