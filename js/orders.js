const orderHistoryPanel = document.getElementById('order-history-panel');
const orderHistoryClose = document.getElementById('order-history-close');
const orderHistoryList = document.getElementById('order-history-list');

const openOrderHistory = () => {
  if (!currentUser) {
    openAuthModal(true);
    return;
  }
  loadOrderHistory();
  orderHistoryPanel.classList.add('order-history-active');
};

orderHistoryClose.addEventListener('click', () => {
  orderHistoryPanel.classList.remove('order-history-active');
});

/* ---- LOAD ORDER HISTORY ---- */

const loadOrderHistory = async () => {
  if (!currentUser) return;

  if (firebaseReady && db) {
    try {
      const snapshot = await db.collection('orders')
        .where('userId', '==', currentUser.uid)
        .get();

      orderHistoryList.innerHTML = '';
      if (snapshot.empty) {
        orderHistoryList.innerHTML = '<p class="no-orders">No orders yet. Start ordering!</p>';
        return;
      }

      const orders = [];
      snapshot.forEach(doc => {
        orders.push({ id: doc.id, ...doc.data() });
      });
      orders.sort((a, b) => {
        const ta = a.createdAt ? a.createdAt.toMillis() : 0;
        const tb = b.createdAt ? b.createdAt.toMillis() : 0;
        return tb - ta;
      });

      for (const order of orders) {
        const date = order.createdAt ? order.createdAt.toDate().toLocaleDateString() : 'N/A';
        const el = await buildOrderElement(order.id, order, date);
        orderHistoryList.appendChild(el);
      }
    } catch (err) {
      orderHistoryList.innerHTML = '<p class="no-orders">Error loading orders.</p>';
      console.error('Error loading orders:', err);
    }
  } else {
    const orders = JSON.parse(localStorage.getItem('rcb_orders') || '[]');
    const reviews = JSON.parse(localStorage.getItem('rcb_reviews') || '{}');
    const userOrders = orders.filter(o => o.userId === currentUser.uid).reverse();

    orderHistoryList.innerHTML = '';
    if (userOrders.length === 0) {
      orderHistoryList.innerHTML = '<p class="no-orders">No orders yet. Start ordering!</p>';
      return;
    }
    userOrders.forEach(order => {
      const review = reviews[order.id] || null;
      orderHistoryList.appendChild(buildOrderElementSync(order.id, order, order.date, review));
    });
  }
};

/* ---- CHECK IF ORDER HAS REVIEW ---- */

const getReview = async (orderId) => {
  if (firebaseReady && db) {
    try {
      const snap = await db.collection('reviews').doc(orderId).get();
      return snap.exists ? snap.data() : null;
    } catch {
      return null;
    }
  } else {
    const reviews = JSON.parse(localStorage.getItem('rcb_reviews') || '{}');
    return reviews[orderId] || null;
  }
};

/* ---- BUILD ORDER ELEMENT ---- */

const buildOrderElement = async (id, order, date) => {
  const review = await getReview(id);
  return buildOrderElementSync(id, order, date, review);
};

const buildOrderElementSync = (id, order, date, review) => {
  const status = order.status || 'placed';
  const canCancel = status === 'placed';
  const hasReview = review !== null;

  const el = document.createElement('div');
  el.classList.add('order-item');

  let actionsHTML = '';
  if (canCancel) {
    actionsHTML += `<button class="order-cancel-btn" data-id="${id}"><i class="fa-solid fa-xmark"></i> Cancel</button>`;
  }
  if (status === 'delivered' && !hasReview) {
    actionsHTML += `<button class="order-review-btn" data-id="${id}"><i class="fa-solid fa-star"></i> Rate</button>`;
  }

  let reviewHTML = '';
  if (hasReview) {
    const stars = Array.from({ length: 5 }, (_, i) =>
      `<i class="fa-solid fa-star${i < review.rating ? '' : ' review-star-empty'}"></i>`
    ).join('');
    reviewHTML = `
      <div class="order-review-display">
        <div class="review-stars-small">${stars}</div>
        <p class="review-text-small">${review.text || ''}</p>
      </div>
    `;
  }

  el.innerHTML = `
    <div class="order-item-header">
      <span class="order-id">#${String(id).slice(0, 8).toUpperCase()}</span>
      <span class="order-date">${date}</span>
    </div>
    <div class="order-items-list">
      ${order.items.map(item => `
        <div class="order-product">
          <span>${item.name} x${item.quantity}</span>
          <span>₹${(parseFloat(item.price.replace('₹', '')) * item.quantity).toFixed(2)}</span>
        </div>
      `).join('')}
    </div>
    ${reviewHTML}
    <div class="order-item-footer">
      <span class="order-status ${status}">${status}</span>
      <span class="order-total">Total: ₹${order.total.toFixed(2)}</span>
    </div>
    ${actionsHTML ? `<div class="order-actions">${actionsHTML}</div>` : ''}
  `;

  const cancelBtn = el.querySelector('.order-cancel-btn');
  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => cancelOrder(id));
  }

  const reviewBtn = el.querySelector('.order-review-btn');
  if (reviewBtn) {
    reviewBtn.addEventListener('click', () => openReviewForm(el, id));
  }

  return el;
};

