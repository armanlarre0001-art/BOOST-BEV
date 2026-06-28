const dbHelper = require('../config/dbHelper');

// @desc    Create a new order
// @route   POST /api/orders
// @access  Private
const createOrder = async (req, res) => {
  const { items, totalAmount, shippingAddress, paymentMethod } = req.body;

  try {
    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, message: 'No items in order' });
    }

    if (!shippingAddress || !shippingAddress.address || !shippingAddress.city || !shippingAddress.postalCode || !shippingAddress.country) {
      return res.status(400).json({ success: false, message: 'Please provide full shipping address details' });
    }

    // Verify stock availability and build clean order items list
    const orderItems = [];
    for (const item of items) {
      const prodId = typeof item.product === 'object' ? item.product._id : item.product;
      const product = await dbHelper.products.findById(prodId);
      
      if (!product) {
        return res.status(404).json({ success: false, message: `Product not found: ${item.name || prodId}` });
      }

      if (product.stock < item.quantity) {
        return res.status(400).json({ success: false, message: `Insufficient stock for ${product.name}. Available: ${product.stock}` });
      }

      orderItems.push({
        product: product._id,
        name: product.name,
        price: product.price,
        quantity: item.quantity,
        image: product.image
      });
    }

    const userId = req.user._id || req.user.id;

    // Create Order
    const order = await dbHelper.orders.create({
      user: userId,
      items: orderItems,
      totalAmount,
      shippingAddress,
      paymentMethod: paymentMethod || 'Stripe',
      paymentStatus: 'Paid' // Simulated instant payment validation
    });

    // Clear cart contents in database
    await dbHelper.carts.save(userId, []);

    // Print invoice log
    console.log(`\n================ NEW ORDER CREATED ================`);
    console.log(`Order ID: ${order._id}`);
    console.log(`User ID: ${userId}`);
    console.log(`Total Amount: $${totalAmount}`);
    console.log(`Shipping Address: ${shippingAddress.address}, ${shippingAddress.city}`);
    console.log(`Payment Status: Paid`);
    console.log(`===================================================\n`);

    res.status(201).json({ success: true, order });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ success: false, message: 'Server error during order check out' });
  }
};

// @desc    Get logged in user orders
// @route   GET /api/orders/myorders
// @access  Private
const getMyOrders = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const orders = await dbHelper.orders.find({ user: userId });
    
    res.status(200).json({ success: true, orders });
  } catch (error) {
    console.error('Fetch my orders error:', error);
    res.status(500).json({ success: false, message: 'Server error retrieving user order list' });
  }
};

// @desc    Get order by ID
// @route   GET /api/orders/:id
// @access  Private
const getOrderById = async (req, res) => {
  try {
    const order = await dbHelper.orders.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Authorize: Admin or Order owner
    const userId = req.user._id || req.user.id;
    const orderUserId = typeof order.user === 'object' ? order.user._id : order.user;
    
    if (req.user.role !== 'admin' && orderUserId.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to view this order' });
    }

    res.status(200).json({ success: true, order });
  } catch (error) {
    console.error('Fetch order detail error:', error);
    res.status(500).json({ success: false, message: 'Server error retrieving order detail' });
  }
};

module.exports = {
  createOrder,
  getMyOrders,
  getOrderById
};
