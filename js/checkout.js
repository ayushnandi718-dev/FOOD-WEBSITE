(() => {
  const DELIVERY_FEE = 40;
  const TAX_RATE = 0.05;

  let cartItems = [];
  let grandTotal = 0;
  let currentOrderData = null;

  const cartListEl = document.getElementById('cart-items-list');
  const subtotalEl = document.getElementById('subtotal');
  const taxEl = document.getElementById('tax');
  const grandTotalEl = document.getElementById('grand-total');
  const paymentTotalEl = document.getElementById('payment-total');
  const loadingOverlay = document.getElementById('loading-overlay');

  const steps = document.querySelectorAll('.checkout-step');
  const progressSteps = document.querySelectorAll('.progress-step');
  const progressLines = document.querySelectorAll('.progress-line');

  const goToStep = (stepNum) => {
    steps.forEach(s => s.classList.remove('active'));
    progressSteps.forEach(s => s.classList.remove('active'));
    progressLines.forEach(l => l.classList.remove('active'));

    document.getElementById(`step-${stepNum}`).classList.add('active');
    progressSteps.forEach((s, i) => {
      if (i < stepNum) s.classList.add('active');
    });
    progressLines.forEach((l, i) => {
      if (i < stepNum - 1) l.classList.add('active');
    });
  };

  const loadCart = () => {
    try {
      const stored = sessionStorage.getItem('rcb_checkout_cart');
      cartItems = stored ? JSON.parse(stored) : [];
    } catch {
      cartItems = [];
    }

    if (cartItems.length === 0) {
      cartListEl.innerHTML = '<p class="empty-cart-msg">Your cart is empty. <a href="index.html">Go back to menu</a></p>';
      return;
    }

    renderCartItems();
    calculateTotals();
  };

  const renderCartItems = () => {
    cartListEl.innerHTML = '';
    cartItems.forEach(item => {
      const price = parseFloat(String(item.price).replace('₹', ''));
      const itemTotal = price * item.quantity;
      const el = document.createElement('div');
      el.className = 'cart-item-row';
      el.innerHTML = `
        <img src="${item.image}" alt="${item.name}" class="cart-item-img">
        <div class="cart-item-info">
          <h4>${item.name}</h4>
          <span>Qty: ${item.quantity}</span>
        </div>
        <span class="cart-item-price">₹${itemTotal.toFixed(2)}</span>
      `;
      cartListEl.appendChild(el);
    });
  };

  const calculateTotals = () => {
    const subtotal = cartItems.reduce((sum, item) => {
      const price = parseFloat(String(item.price).replace('₹', ''));
      return sum + (price * item.quantity);
    }, 0);
    const tax = subtotal * TAX_RATE;
    grandTotal = subtotal + DELIVERY_FEE + tax;

    subtotalEl.textContent = `₹${subtotal.toFixed(2)}`;
    taxEl.textContent = `₹${tax.toFixed(2)}`;
    grandTotalEl.textContent = `₹${grandTotal.toFixed(2)}`;
    paymentTotalEl.textContent = `₹${grandTotal.toFixed(2)}`;
  };

  document.getElementById('to-step-2').addEventListener('click', () => {
    if (cartItems.length === 0) {
      window.location.href = 'index.html';
      return;
    }
    goToStep(2);
    window.scrollTo(0, 0);
  });

  document.getElementById('back-to-step-1').addEventListener('click', () => {
    goToStep(1);
    window.scrollTo(0, 0);
  });

  document.getElementById('to-step-3').addEventListener('click', () => {
    const form = document.getElementById('delivery-form');
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    goToStep(3);
    window.scrollTo(0, 0);
  });

  document.getElementById('back-to-step-2').addEventListener('click', () => {
    goToStep(2);
    window.scrollTo(0, 0);
  });

  const formatCardNumber = (e) => {
    let val = e.target.value.replace(/\D/g, '');
    val = val.replace(/(.{4})/g, '$1 ').trim();
    e.target.value = val;
  };

  const formatCardExpiry = (e) => {
    let val = e.target.value.replace(/\D/g, '');
    if (val.length >= 2) {
      val = val.substring(0, 2) + '/' + val.substring(2);
    }
    e.target.value = val;
  };

  document.getElementById('card-number').addEventListener('input', formatCardNumber);
  document.getElementById('card-expiry').addEventListener('input', formatCardExpiry);

  document.getElementById('pay-now-btn').addEventListener('click', async () => {
    const paymentForm = document.getElementById('payment-form');
    if (!paymentForm.checkValidity()) {
      paymentForm.reportValidity();
      return;
    }

    loadingOverlay.classList.add('active');
    document.getElementById('pay-now-btn').disabled = true;

    setTimeout(async () => {
      const orderId = 'RCB' + Date.now().toString(36).toUpperCase();

      const name = document.getElementById('delivery-name').value;
      const phone = document.getElementById('delivery-phone').value;
      const email = document.getElementById('delivery-email').value;
      const address = document.getElementById('delivery-address').value;
      const city = document.getElementById('delivery-city').value;
      const pincode = document.getElementById('delivery-pincode').value;

      currentOrderData = {
        orderId,
        items: cartItems,
        total: grandTotal,
        delivery: { name, phone, email, address, city, pincode },
        payment: {
          cardNumber: document.getElementById('card-number').value,
          cardName: document.getElementById('card-name').value
        },
        date: new Date().toLocaleString(),
        status: 'placed'
      };

      await saveOrder(currentOrderData);

      loadingOverlay.classList.remove('active');
      document.getElementById('confirm-order-id').textContent = `#${orderId}`;
      document.getElementById('confirm-total').textContent = `₹${grandTotal.toFixed(2)}`;

      goToStep(4);
      window.scrollTo(0, 0);

      sessionStorage.removeItem('rcb_checkout_cart');
    }, 2000);
  });

  const saveOrder = async (order) => {
    if (typeof firebaseReady !== 'undefined' && firebaseReady && typeof db !== 'undefined' && db) {
      try {
        const user = firebase.auth().currentUser;
        await db.collection('orders').add({
          userId: user ? user.uid : 'guest',
          items: order.items,
          total: order.total,
          delivery: order.delivery,
          status: 'placed',
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      } catch (err) {
        console.warn('Firestore save failed, saving to localStorage:', err);
        saveOrderLocal(order);
      }
    } else {
      saveOrderLocal(order);
    }
  };

  const saveOrderLocal = (order) => {
    const orders = JSON.parse(localStorage.getItem('rcb_orders') || '[]');
    orders.push(order);
    localStorage.setItem('rcb_orders', JSON.stringify(orders));
  };

  const generateReceipt = () => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.setFontSize(20);
    doc.setTextColor(204, 0, 0);
    doc.text('Royal Cravings Banglo', 105, 20, { align: 'center' });

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text('Order Receipt', 105, 28, { align: 'center' });

    doc.setDrawColor(204, 0, 0);
    doc.line(20, 33, 190, 33);

    doc.setFontSize(11);
    doc.setTextColor(0);
    doc.text(`Order ID: #${currentOrderData.orderId}`, 20, 43);
    doc.text(`Date: ${currentOrderData.date}`, 20, 51);
    doc.text(`Payment: Demo Payment`, 20, 59);

    doc.text(`Deliver to:`, 20, 73);
    doc.setFontSize(10);
    doc.text(`${currentOrderData.delivery.name}`, 20, 81);
    doc.text(`${currentOrderData.delivery.address}, ${currentOrderData.delivery.city} - ${currentOrderData.delivery.pincode}`, 20, 89);
    doc.text(`Phone: ${currentOrderData.delivery.phone}`, 20, 97);

    doc.setDrawColor(200);
    doc.line(20, 103, 190, 103);

    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('Items', 20, 113);

    let y = 123;
    doc.setFont(undefined, 'normal');
    doc.setFontSize(10);
    currentOrderData.items.forEach(item => {
      const price = parseFloat(String(item.price).replace('₹', ''));
      const itemTotal = price * item.quantity;
      doc.text(`${item.name} x${item.quantity}`, 20, y);
      doc.text(`₹${itemTotal.toFixed(2)}`, 180, y, { align: 'right' });
      y += 8;
    });

    doc.setDrawColor(200);
    doc.line(20, y, 190, y);
    y += 10;

    const subtotal = currentOrderData.items.reduce((s, item) => {
      return s + (parseFloat(String(item.price).replace('₹', '')) * item.quantity);
    }, 0);
    const tax = subtotal * TAX_RATE;

    doc.text('Subtotal:', 120, y);
    doc.text(`₹${subtotal.toFixed(2)}`, 180, y, { align: 'right' });
    y += 8;
    doc.text('Delivery:', 120, y);
    doc.text(`₹${DELIVERY_FEE.toFixed(2)}`, 180, y, { align: 'right' });
    y += 8;
    doc.text('Tax (5%):', 120, y);
    doc.text(`₹${tax.toFixed(2)}`, 180, y, { align: 'right' });
    y += 10;

    doc.setFontSize(13);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(204, 0, 0);
    doc.text('Total:', 120, y);
    doc.text(`₹${currentOrderData.total.toFixed(2)}`, 180, y, { align: 'right' });

    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text('Thank you for ordering from Royal Cravings Banglo! 👑', 105, 280, { align: 'center' });

    doc.save(`RCB_Receipt_${currentOrderData.orderId}.pdf`);
  };

  const sendEmailReceipt = () => {
    if (!currentOrderData) return;
    const to = currentOrderData.delivery.email;
    const subject = `Order Confirmation - #${currentOrderData.orderId}`;
    let body = `Royal Cravings Banglo - Order Confirmation\n\n`;
    body += `Order ID: #${currentOrderData.orderId}\n`;
    body += `Date: ${currentOrderData.date}\n`;
    body += `Total: ₹${currentOrderData.total.toFixed(2)}\n\n`;
    body += `Items:\n`;
    currentOrderData.items.forEach(item => {
      const price = parseFloat(String(item.price).replace('₹', ''));
      body += `  - ${item.name} x${item.quantity} = ₹${(price * item.quantity).toFixed(2)}\n`;
    });
    body += `\nDeliver to: ${currentOrderData.delivery.name}\n`;
    body += `${currentOrderData.delivery.address}, ${currentOrderData.delivery.city} - ${currentOrderData.delivery.pincode}\n`;
    body += `\nThank you for ordering from Royal Cravings Banglo! 👑`;

    window.open(`mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
  };

  const sendWhatsApp = () => {
    if (!currentOrderData) return;
    let msg = `*Royal Cravings Banglo - Order Confirmation*\n\n`;
    msg += `Order ID: #${currentOrderData.orderId}\n`;
    msg += `Total: ₹${currentOrderData.total.toFixed(2)}\n\n`;
    msg += `Items:\n`;
    currentOrderData.items.forEach(item => {
      const price = parseFloat(String(item.price).replace('₹', ''));
      msg += `- ${item.name} x${item.quantity} = ₹${(price * item.quantity).toFixed(2)}\n`;
    });
    msg += `\nDeliver to: ${currentOrderData.delivery.name}`;
    msg += `\nThank you!`;

    const phone = currentOrderData.delivery.phone;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  document.getElementById('download-receipt-btn').addEventListener('click', generateReceipt);
  document.getElementById('email-receipt-btn').addEventListener('click', sendEmailReceipt);
  document.getElementById('whatsapp-btn').addEventListener('click', sendWhatsApp);

  loadCart();
})();
