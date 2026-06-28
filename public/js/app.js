document.addEventListener('DOMContentLoaded', async () => {
  // 1. Initial UI Setup
  initTheme();
  await syncUserNavbarState();
  window.initCart();
  
  // 2. Load Categories and Catalog Products
  await fetchCategories();
  await fetchCatalogProducts();

  // 3. Binding Static Controls
  
  // Search input events
  const searchInput = document.getElementById('catalog-search');
  if (searchInput) {
    searchInput.addEventListener('input', debounce(() => {
      fetchCatalogProducts();
    }, 400));
  }

  // Checkbox Tag filters
  const tagSugarFree = document.getElementById('filter-sugarfree');
  const tagLimited = document.getElementById('filter-limited');
  if (tagSugarFree) tagSugarFree.addEventListener('change', () => fetchCatalogProducts());
  if (tagLimited) tagLimited.addEventListener('change', () => fetchCatalogProducts());

  // Sorting
  const sortSelect = document.getElementById('catalog-sort');
  if (sortSelect) sortSelect.addEventListener('change', () => fetchCatalogProducts());

  // Cart Drawer open/close binding
  const cartBtn = document.getElementById('cart-btn');
  const cartClose = document.getElementById('cart-close-btn');
  const drawerBackdrop = document.getElementById('drawer-backdrop-overlay');
  
  if (cartBtn) cartBtn.addEventListener('click', (e) => { e.preventDefault(); toggleCartDrawer(true); });
  if (cartClose) cartClose.addEventListener('click', () => toggleCartDrawer(false));
  if (drawerBackdrop) drawerBackdrop.addEventListener('click', () => toggleCartDrawer(false));

  // User profile dropdown binding
  const profileBtn = document.getElementById('profile-btn');
  const profileMenu = document.getElementById('profile-dropdown-menu');
  if (profileBtn && profileMenu) {
    profileBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      profileMenu.classList.toggle('show');
    });
    
    document.addEventListener('click', () => {
      profileMenu.classList.remove('show');
    });
  }

  // FAQ list accordions
  const faqQuestions = document.querySelectorAll('.faq-question');
  faqQuestions.forEach(q => {
    q.addEventListener('click', () => {
      const parent = q.parentElement;
      const isActive = parent.classList.contains('active');
      
      // Close all first
      document.querySelectorAll('.faq-item').forEach(item => item.classList.remove('active'));
      
      // Open selected
      if (!isActive) {
        parent.classList.add('active');
      }
    });
  });
});

// Theme Management
function initTheme() {
  const toggleBtn = document.getElementById('theme-toggle-btn');
  if (!toggleBtn) return;

  const currentTheme = localStorage.getItem('boostbev_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', currentTheme);
  updateThemeIcon(currentTheme);

  toggleBtn.addEventListener('click', (e) => {
    e.preventDefault();
    const activeTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = activeTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('boostbev_theme', newTheme);
    updateThemeIcon(newTheme);
    window.showToast(`Switched to ${newTheme} mode!`, 'info');
  });
}

function updateThemeIcon(theme) {
  const icon = document.querySelector('#theme-toggle-btn i');
  if (icon) {
    if (theme === 'dark') {
      icon.className = 'fas fa-sun';
    } else {
      icon.className = 'fas fa-moon';
    }
  }
}

// User Navigation State
async function syncUserNavbarState() {
  const user = await window.checkAuthSession();
  const dropdown = document.getElementById('profile-dropdown-menu');
  const profileBtn = document.getElementById('profile-btn');

  if (!dropdown) return;

  if (user) {
    // Member logged in
    profileBtn.style.borderColor = 'var(--color-secondary)';
    profileBtn.style.color = 'var(--color-secondary)';
    
    dropdown.innerHTML = `
      <p>Hello, <span class="menu-name">${user.name}</span></p>
      ${user.role === 'admin' ? '<button class="login-link-btn" onclick="window.location.href=\'/admin.html\'" style="margin-bottom: 8px;"><i class="fas fa-cog"></i> Admin Dashboard</button>' : ''}
      <button class="logout-btn" onclick="handleLogout()"><i class="fas fa-sign-out-alt"></i> Logout</button>
    `;
  } else {
    // Guest Session
    profileBtn.style.borderColor = 'transparent';
    profileBtn.style.color = 'var(--text-primary)';
    
    dropdown.innerHTML = `
      <p style="color: var(--text-muted);">Access your account</p>
      <button class="login-link-btn" onclick="window.location.href=\'/login.html\'"><i class="fas fa-sign-in-alt"></i> Login / Sign Up</button>
    `;
  }
}

// Logout Utility
function handleLogout() {
  localStorage.removeItem('boostbev_token');
  localStorage.removeItem('boostbev_user');
  localStorage.removeItem('boostbev_cart');
  localStorage.removeItem('boostbev_wishlist');
  window.showToast('Logged out successfully');
  setTimeout(() => {
    window.location.href = '/';
  }, 1000);
}

