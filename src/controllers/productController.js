const dbHelper = require('../config/dbHelper');

// Mock Product Seeding Data
const demoProducts = [
  {
    _id: "60c72b2f9b1d8a25c8cf3f01",
    name: "Boost Kola Premium",
    description: "Classic cola taste supercharged with natural caffeine, organic cane sugar, and ginseng extracts for an instantaneous focus surge.",
    price: 3.49,
    category: "soft-drinks",
    stock: 120,
    rating: 4.8,
    image: "/assets/cola_premium.png",
    isSugarFree: false,
    isLimitedEdition: false
  },
  {
    _id: "60c72b2f9b1d8a25c8cf3f02",
    name: "Vortex Energy Volt",
    description: "Unleash the ultimate wave of electrical current. Powered by 160mg caffeine, taurine, and high B-Vitamin complexes.",
    price: 4.29,
    category: "energy-drinks",
    stock: 85,
    rating: 4.9,
    image: "/assets/energy_volt.png",
    isSugarFree: false,
    isLimitedEdition: false
  },
  {
    _id: "60c72b2f9b1d8a25c8cf3f03",
    name: "Citrus Rush Zero",
    description: "Explosive, tangy lemon-lime splash with zero sugar, zero calories, and maximum refreshment to keep your vibes active.",
    price: 2.99,
    category: "sugar-free",
    stock: 200,
    rating: 4.6,
    image: "/assets/citrus_zero.png",
    isSugarFree: true,
    isLimitedEdition: false
  },
  {
    _id: "60c72b2f9b1d8a25c8cf3f04",
    name: "Galactic Grape Supernova",
    description: "An interplanetary burst of Concord grape combined with green tea extract and L-theanine for jitter-free physical stamina.",
    price: 4.99,
    category: "limited-editions",
    stock: 45,
    rating: 4.9,
    image: "/assets/galactic_grape.png",
    isSugarFree: false,
    isLimitedEdition: true
  },
  {
    _id: "60c72b2f9b1d8a25c8cf3f05",
    name: "Neon Lime Punch",
    description: "Electric lime punch with a smooth sparkling base, offering a highly sweet, sour, and punchy finish.",
    price: 3.19,
    category: "soft-drinks",
    stock: 150,
    rating: 4.4,
    image: "/assets/lime_punch.png",
    isSugarFree: false,
    isLimitedEdition: false
  },
  {
    _id: "60c72b2f9b1d8a25c8cf3f06",
    name: "Ruby Dragon Fruit Energy",
    description: "Exotic dragon fruit flavor combined with raw green coffee beans for sustained energy, and a clean crisp tropical aftertaste.",
    price: 4.49,
    category: "energy-drinks",
    stock: 90,
    rating: 4.7,
    image: "/assets/dragon_fruit.png",
    isSugarFree: false,
    isLimitedEdition: false
  },
  {
    _id: "60c72b2f9b1d8a25c8cf3f07",
    name: "Frostbite Glacier Zero",
    description: "Sub-zero ice berry cooling effect, completely sugar-free. Formulated with electrolytes to keep your hydration high.",
    price: 3.29,
    category: "sugar-free",
    stock: 110,
    rating: 4.5,
    image: "/assets/frostbite_zero.png",
    isSugarFree: true,
    isLimitedEdition: false
  },
  {
    _id: "60c72b2f9b1d8a25c8cf3f08",
    name: "Cyber Punch Eclipse",
    description: "Dark berry, cherry, and blackcurrant fusion. Released under limited quantities for esports tournament champions.",
    price: 5.49,
    category: "limited-editions",
    stock: 30,
    rating: 4.9,
    image: "/assets/cyber_punch.png",
    isSugarFree: false,
    isLimitedEdition: true
  }
];

// Helper to seed database if empty
const seedProductsIfNeeded = async () => {
  try {
    const products = await dbHelper.products.find();
    if (products.length === 0) {
      console.log('[DATABASE SEED] Seeding database with premium drink catalog...');
      
      // Ensure categories exist
      const categories = await dbHelper.categories.find();
      if (categories.length === 0) {
        await dbHelper.categories.create({ name: 'Soft Drinks', description: 'Glow-up sodas and carbonated refreshments' });
        await dbHelper.categories.create({ name: 'Energy Drinks', description: 'High caffeine and focus enhancers' });
        await dbHelper.categories.create({ name: 'Sugar-Free', description: 'Zero sugar, maximum refreshment' });
        await dbHelper.categories.create({ name: 'Limited Editions', description: 'Rare drops and collectible cans' });
      }

      for (const prod of demoProducts) {
        await dbHelper.products.create(prod);
      }
      console.log('[DATABASE SEED] Seeding complete! 8 premium items created.');
    }
  } catch (error) {
    console.error('Error seeding products:', error);
  }
};

