let app = null;
let auth = null;
let db = null;
let provider = null;
let firebaseReady = false;

const isFirebaseConfigured = () => {
  return FIREBASE_CONFIG &&
    FIREBASE_CONFIG.apiKey &&
    !FIREBASE_CONFIG.apiKey.startsWith('YOUR_');
};

const initFirebase = () => {
  if (!isFirebaseConfigured()) {
    console.warn('Firebase not configured — using local auth/orders. Fill js/config.js to enable.');
    return;
  }
  try {
    app = firebase.initializeApp(FIREBASE_CONFIG);
    auth = firebase.auth();
    db = firebase.firestore();
    provider = new firebase.auth.GoogleAuthProvider();
    firebaseReady = true;
    console.log('Firebase initialized.');
  } catch (err) {
    console.error('Firebase init failed:', err);
  }
};

initFirebase();
