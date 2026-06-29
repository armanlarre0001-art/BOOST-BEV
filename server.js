require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const { connectDB, getMongoStatus } = require('./src/config/db');
const { initFallbackDB } = require('./src/config/dbFallback');
const { seedProductsIfNeeded } = require('./src/controllers/productController');

const app = express();
const PORT = process.env.PORT || 5000;

// Initialize Server Database
const initializeDatabase = async () => {
  // 1. Attempt connection to real MongoDB
  const isMongoConnected = await connectDB();
  
  // 2. Always initialize JSON fallback directories to be ready if needed
  await initFallbackDB();

  // 3. Run seeding operation to ensure database has drinks
  await seedProductsIfNeeded();
};

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Lazy Database Initialization Middleware for Serverless Environments
let dbInitialized = false;
let dbInitializationPromise = null;

const ensureDbConnected = async (req, res, next) => {
  if (!dbInitialized) {
    if (!dbInitializationPromise) {
      dbInitializationPromise = initializeDatabase().then(() => {
        dbInitialized = true;
      });
    }
    await dbInitializationPromise;
  }
  next();
};

app.use(ensureDbConnected);

// Serve Static Frontend Assets
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/auth', require('./src/routes/authRoutes'));
app.use('/api/products', require('./src/routes/productRoutes'));
app.use('/api/categories', require('./src/routes/categoryRoutes'));
app.use('/api/cart', require('./src/routes/cartRoutes'));
app.use('/api/orders', require('./src/routes/orderRoutes'));
app.use('/api/admin', require('./src/routes/adminRoutes'));

// Wildcard fallback for clean single page routing or HTML views
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start Server locally if not running in Vercel Serverless environment
if (!process.env.VERCEL) {
  app.listen(PORT, async () => {
    await initializeDatabase();
    console.log(`\n======================================================`);
    console.log(`BoostBev Server is running on port ${PORT}`);
    console.log(`Mode: http://localhost:${PORT}`);
    console.log(`Database Mode: ${getMongoStatus() ? 'MongoDB (Mongoose)' : 'Local JSON Fallback'}`);
    console.log(`======================================================\n`);
  });
}

module.exports = app;

