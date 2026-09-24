const express = require('express');

const authenticateToken = require('../middleware/auth.middleware');
const {
  getCart,
  addToCart,
  updateCartItem,
  deleteCartItem,
  clearCart,
} = require('../controllers/cartController');

const router = express.Router();

router.get('/', authenticateToken, getCart);
router.post('/', authenticateToken, addToCart);
router.put('/:id', authenticateToken, updateCartItem);
router.delete('/:id', authenticateToken, deleteCartItem);
router.delete('/', authenticateToken, clearCart);

module.exports = router;