/* ---- CANCEL ORDER ---- */

const cancelOrder = async (orderId) => {
  const confirm = await showConfirm(
    'Are you sure you want to cancel this order?',
    'Cancel Order',
    'images/icon.png'
  );
  if (!confirm) return;

  if (firebaseReady && db) {
    try {
      await db.collection('orders').doc(orderId).update({ status: 'cancelled' });
    } catch (err) {
      console.error('Error cancelling order:', err);
    }
  } else {
    const orders = JSON.parse(localStorage.getItem('rcb_orders') || '[]');
    const idx = orders.findIndex(o => o.id === orderId);
    if (idx !== -1) {
      orders[idx].status = 'cancelled';
      localStorage.setItem('rcb_orders', JSON.stringify(orders));
    }
  }

  showToast('Order cancelled', 'delete');
  loadOrderHistory();
};

/* ---- REVIEW FORM ---- */

const openReviewForm = (orderEl, orderId) => {
  const existing = orderEl.querySelector('.order-review-form');
  if (existing) { existing.remove(); return; }

  const form = document.createElement('div');
  form.className = 'order-review-form';
  form.innerHTML = `
    <div class="review-rating-select">
      <span>Rating:</span>
      <div class="review-stars-input" data-rating="0">
        <i class="fa-solid fa-star" data-star="1"></i>
        <i class="fa-solid fa-star" data-star="2"></i>
        <i class="fa-solid fa-star" data-star="3"></i>
        <i class="fa-solid fa-star" data-star="4"></i>
        <i class="fa-solid fa-star" data-star="5"></i>
      </div>
    </div>
    <textarea class="review-input" placeholder="How was your experience? (optional)" rows="2"></textarea>
    <div class="review-form-actions">
      <button class="review-submit-btn">Submit Review</button>
      <button class="review-cancel-btn">Cancel</button>
    </div>
  `;

  const footer = orderEl.querySelector('.order-item-footer');
  footer.after(form);

  let selectedRating = 0;
  const stars = form.querySelectorAll('.review-stars-input i');

  stars.forEach(star => {
    star.addEventListener('click', () => {
      selectedRating = parseInt(star.dataset.star);
      stars.forEach((s, i) => {
        s.classList.toggle('review-star-active', i < selectedRating);
      });
    });

    star.addEventListener('mouseenter', () => {
      const hoverVal = parseInt(star.dataset.star);
      stars.forEach((s, i) => {
        s.classList.toggle('review-star-hover', i < hoverVal);
      });
    });

    star.addEventListener('mouseleave', () => {
      stars.forEach(s => s.classList.remove('review-star-hover'));
    });
  });

  form.querySelector('.review-cancel-btn').addEventListener('click', () => form.remove());

  form.querySelector('.review-submit-btn').addEventListener('click', async () => {
    if (selectedRating === 0) {
      showToast('Please select a rating', 'warning');
      return;
    }

    const text = form.querySelector('.review-input').value.trim();
    const reviewData = { rating: selectedRating, text };

    if (firebaseReady && db) {
      try {
        await db.collection('reviews').doc(orderId).set({
          ...reviewData,
          userId: currentUser.uid,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      } catch (err) {
        console.error('Error saving review:', err);
      }
    } else {
      const reviews = JSON.parse(localStorage.getItem('rcb_reviews') || '{}');
      reviews[orderId] = reviewData;
      localStorage.setItem('rcb_reviews', JSON.stringify(reviews));
    }

    showToast('Review submitted! Thank you', 'success');
    loadOrderHistory();
  });
};

/* ---- PLACE ORDER ---- */

const placeOrder = async (items, total) => {
  if (!currentUser) {
    openAuthModal(true);
    return null;
  }

  if (firebaseReady && db) {
    try {
      const orderRef = await db.collection('orders').add({
        userId: currentUser.uid,
        items: items.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          image: item.image,
          quantity: item.quantity
        })),
        total: total,
        status: 'placed',
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      return orderRef.id;
    } catch (err) {
      console.error('Error placing order:', err);
      return null;
    }
  } else {
    const orderId = 'ORD' + Date.now();
    const orders = JSON.parse(localStorage.getItem('rcb_orders') || '[]');
    orders.push({
      id: orderId,
      userId: currentUser.uid,
      items: items.map(item => ({
        id: item.id,
        name: item.name,
        price: item.price,
        image: item.image,
        quantity: item.quantity
      })),
      total: total,
      status: 'placed',
      date: new Date().toLocaleDateString()
    });
    localStorage.setItem('rcb_orders', JSON.stringify(orders));
    return orderId;
  }
};
