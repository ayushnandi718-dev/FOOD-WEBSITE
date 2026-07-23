var swiper = new Swiper(".mySwiper", {
  loop: true,
  navigation: {
    nextEl: "#next",
    prevEl: "#prev",
  },
});

const cartIcon = document.querySelector('.cart-icon');
const cartTab = document.querySelector('.cart-tab');
const closeBtn = document.querySelector('.close-btn');
const cardList = document.querySelector('.card-list');
const cartList = document.querySelector('.cart-list');
const cartTotal = document.querySelector('.cart-total');
const cartValue = document.querySelector('.cart-value');
const hamburger = document.querySelector('.hamburger');
const mobileMenu = document.querySelector('.mobile-menu');

cartIcon.addEventListener('click', () => cartTab.classList.add('cart-tab-active'));
closeBtn.addEventListener('click', () => cartTab.classList.remove('cart-tab-active'));
hamburger.addEventListener('click', () => mobileMenu.classList.toggle('mobile-menu-active'));

let productList = [];
let cartProduct = [];

let toastTimeout = null;

const showToast = (message, type = 'success', product = null) => {
  document.querySelectorAll('.rcb-toast').forEach(t => t.remove());
  if (toastTimeout) clearTimeout(toastTimeout);

  const titles = {
    success: 'Added to Cart',
    warning: 'Already in Cart',
    delete: 'Removed from Cart',
    empty: 'Empty Cart'
  };

  const icons = {
    success: 'fa-check',
    warning: 'fa-exclamation',
    delete: 'fa-trash',
    empty: 'fa-cart-shopping'
  };

  const toast = document.createElement('div');
  toast.className = `rcb-toast border-${type}`;

  const img = product && product.image ? `<img src="${product.image}" class="rcb-toast-img">` : '';

  toast.innerHTML = `
    <div class="rcb-toast-progress rcb-toast-progress-${type}"></div>
    <div class="rcb-toast-body">
      <div class="rcb-toast-icon ${type}"><i class="fa-solid ${icons[type]}"></i></div>
      ${img}
      <div class="rcb-toast-text">
        <span class="rcb-toast-title">${titles[type]}</span>
        <span class="rcb-toast-msg">${message}</span>
      </div>
    </div>
    <button class="rcb-toast-close">&times;</button>
  `;

  document.body.appendChild(toast);
  toast.querySelector('.rcb-toast-close').addEventListener('click', () => dismissToast(toast));

  requestAnimationFrame(() => toast.classList.add('rcb-toast-show'));

  toastTimeout = setTimeout(() => dismissToast(toast), 3000);
};

const dismissToast = (toast) => {
  if (!toast || toast.classList.contains('rcb-toast-hide')) return;
  if (toastTimeout) clearTimeout(toastTimeout);
  toast.classList.add('rcb-toast-hide');
  setTimeout(() => toast.remove(), 500);
};

