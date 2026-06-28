document.addEventListener('DOMContentLoaded', () => {
  // Check redirect if user is already logged in
  const currentUser = window.getCurrentUser();
  if (currentUser) {
    redirectUser(currentUser);
  }

  // Panel Switchers
  const toRegisterLink = document.getElementById('switch-to-register');
  const toLoginLink = document.getElementById('switch-to-login');
  const toForgotLink = document.getElementById('switch-to-forgot');
  const forgotToLoginLink = document.getElementById('switch-forgot-to-login');
  const resetToLoginLink = document.getElementById('switch-reset-to-login');
  
  const loginPanel = document.getElementById('panel-login');
  const registerPanel = document.getElementById('panel-register');
  const forgotPanel = document.getElementById('panel-forgot');
  const resetPanel = document.getElementById('panel-reset');

  function showPanel(panel) {
    [loginPanel, registerPanel, forgotPanel, resetPanel].forEach(p => {
      if (p) p.classList.remove('active');
    });
    if (panel) panel.classList.add('active');
  }

  if (toRegisterLink) toRegisterLink.addEventListener('click', (e) => { e.preventDefault(); showPanel(registerPanel); });
  if (toLoginLink) toLoginLink.addEventListener('click', (e) => { e.preventDefault(); showPanel(loginPanel); });
  if (toForgotLink) toForgotLink.addEventListener('click', (e) => { e.preventDefault(); showPanel(forgotPanel); });
  if (forgotToLoginLink) forgotToLoginLink.addEventListener('click', (e) => { e.preventDefault(); showPanel(loginPanel); });
  if (resetToLoginLink) resetToLoginLink.addEventListener('click', (e) => { e.preventDefault(); showPanel(loginPanel); });

  // 1. LOGIN FLOW
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('login-email').value.trim();
      const password = document.getElementById('login-password').value.trim();

      if (!email || !password) {
        return window.showToast('Please enter both email and password', 'error');
      }

      try {
        const data = await window.apiCall('/auth/login', {
          method: 'POST',
          body: { email, password }
        });

        if (data.success) {
          localStorage.setItem('boostbev_token', data.token);
          localStorage.setItem('boostbev_user', JSON.stringify(data.user));
          window.showToast('Welcome back to BoostBev!');
          
          // Re-sync local storage cart items up to server
          const localCart = localStorage.getItem('boostbev_cart');
          if (localCart && JSON.parse(localCart).length > 0) {
            const payload = JSON.parse(localCart).map(item => ({
              product: item.product._id || item.product.id || item.product,
              quantity: item.quantity
            }));
            await window.apiCall('/cart', {
              method: 'POST',
              body: { items: payload }
            });
          }

          setTimeout(() => {
            redirectUser(data.user);
          }, 1000);
        }
      } catch (error) {
        window.showToast(error.message, 'error');
      }
    });
  }

  // 2. REGISTER FLOW
  const registerForm = document.getElementById('register-form');
  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('register-name').value.trim();
      const email = document.getElementById('register-email').value.trim();
      const password = document.getElementById('register-password').value.trim();
      const confirmPassword = document.getElementById('register-confirm').value.trim();

      if (!name || !email || !password) {
        return window.showToast('Please fill out all fields', 'error');
      }

      if (password.length < 6) {
        return window.showToast('Password must be at least 6 characters long', 'error');
      }

      if (password !== confirmPassword) {
        return window.showToast('Passwords do not match', 'error');
      }

      try {
        const data = await window.apiCall('/auth/register', {
          method: 'POST',
          body: { name, email, password }
        });

        if (data.success) {
          localStorage.setItem('boostbev_token', data.token);
          localStorage.setItem('boostbev_user', JSON.stringify(data.user));
          window.showToast('Account registered successfully!');

          setTimeout(() => {
            redirectUser(data.user);
          }, 1000);
        }
      } catch (error) {
        window.showToast(error.message, 'error');
      }
    });
  }

  // 3. FORGOT PASSWORD FLOW
  const forgotForm = document.getElementById('forgot-form');
  let forgotEmailInput = '';
  let generatedCode = '';

  if (forgotForm) {
    forgotForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      forgotEmailInput = document.getElementById('forgot-email').value.trim();

      if (!forgotEmailInput) {
        return window.showToast('Please enter your email address', 'error');
      }

      try {
        const data = await window.apiCall('/auth/forgot-password', {
          method: 'POST',
          body: { email: forgotEmailInput }
        });

        if (data.success) {
          generatedCode = data.resetCode;
          window.showToast('Reset code logged to server log. (Auto-filled on screen)');
          
          // Pre-populate fields on reset sheet for simple verification
          const codeInput = document.getElementById('reset-code');
          if (codeInput) codeInput.value = generatedCode;

          showPanel(resetPanel);
        }
      } catch (error) {
        window.showToast(error.message, 'error');
      }
    });
  }

  // 4. RESET PASSWORD FLOW
  const resetForm = document.getElementById('reset-form');
  if (resetForm) {
    resetForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const enteredCode = document.getElementById('reset-code').value.trim();
      const newPassword = document.getElementById('reset-password').value.trim();

      if (!enteredCode || !newPassword) {
        return window.showToast('Please enter both code and new password', 'error');
      }

      if (newPassword.length < 6) {
        return window.showToast('Password must be at least 6 characters', 'error');
      }

      if (enteredCode !== generatedCode) {
        return window.showToast('Invalid verification code', 'error');
      }

      try {
        const data = await window.apiCall('/auth/reset-password', {
          method: 'POST',
          body: { email: forgotEmailInput, password: newPassword }
        });

        if (data.success) {
          window.showToast('Password updated! You can now log in.');
          showPanel(loginPanel);
        }
      } catch (error) {
        window.showToast(error.message, 'error');
      }
    });
  }
});

// Helper redirection utility
function redirectUser(user) {
  if (user.role === 'admin') {
    window.location.href = '/admin.html';
  } else {
    window.location.href = '/';
  }
}
