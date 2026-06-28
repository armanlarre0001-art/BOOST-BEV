// Cart State
let cartItems = [];
let wishlistItems = [];

// Initialize Local Storage Cart
function initCart() {
  const localCart = localStorage.getItem('boostbev_cart');
  if (localCart) {
    cartItems = JSON.parse(localCart);
  }
  
  const localWish = localStorage.getItem('boostbev_wishlist');
  if (localWish) {
    wishlistItems = JSON.parse(localWish);
  }
  
  // Sync if logged in
  const user = window.getCurrentUser();
  if (user) {
    if (user.wishlist) wishlistItems = user.wishlist;
    syncCartWithServer('load');
  }
  
  updateCartUI();
}

// Add Item
async function addToCart(product, quantity = 1) {
  const productId = product._id || product.id;
  const existingItem = cartItems.find(item => {
    const itemId = item.product._id || item.product.id || item.product;
    return itemId === productId;
  });

  if (existingItem) {
    existingItem.quantity += Number(quantity);
  } else {
    cartItems.push({
      product: {
        _id: productId,
        name: product.name,
        price: product.price,
        image: product.image,
        stock: product.stock
      },
      quantity: Number(quantity)
    });
  }

  window.showToast(`${product.name} added to cart`);
  
  localStorage.setItem('boostbev_cart', JSON.stringify(cartItems));
  updateCartUI();
  
  // Sync backend if authenticated
  if (window.getCurrentUser()) {
    await syncCartWithServer('save');
  }
}

// Update Quantity
async function updateCartQuantity(productId, quantity) {
  const item = cartItems.find(item => {
    const itemId = item.product._id || item.product.id || item.product;
    return itemId === productId;
  });

  if (item) {
    item.quantity = Math.max(1, Number(quantity));
    localStorage.setItem('boostbev_cart', JSON.stringify(cartItems));
    updateCartUI();

    if (window.getCurrentUser()) {
      await syncCartWithServer('save');
    }
  }
}

// Remove Item
async function removeFromCart(productId) {
  cartItems = cartItems.filter(item => {
    const itemId = item.product._id || item.product.id || item.product;
    return itemId !== productId;
  });
  
  localStorage.setItem('boostbev_cart', JSON.stringify(cartItems));
  updateCartUI();
  
  window.showToast('Item removed from cart', 'info');

  if (window.getCurrentUser()) {
    await syncCartWithServer('save');
  }
}

// Clear Cart
async function clearCart() {
  cartItems = [];
  localStorage.removeItem('boostbev_cart');
  updateCartUI();

  if (window.getCurrentUser()) {
    await syncCartWithServer('save');
  }
}

// Get Totals
function getCartTotal() {
  return cartItems.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
}

function getCartCount() {
  return cartItems.reduce((sum, item) => sum + item.quantity, 0);
}

// Toggle Wishlist
async function toggleWishlist(productId, productName) {
  const user = window.getCurrentUser();
  
  if (!user) {
    // Local wishlist for guests
    const index = wishlistItems.indexOf(productId);
    if (index === -1) {
      wishlistItems.push(productId);
      window.showToast(`${productName || 'Item'} added to wishlist`);
    } else {
      wishlistItems.splice(index, 1);
      window.showToast(`${productName || 'Item'} removed from wishlist`, 'info');
    }
    localStorage.setItem('boostbev_wishlist', JSON.stringify(wishlistItems));
    updateWishlistUI();
  } else {
    // Remote wishlist for members
    try {
      const data = await window.apiCall(`/auth/wishlist/${productId}`, { method: 'POST' });
      if (data.success) {
        wishlistItems = data.wishlist;
        localStorage.setItem('boostbev_wishlist', JSON.stringify(wishlistItems));
        
        // Sync active user record
        user.wishlist = wishlistItems;
        localStorage.setItem('boostbev_user', JSON.stringify(user));
        
        const isAdded = wishlistItems.includes(productId);
        window.showToast(`${productName || 'Item'} ${isAdded ? 'added to' : 'removed from'} wishlist`, isAdded ? 'success' : 'info');
        updateWishlistUI();
      }
    } catch (err) {
      window.showToast(err.message, 'error');
    }
  }
}