// @desc    Get all products (with search, category filter, sugar-free, limited edition)
// @route   GET /api/products
// @access  Public
const getProducts = async (req, res) => {
  try {
    // Run seed checking
    await seedProductsIfNeeded();

    const { category, isSugarFree, isLimitedEdition, search } = req.query;

    const filters = {};
    if (category && category !== 'all') {
      filters.category = category;
    }
    if (isSugarFree === 'true') {
      filters.isSugarFree = true;
    }
    if (isLimitedEdition === 'true') {
      filters.isLimitedEdition = true;
    }

    let products = await dbHelper.products.find(filters);

    // Apply search filter in memory for consistency across DB interfaces
    if (search) {
      const q = search.toLowerCase();
      products = products.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q)
      );
    }

    res.status(200).json({
      success: true,
      count: products.length,
      products
    });
  } catch (error) {
    console.error('Fetch products error:', error);
    res.status(500).json({ success: false, message: 'Server error retrieving products' });
  }
};

// @desc    Get single product details
// @route   GET /api/products/:id
// @access  Public
const getProductById = async (req, res) => {
  try {
    const product = await dbHelper.products.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    res.status(200).json({ success: true, product });
  } catch (error) {
    console.error('Fetch single product error:', error);
    res.status(500).json({ success: false, message: 'Server error retrieving product detail' });
  }
};

// @desc    Create a product
// @route   POST /api/products
// @access  Private/Admin
const createProduct = async (req, res) => {
  try {
    const { name, description, price, category, stock, isSugarFree, isLimitedEdition } = req.body;

    if (!name || !description || !price || !category) {
      return res.status(400).json({ success: false, message: 'Please enter all required fields: name, description, price, category' });
    }

    // Set uploaded file image path or use default placeholder
    let image = '/assets/placeholder-drink.png';
    if (req.file) {
      image = `/uploads/${req.file.filename}`;
    }

    const newProd = await dbHelper.products.create({
      name,
      description,
      price: Number(price),
      category,
      stock: stock ? Number(stock) : 10,
      image,
      isSugarFree: isSugarFree === 'true' || isSugarFree === true,
      isLimitedEdition: isLimitedEdition === 'true' || isLimitedEdition === true
    });

    res.status(201).json({ success: true, product: newProd });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ success: false, message: 'Server error creating product' });
  }
};

// @desc    Update a product
// @route   PUT /api/products/:id
// @access  Private/Admin
const updateProduct = async (req, res) => {
  try {
    const productId = req.params.id;
    const existingProduct = await dbHelper.products.findById(productId);

    if (!existingProduct) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const { name, description, price, category, stock, isSugarFree, isLimitedEdition } = req.body;

    const updateFields = {};
    if (name) updateFields.name = name;
    if (description) updateFields.description = description;
    if (price) updateFields.price = Number(price);
    if (category) updateFields.category = category;
    if (stock !== undefined) updateFields.stock = Number(stock);
    
    if (isSugarFree !== undefined) {
      updateFields.isSugarFree = isSugarFree === 'true' || isSugarFree === true;
    }
    if (isLimitedEdition !== undefined) {
      updateFields.isLimitedEdition = isLimitedEdition === 'true' || isLimitedEdition === true;
    }

    if (req.file) {
      updateFields.image = `/uploads/${req.file.filename}`;
    }

    const updated = await dbHelper.products.update(productId, updateFields);

    res.status(200).json({ success: true, product: updated });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ success: false, message: 'Server error updating product' });
  }
};

// @desc    Delete a product
// @route   DELETE /api/products/:id
// @access  Private/Admin
const deleteProduct = async (req, res) => {
  try {
    const deleted = await dbHelper.products.delete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    res.status(200).json({ success: true, message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ success: false, message: 'Server error deleting product' });
  }
};

module.exports = {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  seedProductsIfNeeded
};
