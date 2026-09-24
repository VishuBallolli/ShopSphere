const pool = require('../config/db');

const validStatuses = new Set([
  'pending',
  'confirmed',
  'shipped',
  'delivered',
  'cancelled',
]);

const getPositiveInteger = (value) => {
  return Number.isInteger(value) && value > 0 ? value : null;
};

const getOrder = async (connection, userId, orderId) => {
  const orderQuery = userId === null
    ? `SELECT id, user_id, total_amount, status, created_at, updated_at
       FROM orders
       WHERE id = ?`
    : `SELECT id, user_id, total_amount, status, created_at, updated_at
       FROM orders
       WHERE id = ? AND user_id = ?`;
  const orderParams = userId === null ? [orderId] : [orderId, userId];
  const [orders] = await connection.query(
    orderQuery,
    orderParams
  );

  if (orders.length === 0) {
    return null;
  }

  const [items] = await connection.query(
    `SELECT
      oi.id,
      oi.product_id,
      p.name AS product_name,
      oi.quantity,
      oi.price,
      (oi.price * oi.quantity) AS subtotal
    FROM order_items oi
    LEFT JOIN products p ON oi.product_id = p.id
    WHERE oi.order_id = ?
    ORDER BY oi.id`,
    [orderId]
  );

  return {
    order: orders[0],
    items,
  };
};

const createOrder = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [cartItems] = await connection.query(
      `SELECT
        ci.product_id,
        ci.quantity,
        p.id AS product_exists,
        p.name,
        p.price,
        p.stock
      FROM cart_items ci
      LEFT JOIN products p ON ci.product_id = p.id
      WHERE ci.user_id = ?
      ORDER BY ci.id
      FOR UPDATE`,
      [req.user.id]
    );

    if (cartItems.length === 0) {
      await connection.rollback();
      return res.status(400).json({ error: 'Cannot checkout with an empty cart' });
    }

    let totalCents = 0;
    for (const item of cartItems) {
      if (!getPositiveInteger(item.product_id) || !getPositiveInteger(item.quantity)) {
        await connection.rollback();
        return res.status(400).json({ error: 'Cart contains invalid product data' });
      }

      if (!item.product_exists) {
        await connection.rollback();
        return res.status(404).json({ error: 'A product in the cart no longer exists' });
      }

      if (item.quantity > item.stock) {
        await connection.rollback();
        return res.status(409).json({
          error: `Insufficient stock for product ${item.product_id}`,
        });
      }

      totalCents += Math.round(Number(item.price) * 100) * item.quantity;
    }

    const totalAmount = (totalCents / 100).toFixed(2);
    const [orderResult] = await connection.query(
      'INSERT INTO orders (user_id, total_amount, status) VALUES (?, ?, ?)',
      [req.user.id, totalAmount, 'pending']
    );
    const orderId = orderResult.insertId;

    for (const item of cartItems) {
      await connection.query(
        'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)',
        [orderId, item.product_id, item.quantity, item.price]
      );

      const [stockResult] = await connection.query(
        'UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?',
        [item.quantity, item.product_id, item.quantity]
      );

      if (stockResult.affectedRows === 0) {
        throw new Error('Product stock changed during checkout');
      }
    }

    await connection.query('DELETE FROM cart_items WHERE user_id = ?', [req.user.id]);

    const createdOrder = await getOrder(connection, req.user.id, orderId);
    await connection.commit();
    res.status(201).json(createdOrder);
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ error: 'Failed to create order' });
  } finally {
    connection.release();
  }
};

const getOrders = async (req, res) => {
  try {
    const [orders] = await pool.query(
      `SELECT id, total_amount, status, created_at, updated_at
       FROM orders
       WHERE user_id = ?
       ORDER BY created_at DESC, id DESC`,
      [req.user.id]
    );

    res.status(200).json(orders);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
};

const getOrderById = async (req, res) => {
  const orderId = getPositiveInteger(Number(req.params.id));

  if (!orderId) {
    return res.status(400).json({ error: 'Invalid order id' });
  }

  try {
    const order = await getOrder(pool, req.user.id, orderId);

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.status(200).json(order);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch order' });
  }
};

const updateOrderStatus = async (req, res) => {
  const orderId = getPositiveInteger(Number(req.params.id));
  const status = req.body?.status;

  if (!orderId) {
    return res.status(400).json({ error: 'Invalid order id' });
  }

  if (typeof status !== 'string' || !validStatuses.has(status)) {
    return res.status(400).json({ error: 'Invalid order status' });
  }

  try {
    const [result] = await pool.query(
      'UPDATE orders SET status = ? WHERE id = ?',
      [status, orderId]
    );

    if (result.affectedRows === 0) {
      const [orders] = await pool.query('SELECT id FROM orders WHERE id = ?', [orderId]);

      if (orders.length === 0) {
        return res.status(404).json({ error: 'Order not found' });
      }
    }

    const order = await getOrder(pool, null, orderId);
    res.status(200).json(order);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update order status' });
  }
};

module.exports = {
  createOrder,
  getOrders,
  getOrderById,
  updateOrderStatus,
};