// Server Synchronization
async function syncCartWithServer(action = 'save') {
  try {
    if (action === 'save') {
      const payload = cartItems.map(item => ({
        product: item.product._id || item.product.id || item.product,
        quantity: item.quantity
      }));
      await window.apiCall('/cart', {
        method: 'POST',
        body: { items: payload }
      });
    } else {
      // Load from server database
      const data = await window.apiCall('/cart');
      if (data.success && data.cart && data.cart.items) {
        // Map products format
        cartItems = data.cart.items.map(item => ({
          product: item.product,
          quantity: item.quantity
        }));
        localStorage.setItem('boostbev_cart', JSON.stringify(cartItems));
        updateCartUI();
      }
    }
  } catch (error) {
    console.error('Cart sync error:', error);
  }
}

// Update DOM elements for Cart Drawer
function updateCartUI() {
  const badge = document.getElementById('cart-badge');
  const countSpan = document.getElementById('cart-count-desc');
  const body = document.getElementById('cart-drawer-items');
  const subtotal = document.getElementById('cart-subtotal-price');
  
  if (badge) badge.textContent = getCartCount();
  if (countSpan) countSpan.textContent = `(${getCartCount()} items)`;
  if (subtotal) subtotal.textContent = `$${getCartTotal().toFixed(2)}`;

  if (!body) return;

  if (cartItems.length === 0) {
    body.innerHTML = `
      <div class="cart-empty-message">
        <i class="fas fa-shopping-bag"></i>
        <h3>Your cart is empty</h3>
        <p>Boost your day by adding some premium carbonated energy levels to your cart!</p>
      </div>
    `;
    return;
  }

  body.innerHTML = cartItems.map(item => {
    const prodId = item.product._id || item.product.id || item.product;
    return `
      <div class="cart-item">
        <img class="cart-item-img" src="${item.product.image}" alt="${item.product.name}" onerror="this.src='/assets/placeholder-drink.png'">
        <div class="cart-item-info">
          <h4 class="cart-item-title">${item.product.name}</h4>
          <span class="cart-item-price">$${item.product.price}</span>
          
          <div class="quantity-selector" style="margin-top: 8px; width: fit-content;">
            <button class="qty-btn" onclick="updateCartQuantity('${prodId}', ${item.quantity - 1})">-</button>
            <input class="qty-input" type="text" readonly value="${item.quantity}">
            <button class="qty-btn" onclick="updateCartQuantity('${prodId}', ${item.quantity + 1})">+</button>
          </div>
        </div>
        <i class="fas fa-trash-alt cart-item-remove" onclick="removeFromCart('${prodId}')"></i>
      </div>
    `;
  }).join('');
}

// Update Wishlist icons status in Catalog Cards
function updateWishlistUI() {
  document.querySelectorAll('.wishlist-btn').forEach(btn => {
    const prodId = btn.getAttribute('data-id');
    if (wishlistItems.includes(prodId)) {
      btn.classList.add('active');
      btn.innerHTML = '<i class="fas fa-heart"></i>';
    } else {
      btn.classList.remove('active');
      btn.innerHTML = '<i class="far fa-heart"></i>';
    }
  });
}

// Bind to window global scope
window.initCart = initCart;
window.addToCart = addToCart;
window.updateCartQuantity = updateCartQuantity;
window.removeFromCart = removeFromCart;
window.clearCart = clearCart;
window.getCartTotal = getCartTotal;
window.getCartCount = getCartCount;
window.toggleWishlist = toggleWishlist;
window.updateWishlistUI = updateWishlistUI;
window.cartItems = () => cartItems;
window.wishlistItems = () => wishlistItems;
