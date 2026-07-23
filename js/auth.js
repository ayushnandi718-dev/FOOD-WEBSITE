let currentUser = null;

const authModal = document.getElementById('auth-modal');
const authCloseBtn = document.getElementById('auth-close');
const authForm = document.getElementById('auth-form');
const authTitle = document.getElementById('auth-title');
const authSubmitBtn = document.getElementById('auth-submit');
const authSwitchLink = document.getElementById('auth-switch');
const googleSignInBtn = document.getElementById('google-signin');
const nameField = document.getElementById('name-field');
const userMenuBtn = document.getElementById('user-menu-btn');
const userDropdown = document.getElementById('user-dropdown');
const userNameEl = document.getElementById('user-name');
const userAvatarEl = document.getElementById('user-avatar');
const signOutBtn = document.getElementById('sign-out-btn');
const orderHistoryBtn = document.getElementById('order-history-btn');

let isLoginMode = true;
let isGoogleSigningIn = false;

const openAuthModal = (loginMode = true) => {
  isLoginMode = loginMode;
  updateAuthForm();
  authModal.classList.add('auth-modal-active');
};

const closeAuthModal = () => {
  authModal.classList.remove('auth-modal-active');
  authForm.reset();
  if (nameField) nameField.style.display = 'none';
};

const updateAuthForm = () => {
  authTitle.textContent = isLoginMode ? 'Sign In' : 'Sign Up';
  authSubmitBtn.textContent = isLoginMode ? 'Sign In' : 'Create Account';

  if (nameField) {
    nameField.style.display = isLoginMode ? 'none' : 'block';
  }

  authSwitchLink.innerHTML = isLoginMode
    ? 'Don\'t have an account? <a href="#">Sign Up</a>'
    : 'Already have an account? <a href="#">Sign In</a>';

  authSwitchLink.querySelector('a').addEventListener('click', (e) => {
    e.preventDefault();
    isLoginMode = !isLoginMode;
    updateAuthForm();
  });
};

const updateUIForUser = (user) => {
  const signInBtns = document.querySelectorAll('.sign-in-btn');
  if (user) {
    currentUser = user;
    signInBtns.forEach(btn => btn.style.display = 'none');
    userMenuBtn.style.display = 'flex';
    userNameEl.textContent = user.displayName || user.email.split('@')[0];
    userAvatarEl.textContent = (user.displayName || user.email)[0].toUpperCase();
    closeAuthModal();
  } else {
    currentUser = null;
    signInBtns.forEach(btn => btn.style.display = 'inline-block');
    userMenuBtn.style.display = 'none';
    userDropdown.classList.remove('user-dropdown-active');
  }
};

/* ---- LOCAL AUTH HELPERS ---- */

const localSignup = (email, password, name) => {
  const users = JSON.parse(localStorage.getItem('rcb_users') || '[]');
  if (users.find(u => u.email === email)) {
    alert('Account already exists. Please sign in.');
    return false;
  }
  const user = { uid: 'local_' + Date.now(), email, displayName: name || email.split('@')[0] };
  users.push({ ...user, password });
  localStorage.setItem('rcb_users', JSON.stringify(users));
  localStorage.setItem('rcb_session', JSON.stringify(user));
  currentUser = user;
  updateUIForUser(user);
  return true;
};

const localLogin = (email, password) => {
  const users = JSON.parse(localStorage.getItem('rcb_users') || '[]');
  const found = users.find(u => u.email === email && u.password === password);
  if (!found) {
    alert('Invalid email or password.');
    return false;
  }
  const session = { uid: found.uid, email: found.email, displayName: found.displayName };
  localStorage.setItem('rcb_session', JSON.stringify(session));
  currentUser = session;
  updateUIForUser(session);
  return true;
};

const localSignOut = () => {
  localStorage.removeItem('rcb_session');
  currentUser = null;
  updateUIForUser(null);
};

const restoreSession = () => {
  const session = localStorage.getItem('rcb_session');
  if (session) {
    currentUser = JSON.parse(session);
    updateUIForUser(currentUser);
  }
};

/* ---- FORM SUBMIT ---- */

authForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('auth-email').value;
  const password = document.getElementById('auth-password').value;
  const name = document.getElementById('auth-name');

  if (firebaseReady && auth) {
    try {
      if (isLoginMode) {
        await auth.signInWithEmailAndPassword(email, password);
      } else {
        const cred = await auth.createUserWithEmailAndPassword(email, password);
        if (name && name.value) {
          await cred.user.updateProfile({ displayName: name.value });
        }
      }
      closeAuthModal();
    } catch (err) {
      alert(err.message);
    }
  } else {
    if (isLoginMode) {
      localLogin(email, password);
    } else {
      localSignup(email, password, name ? name.value : '');
    }
  }
});

/* ---- GOOGLE SIGN IN ---- */

googleSignInBtn.addEventListener('click', async () => {
  if (isGoogleSigningIn) return;
  if (firebaseReady && auth && provider) {
    isGoogleSigningIn = true;
    try {
      await auth.signInWithPopup(provider);
    } catch (err) {
      if (err.code !== 'auth/cancelled-popup-request') {
        console.error('Google sign-in error:', err);
      }
    } finally {
      isGoogleSigningIn = false;
    }
  } else {
    alert('Google Sign-In requires Firebase. Please configure js/config.js');
  }
});

/* ---- USER MENU ---- */

userMenuBtn.addEventListener('click', () => {
  userDropdown.classList.toggle('user-dropdown-active');
});

signOutBtn.addEventListener('click', () => {
  if (firebaseReady && auth) {
    auth.signOut();
  } else {
    localSignOut();
  }
  userDropdown.classList.remove('user-dropdown-active');
});

orderHistoryBtn.addEventListener('click', () => {
  userDropdown.classList.remove('user-dropdown-active');
  openOrderHistory();
});

/* ---- SIGN IN BUTTONS ---- */

document.querySelectorAll('.sign-in-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    openAuthModal(true);
  });
});

/* ---- CLOSE MODAL ---- */

authCloseBtn.addEventListener('click', closeAuthModal);
authModal.addEventListener('click', (e) => {
  if (e.target === authModal) closeAuthModal();
});

document.addEventListener('click', (e) => {
  if (!userMenuBtn.contains(e.target) && !userDropdown.contains(e.target)) {
    userDropdown.classList.remove('user-dropdown-active');
  }
});

/* ---- INIT ---- */

if (firebaseReady && auth) {
  auth.onAuthStateChanged((user) => {
    updateUIForUser(user);
  });
} else {
  restoreSession();
}
