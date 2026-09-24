const express = require('express');

const authenticateToken = require('../middleware/auth.middleware');
const authorizeRole = require('../middleware/role.middleware');

const {
  createOrder,
  getOrders,
  getOrderById,
  updateOrderStatus,
} = require('../controllers/orderController');

const router = express.Router();

router.post('/', authenticateToken, createOrder);

router.get('/', authenticateToken, getOrders);

router.get('/:id', authenticateToken, getOrderById);

router.put(
  '/:id/status',
  authenticateToken,
  authorizeRole('admin'),
  updateOrderStatus
);

module.exports = router;
