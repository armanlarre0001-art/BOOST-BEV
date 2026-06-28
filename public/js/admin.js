document.addEventListener('DOMContentLoaded', async () => {
  // Check admin privileges
  const currentUser = window.getCurrentUser();
  if (!currentUser || currentUser.role !== 'admin') {
    window.showToast('Access denied. Administrator session required.', 'error');
    setTimeout(() => {
      window.location.href = '/login.html';
    }, 1500);
    return;
  }

  // Display admin name
  const nameLabel = document.getElementById('admin-profile-name');
  if (nameLabel) nameLabel.textContent = currentUser.name;

  // Sidebar Tab Switcher
  const sidebarLinks = document.querySelectorAll('.sidebar-item');
  const sections = document.querySelectorAll('.dashboard-view');

  sidebarLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      
      // Remove active states
      sidebarLinks.forEach(item => item.classList.remove('active'));
      sections.forEach(sec => sec.classList.remove('active'));

      // Set active
      link.classList.add('active');
      const sectionId = link.getAttribute('data-target');
      const section = document.getElementById(sectionId);
      if (section) section.classList.add('active');
      
      // Refresh section data
      if (sectionId === 'section-dashboard') fetchDashboardStats();
      if (sectionId === 'section-products') fetchProductsCatalog();
      if (sectionId === 'section-orders') fetchOrdersList();
    });
  });

  // Initial load
  await fetchDashboardStats();
  await loadCategoriesDropdown();

  // Create Product Form Submission
  const productForm = document.getElementById('product-form');
  if (productForm) {
    productForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const submitBtn = productForm.querySelector('button[type="submit"]');
      const origText = submitBtn.innerHTML;
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

      const productId = document.getElementById('form-product-id').value;
      const name = document.getElementById('form-product-name').value.trim();
      const description = document.getElementById('form-product-desc').value.trim();
      const price = document.getElementById('form-product-price').value;
      const category = document.getElementById('form-product-cat').value;
      const stock = document.getElementById('form-product-stock').value;
      
      const isSugarFree = document.getElementById('form-product-sugarfree').checked;
      const isLimited = document.getElementById('form-product-limited').checked;
      const imageFile = document.getElementById('form-product-image').files[0];

      // Form validation
      if (!name || !description || !price || !category || !stock) {
        window.showToast('Please fill out all product parameters', 'error');
        submitBtn.disabled = false;
        submitBtn.innerHTML = origText;
        return;
      }

      // Compile FormData to support uploading file attachments
      const formData = new FormData();
      formData.append('name', name);
      formData.append('description', description);
      formData.append('price', price);
      formData.append('category', category);
      formData.append('stock', stock);
      formData.append('isSugarFree', isSugarFree);
      formData.append('isLimitedEdition', isLimited);
      
      if (imageFile) {
        formData.append('image', imageFile);
      }

      try {
        let response;
        if (productId) {
          // Edit
          response = await window.apiCall(`/products/${productId}`, {
            method: 'PUT',
            body: formData
          });
          if (response.success) window.showToast('Product updated successfully!');
        } else {
          // Create
          response = await window.apiCall('/products', {
            method: 'POST',
            body: formData
          });
          if (response.success) window.showToast('New product added to catalog!');
        }

        closeProductModal();
        fetchProductsCatalog();
      } catch (error) {
        window.showToast(error.message, 'error');
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = origText;
      }
    });
  }

  // Create Category Form Submission
  const catForm = document.getElementById('category-form');
  if (catForm) {
    catForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('form-cat-name').value.trim();
      const description = document.getElementById('form-cat-desc').value.trim();

      if (!name || !description) {
        return window.showToast('Please provide both name and description', 'error');
      }

      try {
        const response = await window.apiCall('/categories', {
          method: 'POST',
          body: { name, description }
        });
        if (response.success) {
          window.showToast('New category created successfully!');
          closeCategoryModal();
          loadCategoriesDropdown();
        }
      } catch (error) {
        window.showToast(error.message, 'error');
      }
    });
  }
});

