const dbHelper = require('../config/dbHelper');

// @desc    Get logged in user's cart
// @route   GET /api/cart
// @access  Private
const getCart = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const cart = await dbHelper.carts.getByUserId(userId);
    
    res.status(200).json({ success: true, cart });
  } catch (error) {
    console.error('Fetch cart error:', error);
    res.status(500).json({ success: false, message: 'Server error retrieving shopping cart' });
  }
};

// @desc    Update/Save user's cart
// @route   POST /api/cart
// @access  Private
const updateCart = async (req, res) => {
  const { items } = req.body; // Array of { product: id, quantity: num }

  try {
    if (!items || !Array.isArray(items)) {
      return res.status(400).json({ success: false, message: 'Invalid items array provided' });
    }

    const userId = req.user._id || req.user.id;
    const updatedCart = await dbHelper.carts.save(userId, items);

    res.status(200).json({ success: true, cart: updatedCart });
  } catch (error) {
    console.error('Save cart error:', error);
    res.status(500).json({ success: false, message: 'Server error updating shopping cart' });
  }
};

module.exports = {
  getCart,
  updateCart
};
