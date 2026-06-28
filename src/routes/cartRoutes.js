const express = require('express');
const router = express.Router();
const { getCart, updateCart } = require('../controllers/cartController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect); // protect all cart endpoints

router.route('/')
  .get(getCart)
  .post(updateCart);

module.exports = router;