const showConfirm = (message, productName, productImage) => {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'rcb-confirm-overlay';
    overlay.innerHTML = `
      <div class="rcb-confirm-box">
        <div class="rcb-confirm-top">
          <img src="${productImage}" class="rcb-confirm-img">
          <div class="rcb-confirm-text">
            <h4>Remove Item?</h4>
            <p>${message}</p>
          </div>
        </div>
        <div class="rcb-confirm-actions">
          <button class="rcb-confirm-btn cancel">Keep It</button>
          <button class="rcb-confirm-btn delete">Delete</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('rcb-confirm-show'));

    overlay.querySelector('.cancel').addEventListener('click', () => {
      overlay.classList.remove('rcb-confirm-show');
      setTimeout(() => overlay.remove(), 300);
      resolve(false);
    });

    overlay.querySelector('.delete').addEventListener('click', () => {
      overlay.classList.remove('rcb-confirm-show');
      setTimeout(() => overlay.remove(), 300);
      resolve(true);
    });

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.classList.remove('rcb-confirm-show');
        setTimeout(() => overlay.remove(), 300);
        resolve(false);
      }
    });
  });
};

const updateTotals = () => {
  let totalPrice = 0;
  let totalQuantity = 0;

  document.querySelectorAll('.cart-list .item').forEach(item => {
    const itemTotal = item.querySelector('.item-total');
    if (itemTotal) {
      const quantity = parseInt(item.querySelector('.quantity-value').textContent);
      const price = parseFloat(itemTotal.textContent.replace('₹', ''));
      totalPrice += price;
      totalQuantity += quantity;
    }
  });

  cartTotal.textContent = `₹${totalPrice.toFixed(2)}`;
  cartValue.textContent = totalQuantity;
};

const clearCart = () => {
  cartProduct = [];
  cartList.innerHTML = '';
  updateTotals();
};

const showCards = () => {
  cardList.innerHTML = '';
  productList.forEach(product => {
    const orderCard = document.createElement('div');
    orderCard.classList.add('order-card');
    orderCard.dataset.category = product.category || '';

    orderCard.innerHTML = `
      <div class="card-image">
        <img src="${product.image}">
      </div>
      <h4>${product.name}</h4>
      <h4 class="price">${product.price}</h4>
      <a href="#" class="btn card-btn">Order Like Royalty 👑</a>
    `;
    cardList.appendChild(orderCard);

    const cardBtn = orderCard.querySelector('.card-btn');
    cardBtn.addEventListener('click', (e) => {
      e.preventDefault();
      addToCart(product);
    });
  });
};

const addToCart = (product) => {
  const existingProduct = cartProduct.find(item => item.id === product.id);
  if (existingProduct) {
    showToast(`${product.name} is already in your cart!`, 'warning', product);
    return;
  }

  cartProduct.push(product);
  showToast(`${product.name} — ${product.price}`, 'success', product);

  let quantity = 1;
  let price = parseFloat(product.price.replace('₹', ''));

  const cartItem = document.createElement('div');
  cartItem.classList.add('item');

  cartItem.innerHTML = `
    <div class="item-image">
      <img src="${product.image}">
    </div>
    <div class="detail">
      <h4>${product.name}</h4>
      <h4 class="item-total">${product.price}</h4>
    </div>
    <div class="flex">
      <a href="#" class="quantity-btn minus">
        <i class="fa-solid fa-minus"></i>
      </a>
      <h4 class="quantity-value">${quantity}</h4>
      <a href="#" class="quantity-btn plus">
        <i class="fa-solid fa-plus"></i>
      </a>
    </div>
  `;

  cartList.appendChild(cartItem);
  updateTotals();

  const plusBtn = cartItem.querySelector('.plus');
  const quantityValue = cartItem.querySelector('.quantity-value');
  const itemTotal = cartItem.querySelector('.item-total');
  const minusBtn = cartItem.querySelector('.minus');

  plusBtn.addEventListener('click', (e) => {
    e.preventDefault();
    quantity++;
    quantityValue.textContent = quantity;
    itemTotal.textContent = `₹${(price * quantity).toFixed(2)}`;
    updateTotals();
  });

  minusBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    if (quantity > 1) {
      quantity--;
      quantityValue.textContent = quantity;
      itemTotal.textContent = `₹${(price * quantity).toFixed(2)}`;
      updateTotals();
    } else {
      const confirmed = await showConfirm(
        `Are you sure you want to remove <strong>${product.name}</strong> from your cart?`,
        product.name,
        product.image
      );
      if (confirmed) {
        cartItem.classList.add('slide-out');
        setTimeout(() => {
          cartItem.remove();
          cartProduct = cartProduct.filter(item => item.id !== product.id);
          updateTotals();
          showToast(`${product.name} removed from cart`, 'delete');
        }, 300);
      }
    }
  });
};

const loadProductsFromFirestore = () => {
  db.collection('products').orderBy('id').get()
    .then(snapshot => {
      if (snapshot.empty) {
        loadProductsFromJSON();
        return;
      }
      productList = [];
      snapshot.forEach(doc => {
        productList.push(doc.data());
      });
      showCards();
    })
    .catch(() => {
      loadProductsFromJSON();
    });
};

const loadProductsFromJSON = () => {
  fetch('products.json')
    .then(response => response.json())
    .then(data => {
      productList = data;
      showCards();
    });
};

/* ---- CHECKOUT BUTTON: Save cart to sessionStorage and go to checkout ---- */
const checkoutBtnEl = document.querySelector('.checkout-btn');
if (checkoutBtnEl) {
  checkoutBtnEl.addEventListener('click', (e) => {
    e.preventDefault();

    if (cartProduct.length === 0) {
      showToast('Your cart is empty! Add items first.', 'empty');
      return;
    }

    const checkoutData = cartProduct.map((product, idx) => {
      const cartItem = cartList.querySelectorAll('.item')[idx];
      const quantity = cartItem ? parseInt(cartItem.querySelector('.quantity-value').textContent) : 1;
      return {
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.image,
        quantity: quantity
      };
    });

    sessionStorage.setItem('rcb_checkout_cart', JSON.stringify(checkoutData));
    window.location.href = 'checkout.html';
  });
}

const initApp = () => {
  if (typeof db !== 'undefined' && db) {
    loadProductsFromFirestore();
  } else {
    loadProductsFromJSON();
  }
};

if (typeof db !== 'undefined' && db) {
  initApp();
} else {
  window.addEventListener('load', initApp);
}