// Fetch & Render Category Filter Tabs
let selectedCategory = 'all';
async function fetchCategories() {
  const tabsContainer = document.getElementById('category-filter-tabs');
  if (!tabsContainer) return;

  try {
    const data = await window.apiCall('/categories');
    if (data.success) {
      tabsContainer.innerHTML = `
        <li class="tab-item active" data-slug="all" onclick="selectCategoryTab('all')">All Products</li>
      ` + data.categories.map(c => `
        <li class="tab-item" data-slug="${c.slug}" onclick="selectCategoryTab('${c.slug}')">${c.name}</li>
      `).join('');
    }
  } catch (error) {
    console.error('Error fetching categories:', error);
  }
}

// Swap categories tab active classes
function selectCategoryTab(slug) {
  selectedCategory = slug;
  
  const tabs = document.querySelectorAll('#category-filter-tabs .tab-item');
  tabs.forEach(tab => {
    if (tab.getAttribute('data-slug') === slug) {
      tab.classList.add('active');
    } else {
      tab.classList.remove('active');
    }
  });

  fetchCatalogProducts();
}

// Fetch Products from Catalog with active filter settings
async function fetchCatalogProducts() {
  const grid = document.getElementById('catalog-products-grid');
  if (!grid) return;

  // Add loading skeleton animation
  grid.innerHTML = Array(4).fill(0).map(() => `
    <div class="product-card" style="opacity: 0.5; pointer-events: none;">
      <div style="height: 200px; background: rgba(255,255,255,0.03); border-radius: 8px;"></div>
      <div style="height: 20px; background: rgba(255,255,255,0.03); width: 60%; margin-top: 10px;"></div>
      <div style="height: 15px; background: rgba(255,255,255,0.03); width: 80%; margin-top: 5px;"></div>
    </div>
  `).join('');

  try {
    // Read current controls
    const searchInput = document.getElementById('catalog-search');
    const search = searchInput ? searchInput.value.trim() : '';

    const isSugarFree = document.getElementById('filter-sugarfree')?.checked || false;
    const isLimited = document.getElementById('filter-limited')?.checked || false;
    
    // Construct Query String
    let queryParams = [];
    if (selectedCategory && selectedCategory !== 'all') queryParams.push(`category=${selectedCategory}`);
    if (search) queryParams.push(`search=${encodeURIComponent(search)}`);
    if (isSugarFree) queryParams.push(`isSugarFree=true`);
    if (isLimited) queryParams.push(`isLimitedEdition=true`);

    const queryString = queryParams.length > 0 ? `?${queryParams.join('&')}` : '';
    const response = await window.apiCall(`/products${queryString}`);
    
    if (response.success) {
      let products = response.products;
      
      // Perform client side sorting
      const sortBy = document.getElementById('catalog-sort')?.value || 'featured';
      if (sortBy === 'price-low') {
        products.sort((a, b) => a.price - b.price);
      } else if (sortBy === 'price-high') {
        products.sort((a, b) => b.price - a.price);
      } else if (sortBy === 'rating') {
        products.sort((a, b) => b.rating - a.rating);
      }

      renderProductsGrid(products);
    }
  } catch (error) {
    grid.innerHTML = `<div style="grid-column: span 4; text-align: center; color: var(--color-primary); padding: 40px;">Failed to retrieve beverage products. Please try again later.</div>`;
  }
}

// Render catalog cards
function renderProductsGrid(products) {
  const grid = document.getElementById('catalog-products-grid');
  if (!grid) return;

  if (products.length === 0) {
    grid.innerHTML = `<div style="grid-column: span 4; text-align: center; color: var(--text-muted); padding: 60px;">No energy levels found matching your filters.</div>`;
    return;
  }

  grid.innerHTML = products.map(p => {
    const isLowStock = p.stock > 0 && p.stock < 10;
    const isOutOfStock = p.stock === 0;

    return `
      <div class="product-card">
        <div class="card-badges">
          ${p.isLimitedEdition ? '<span class="card-badge badge-limited">Limited Drop</span>' : ''}
          ${p.isSugarFree ? '<span class="card-badge badge-sugarfree">Sugar Free</span>' : ''}
        </div>
        
        <button class="wishlist-btn" data-id="${p._id}" onclick="event.stopPropagation(); window.toggleWishlist('${p._id}', '${p.name}')">
          <i class="far fa-heart"></i>
        </button>

        <div class="card-img-container" onclick="openQuickPreviewModal('${p._id}')" style="cursor: pointer;">
          <img src="${p.image}" alt="${p.name}" onerror="this.src='/assets/placeholder-drink.png'">
        </div>

        <div class="card-body">
          <div class="card-rating">
            <i class="fas fa-star"></i> <span>${p.rating}</span>
          </div>
          <h3 class="card-title" onclick="openQuickPreviewModal('${p._id}')">${p.name}</h3>
          <p class="card-desc">${p.description}</p>
        </div>

        <div class="card-footer">
          <div style="display: flex; flex-direction: column;">
            <span class="card-price">$${p.price.toFixed(2)}</span>
            <span class="card-stock ${isOutOfStock ? 'stock-out' : (isLowStock ? 'stock-low' : 'stock-in')}">
              ${isOutOfStock ? 'Sold Out' : (isLowStock ? `Low Stock (${p.stock})` : 'In Stock')}
            </span>
          </div>
          <button class="add-cart-btn" ${isOutOfStock ? 'disabled' : ''} onclick="triggerAddToCart('${p._id}')">
            <i class="fas fa-cart-plus"></i>
          </button>
        </div>
      </div>
    `;
  }).join('');

  // Sync wishlist states
  window.updateWishlistUI();
}

