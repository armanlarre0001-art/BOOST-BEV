const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a product name'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Please add a product description']
  },
  price: {
    type: Number,
    required: [true, 'Please add a product price']
  },
  category: {
    type: String, // Store category slug or name (supports both relational ref and fallback keys)
    required: [true, 'Please specify a category']
  },
  stock: {
    type: Number,
    required: [true, 'Please add inventory stock level'],
    default: 10
  },
  rating: {
    type: Number,
    default: 4.5
  },
  image: {
    type: String,
    default: '/assets/placeholder-drink.png'
  },
  isSugarFree: {
    type: Boolean,
    default: false
  },
  isLimitedEdition: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Product', ProductSchema);
