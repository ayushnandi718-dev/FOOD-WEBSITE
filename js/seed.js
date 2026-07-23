const seedProducts = async () => {
  if (!firebaseReady || !db) {
    console.warn('Firebase not initialized. Check js/config.js');
    return;
  }

  const products = [
    { id: 1, name: "Veg Burger", price: "₹190", image: "images/veg_burger.png", category: "burger" },
    { id: 2, name: "Veggie Pizza", price: "₹200", image: "images/pizza.png", category: "pizza" },
    { id: 3, name: "Fried Chicken", price: "₹90", image: "images/fried-chicken.png", category: "chicken" },
    { id: 4, name: "Lasagna", price: "₹110", image: "images/lasagna.png", category: "pasta" },
    { id: 5, name: "Spring Roll", price: "₹100", image: "images/spring-roll.png", category: "snacks" },
    { id: 6, name: "Spaghetti", price: "₹90", image: "images/spaghetti.png", category: "pasta" },
    { id: 7, name: "Chicken Roll", price: "₹150", image: "images/chicken-roll.png", category: "chicken" },
    { id: 8, name: "Sandwich", price: "₹120", image: "images/sandwich.png", category: "snacks" }
  ];

  try {
    const batch = db.batch();
    products.forEach(product => {
      const ref = db.collection('products').doc(String(product.id));
      batch.set(ref, product);
    });
    await batch.commit();
    console.log('Products seeded successfully!');
  } catch (err) {
    console.error('Error seeding products:', err);
  }
};

window.seedProducts = seedProducts;
