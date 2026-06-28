const dbHelper = require('../config/dbHelper');

// @desc    Get Admin Dashboard metrics
// @route   GET /api/admin/stats
// @access  Private/Admin
const getDashboardStats = async (req, res) => {
  try {
    // 1. Fetch data
    const orders = await dbHelper.orders.find();
    const products = await dbHelper.products.find();
    
    // Fallback users count logic
    let usersCount = 0;
    const db = require('../config/db');
    if (db.getMongoStatus()) {
      const User = require('../models/User');
      usersCount = await User.countDocuments();
    } else {
      const { dbFallback } = require('../config/dbFallback');
      const usersList = await dbFallback.users.find();
      usersCount = usersList.length;
    }

    // 2. Calculations
    let totalRevenue = 0;
    orders.forEach(o => {
      if (o.paymentStatus === 'Paid') {
        totalRevenue += o.totalAmount;
      }
    });

    const totalOrders = orders.length;
    const totalProducts = products.length;

    // Filter low stock products (stock < 10)
    const lowStockProducts = products.filter(p => p.stock < 10).map(p => ({
      _id: p._id,
      name: p.name,
      stock: p.stock,
      price: p.price
    }));

    // Slice recent orders (last 5)
    const recentOrders = orders.slice(0, 5).map(o => ({
      _id: o._id,
      totalAmount: o.totalAmount,
      orderStatus: o.orderStatus,
      paymentStatus: o.paymentStatus,
      createdAt: o.createdAt
    }));

    res.status(200).json({
      success: true,
      stats: {
        totalRevenue: Number(totalRevenue.toFixed(2)),
        totalOrders,
        totalProducts,
        totalUsers: usersCount,
        lowStockCount: lowStockProducts.length,
        lowStockProducts,
        recentOrders
      }
    });
  } catch (error) {
    console.error('Fetch dashboard stats error:', error);
    res.status(500).json({ success: false, message: 'Server error compiling dashboard details' });
  }
};

// @desc    Get all system orders
// @route   GET /api/admin/orders
// @access  Private/Admin
const getAllOrders = async (req, res) => {
  try {
    const orders = await dbHelper.orders.find();
    res.status(200).json({ success: true, count: orders.length, orders });
  } catch (error) {
    console.error('Fetch admin orders error:', error);
    res.status(500).json({ success: false, message: 'Server error retrieving all orders' });
  }
};

// @desc    Update order shipping/fulfillment status
// @route   PUT /api/admin/orders/:id
// @access  Private/Admin
const updateOrderStatus = async (req, res) => {
  const { orderStatus, paymentStatus } = req.body;

  try {
    const order = await dbHelper.orders.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const updateFields = {};
    if (orderStatus) updateFields.orderStatus = orderStatus;
    if (paymentStatus) updateFields.paymentStatus = paymentStatus;

    const updated = await dbHelper.orders.updateStatus(req.params.id, updateFields);

    res.status(200).json({ success: true, order: updated });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ success: false, message: 'Server error modifying order fulfillment details' });
  }
};

module.exports = {
  getDashboardStats,
  getAllOrders,
  updateOrderStatus
};
