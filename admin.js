(() => {
  const client = window.supabase.createClient('https://bufgifgroghgjmbarnwn.supabase.co','sb_publishable_2ERT7quoEZKc1KkP-BeUGg_OBdWwhL2');
  const $ = id => document.getElementById(id);
  const money = n => n == null ? 'Delivery TBD' : new Intl.NumberFormat('en-PK',{style:'currency',currency:'PKR',maximumFractionDigits:0}).format(Number(n));
  const slugify = s => String(s||'').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,160);
  const safe = s => String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function status(el,text,ok=false){if(!el)return;el.textContent=text;el.className='admin-message'+(ok?' ok':'');}
  function enhanceDashboard(){
    if($('admin-quick-style')) return;
    const style=document.createElement('style');style.id='admin-quick-style';style.textContent=`
      .admin-welcome{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin:18px 0}
      .admin-welcome h2{font:500 27px "Cormorant Garamond",Georgia,serif;margin:0}
      .admin-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin:18px 0}
      .admin-stat{padding:17px;border:1px solid var(--line);border-radius:10px;background:linear-gradient(135deg,rgba(201,169,106,.10),rgba(255,255,255,.025))}
      .admin-stat span{display:block;color:var(--muted);font-size:11px;margin-bottom:8px}
      .admin-stat strong{font-size:24px;font-weight:600;color:var(--gold)}
      .admin-helper{font-size:12px;color:var(--muted);margin:8px 0 14px;line-height:1.6}
      .admin-filter{width:100%;box-sizing:border-box;margin:10px 0 14px;padding:12px;border:1px solid var(--line);border-radius:7px;background:#111;color:#f5f0e7;font:inherit}
      .admin-table tbody tr:hover{background:rgba(201,169,106,.045)}
      .admin-table select{max-width:145px}
      @media(max-width:760px){.admin-stats{grid-template-columns:repeat(2,minmax(0,1fr))}.admin-stat{padding:13px}.admin-stat strong{font-size:21px}.admin-welcome h2{font-size:24px}}
    `;document.head.appendChild(style);
    const dashboard=$('dashboard');
    const welcome=document.createElement('div');welcome.className='admin-welcome';welcome.innerHTML='<div><h2>Welcome to your store</h2><p class="admin-helper">Manage products, stock and COD orders from one place.</p></div><button type="button" class="admin-button primary" id="admin-refresh-all">Refresh all</button>';
    const stats=document.createElement('div');stats.className='admin-stats';stats.innerHTML='<div class="admin-stat"><span>Total products</span><strong id="stat-products">—</strong></div><div class="admin-stat"><span>Published</span><strong id="stat-published">—</strong></div><div class="admin-stat"><span>Low stock (5 or less)</span><strong id="stat-low-stock">—</strong></div><div class="admin-stat"><span>Open orders</span><strong id="stat-open-orders">—</strong></div>';
    dashboard.prepend(stats);dashboard.prepend(welcome);
    $('admin-refresh-all').addEventListener('click',()=>Promise.all([loadProducts(),loadOrders(),loadSettings()]));
    const inventory=$('products-table')?.closest('.admin-card');
    if(inventory&&!$('filter-products')){const input=document.createElement('input');input.id='filter-products';input.className='admin-filter';input.placeholder='Search products by name or SKU…';input.setAttribute('aria-label','Search inventory');inventory.querySelector('.admin-table-wrap').before(input);input.addEventListener('input',()=>{const q=input.value.trim().toLowerCase();$('products-table').querySelectorAll('tr').forEach(tr=>tr.hidden=!tr.textContent.toLowerCase().includes(q));});}
    const orders=$('orders-table')?.closest('.admin-card');
    if(orders&&!$('filter-orders')){const input=document.createElement('input');input.id='filter-orders';input.className='admin-filter';input.placeholder='Search orders by order number, customer, phone or city…';input.setAttribute('aria-label','Search customer orders');orders.querySelector('.admin-table-wrap').before(input);input.addEventListener('input',()=>{const q=input.value.trim().toLowerCase();$('orders-table').querySelectorAll('tr').forEach(tr=>tr.hidden=!tr.textContent.toLowerCase().includes(q));});}
    document.querySelectorAll('#dashboard .admin-card').forEach(card=>{const h=card.querySelector('h2');if(h&&!card.querySelector('.admin-helper')){const helper=document.createElement('p');helper.className='admin-helper';helper.textContent=({'Delivery settings':'Set one standard delivery charge for COD orders.','Order workflow':'Change an order status from the list below; use View to see the full address and items.','Add a product':'Fill in the basics, then choose whether the product should appear in the store.','Edit product':'Change product details, price or stock and save.','Inventory':'Search products below, then choose Edit to update them.','Customer orders':'Search orders, update their status, or select View for details.'})[h.textContent]||'';if(helper.textContent)h.after(helper);}});
  }
  const statsCache={products:[],orders:[]};
  function updateStats(products,orders){
    if(products.length||!statsCache.products.length)statsCache.products=products;
    if(orders.length||!statsCache.orders.length)statsCache.orders=orders;
    const ps=statsCache.products,os=statsCache.orders;
    if($('stat-products'))$('stat-products').textContent=ps.length;
    if($('stat-published'))$('stat-published').textContent=ps.filter(p=>p.is_active).length;
    if($('stat-low-stock'))$('stat-low-stock').textContent=ps.filter(p=>Number(p.stock_quantity)<=5).length;
    if($('stat-open-orders'))$('stat-open-orders').textContent=os.filter(o=>!['delivered','cancelled'].includes(String(o.status).toLowerCase())).length;
  }
  function showSetup(user){
    $('login-card').classList.add('admin-hide');$('dashboard').classList.add('admin-hide');$('setup-card').classList.remove('admin-hide');
    $('admin-sql').textContent="insert into public.admin_users (user_id) values ('"+user.id+"') on conflict (user_id) do nothing;";
    status($('setup-message'),'Signed in as '+user.email+'. Approve this exact user ID in Supabase SQL Editor, then click “Check access again”.');
  }
  async function enterDashboard(user){
    const {data,error}=await client.from('admin_users').select('user_id').eq('user_id',user.id).maybeSingle();
    if(error || !data){showSetup(user);return;}
    $('login-card').classList.add('admin-hide');$('setup-card').classList.add('admin-hide');$('dashboard').classList.remove('admin-hide');
    enhanceDashboard();await Promise.all([loadProducts(),loadOrders(),loadSettings()]);await clearProductForm();
  }
  async function checkAccess(){
    const {data:{user}}=await client.auth.getUser();
    if(!user){status($('login-message'),'Please sign in first.');return;}
    await enterDashboard(user);
  }
  $('login-form').addEventListener('submit',async e=>{
    e.preventDefault();const fd=new FormData(e.currentTarget);const btn=e.currentTarget.querySelector('button[type=submit]');
    btn.disabled=true;status($('login-message'),'Signing in…');
    try{const {data,error}=await client.auth.signInWithPassword({email:String(fd.get('email')).trim(),password:String(fd.get('password'))});if(error)throw error;await enterDashboard(data.user);}
    catch(err){status($('login-message'),err.message||'Sign-in failed.');}
    finally{btn.disabled=false;}
  });
  $('copy-admin-sql').addEventListener('click',async()=>{try{await navigator.clipboard.writeText($('admin-sql').textContent);status($('setup-message'),'SQL copied. Paste it into Supabase SQL Editor and run it.',true);}catch{status($('setup-message'),'Select and copy the SQL line manually.');}});
  $('check-admin').addEventListener('click',checkAccess);
  $('sign-out').addEventListener('click',async()=>{await client.auth.signOut();location.reload();});
  $('menu-toggle')?.addEventListener('click',()=>document.querySelector('.main-nav')?.classList.toggle('open'));

  async function nextProductSku(){
    const input=$('product-form').elements.sku;
    const {data,error}=await client.from('products').select('sku');
    if(error){status($('product-message'),'Could not generate SKU: '+error.message);return null;}
    const max=(data||[]).reduce((highest,p)=>{
      const match=String(p.sku||'').match(/^MARF-110-(\d+)$/i);
      return match?Math.max(highest,Number(match[1])||0):highest;
    },0);
    input.value='MARF-110-'+(max+1);
    return input.value;
  }
  async function clearProductForm(){const form=$('product-form');form.reset();form.elements.id.value='';form.elements.stock.value='0';form.elements.active.value='false';$('product-form-heading').textContent='Add a product';await nextProductSku();}
  $('reset-product').addEventListener('click',clearProductForm);
  $('product-form').addEventListener('submit',async e=>{
    e.preventDefault();const form=e.currentTarget,fd=new FormData(form),btn=$('save-product');btn.disabled=true;status($('product-message'),'Saving product…');
    const name=String(fd.get('name')).trim();
    const id=String(fd.get('id')||'');
    const sku=id?String(fd.get('sku')||'').trim():(await nextProductSku());
    if(!sku){btn.disabled=false;return;}
    const payload={name,slug:slugify(name),sku,category:String(fd.get('category')),price_pkr:Number(fd.get('price')),compare_at_price_pkr:fd.get('compare')===''?null:Number(fd.get('compare')),stock_quantity:Number(fd.get('stock')),image_url:String(fd.get('image')||'').trim()||null,description:String(fd.get('description')||'').trim()||null,is_active:fd.get('active')==='true',updated_at:new Date().toISOString()};
    if(id)payload.id=id;
    try{
      if(!payload.slug||!Number.isFinite(payload.price_pkr)||payload.price_pkr<0||!Number.isInteger(payload.stock_quantity)||payload.stock_quantity<0)throw new Error('Check the product name, price and stock.');
      const result=id?await client.from('products').update(payload).eq('id',id).select().single():await client.from('products').insert(payload).select().single();
      if(result.error)throw result.error;
      status($('product-message'),'Product saved successfully. SKU: '+sku,true);await clearProductForm();await loadProducts();
    }catch(err){status($('product-message'),err.message||'Could not save product.');}
    finally{btn.disabled=false;}
  });
  async function loadProducts(){
    const body=$('products-table');body.innerHTML='<tr><td colspan="5">Loading…</td></tr>';
    const {data,error}=await client.from('products').select('*').order('created_at',{ascending:false});
    if(error){body.innerHTML='<tr><td colspan="5">Could not load inventory: '+safe(error.message)+'</td></tr>';return;}
    if(!data?.length){body.innerHTML='<tr><td colspan="5">No products yet. Add a product above with a verified price and stock quantity.</td></tr>';updateStats([],[]);return;}
    updateStats(data,[]);
    body.innerHTML=data.map(p=>'<tr><td><strong>'+safe(p.name)+'</strong><br><small>'+safe(p.sku||p.slug)+'</small></td><td>'+money(p.price_pkr)+'</td><td>'+Number(p.stock_quantity)+'</td><td>'+(p.is_active?'Published':'Hidden')+'</td><td><button class="product-edit-btn" data-edit="'+safe(p.id)+'">Edit</button></td></tr>').join('');
    body.querySelectorAll('[data-edit]').forEach(btn=>btn.addEventListener('click',()=>editProduct(data.find(p=>p.id===btn.dataset.edit))));
  }
  function editProduct(p){if(!p)return;const f=$('product-form').elements;f.id.value=p.id;f.name.value=p.name;f.sku.value=p.sku||'';f.category.value=p.category;f.price.value=p.price_pkr;f.compare.value=p.compare_at_price_pkr??'';f.stock.value=p.stock_quantity;f.image.value=p.image_url||'';f.description.value=p.description||'';f.active.value=String(p.is_active);$('product-form-heading').textContent='Edit product';$('product-form').scrollIntoView({behavior:'smooth',block:'start'});}
  $('settings-form').addEventListener('submit',async e=>{
    e.preventDefault();const raw=new FormData(e.currentTarget).get('shipping_fee');const fee=raw===''?null:Number(raw);
    if(fee!==null&&(!Number.isFinite(fee)||fee<0)){status($('settings-message'),'Enter a valid non-negative delivery fee.');return;}
    const {error}=await client.from('store_settings').update({shipping_fee_pkr:fee,updated_at:new Date().toISOString()}).eq('id',true);
    status($('settings-message'),error?error.message:(fee===null?'Delivery fee cleared; staff must confirm it for each order.':'Delivery fee saved: '+money(fee)),!error);
  });
  async function loadSettings(){
    const {data,error}=await client.from('store_settings').select('shipping_fee_pkr').eq('id',true).maybeSingle();
    if(error){status($('settings-message'),error.message);return;}
    $('settings-form').elements.shipping_fee.value=data?.shipping_fee_pkr??'';
    status($('settings-message'),data?.shipping_fee_pkr==null?'Delivery fee is not set; confirm manually.':'Current delivery fee: '+money(data.shipping_fee_pkr),true);
  }
  const states=['pending','confirmed','processing','shipped','delivered','cancelled'];
  async function loadOrders(){
    const body=$('orders-table');body.innerHTML='<tr><td colspan="5">Loading…</td></tr>';
    const {data,error}=await client.from('orders').select('id,order_number,customer_name,phone,email,shipping_address,notes,city,subtotal_pkr,shipping_pkr,total_pkr,status,created_at').order('created_at',{ascending:false}).limit(100);
    if(error){body.innerHTML='<tr><td colspan="5">Could not load orders: '+safe(error.message)+'</td></tr>';return;}
    if(!data?.length){body.innerHTML='<tr><td colspan="5">No orders received yet.</td></tr>';updateStats([],[]);return;}
    updateStats([],data);
    body.innerHTML=data.map(o=>'<tr><td><strong>#'+safe(o.order_number)+'</strong><br><small>'+safe(new Date(o.created_at).toLocaleString())+'</small></td><td>'+safe(o.customer_name)+'<br>'+safe(o.phone)+'<br>'+safe(o.city)+'</td><td>'+money(o.total_pkr)+'<br><small>Items '+money(o.subtotal_pkr)+' · Delivery '+(o.shipping_pkr==null?'TBD':money(o.shipping_pkr))+'</small></td><td><select data-status="'+safe(o.id)+'">'+states.map(s=>'<option value="'+s+'" '+(s===o.status?'selected':'')+'>'+s.charAt(0).toUpperCase()+s.slice(1)+'</option>').join('')+'</select></td><td><button class="product-edit-btn" data-order="'+safe(o.id)+'">View</button></td></tr>').join('');
    body.querySelectorAll('[data-status]').forEach(sel=>sel.addEventListener('change',async()=>{
      sel.disabled=true;const {error}=await client.from('orders').update({status:sel.value}).eq('id',sel.dataset.status);
      if(error){status($('dashboard-message'),'Could not update order: '+error.message);await loadOrders();}else status($('dashboard-message'),'Order status updated.',true);
      sel.disabled=false;
    }));
    body.querySelectorAll('[data-order]').forEach(btn=>btn.addEventListener('click',()=>showOrder(data.find(o=>o.id===btn.dataset.order))));
  }
  async function showOrder(o){
    const box=$('order-detail');box.textContent='Loading order details…';
    const {data:items,error}=await client.from('order_items').select('product_name,unit_price_pkr,quantity,line_total_pkr').eq('order_id',o.id);
    if(error){box.textContent='Could not load items: '+error.message;return;}
    box.innerHTML='<strong>Order #'+safe(o.order_number)+' — '+safe(o.customer_name)+'</strong><br>Phone: '+safe(o.phone)+' · '+safe(o.city)+'<br>Address: '+safe(o.shipping_address||'Open the order in the database for address details')+'<br>Items: '+(items||[]).map(i=>safe(i.product_name)+' × '+i.quantity+' ('+money(i.line_total_pkr)+')').join('; ')+'<br>Subtotal: '+money(o.subtotal_pkr)+' · Delivery: '+(o.shipping_pkr==null?'TBD':money(o.shipping_pkr))+' · Total: '+money(o.total_pkr);
  }
  $('refresh-orders').addEventListener('click',loadOrders);
  client.auth.getSession().then(({data})=>{if(data.session)enterDashboard(data.session.user);});
})();