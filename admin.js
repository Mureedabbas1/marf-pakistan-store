(() => {
  const client = window.supabase.createClient('https://bufgifgroghgjmbarnwn.supabase.co','sb_publishable_2ERT7quoEZKc1KkP-BeUGg_OBdWwhL2');
  const $ = id => document.getElementById(id);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const money = n => n == null ? 'Delivery TBD' : new Intl.NumberFormat('en-PK',{style:'currency',currency:'PKR',maximumFractionDigits:0}).format(Number(n));
  const pkr = n => new Intl.NumberFormat('en-PK',{style:'currency',currency:'PKR',maximumFractionDigits:0}).format(Number(n) || 0);
  const slugify = s => String(s||'').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,160);
  const safe = s => String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const cap = s => String(s||'').charAt(0).toUpperCase() + String(s||'').slice(1);
  const fmtDate = d => { try { return new Date(d).toLocaleString('en-PK',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}); } catch { return ''; } };
  const STATES = ['pending','confirmed','processing','shipped','delivered','cancelled'];
  const CATS = Object.fromEntries($$('option', $('product-form').elements.category).map(o => [o.value, o.textContent]));
  const state = { products: [], orders: [], view: 'overview', orderStatus: 'all', orderQ: '', invQ: '', invCat: 'all', invStock: 'all' };
  const VIEWS = {
    overview:  ['Overview', 'Your store at a glance'],
    orders:    ['Orders', 'Cash on Delivery'],
    inventory: ['Inventory', 'Products and stock'],
    product:   ['Add a product', 'Catalogue'],
    settings:  ['Delivery settings', 'Store']
  };

  function status(el, text, ok = false) { if (!el) return; el.textContent = text; el.className = 'admin-message' + (ok ? ' ok' : ''); }
  let toastTimer;
  function toast(msg, ok = true) {
    const t = $('toast'); t.textContent = msg; t.className = 'toast show' + (ok ? '' : ' bad');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 3200);
  }

  /* ---------------- Navigation ---------------- */
  function closeSidebar() { $('dashboard').classList.remove('menu-open'); }
  function showView(v, push = true) {
    if (!VIEWS[v]) v = 'overview';
    state.view = v;
    $$('.view').forEach(s => s.classList.toggle('admin-hide', s.id !== 'view-' + v));
    $$('.side-link[data-view]').forEach(b => {
      const on = b.dataset.view === v;
      b.classList.toggle('active', on);
      on ? b.setAttribute('aria-current', 'page') : b.removeAttribute('aria-current');
    });
    const editing = !!$('product-form').elements.id.value;
    $('view-title').textContent = v === 'product' ? (editing ? 'Edit product' : 'Add a product') : VIEWS[v][0];
    $('view-sub').textContent = VIEWS[v][1];
    closeSidebar();
    if (push && location.hash !== '#' + v) history.replaceState(null, '', '#' + v);
    window.scrollTo({ top: 0 });
  }
  document.addEventListener('click', e => {
    const nav = e.target.closest('[data-view]'); if (nav) { if (nav.dataset.view === 'product') clearProductForm(); showView(nav.dataset.view); return; }
    const go = e.target.closest('[data-go]'); if (go) { if (go.dataset.go === 'product') clearProductForm(); showView(go.dataset.go); return; }
    const ord = e.target.closest('[data-order]'); if (ord) { openOrder(ord.dataset.order); return; }
    const ed = e.target.closest('[data-edit]'); if (ed) { editProduct(state.products.find(p => p.id === ed.dataset.edit)); return; }
    const tg = e.target.closest('[data-toggle]'); if (tg) { toggleProduct(tg.dataset.toggle, tg); return; }
    const chip = e.target.closest('[data-chip]'); if (chip) { state.orderStatus = chip.dataset.chip; renderOrders(); return; }
    const cover = e.target.closest('[data-photo-cover]'); if (cover) { const g = getGallery(); const [x] = g.splice(Number(cover.dataset.photoCover), 1); g.unshift(x); setGallery(g); return; }
    const rm = e.target.closest('[data-photo-remove]'); if (rm) { const g = getGallery(); g.splice(Number(rm.dataset.photoRemove), 1); setGallery(g); return; }
    const rmNew = e.target.closest('[data-photo-clear]'); if (rmNew) { $('product-form').elements.image_files.value = ''; renderGallery(); return; }
  });
  document.addEventListener('change', e => {
    const sel = e.target.closest('select[data-status]'); if (sel) setOrderStatus(sel.dataset.status, sel.value, sel);
  });
  $('menu-toggle').addEventListener('click', () => $('dashboard').classList.add('menu-open'));
  $('side-close').addEventListener('click', closeSidebar);
  $('side-scrim').addEventListener('click', closeSidebar);
  $('top-add').addEventListener('click', () => { clearProductForm(); showView('product'); });
  $('admin-refresh-all').addEventListener('click', async () => { const b = $('admin-refresh-all'); b.disabled = true; await Promise.all([loadProducts(), loadOrders(), loadSettings()]); b.disabled = false; toast('Refreshed.'); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeDrawer(); closeSidebar(); } });

  /* ---------------- Auth ---------------- */
  function showSetup(user) {
    $('auth-screen').classList.remove('admin-hide'); $('login-card').classList.add('admin-hide');
    $('dashboard').classList.add('admin-hide'); $('setup-card').classList.remove('admin-hide');
    $('admin-sql').textContent = "insert into public.admin_users (user_id) values ('" + user.id + "') on conflict (user_id) do nothing;";
    status($('setup-message'), 'Signed in as ' + user.email + '. Approve this exact user ID in Supabase SQL Editor, then click “Check access again”.');
  }
  async function enterDashboard(user) {
    const { data, error } = await client.from('admin_users').select('user_id').eq('user_id', user.id).maybeSingle();
    if (error || !data) { showSetup(user); return; }
    $('auth-screen').classList.add('admin-hide'); $('dashboard').classList.remove('admin-hide');
    const email = user.email || '';
    $('user-email').textContent = email || '—';
    $('user-initial').textContent = (email.charAt(0) || 'A').toUpperCase();
    showView((location.hash || '').replace('#', '') || 'overview', false);
    await Promise.all([loadProducts(), loadOrders(), loadSettings()]);
    await clearProductForm();
  }
  async function checkAccess() {
    const { data: { user } } = await client.auth.getUser();
    if (!user) { status($('login-message'), 'Please sign in first.'); return; }
    await enterDashboard(user);
  }
  $('login-form').addEventListener('submit', async e => {
    e.preventDefault(); const fd = new FormData(e.currentTarget); const btn = e.currentTarget.querySelector('button[type=submit]');
    btn.disabled = true; status($('login-message'), 'Signing in…');
    try {
      const { data, error } = await client.auth.signInWithPassword({ email: String(fd.get('email')).trim(), password: String(fd.get('password')) });
      if (error) throw error; status($('login-message'), ''); await enterDashboard(data.user);
    } catch (err) { status($('login-message'), err.message || 'Sign-in failed.'); }
    finally { btn.disabled = false; }
  });
  $('copy-admin-sql').addEventListener('click', async () => { try { await navigator.clipboard.writeText($('admin-sql').textContent); status($('setup-message'), 'SQL copied. Paste it into Supabase SQL Editor and run it.', true); } catch { status($('setup-message'), 'Select and copy the SQL line manually.'); } });
  $('check-admin').addEventListener('click', checkAccess);
  $('sign-out').addEventListener('click', async () => { await client.auth.signOut(); location.reload(); });

  /* ---------------- Rendering ---------------- */
  const isOpen = o => !['delivered', 'cancelled'].includes(String(o.status).toLowerCase());
  const isLow = p => Number(p.stock_quantity) <= 5;
  const stBadge = s => '<span class="st" data-s="' + safe(s) + '">' + safe(cap(s)) + '</span>';
  const statusSelect = o => '<select class="status-select" data-s="' + safe(o.status) + '" data-status="' + safe(o.id) + '" aria-label="Order status">' + STATES.map(s => '<option value="' + s + '"' + (s === o.status ? ' selected' : '') + '>' + cap(s) + '</option>').join('') + '</select>';
  const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  function renderAll() { renderStats(); renderOverview(); renderOrders(); renderInventory(); }

  function renderStats() {
    const ps = state.products, os = state.orders, now = new Date();
    const today = os.filter(o => sameDay(new Date(o.created_at), now));
    const pending = os.filter(o => o.status === 'pending').length;
    const open = os.filter(isOpen).length;
    const low = ps.filter(isLow).length;
    const sales = os.filter(o => o.status !== 'cancelled').reduce((n, o) => n + (Number(o.total_pkr) || 0), 0);
    $('stat-today').textContent = today.length;
    $('stat-today-sub').textContent = pending ? pending + ' pending in total' : 'Nothing pending';
    $('stat-open-orders').textContent = open;
    $('stat-sales').textContent = pkr(sales);
    $('stat-products').textContent = ps.length;
    $('stat-published').textContent = ps.filter(p => p.is_active).length + ' published in store';
    $('stat-low-stock').textContent = low;
    const bo = $('badge-orders'); bo.textContent = pending; bo.hidden = !pending;
    const bs = $('badge-stock'); bs.textContent = low; bs.hidden = !low;
  }

  function renderOverview() {
    const os = state.orders, ps = state.products;
    // 7-day chart
    const days = [...Array(7)].map((_, i) => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - (6 - i)); return d; });
    const counts = days.map(d => os.filter(o => sameDay(new Date(o.created_at), d)).length);
    const max = Math.max(1, ...counts);
    $('bars').innerHTML = days.map((d, i) => '<div class="bar' + (counts[i] ? '' : ' zero') + (i === 6 ? ' today' : '') + '"><div class="bar-col"><i style="height:' + Math.max(3, Math.round(counts[i] / max * 100)) + '%;animation-delay:' + (i * 70) + 'ms"></i></div><b>' + counts[i] + '</b><span>' + (i === 6 ? 'Today' : d.toLocaleDateString('en-PK', { weekday: 'short' })) + '</span></div>').join('');
    // attention list
    const pending = os.filter(o => o.status === 'pending').length;
    const low = ps.filter(p => isLow(p) && Number(p.stock_quantity) > 0);
    const out = ps.filter(p => Number(p.stock_quantity) <= 0);
    const hidden = ps.filter(p => !p.is_active).length;
    const items = [];
    items.push(pending ? '<li><span class="dot"></span><span><strong>' + pending + '</strong> pending order' + (pending > 1 ? 's' : '') + ' waiting for confirmation</span><button class="btn sm" type="button" data-go="orders">Open</button></li>' : '<li><span class="dot ok"></span><span>No pending orders. You are all caught up.</span></li>');
    if (out.length) items.push('<li><span class="dot warn"></span><span><strong>' + out.length + '</strong> product' + (out.length > 1 ? 's' : '') + ' out of stock' + (out[0] ? ' (' + safe(out[0].name) + (out.length > 1 ? ' and more' : '') + ')' : '') + '</span><button class="btn sm" type="button" data-go="inventory">Review</button></li>');
    if (low.length) items.push('<li><span class="dot warn"></span><span><strong>' + low.length + '</strong> product' + (low.length > 1 ? 's' : '') + ' running low (' + safe(low[0].name) + ' · ' + Number(low[0].stock_quantity) + ' left)</span><button class="btn sm" type="button" data-go="inventory">Review</button></li>');
    if (hidden) items.push('<li><span class="dot"></span><span><strong>' + hidden + '</strong> product' + (hidden > 1 ? 's' : '') + ' hidden from the store</span><button class="btn sm" type="button" data-go="inventory">View</button></li>');
    $('attention').innerHTML = items.join('');
    // recent orders
    const rec = os.slice(0, 6);
    $('recent-orders').innerHTML = rec.length ? rec.map(o => orderRow(o, true)).join('') : '<tr><td colspan="5" class="empty">No orders received yet. New COD orders will appear here.</td></tr>';
  }

  function orderRow(o, compact) {
    return '<tr><td class="t-main" data-label="Order"><strong>#' + safe(o.order_number) + '</strong><small>' + safe(fmtDate(o.created_at)) + '</small></td>' +
      '<td data-label="Customer"><span>' + safe(o.customer_name) + '<small>' + safe(o.phone) + ' · ' + safe(o.city) + '</small></span></td>' +
      '<td data-label="Total"><span>' + (o.total_pkr == null ? 'TBD' : pkr(o.total_pkr)) + '<small>Delivery ' + (o.shipping_pkr == null ? 'TBD' : pkr(o.shipping_pkr)) + '</small></span></td>' +
      '<td data-label="Status">' + (compact ? stBadge(o.status) : statusSelect(o)) + '</td>' +
      '<td class="t-actions"><button class="btn sm" type="button" data-order="' + safe(o.id) + '">View</button></td></tr>';
  }

  function renderOrders() {
    const os = state.orders;
    const counts = Object.fromEntries(STATES.map(s => [s, os.filter(o => o.status === s).length]));
    $('order-chips').innerHTML = [['all', 'All', os.length], ...STATES.map(s => [s, cap(s), counts[s]])].map(([k, l, n]) => '<button type="button" class="chip' + (state.orderStatus === k ? ' on' : '') + '" data-chip="' + k + '">' + l + ' <em>' + n + '</em></button>').join('');
    const q = state.orderQ.trim().toLowerCase();
    const list = os.filter(o => (state.orderStatus === 'all' || o.status === state.orderStatus) && (!q || [o.order_number, o.customer_name, o.phone, o.city, o.email].join(' ').toLowerCase().includes(q)));
    $('orders-table').innerHTML = list.length ? list.map(o => orderRow(o, false)).join('') : '<tr><td colspan="5" class="empty">' + (os.length ? 'No orders match this filter.' : 'No orders received yet.') + '</td></tr>';
  }
  $('filter-orders').addEventListener('input', e => { state.orderQ = e.target.value; renderOrders(); });

  function renderInventory() {
    const sel = $('inv-category');
    const used = [...new Set(state.products.map(p => p.category))].filter(Boolean);
    const keep = sel.value;
    sel.innerHTML = '<option value="all">All categories</option>' + used.map(c => '<option value="' + safe(c) + '">' + safe(CATS[c] || c) + '</option>').join('');
    sel.value = used.includes(keep) ? keep : 'all'; state.invCat = sel.value;
    drawInventory();
  }
  function drawInventory() {
    const q = state.invQ.trim().toLowerCase();
    const list = state.products.filter(p => {
      if (q && !(String(p.name) + ' ' + String(p.sku || '') + ' ' + String(p.slug || '')).toLowerCase().includes(q)) return false;
      if (state.invCat !== 'all' && p.category !== state.invCat) return false;
      const st = Number(p.stock_quantity);
      if (state.invStock === 'low' && !(st <= 5 && st > 0)) return false;
      if (state.invStock === 'out' && st > 0) return false;
      if (state.invStock === 'hidden' && p.is_active) return false;
      return true;
    });
    $('products-table').innerHTML = list.length ? list.map(p => {
      const img = (Array.isArray(p.image_urls) && p.image_urls[0]) || p.image_url;
      const st = Number(p.stock_quantity);
      const stock = st <= 0 ? '<span class="out">Out of stock</span>' : st <= 5 ? '<span class="low">' + st + ' · Low</span>' : String(st);
      return '<tr><td class="t-main" data-label="Product"><div class="prod-cell"><span class="thumb">' + (img ? '<img src="' + safe(img) + '" alt="" loading="lazy">' : 'M') + '</span><span><strong>' + safe(p.name) + '</strong><small>' + safe(p.sku || p.slug) + '</small></span></div></td>' +
        '<td data-label="Category">' + safe(CATS[p.category] || p.category || '—') + '</td>' +
        '<td data-label="Price">' + pkr(p.price_pkr) + (p.compare_at_price_pkr ? '<small>Was ' + pkr(p.compare_at_price_pkr) + '</small>' : '') + '</td>' +
        '<td data-label="Stock">' + stock + '</td>' +
        '<td data-label="In store"><button type="button" class="switch' + (p.is_active ? ' on' : '') + '" role="switch" aria-checked="' + (p.is_active ? 'true' : 'false') + '" aria-label="Show ' + safe(p.name) + ' in store" data-toggle="' + safe(p.id) + '"></button></td>' +
        '<td class="t-actions"><button class="btn sm" type="button" data-edit="' + safe(p.id) + '">Edit</button></td></tr>';
    }).join('') : '<tr><td colspan="6" class="empty">' + (state.products.length ? 'No products match these filters.' : 'No products yet. Choose “Add product” to create your first one.') + '</td></tr>';
  }
  $('filter-products').addEventListener('input', e => { state.invQ = e.target.value; drawInventory(); });
  $('inv-category').addEventListener('change', e => { state.invCat = e.target.value; drawInventory(); });
  $('inv-stock').addEventListener('change', e => { state.invStock = e.target.value; drawInventory(); });

  /* ---------------- Products ---------------- */
  async function loadProducts() {
    const { data, error } = await client.from('products').select('*').order('created_at', { ascending: false });
    if (error) { $('products-table').innerHTML = '<tr><td colspan="6" class="empty">Could not load inventory: ' + safe(error.message) + '</td></tr>'; return; }
    state.products = data || []; renderAll();
  }
  async function toggleProduct(id, btn) {
    const p = state.products.find(x => x.id === id); if (!p) return;
    btn.disabled = true; const next = !p.is_active;
    const { error } = await client.from('products').update({ is_active: next, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) { toast('Could not update: ' + error.message, false); btn.disabled = false; return; }
    p.is_active = next; renderAll(); toast(p.name + (p.is_active ? ' is now visible in the store.' : ' is now hidden from the store.'));
  }
  async function nextProductSku() {
    const input = $('product-form').elements.sku;
    const { data, error } = await client.from('products').select('sku');
    if (error) { status($('product-message'), 'Could not generate SKU: ' + error.message); return null; }
    const max = (data || []).reduce((highest, p) => { const m = String(p.sku || '').match(/^MARF-110-(\d+)$/i); return m ? Math.max(highest, Number(m[1]) || 0) : highest; }, 0);
    input.value = 'MARF-110-' + (max + 1);
    return input.value;
  }
  async function clearProductForm() {
    const form = $('product-form'); form.reset(); form.elements.id.value = ''; form.elements.stock.value = '0'; form.elements.active.value = 'false';
    form.elements.image_urls.value = '[]'; $('product-form-heading').textContent = 'Add a product'; status($('product-message'), '');
    if (state.view === 'product') $('view-title').textContent = 'Add a product';
    renderGallery(); await nextProductSku();
  }
  $('reset-product').addEventListener('click', clearProductForm);

  // photo gallery (existing + newly chosen files)
  function getGallery() { try { const a = JSON.parse($('product-form').elements.image_urls.value || '[]'); return Array.isArray(a) ? a : []; } catch { return []; } }
  function setGallery(a) { $('product-form').elements.image_urls.value = JSON.stringify(a); renderGallery(); }
  let previews = [];
  function renderGallery() {
    previews.forEach(u => URL.revokeObjectURL(u));
    const g = getGallery(); const files = [...($('product-form').elements.image_files.files || [])];
    previews = files.map(f => URL.createObjectURL(f));
    const own = g.map((u, i) => '<div class="shot"><img src="' + safe(u) + '" alt="Product photo ' + (i + 1) + '" loading="lazy">' + (i === 0 ? '<span class="tag">Cover</span>' : '') + '<div class="acts">' + (i === 0 ? '<span></span>' : '<button type="button" data-photo-cover="' + i + '" aria-label="Make cover photo" title="Make cover"><svg class="ic"><use href="#i-star"/></svg></button>') + '<button type="button" data-photo-remove="' + i + '" aria-label="Remove photo" title="Remove"><svg class="ic"><use href="#i-x"/></svg></button></div></div>').join('');
    const fresh = previews.map((u, i) => '<div class="shot new"><img src="' + u + '" alt="New photo ' + (i + 1) + '"><span class="tag">New</span></div>').join('');
    $('photo-gallery').innerHTML = (own + fresh) || '<p class="empty">No photos yet.</p>';
    if (files.length) $('photo-gallery').insertAdjacentHTML('beforeend', '<button type="button" class="link-btn" style="grid-column:1/-1;justify-self:start" data-photo-clear>Clear ' + files.length + ' new photo' + (files.length > 1 ? 's' : '') + '</button>');
  }
  $('product-form').elements.image_files.addEventListener('change', renderGallery);

  $('product-form').addEventListener('submit', async e => {
    e.preventDefault();
    const form = e.currentTarget; if (!form.reportValidity()) return;
    const fd = new FormData(form), btn = $('save-product'); btn.disabled = true; status($('product-message'), 'Saving product…');
    const name = String(fd.get('name')).trim();
    const id = String(fd.get('id') || '');
    const sku = id ? String(fd.get('sku') || '').trim() : (await nextProductSku());
    if (!sku) { btn.disabled = false; return; }
    const imageFiles = Array.from(form.elements.image_files.files || []);
    let imageUrls = [];
    try { imageUrls = JSON.parse(String(fd.get('image_urls') || '[]')); } catch { imageUrls = []; }
    if (!Array.isArray(imageUrls)) imageUrls = [];
    const manualImage = String(fd.get('image') || '').trim();
    const payload = { name, slug: slugify(name), sku, category: String(fd.get('category')), price_pkr: Number(fd.get('price')), compare_at_price_pkr: fd.get('compare') === '' ? null : Number(fd.get('compare')), stock_quantity: Number(fd.get('stock')), image_url: manualImage || imageUrls[0] || null, image_urls: imageUrls, description: String(fd.get('description') || '').trim() || null, is_active: fd.get('active') === 'true', updated_at: new Date().toISOString() };
    if (id) payload.id = id;
    try {
      if (imageFiles.length > 10) throw new Error('Choose up to 10 images at a time.');
      if (imageFiles.length) {
        const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];
        status($('product-message'), 'Uploading ' + imageFiles.length + ' product image(s)…');
        for (let index = 0; index < imageFiles.length; index++) {
          const imageFile = imageFiles[index];
          if (!allowed.includes(imageFile.type)) throw new Error('Every file must be JPG, PNG, WebP, GIF or AVIF.');
          if (imageFile.size > 5 * 1024 * 1024) throw new Error('Each image must be 5 MB or smaller.');
          const ext = ({ 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'image/avif': 'avif' })[imageFile.type];
          const base = slugify(imageFile.name.split('.').slice(0, -1).join('.')) || 'product-image';
          const path = sku + '/' + Date.now() + '-' + index + '-' + base.slice(0, 100) + '.' + ext;
          const uploaded = await client.storage.from('product-images').upload(path, imageFile, { contentType: imageFile.type, cacheControl: '3600', upsert: false });
          if (uploaded.error) throw new Error('Image upload failed: ' + uploaded.error.message);
          imageUrls.push(client.storage.from('product-images').getPublicUrl(uploaded.data.path).data.publicUrl);
        }
        payload.image_urls = [...new Set(imageUrls)];
        payload.image_url = payload.image_urls[0] || payload.image_url;
      }
      if (!payload.slug || !Number.isFinite(payload.price_pkr) || payload.price_pkr < 0 || !Number.isInteger(payload.stock_quantity) || payload.stock_quantity < 0) throw new Error('Check the product name, price and stock.');
      const result = id ? await client.from('products').update(payload).eq('id', id).select().single() : await client.from('products').insert(payload).select().single();
      if (result.error) throw result.error;
      await clearProductForm(); await loadProducts();
      toast('Product saved. SKU: ' + sku); showView('inventory');
    } catch (err) { status($('product-message'), err.message || 'Could not save product.'); }
    finally { btn.disabled = false; }
  });

  function editProduct(p) {
    if (!p) return;
    const f = $('product-form').elements;
    const gallery = Array.isArray(p.image_urls) && p.image_urls.length ? p.image_urls : (p.image_url ? [p.image_url] : []);
    f.id.value = p.id; f.name.value = p.name; f.sku.value = p.sku || ''; f.category.value = p.category;
    f.price.value = p.price_pkr; f.compare.value = p.compare_at_price_pkr ?? ''; f.stock.value = p.stock_quantity;
    f.image.value = gallery.includes(p.image_url) ? '' : (p.image_url || '');
    f.image_files.value = ''; f.image_urls.value = JSON.stringify(gallery);
    f.description.value = p.description || ''; f.active.value = String(p.is_active);
    $('product-form-heading').textContent = 'Edit product'; status($('product-message'), '');
    renderGallery(); showView('product');
  }

  /* ---------------- Settings ---------------- */
  $('settings-form').addEventListener('submit', async e => {
    e.preventDefault(); const raw = new FormData(e.currentTarget).get('shipping_fee'); const fee = raw === '' ? null : Number(raw);
    if (fee !== null && (!Number.isFinite(fee) || fee < 0)) { status($('settings-message'), 'Enter a valid non-negative delivery fee.'); return; }
    const { error } = await client.from('store_settings').update({ shipping_fee_pkr: fee, updated_at: new Date().toISOString() }).eq('id', true);
    status($('settings-message'), error ? error.message : (fee === null ? 'Delivery fee cleared; staff must confirm it for each order.' : 'Delivery fee saved: ' + money(fee)), !error);
    if (!error) toast('Delivery setting saved.');
  });
  async function loadSettings() {
    const { data, error } = await client.from('store_settings').select('shipping_fee_pkr').eq('id', true).maybeSingle();
    if (error) { status($('settings-message'), error.message); return; }
    $('settings-form').elements.shipping_fee.value = data?.shipping_fee_pkr ?? '';
    status($('settings-message'), data?.shipping_fee_pkr == null ? 'Delivery fee is not set; confirm manually.' : 'Current delivery fee: ' + money(data.shipping_fee_pkr), true);
  }

  /* ---------------- Orders ---------------- */
  async function loadOrders() {
    const { data, error } = await client.from('orders').select('id,order_number,customer_name,phone,email,shipping_address,notes,city,subtotal_pkr,shipping_pkr,total_pkr,status,created_at').order('created_at', { ascending: false }).limit(100);
    if (error) { const m = '<tr><td colspan="5" class="empty">Could not load orders: ' + safe(error.message) + '</td></tr>'; $('orders-table').innerHTML = m; $('recent-orders').innerHTML = m; return; }
    state.orders = data || []; renderAll();
  }
  $('refresh-orders').addEventListener('click', async () => { await loadOrders(); toast('Orders refreshed.'); });
  async function setOrderStatus(id, value, sel) {
    const o = state.orders.find(x => x.id === id); const before = o && o.status;
    if (sel) sel.disabled = true;
    const { error } = await client.from('orders').update({ status: value }).eq('id', id);
    if (error) { toast('Could not update order: ' + error.message, false); await loadOrders(); return; }
    if (o) o.status = value;
    renderAll(); toast('Order #' + (o ? o.order_number : '') + ' marked ' + value + '.');
    if (before === 'cancelled' || value === 'cancelled') loadProducts();   // stock is restored/deducted by the database
    if (!$('order-drawer').classList.contains('open')) return;
    if ($('drawer-title').dataset.id === id) openOrder(id, true);
  }
  const waNumber = p => { let d = String(p || '').replace(/\D/g, ''); if (d.startsWith('00')) d = d.slice(2); if (d.startsWith('0')) d = '92' + d.slice(1); return d; };
  async function openOrder(id, keepOpen) {
    const o = state.orders.find(x => x.id === id); if (!o) return;
    const box = $('order-detail'); const drawer = $('order-drawer');
    $('drawer-title').textContent = 'Order #' + o.order_number; $('drawer-title').dataset.id = id;
    $('drawer-sub').textContent = fmtDate(o.created_at);
    if (!keepOpen) { box.innerHTML = '<p class="empty">Loading order details…</p>'; drawer.classList.add('open'); drawer.setAttribute('aria-hidden', 'false'); document.body.style.overflow = 'hidden'; }
    const { data: items, error } = await client.from('order_items').select('product_name,unit_price_pkr,quantity,line_total_pkr').eq('order_id', o.id);
    if (error) { box.innerHTML = '<p class="admin-message">Could not load items: ' + safe(error.message) + '</p>'; return; }
    const wa = waNumber(o.phone);
    const msg = encodeURIComponent('Assalam o Alaikum ' + (o.customer_name || '') + ', this is MARF Pakistan regarding your order #' + o.order_number + '.');
    box.innerHTML =
      '<div class="d-sec"><h4>Status</h4><div class="row wrap">' + statusSelect(o) + '</div></div>' +
      '<div class="d-sec"><h4>Customer</h4><div class="d-box"><strong>' + safe(o.customer_name) + '</strong><br>' + safe(o.phone) + (o.email ? '<br>' + safe(o.email) : '') + '<br>' + safe(o.city) + '</div>' +
      '<div class="d-actions"><a class="btn sm" href="tel:' + safe(String(o.phone || '').replace(/[^\d+]/g, '')) + '"><svg class="ic"><use href="#i-phone"/></svg>Call</a>' + (wa ? '<a class="btn sm" href="https://wa.me/' + wa + '?text=' + msg + '" target="_blank" rel="noopener noreferrer"><svg class="ic"><use href="#i-chat"/></svg>WhatsApp</a>' : '') + '</div></div>' +
      '<div class="d-sec"><h4>Delivery address</h4><div class="d-box">' + safe(o.shipping_address || 'No address saved. Open the order in the database for details.') + '</div></div>' +
      (o.notes ? '<div class="d-sec"><h4>Customer note</h4><div class="d-box">' + safe(o.notes) + '</div></div>' : '') +
      '<div class="d-sec"><h4>Items</h4><div class="d-lines">' + ((items || []).length ? items.map(i => '<div class="d-line"><span>' + safe(i.product_name) + '<small>' + pkr(i.unit_price_pkr) + ' × ' + Number(i.quantity) + '</small></span><strong>' + pkr(i.line_total_pkr) + '</strong></div>').join('') : '<p class="muted sm">No items found.</p>') + '</div></div>' +
      '<div class="d-total"><div><span>Subtotal</span><span>' + pkr(o.subtotal_pkr) + '</span></div><div><span>Delivery</span><span>' + (o.shipping_pkr == null ? 'TBD' : pkr(o.shipping_pkr)) + '</span></div><div><span>Total</span><span>' + (o.total_pkr == null ? 'TBD' : pkr(o.total_pkr)) + '</span></div></div>';
  }
  function closeDrawer() { const d = $('order-drawer'); d.classList.remove('open'); d.setAttribute('aria-hidden', 'true'); document.body.style.overflow = ''; }
  $('drawer-close').addEventListener('click', closeDrawer);
  $('drawer-scrim').addEventListener('click', closeDrawer);

  // Poll for new orders while the admin dashboard is open so new customer orders appear automatically.
  let lastKnownOrderIds = new Set();
  let hasInitialOrderSnapshot = false;
  window.setInterval(async () => {
    if ($('dashboard').classList.contains('admin-hide') || document.visibilityState !== 'visible') return;
    const previousIds = lastKnownOrderIds;
    await loadOrders();
    const freshOrders = state.orders.filter(order => !previousIds.has(order.id));
    lastKnownOrderIds = new Set(state.orders.map(order => order.id));
    if (hasInitialOrderSnapshot && freshOrders.length) {
      toast('New customer order received! #' + freshOrders[0].order_number);
    }
    hasInitialOrderSnapshot = true;
  }, 15000);

  client.auth.getSession().then(({ data }) => { if (data.session) enterDashboard(data.session.user); });
})();