// 1. Fetch KPI Metrics
async function fetchDashboardStats() {
  try {
    const data = await window.apiCall('/admin/stats');
    if (data.success) {
      const stats = data.stats;
      
      // Update values
      document.getElementById('stat-revenue').textContent = `$${stats.totalRevenue.toFixed(2)}`;
      document.getElementById('stat-orders').textContent = stats.totalOrders;
      document.getElementById('stat-products').textContent = stats.totalProducts;
      document.getElementById('stat-users').textContent = stats.totalUsers;

      // Low stock warnings
      const warningContainer = document.getElementById('low-stock-list');
      if (warningContainer) {
        if (stats.lowStockProducts.length === 0) {
          warningContainer.innerHTML = '<tr><td colspan="4" style="text-align: center; color: var(--color-secondary);">All items are well stocked!</td></tr>';
        } else {
          warningContainer.innerHTML = stats.lowStockProducts.map(p => `
            <tr>
              <td><strong>${p.name}</strong></td>
              <td style="font-family: monospace;">${p._id}</td>
              <td style="color: var(--color-primary); font-weight: 800;">${p.stock} units</td>
              <td>$${p.price.toFixed(2)}</td>
            </tr>
          `).join('');
        }
      }

      // Recent orders table
      const recentContainer = document.getElementById('recent-orders-list');
      if (recentContainer) {
        if (stats.recentOrders.length === 0) {
          recentContainer.innerHTML = '<tr><td colspan="5" style="text-align: center;">No orders logged yet.</td></tr>';
        } else {
          recentContainer.innerHTML = stats.recentOrders.map(o => `
            <tr>
              <td style="font-family: monospace;">${o._id}</td>
              <td>${new Date(o.createdAt).toLocaleDateString()}</td>
              <td>$${o.totalAmount.toFixed(2)}</td>
              <td><span class="status-tag status-${o.paymentStatus.toLowerCase()}">${o.paymentStatus}</span></td>
              <td><span class="status-tag status-${o.orderStatus.toLowerCase()}">${o.orderStatus}</span></td>
            </tr>
          `).join('');
        }
      }
    }
  } catch (error) {
    window.showToast('Error loading stats metrics', 'error');
  }
}

// 2. Fetch & Render Product List
async function fetchProductsCatalog() {
  const tableBody = document.getElementById('admin-products-list');
  if (!tableBody) return;

  try {
    const data = await window.apiCall('/products');
    if (data.success) {
      if (data.products.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6" style="text-align: center;">No products in catalog.</td></tr>';
        return;
      }

      tableBody.innerHTML = data.products.map(p => `
        <tr>
          <td>
            <div class="product-cell">
              <img src="${p.image}" alt="${p.name}" onerror="this.src='/assets/placeholder-drink.png'">
              <div>
                <strong>${p.name}</strong>
                <div style="font-size: 11px; color: var(--text-muted);">${p.category}</div>
              </div>
            </div>
          </td>
          <td style="font-family: monospace; font-size: 12px;">${p._id}</td>
          <td>$${p.price.toFixed(2)}</td>
          <td style="${p.stock < 10 ? 'color: var(--color-primary); font-weight: 700;' : ''}">${p.stock} units</td>
          <td>
            ${p.isSugarFree ? '<span class="status-tag status-shipped" style="margin-right: 4px;">Zero Sugar</span>' : ''}
            ${p.isLimitedEdition ? '<span class="status-tag status-paid">Limited Drop</span>' : ''}
          </td>
          <td>
            <div class="action-btn-group">
              <button class="btn-icon edit" onclick="openProductEditModal('${p._id}')"><i class="fas fa-edit"></i></button>
              <button class="btn-icon delete" onclick="deleteProductItem('${p._id}')"><i class="fas fa-trash-alt"></i></button>
            </div>
          </td>
        </tr>
      `).join('');
    }
  } catch (error) {
    window.showToast('Error loading product catalog', 'error');
  }
}

