const searchInput = document.getElementById('menu-search');
const filterButtons = document.querySelectorAll('.filter-btn');
let activeCategory = 'all';

const normalize = (str) => str.toLowerCase().trim();

const filterProducts = () => {
  const query = normalize(searchInput.value);
  const cards = document.querySelectorAll('.order-card');

  cards.forEach(card => {
    const name = normalize(card.querySelector('h4').textContent);
    const category = normalize(card.dataset.category || '');
    const matchesSearch = name.includes(query);
    const matchesCategory = activeCategory === 'all' || category === activeCategory;

    card.style.display = (matchesSearch && matchesCategory) ? '' : 'none';
  });
};

searchInput.addEventListener('input', filterProducts);

filterButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    filterButtons.forEach(b => b.classList.remove('filter-btn-active'));
    btn.classList.add('filter-btn-active');
    activeCategory = btn.dataset.category;
    filterProducts();
  });
});
