document.addEventListener('DOMContentLoaded', async () => {
  // Check auth session
  let user = window.getCurrentUser();
  if (!user) {
    window.showToast('Please login to proceed to checkout', 'info');
    setTimeout(() => {
      window.location.href = '/login.html';
    }, 1500);
    return;
  }

  // Load cart state
  window.initCart();
  const items = window.cartItems();
  
  if (items.length === 0) {
    window.showToast('Your cart is empty. Redirecting to home...', 'info');
    setTimeout(() => {
      window.location.href = '/';
    }, 1500);
    return;
  }

  // Render Order Summaries
  renderOrderSummary(items);

  // Form Submission
  const checkoutForm = document.getElementById('checkout-form');
  if (checkoutForm) {
    checkoutForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const name = document.getElementById('shipping-name').value.trim();
      const address = document.getElementById('shipping-address').value.trim();
      const city = document.getElementById('shipping-city').value.trim();
      const postalCode = document.getElementById('shipping-postal').value.trim();
      const country = document.getElementById('shipping-country').value.trim();

      const cardName = document.getElementById('card-name').value.trim();
      const cardNumber = document.getElementById('card-number').value.trim().replace(/\s+/g, '');
      const cardExpiry = document.getElementById('card-expiry').value.trim();
      const cardCvc = document.getElementById('card-cvc').value.trim();

      // Form validation
      if (!name || !address || !city || !postalCode || !country) {
        return window.showToast('Please fill out all shipping details', 'error');
      }

      if (!cardName || !cardNumber || !cardExpiry || !cardCvc) {
        return window.showToast('Please fill out all payment details', 'error');
      }

      if (cardNumber.length < 16) {
        return window.showToast('Please enter a valid 16-digit card number', 'error');
      }

      // Start simulated loading spinner
      const submitBtn = document.getElementById('submit-order-btn');
      const originalBtnText = submitBtn.innerHTML;
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing Secure Payment...';

      try {
        const payload = {
          items: items.map(item => ({
            product: item.product._id || item.product.id || item.product,
            quantity: item.quantity,
            name: item.product.name,
            price: item.product.price
          })),
          totalAmount: Number(window.getCartTotal().toFixed(2)),
          shippingAddress: { name, address, city, postalCode, country },
          paymentMethod: 'Stripe'
        };

        const response = await window.apiCall('/orders', {
          method: 'POST',
          body: payload
        });

        if (response.success) {
          window.showToast('Payment Approved! Order placed successfully.');
          
          // Clear Local Storage Cart
          await window.clearCart();

          // Render success modal or card
          showSuccessScreen(response.order);
        }
      } catch (error) {
        window.showToast(error.message, 'error');
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnText;
      }
    });
  }
});

// Render Cart items in side panel
function renderOrderSummary(items) {
  const container = document.getElementById('checkout-items-list');
  if (!container) return;

  container.innerHTML = items.map(item => `
    <div class="cart-item" style="border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 12px; margin-bottom: 12px;">
      <img src="${item.product.image}" alt="${item.product.name}" style="width: 50px; height: 50px; object-fit: contain; background: rgba(255,255,255,0.02); border-radius: 4px; padding: 2px;" onerror="this.src='/assets/placeholder-drink.png'">
      <div style="flex: 1; display: flex; flex-direction: column; gap: 4px;">
        <h4 style="font-size: 14px; font-weight: 700;">${item.product.name}</h4>
        <span style="font-size: 12px; color: var(--text-muted);">Qty: ${item.quantity}</span>
      </div>
      <span style="font-family: var(--font-display); font-weight: 700; font-size: 15px;">$${(item.product.price * item.quantity).toFixed(2)}</span>
    </div>
  `).join('');

  // Subtotal & Shipping
  const subtotalVal = window.getCartTotal();
  const shippingVal = subtotalVal > 30 ? 0 : 4.99; // Free shipping over $30
  const taxVal = subtotalVal * 0.08; // 8% Tax
  const totalVal = subtotalVal + shippingVal + taxVal;

  document.getElementById('summary-subtotal').textContent = `$${subtotalVal.toFixed(2)}`;
  document.getElementById('summary-shipping').textContent = shippingVal === 0 ? 'FREE' : `$${shippingVal.toFixed(2)}`;
  document.getElementById('summary-tax').textContent = `$${taxVal.toFixed(2)}`;
  document.getElementById('summary-total').textContent = `$${totalVal.toFixed(2)}`;
}

// Show success verification panel
function showSuccessScreen(order) {
  const root = document.querySelector('.checkout-grid-layout');
  if (!root) return;

  root.innerHTML = `
    <div class="card-bg" style="grid-column: span 2; text-align: center; padding: 60px 40px; border-radius: var(--border-radius-lg); border: 1px solid var(--panel-border); background: var(--card-bg); backdrop-filter: blur(10px); animation: fadeIn 0.5s ease;">
      <div style="width: 80px; height: 80px; border-radius: 50%; background: rgba(57, 255, 20, 0.1); color: var(--color-secondary); display: flex; align-items: center; justify-content: center; font-size: 40px; margin: 0 auto 24px; box-shadow: var(--shadow-glow-secondary);">
        <i class="fas fa-check"></i>
      </div>
      <h1 style="font-size: 36px; margin-bottom: 8px;">Order Confirmed!</h1>
      <p style="color: var(--text-muted); font-size: 16px; margin-bottom: 32px;">Thank you for shopping with BoostBev. Your energy cargo is preparing for shipment.</p>
      
      <div style="max-width: 500px; margin: 0 auto 40px; border: 1px solid var(--panel-border); border-radius: var(--border-radius-md); padding: 24px; text-align: left; background: rgba(0,0,0,0.15);">
        <h4 style="text-transform: uppercase; font-size: 12px; letter-spacing: 0.1em; color: var(--text-muted); margin-bottom: 12px;">Order Summary</h4>
        <p style="margin-bottom: 8px; font-size: 14px;"><strong>Order Reference:</strong> <span style="font-family: monospace; color: var(--color-accent);">${order._id}</span></p>
        <p style="margin-bottom: 8px; font-size: 14px;"><strong>Total Paid:</strong> $${order.totalAmount.toFixed(2)}</p>
        <p style="margin-bottom: 8px; font-size: 14px;"><strong>Shipping to:</strong> ${order.shippingAddress.name}, ${order.shippingAddress.address}, ${order.shippingAddress.city}</p>
        <p style="font-size: 14px;"><strong>Status:</strong> <span class="status-tag status-paid">Paid</span></p>
      </div>

      <div style="display: flex; gap: 16px; justify-content: center;">
        <a href="/" class="btn btn-primary"><i class="fas fa-shopping-bag"></i> Continue Shopping</a>
      </div>
    </div>
  `;
}