// 3. Fetch & Render Orders List
async function fetchOrdersList() {
  const tableBody = document.getElementById('admin-orders-table-list');
  if (!tableBody) return;

  try {
    const data = await window.apiCall('/admin/orders');
    if (data.success) {
      if (data.orders.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6" style="text-align: center;">No client transactions logged.</td></tr>';
        return;
      }

      tableBody.innerHTML = data.orders.map(o => `
        <tr>
          <td style="font-family: monospace; font-size: 12px;">${o._id}</td>
          <td>
            <strong>${o.shippingAddress.name}</strong>
            <div style="font-size: 11px; color: var(--text-muted);">${o.shippingAddress.address}, ${o.shippingAddress.city}</div>
          </td>
          <td>
            <div style="font-size: 13px;">${o.items.map(i => `${i.name} (x${i.quantity})`).join(', ')}</div>
          </td>
          <td>$${o.totalAmount.toFixed(2)}</td>
          <td>
            <select class="sort-select" onchange="updateFulfillmentStatus('${o._id}', this.value)" style="padding: 4px 8px; font-size: 12px;">
              <option value="Pending" ${o.orderStatus === 'Pending' ? 'selected' : ''}>Pending</option>
              <option value="Processing" ${o.orderStatus === 'Processing' ? 'selected' : ''}>Processing</option>
              <option value="Shipped" ${o.orderStatus === 'Shipped' ? 'selected' : ''}>Shipped</option>
              <option value="Delivered" ${o.orderStatus === 'Delivered' ? 'selected' : ''}>Delivered</option>
              <option value="Cancelled" ${o.orderStatus === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
            </select>
          </td>
          <td><span class="status-tag status-${o.paymentStatus.toLowerCase()}">${o.paymentStatus}</span></td>
        </tr>
      `).join('');
    }
  } catch (error) {
    window.showToast('Error loading orders queue', 'error');
  }
}

// Update Order status
async function updateFulfillmentStatus(orderId, newStatus) {
  try {
    const response = await window.apiCall(`/admin/orders/${orderId}`, {
      method: 'PUT',
      body: { orderStatus: newStatus }
    });
    if (response.success) {
      window.showToast(`Order status updated to ${newStatus}`);
      fetchOrdersList();
    }
  } catch (error) {
    window.showToast(error.message, 'error');
  }
}

// Delete Product
async function deleteProductItem(productId) {
  if (!confirm('Are you sure you want to permanently delete this product?')) return;

  try {
    const response = await window.apiCall(`/products/${productId}`, {
      method: 'DELETE'
    });
    if (response.success) {
      window.showToast('Product deleted from catalog');
      fetchProductsCatalog();
    }
  } catch (error) {
    window.showToast(error.message, 'error');
  }
}

// Load Categories select list
async function loadCategoriesDropdown() {
  const catSelect = document.getElementById('form-product-cat');
  if (!catSelect) return;

  try {
    const data = await window.apiCall('/categories');
    if (data.success) {
      catSelect.innerHTML = '<option value="">-- Select Category --</option>' + 
        data.categories.map(c => `<option value="${c.slug}">${c.name}</option>`).join('');
    }
  } catch (error) {
    console.error('Error fetching categories');
  }
}

// Product Modals
function openProductCreateModal() {
  document.getElementById('product-modal-title').textContent = 'Create New Drink';
  document.getElementById('product-form').reset();
  document.getElementById('form-product-id').value = '';
  document.getElementById('product-modal-overlay').classList.add('show');
}

async function openProductEditModal(productId) {
  try {
    const data = await window.apiCall(`/products/${productId}`);
    if (data.success) {
      const p = data.product;
      document.getElementById('product-modal-title').textContent = 'Modify Drink Parameters';
      document.getElementById('form-product-id').value = p._id;
      document.getElementById('form-product-name').value = p.name;
      document.getElementById('form-product-desc').value = p.description;
      document.getElementById('form-product-price').value = p.price;
      document.getElementById('form-product-cat').value = p.category;
      document.getElementById('form-product-stock').value = p.stock;
      document.getElementById('form-product-sugarfree').checked = p.isSugarFree;
      document.getElementById('form-product-limited').checked = p.isLimitedEdition;

      document.getElementById('product-modal-overlay').classList.add('show');
    }
  } catch (error) {
    window.showToast('Error retrieving product details', 'error');
  }
}

function closeProductModal() {
  document.getElementById('product-modal-overlay').classList.remove('show');
}

function openCategoryModal() {
  document.getElementById('category-form').reset();
  document.getElementById('category-modal-overlay').classList.add('show');
}

function closeCategoryModal() {
  document.getElementById('category-modal-overlay').classList.remove('show');
}

// Bind to window global scope
window.openProductCreateModal = openProductCreateModal;
window.openProductEditModal = openProductEditModal;
window.closeProductModal = closeProductModal;
window.openCategoryModal = openCategoryModal;
window.closeCategoryModal = closeCategoryModal;
window.deleteProductItem = deleteProductItem;
window.updateFulfillmentStatus = updateFulfillmentStatus;
