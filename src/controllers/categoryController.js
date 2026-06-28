const dbHelper = require('../config/dbHelper');

// @desc    Get all categories
// @route   GET /api/categories
// @access  Public
const getCategories = async (req, res) => {
  try {
    const categories = await dbHelper.categories.find();
    res.status(200).json({ success: true, categories });
  } catch (error) {
    console.error('Fetch categories error:', error);
    res.status(500).json({ success: false, message: 'Server error retrieving categories' });
  }
};

// @desc    Create a new category
// @route   POST /api/categories
// @access  Private/Admin
const createCategory = async (req, res) => {
  const { name, description } = req.body;

  try {
    if (!name || !description) {
      return res.status(400).json({ success: false, message: 'Please provide name and description' });
    }

    const category = await dbHelper.categories.create({ name, description });
    res.status(201).json({ success: true, category });
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({ success: false, message: 'Server error creating category' });
  }
};

module.exports = {
  getCategories,
  createCategory
};
