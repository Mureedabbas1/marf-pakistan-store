(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Live date/time for Pakistan (Asia/Karachi); uses the visitor's device clock.
  const liveClock = document.getElementById('marf-live-clock');
  const liveDate = document.getElementById('marf-live-date');
  function updateMarfClock() {
    const now = new Date();
    if (liveClock) liveClock.textContent = new Intl.DateTimeFormat('en-PK', {
      timeZone: 'Asia/Karachi', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
    }).format(now);
    if (liveDate) liveDate.textContent = new Intl.DateTimeFormat('en-PK', {
      timeZone: 'Asia/Karachi', weekday: 'short', day: '2-digit', month: 'short', year: 'numeric'
    }).format(now);
  }
  updateMarfClock();
  window.setInterval(updateMarfClock, 1000);

  const revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !reduceMotion) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); }
    }), { threshold: 0.12 });
    revealEls.forEach(el => observer.observe(el));
  } else revealEls.forEach(el => el.classList.add('visible'));

  const menuToggle = document.getElementById('menu-toggle');
  const nav = document.querySelector('.main-nav');
  menuToggle?.addEventListener('click', () => nav.classList.toggle('open'));
  nav?.querySelectorAll('a').forEach(link => link.addEventListener('click', () => nav.classList.remove('open')));

  const cartDrawer = document.getElementById('cart-drawer');
  const cartItems = document.getElementById('cart-items');
  const cartCount = document.getElementById('cart-count');
  const drawerCount = document.getElementById('drawer-count');
  const cart = [];
  const toast = document.getElementById('toast');
  let toastTimer;
  function showToast(message) {
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2400);
  }
  function renderCart() {
    cartCount.textContent = cart.length;
    drawerCount.textContent = '(' + cart.length + ')';
    if (!cart.length) {
      cartItems.innerHTML = '<p class="empty-cart">Your bag is waiting for something good.</p>';
      return;
    }
    cartItems.innerHTML = '';
    cart.forEach((item, index) => {
      const row = document.createElement('div');
      row.className = 'cart-item';
      const name = document.createElement('span');
      name.textContent = item;
      const remove = document.createElement('button');
      remove.type = 'button'; remove.textContent = 'REMOVE';
      remove.addEventListener('click', () => { cart.splice(index, 1); renderCart(); });
      row.append(name, remove);
      cartItems.append(row);
    });
  }
  function openCart() { cartDrawer.classList.add('open'); cartDrawer.setAttribute('aria-hidden', 'false'); document.body.style.overflow = 'hidden'; }
  function closeCart() { cartDrawer.classList.remove('open'); cartDrawer.setAttribute('aria-hidden', 'true'); document.body.style.overflow = ''; }
  document.getElementById('cart-open').addEventListener('click', openCart);
  document.getElementById('cart-close').addEventListener('click', closeCart);
  document.getElementById('drawer-x').addEventListener('click', closeCart);
  document.addEventListener('keydown', event => { if (event.key === 'Escape') { closeCart(); closeSearch(); } });
  document.querySelectorAll('.quick-add').forEach(button => button.addEventListener('click', () => {
    showToast('Preview only — live products and ordering are being set up.');
    // Keep this as a visual preview until real products and prices are configured.
    cart.push(button.dataset.name);
    renderCart();
  }));

  document.querySelectorAll('.filter').forEach(button => button.addEventListener('click', () => {
    document.querySelectorAll('.filter').forEach(filter => filter.classList.remove('active'));
    button.classList.add('active');
    const category = button.dataset.filter;
    document.querySelectorAll('.product-card').forEach(card => {
      card.hidden = category !== 'All' && card.dataset.category !== category;
    });
  }));
  document.querySelectorAll('.shop-category-card').forEach(card => card.addEventListener('click', event => {
    event.preventDefault();
    const category = card.dataset.shopCategory;
    const matchingFilter = [...document.querySelectorAll('.filter')].find(filter =>
      filter.dataset.filter.toLowerCase() === category.toLowerCase()
    );
    document.getElementById('featured').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
    if (matchingFilter) {
      matchingFilter.click();
    } else {
      showToast(category + ' category added — products will appear when the collection is stocked.');
    }
  }));

  document.querySelectorAll('.collection-card').forEach(card => card.addEventListener('click', () => {
    const category = card.dataset.category;
    const filter = document.querySelector('.filter[data-filter="' + category + '"]');
    if (filter) filter.click();
  }));

  const searchPanel = document.getElementById('search-panel');
  const searchInput = document.getElementById('search-input');
  function openSearch() { searchPanel.classList.add('open'); setTimeout(() => searchInput.focus(), 180); }
  function closeSearch() { searchPanel.classList.remove('open'); }
  document.querySelector('.search-toggle').addEventListener('click', openSearch);
  document.getElementById('search-close').addEventListener('click', closeSearch);
  document.getElementById('search-form').addEventListener('submit', event => {
    event.preventDefault();
    const term = searchInput.value.trim().toLowerCase();
    let shown = 0;
    document.querySelectorAll('.product-card').forEach(card => {
      const match = !term || card.textContent.toLowerCase().includes(term) || card.dataset.category.toLowerCase().includes(term);
      card.hidden = !match;
      if (match) shown++;
    });
    document.querySelectorAll('.filter').forEach(filter => filter.classList.remove('active'));
    document.querySelector('.filter[data-filter="All"]').classList.add('active');
    closeSearch();
    document.getElementById('featured').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
    showToast(shown ? shown + ' preview item(s) found.' : 'No preview items match that search.');
  });
})();