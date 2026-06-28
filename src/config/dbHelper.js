const { getMongoStatus } = require('./db');
const { dbFallback } = require('./dbFallback');
const User = require('../models/User');
const Product = require('../models/Product');
const Category = require('../models/Category');
const Cart = require('../models/Cart');
const Order = require('../models/Order');
const bcrypt = require('bcryptjs');

const dbHelper = {
  users: {
    findByEmail: async (email, includePassword = false) => {
      if (getMongoStatus()) {
        if (includePassword) {
          return await User.findOne({ email }).select('+password');
        }
        return await User.findOne({ email });
      } else {
        const user = await dbFallback.users.findOne({ email });
        return user; // in JSON database, password is included directly
      }
    },
    findById: async (id) => {
      if (getMongoStatus()) {
        return await User.findById(id);
      } else {
        return await dbFallback.users.findById(id);
      }
    },
    create: async (userData) => {
      if (getMongoStatus()) {
        return await User.create(userData);
      } else {
        return await dbFallback.users.create(userData);
      }
    },
    toggleWishlist: async (userId, productId) => {
      if (getMongoStatus()) {
        const user = await User.findById(userId);
        if (!user) return null;
        
        const index = user.wishlist.indexOf(productId);
        if (index === -1) {
          user.wishlist.push(productId);
        } else {
          user.wishlist.splice(index, 1);
        }
        await user.save();
        return user;
      } else {
        return await dbFallback.users.updateWishlist(userId, productId);
      }
    },
    comparePassword: async (enteredPassword, hashedPassword) => {
      return await bcrypt.compare(enteredPassword, hashedPassword);
    }
  },

  products: {
    find: async (filters = {}) => {
      if (getMongoStatus()) {
        // Build Mongoose query
        const query = {};
        if (filters.category) query.category = filters.category;
        if (filters.isSugarFree !== undefined) query.isSugarFree = filters.isSugarFree;
        if (filters.isLimitedEdition !== undefined) query.isLimitedEdition = filters.isLimitedEdition;
        return await Product.find(query);
      } else {
        return await dbFallback.products.find(filters);
      }
    },
    findById: async (id) => {
      if (getMongoStatus()) {
        return await Product.findById(id);
      } else {
        return await dbFallback.products.findById(id);
      }
    },
    create: async (prodData) => {
      if (getMongoStatus()) {
        return await Product.create(prodData);
      } else {
        return await dbFallback.products.create(prodData);
      }
    },
    update: async (id, updateData) => {
      if (getMongoStatus()) {
        return await Product.findByIdAndUpdate(id, updateData, { new: true });
      } else {
        return await dbFallback.products.findByIdAndUpdate(id, updateData);
      }
    },
    delete: async (id) => {
      if (getMongoStatus()) {
        const result = await Product.findByIdAndDelete(id);
        return !!result;
      } else {
        return await dbFallback.products.findByIdAndDelete(id);
      }
    }
  },

  categories: {
    find: async () => {
      if (getMongoStatus()) {
        return await Category.find({});
      } else {
        return await dbFallback.categories.find();
      }
    },
    findBySlug: async (slug) => {
      if (getMongoStatus()) {
        return await Category.findOne({ slug });
      } else {
        return await dbFallback.categories.findOne({ slug });
      }
    },
    create: async (catData) => {
      if (getMongoStatus()) {
        return await Category.create(catData);
      } else {
        return await dbFallback.categories.create(catData);
      }
    }
  },

  carts: {
    getByUserId: async (userId) => {
      if (getMongoStatus()) {
        let cart = await Cart.findOne({ user: userId }).populate('items.product');
        if (!cart) {
          cart = await Cart.create({ user: userId, items: [] });
          // populate it back for UI format consistency
          cart = await Cart.findOne({ user: userId }).populate('items.product');
        }
        return cart;
      } else {
        let cart = await dbFallback.carts.findOne({ user: userId });
        if (!cart) {
          cart = await dbFallback.carts.save({ user: userId, items: [] });
          cart = await dbFallback.carts.findOne({ user: userId });
        }
        return cart;
      }
    },
    save: async (userId, items) => {
      if (getMongoStatus()) {
        let cart = await Cart.findOne({ user: userId });
        if (!cart) {
          cart = new Cart({ user: userId, items: [] });
        }
        cart.items = items.map(item => ({
          product: typeof item.product === 'object' ? item.product._id : item.product,
          quantity: item.quantity
        }));
        cart.updatedAt = Date.now();
        await cart.save();
        return await Cart.findOne({ user: userId }).populate('items.product');
      } else {
        const cartData = { user: userId, items };
        const saved = await dbFallback.carts.save(cartData);
        return await dbFallback.carts.findOne({ user: userId });
      }
    }
  },

  orders: {
    find: async (filters = {}) => {
      if (getMongoStatus()) {
        return await Order.find(filters).populate('items.product').sort({ createdAt: -1 });
      } else {
        const orders = await dbFallback.orders.find(filters);
        // Resolve product references in memory for fallback orders
        const products = await dbFallback.products.find();
        return orders.map(order => {
          const resolvedItems = order.items.map(item => {
            const prod = products.find(p => p._id === item.product);
            return { ...item, product: prod || { _id: item.product, name: item.name } };
          });
          return { ...order, items: resolvedItems };
        });
      }
    },
    findById: async (id) => {
      if (getMongoStatus()) {
        return await Order.findById(id).populate('items.product');
      } else {
        const order = await dbFallback.orders.findById(id);
        if (!order) return null;
        const products = await dbFallback.products.find();
        const resolvedItems = order.items.map(item => {
          const prod = products.find(p => p._id === item.product);
          return { ...item, product: prod || { _id: item.product, name: item.name } };
        });
        return { ...order, items: resolvedItems };
      }
    },
    create: async (orderData) => {
      if (getMongoStatus()) {
        // In mongoose, we create the order document
        const newOrder = await Order.create(orderData);
        // Decrement product stock in mongoose
        for (const item of orderData.items) {
          await Product.findByIdAndUpdate(item.product, {
            $inc: { stock: -item.quantity }
          });
        }
        return newOrder;
      } else {
        const newOrder = await dbFallback.orders.create(orderData);
        // Decrement product stock in fallback JSON
        for (const item of orderData.items) {
          const prod = await dbFallback.products.findById(item.product);
          if (prod) {
            const newStock = Math.max(0, prod.stock - item.quantity);
            await dbFallback.products.findByIdAndUpdate(item.product, { stock: newStock });
          }
        }
        return newOrder;
      }
    },
    updateStatus: async (id, statusData) => {
      if (getMongoStatus()) {
        return await Order.findByIdAndUpdate(id, statusData, { new: true });
      } else {
        return await dbFallback.orders.findByIdAndUpdate(id, statusData);
      }
    }
  }
};

module.exports = dbHelper;
