const mongoose = require('mongoose');

let isMongoConnected = false;

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/boostbev', {
      serverSelectionTimeoutMS: 3000 // 3 seconds timeout
    });
    isMongoConnected = true;
    console.log(`[DATABASE] MongoDB Connected: ${conn.connection.host}`);
    return true;
  } catch (error) {
    isMongoConnected = false;
    console.warn(`\n[DATABASE WARNING] MongoDB connection failed: ${error.message}`);
    console.warn(`[DATABASE WARNING] Falling back to Local JSON Database persistence.\n`);
    return false;
  }
};

const getMongoStatus = () => isMongoConnected;

module.exports = { connectDB, getMongoStatus };
