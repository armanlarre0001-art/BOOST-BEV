const fs = require('fs').promises;
const path = require('path');
const bcrypt = require('bcryptjs');

const DATA_DIR = path.join(__dirname, '..', '..', 'data_fallback');

// Helper to ensure data files exist
const initFallbackDB = async () => {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const files = ['users.json', 'products.json', 'categories.json', 'orders.json', 'carts.json'];
    for (const file of files) {
      const filePath = path.join(DATA_DIR, file);
      try {
        await fs.access(filePath);
      } catch {
        await fs.writeFile(filePath, JSON.stringify([], null, 2));
      }
    }
  } catch (error) {
    console.error('Error initializing fallback DB:', error);
  }
};

// Generic read/write helpers
const readCollection = async (collectionName) => {
  const filePath = path.join(DATA_DIR, `${collectionName}.json`);
  try {
    const data = await fs.readFile(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
};

const writeCollection = async (collectionName, data) => {
  const filePath = path.join(DATA_DIR, `${collectionName}.json`);
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
};

// Generate UUID
const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2, 5);

// Model Mocking Implementations
const dbFallback = {
  users: {
    find: async () => readCollection('users'),
    findOne: async (query) => {
      const list = await readCollection('users');
      return list.find(u => {
        for (let key in query) {
          if (u[key] !== query[key]) return false;
        }
        return true;
      });
    },
    findById: async (id) => {
      const list = await readCollection('users');
      return list.find(u => u._id === id);
    },
    create: async (userData) => {
      const list = await readCollection('users');
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(userData.password, salt);
      const newUser = {
        _id: generateId(),
        wishlist: [],
        createdAt: new Date().toISOString(),
        ...userData,
        password: hashedPassword,
        role: userData.role || 'customer'
      };
      list.push(newUser);
      await writeCollection('users', list);
      return newUser;
    },
    updateWishlist: async (userId, productId) => {
      const list = await readCollection('users');
      const idx = list.findIndex(u => u._id === userId);
      if (idx !== -1) {
        if (!list[idx].wishlist) list[idx].wishlist = [];
        const index = list[idx].wishlist.indexOf(productId);
        if (index === -1) {
          list[idx].wishlist.push(productId);
        } else {
          list[idx].wishlist.splice(index, 1);
        }
        await writeCollection('users', list);
        return list[idx];
      }
      return null;
    }
  },

  products: {
    find: async (query = {}) => {
      const list = await readCollection('products');
      return list.filter(p => {
        for (let key in query) {
          if (query[key] !== undefined && p[key] !== query[key]) return false;
        }
        return true;
      });
    },
    findById: async (id) => {
      const list = await readCollection('products');
      return list.find(p => p._id === id);
    },
    create: async (prodData) => {
      const list = await readCollection('products');
      const newProd = {
        _id: generateId(),
        rating: 4.5,
        stock: 10,
        isSugarFree: false,
        isLimitedEdition: false,
        image: '/assets/placeholder-drink.png',
        createdAt: new Date().toISOString(),
        ...prodData,
        price: Number(prodData.price)
      };
      list.push(newProd);
      await writeCollection('products', list);
      return newProd;
    },
    findByIdAndUpdate: async (id, updateData) => {
      const list = await readCollection('products');
      const idx = list.findIndex(p => p._id === id);
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...updateData };
        if (updateData.price !== undefined) list[idx].price = Number(updateData.price);
        if (updateData.stock !== undefined) list[idx].stock = Number(updateData.stock);
        await writeCollection('products', list);
        return list[idx];
      }
      return null;
    },
    findByIdAndDelete: async (id) => {
      let list = await readCollection('products');
      const originalLen = list.length;
      list = list.filter(p => p._id !== id);
      await writeCollection('products', list);
      return list.length < originalLen;
    }
  },

  categories: {
    find: async () => readCollection('categories'),
    findOne: async (query) => {
      const list = await readCollection('categories');
      return list.find(c => {
        for (let key in query) {
          if (c[key] !== query[key]) return false;
        }
        return true;
      });
    },
    create: async (catData) => {
      const list = await readCollection('categories');
      const slug = catData.name
        .toLowerCase()
        .replace(/[^a-z0-9 -]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
      const newCat = {
        _id: generateId(),
        slug,
        createdAt: new Date().toISOString(),
        ...catData
      };
      list.push(newCat);
      await writeCollection('categories', list);
      return newCat;
    }
  },

  carts: {
    findOne: async (query) => {
      const list = await readCollection('carts');
      const cart = list.find(c => c.user === query.user);
      if (!cart) return null;
      // Resolve product data for items
      const products = await readCollection('products');
      const resolvedItems = cart.items.map(item => {
        const prod = products.find(p => p._id === item.product);
        return {
          ...item,
          product: prod || { _id: item.product, name: 'Unknown Drink', price: 0 }
        };
      });
      return { ...cart, items: resolvedItems };
    },
    save: async (cartData) => {
      const list = await readCollection('carts');
      // Normalize items before saving (only save product ID and quantity)
      const sanitizedItems = cartData.items.map(item => {
        const productId = typeof item.product === 'object' ? item.product._id : item.product;
        return {
          product: productId,
          quantity: Number(item.quantity)
        };
      });

      const idx = list.findIndex(c => c.user === cartData.user);
      const savedCart = {
        _id: cartData._id || generateId(),
        user: cartData.user,
        items: sanitizedItems,
        updatedAt: new Date().toISOString()
      };

      if (idx !== -1) {
        list[idx] = savedCart;
      } else {
        list.push(savedCart);
      }
      await writeCollection('carts', list);
      return savedCart;
    }
  },

  orders: {
    find: async (query = {}) => {
      const list = await readCollection('orders');
      return list.filter(o => {
        for (let key in query) {
          if (o[key] !== query[key]) return false;
        }
        return true;
      }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    },
    findById: async (id) => {
      const list = await readCollection('orders');
      return list.find(o => o._id === id);
    },
    create: async (orderData) => {
      const list = await readCollection('orders');
      const newOrder = {
        _id: generateId(),
        paymentStatus: 'Pending',
        orderStatus: 'Pending',
        createdAt: new Date().toISOString(),
        ...orderData
      };
      list.push(newOrder);
      await writeCollection('orders', list);
      return newOrder;
    },
    findByIdAndUpdate: async (id, updateData) => {
      const list = await readCollection('orders');
      const idx = list.findIndex(o => o._id === id);
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...updateData };
        await writeCollection('orders', list);
        return list[idx];
      }
      return null;
    }
  }
};

module.exports = { dbFallback, initFallbackDB };
