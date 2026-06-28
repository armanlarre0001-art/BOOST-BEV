const express = require('express');
const router = express.Router();
const { getCategories, createCategory } = require('../controllers/categoryController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

router.route('/')
  .get(getCategories)
  .post(protect, adminOnly, createCategory);

module.exports = router;
