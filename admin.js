(() => {
  const client = window.supabase.createClient('https://bufgifgroghgjmbarnwn.supabase.co','sb_publishable_2ERT7quoEZc1KkP-BeUGg_OBdWwhL2');
  const $ = id => document.getElementById(id);
  const money = n => n == null ? 'Delivery TBD' : new Intl.NumberFormat('en-PK',{style:'currency',currency:'PKR',maximumFractionDigits:0}).format(Number(n));
  const slugify = s => String(s||'').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,160);
  const safe = s => String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function status(el,text,ok=false){if(!el)return;el.textContent=text;el.className='admin-message'+(ok?' ok':'');}
  function showSetup(user){
    $('login-card').classList.add('admin-hide');$('dashboard').classList.add('admin-hide');$('setup-card').classList.remove('admin-hide');
    $('admin-sql').textContent="insert into public.admin_users (user_id) values ('"+user.id+"') on conflict (user_id) do nothing;";
    status($('setup-message'),'Signed in as '+user.email+'. Approve this exact user ID in Supabase SQL Editor, then click “Check access again”.');
  }
  async function enterDashboard(user){
    const {data,error}=await client.from('admin_users').select('user_id').eq('user_id',user.id).maybeSingle();
    if(error || !data){showSetup(user);return;}
    $('login-card').classList.add('admin-hide');$('setup-card').classList.add('admin-hide');$('dashboard').classList.remove('admin-hide');
    await Promise.all([loadProducts(),loadOrders(),loadSettings()]);
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

  function clearProductForm(){const form=$('product-form');form.reset();form.elements.id.value='';form.elements.stock.value='0';form.elements.active.value='false';$('product-form-heading').textContent='Add a product';}
  $('reset-product').addEventListener('click',clearProductForm);
  $('product-form').addEventListener('submit',async e=>{
    e.preventDefault();const form=e.currentTarget,fd=new FormData(form),btn=$('save-product');btn.disabled=true;status($('product-message'),'Saving product…');
    const name=String(fd.get('name')).trim();
    const payload={name,slug:slugify(name),sku:String(fd.get('sku')||'').trim()||null,category:String(fd.get('category')),price_pkr:Number(fd.get('price')),compare_at_price_pkr:fd.get('compare')===''?null:Number(fd.get('compare')),stock_quantity:Number(fd.get('stock')),image_url:String(fd.get('image')||'').trim()||null,description:String(fd.get('description')||'').trim()||null,is_active:fd.get('active')==='true',updated_at:new Date().toISOString()};
    const id=String(fd.get('id')||'');if(id)payload.id=id;
    try{
      if(!payload.slug||!Number.isFinite(payload.price_pkr)||payload.price_pkr<0||!Number.isInteger(payload.stock_quantity)||payload.stock_quantity<0)throw new Error('Check the product name, price and stock.');
      const result=id?await client.from('products').update(payload).eq('id',id).select().single():await client.from('products').insert(payload).select().single();
      if(result.error)throw result.error;
      status($('product-message'),'Product saved successfully.',true);clearProductForm();await loadProducts();
    }catch(err){status($('product-message'),err.message||'Could not save product.');}
    finally{btn.disabled=false;}
  });
  async function loadProducts(){
    const body=$('products-table');body.innerHTML='<tr><td colspan="5">Loading…</td></tr>';
    const {data,error}=await client.from('products').select('*').order('created_at',{ascending:false});
    if(error){body.innerHTML='<tr><td colspan="5">Could not load inventory: '+safe(error.message)+'</td></tr>';return;}
    if(!data?.length){body.innerHTML='<tr><td colspan="5">No products yet. Add a product above with a verified price and stock quantity.</td></tr>';return;}
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
    const {data,error}=await client.from('orders').select('id,order_number,customer_name,phone,city,subtotal_pkr,shipping_pkr,total_pkr,status,created_at').order('created_at',{ascending:false}).limit(100);
    if(error){body.innerHTML='<tr><td colspan="5">Could not load orders: '+safe(error.message)+'</td></tr>';return;}
    if(!data?.length){body.innerHTML='<tr><td colspan="5">No orders received yet.</td></tr>';return;}
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