// Add item wrapper referencing full object
async function triggerAddToCart(productId) {
  try {
    const data = await window.apiCall(`/products/${productId}`);
    if (data.success) {
      window.addToCart(data.product);
    }
  } catch (error) {
    window.showToast('Could not add drink to cart', 'error');
  }
}

// Quick Product Detail Modals
async function openQuickPreviewModal(productId) {
  try {
    const data = await window.apiCall(`/products/${productId}`);
    if (data.success) {
      const p = data.product;
      const isOutOfStock = p.stock === 0;

      // Populate elements
      document.getElementById('qv-title').textContent = p.name;
      document.getElementById('qv-desc').textContent = p.description;
      document.getElementById('qv-price').textContent = `$${p.price.toFixed(2)}`;
      
      const qvImg = document.getElementById('qv-image');
      qvImg.src = p.image;
      qvImg.onerror = () => { qvImg.src = '/assets/placeholder-drink.png'; };

      // Set Stock badge
      const qvStock = document.getElementById('qv-stock-status');
      if (isOutOfStock) {
        qvStock.textContent = 'Sold Out';
        qvStock.className = 'status-tag status-failed';
      } else {
        qvStock.textContent = 'In Stock';
        qvStock.className = 'status-tag status-paid';
      }

      // Populate badging details
      const badgeBox = document.getElementById('qv-badges-box');
      badgeBox.innerHTML = `
        ${p.isLimitedEdition ? '<span class="card-badge badge-limited">Limited Drop</span>' : ''}
        ${p.isSugarFree ? '<span class="card-badge badge-sugarfree">Sugar Free</span>' : ''}
      `;

      // Set item amount buttons
      const qvAddBtn = document.getElementById('qv-add-cart-btn');
      qvAddBtn.onclick = () => {
        const qty = Number(document.getElementById('qv-qty-input').value);
        window.addToCart(p, qty);
        closeQuickPreviewModal();
      };
      qvAddBtn.disabled = isOutOfStock;

      const qvWishBtn = document.getElementById('qv-wishlist-btn');
      qvWishBtn.onclick = () => window.toggleWishlist(p._id, p.name);
      
      // Update wishlist button state in modal
      if (window.wishlistItems().includes(p._id)) {
        qvWishBtn.innerHTML = '<i class="fas fa-heart"></i> Remove from Wishlist';
        qvWishBtn.style.color = 'var(--color-primary)';
      } else {
        qvWishBtn.innerHTML = '<i class="far fa-heart"></i> Add to Wishlist';
        qvWishBtn.style.color = 'var(--text-primary)';
      }

      // Reset qty selector input
      document.getElementById('qv-qty-input').value = 1;

      // Open Modal Overlay
      document.getElementById('quickview-modal-overlay').classList.add('show');
    }
  } catch (error) {
    window.showToast('Could not load product details', 'error');
  }
}

function closeQuickPreviewModal() {
  document.getElementById('quickview-modal-overlay').classList.remove('show');
}

// Adjust quantity inside detail modal
function adjustQvQuantity(amount) {
  const input = document.getElementById('qv-qty-input');
  let currentVal = Number(input.value);
  currentVal = Math.max(1, currentVal + amount);
  input.value = currentVal;
}

// Cart Drawer open/close toggles
function toggleCartDrawer(open) {
  const drawer = document.getElementById('cart-drawer-slider');
  const backdrop = document.getElementById('drawer-backdrop-overlay');

  if (open) {
    drawer.classList.add('show');
    backdrop.classList.add('show');
  } else {
    drawer.classList.remove('show');
    backdrop.classList.remove('show');
  }
}

// Debouncing helpers for search input delays
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Bind to window global scope
window.selectCategoryTab = selectCategoryTab;
window.triggerAddToCart = triggerAddToCart;
window.openQuickPreviewModal = openQuickPreviewModal;
window.closeQuickPreviewModal = closeQuickPreviewModal;
window.adjustQvQuantity = adjustQvQuantity;
window.toggleCartDrawer = toggleCartDrawer;
window.handleLogout = handleLogout;
