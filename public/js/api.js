const API_BASE = '/api';

// Show Custom Premium Toast Alert
function showToast(message, type = 'success') {
  // Create toast container if not exists
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  // Create toast element
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  // Icon based on type
  let icon = '<i class="fas fa-check-circle" style="color: var(--color-secondary);"></i>';
  if (type === 'error') {
    icon = '<i class="fas fa-exclamation-circle" style="color: var(--color-primary);"></i>';
  } else if (type === 'info') {
    icon = '<i class="fas fa-info-circle" style="color: var(--color-accent);"></i>';
  }

  toast.innerHTML = `${icon}<span>${message}</span>`;
  container.appendChild(toast);

  // Auto remove toast
  setTimeout(() => {
    toast.style.animation = 'fadeIn 0.3s ease reverse';
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 3500);
}

// Wrapper for fetch requests with authorization
async function apiCall(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  
  // Set up default headers
  const token = localStorage.getItem('boostbev_token');
  const headers = {};
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Don't set Content-Type header if sending FormData (Multipart file upload)
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    if (options.body && typeof options.body === 'object') {
      options.body = JSON.stringify(options.body);
    }
  }

  const fetchOptions = {
    ...options,
    headers: {
      ...headers,
      ...options.headers
    }
  };

  try {
    const response = await fetch(url, fetchOptions);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'API request failed');
    }
    
    return data;
  } catch (error) {
    console.error(`[API ERROR] ${endpoint}:`, error.message);
    throw error;
  }
}

// Check logged in user profile
async function checkAuthSession() {
  const token = localStorage.getItem('boostbev_token');
  if (!token) return null;
  
  try {
    const data = await apiCall('/auth/me');
    if (data.success) {
      localStorage.setItem('boostbev_user', JSON.stringify(data.user));
      return data.user;
    }
  } catch (error) {
    localStorage.removeItem('boostbev_token');
    localStorage.removeItem('boostbev_user');
  }
  return null;
}

// Return current active user profile
function getCurrentUser() {
  const user = localStorage.getItem('boostbev_user');
  return user ? JSON.parse(user) : null;
}

// Exports to window global scope
window.apiCall = apiCall;
window.showToast = showToast;
window.checkAuthSession = checkAuthSession;
window.getCurrentUser = getCurrentUser;
