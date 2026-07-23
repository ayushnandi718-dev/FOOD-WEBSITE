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

      orders.forEach(order => {
        const date = order.createdAt ? order.createdAt.toDate().toLocaleDateString() : 'N/A';
        orderHistoryList.appendChild(buildOrderElement(order.id, order, date));
      });
    } catch (err) {
      orderHistoryList.innerHTML = '<p class="no-orders">Error loading orders.</p>';
      console.error('Error loading orders:', err);
    }
  } else {
    const orders = JSON.parse(localStorage.getItem('rcb_orders') || '[]');
    const userOrders = orders.filter(o => o.userId === currentUser.uid).reverse();

    orderHistoryList.innerHTML = '';
    if (userOrders.length === 0) {
      orderHistoryList.innerHTML = '<p class="no-orders">No orders yet. Start ordering!</p>';
      return;
    }
    userOrders.forEach(order => {
      orderHistoryList.appendChild(buildOrderElement(order.id, order, order.date));
    });
  }
};

const buildOrderElement = (id, order, date) => {
  const el = document.createElement('div');
  el.classList.add('order-item');
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
    <div class="order-item-footer">
      <span class="order-status ${order.status}">${order.status || 'placed'}</span>
      <span class="order-total">Total: ₹${order.total.toFixed(2)}</span>
    </div>
  `;
  return el;
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
