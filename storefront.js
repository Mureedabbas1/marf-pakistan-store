(() => {
  const SUPABASE_URL = 'https://bufgifgroghgjmbarnwn.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_2ERT7quoEZKc1KkP-BeUGg_OBdWwhL2';
  const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  const grid = document.getElementById('live-products');
  const cartBox = document.getElementById('checkout-items');
  const cartCount = document.getElementById('checkout-count');
  const totalBox = document.getElementById('checkout-subtotal');
  const feeBox = document.getElementById('checkout-delivery');
  const msg = document.getElementById('checkout-message');
  const cart = new Map();
  let shippingFee = null;
  const money = n => new Intl.NumberFormat('en-PK',{style:'currency',currency:'PKR',maximumFractionDigits:0}).format(Number(n||0));
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function message(text, ok=false) {
    if (!msg) return;
    msg.textContent = text;
    msg.className = 'checkout-message' + (ok ? ' success' : '');
  }
  function renderCart() {
    if (!cartBox) return;
    cartBox.replaceChildren();
    let count = 0, subtotal = 0;
    for (const [id, item] of cart) {
      count += item.quantity; subtotal += Number(item.product.price_pkr) * item.quantity;
      const row = document.createElement('div');
      row.className = 'checkout-line';
      const details = document.createElement('div');
      const name = document.createElement('strong'); name.textContent = item.product.name;
      const price = document.createElement('small'); price.textContent = money(item.product.price_pkr) + ' each · ' + money(Number(item.product.price_pkr)*item.quantity);
      details.append(name, price);
      const controls = document.createElement('div'); controls.className = 'qty-controls';
      const minus = document.createElement('button'); minus.type='button'; minus.textContent='−'; minus.setAttribute('aria-label','Decrease quantity');
      minus.addEventListener('click',()=>{ if(item.quantity<=1) cart.delete(id); else item.quantity--; renderCart(); });
      const qty = document.createElement('span'); qty.textContent=String(item.quantity);
      const plus = document.createElement('button'); plus.type='button'; plus.textContent='+'; plus.setAttribute('aria-label','Increase quantity');
      plus.disabled = item.quantity >= Math.min(20, Number(item.product.stock_quantity));
      plus.addEventListener('click',()=>{ if(item.quantity < Math.min(20,Number(item.product.stock_quantity))) item.quantity++; renderCart(); });
      const remove = document.createElement('button'); remove.type='button'; remove.className='remove-line'; remove.textContent='Remove'; remove.addEventListener('click',()=>{cart.delete(id);renderCart();});
      controls.append(minus,qty,plus,remove); row.append(details,controls); cartBox.append(row);
    }
    if (!count) { const p=document.createElement('p'); p.textContent='Your bag is empty. Add an available product above.'; p.className='empty-cart'; cartBox.append(p); }
    if(cartCount) cartCount.textContent=String(count);
    if(totalBox) totalBox.textContent=money(subtotal);
    if(feeBox) feeBox.textContent=shippingFee === null ? 'To be confirmed' : (shippingFee === 0 ? 'Free' : money(shippingFee));
  }
  function addProduct(product) {
    const current = cart.get(product.id);
    if (current) {
      if(current.quantity >= Math.min(20, Number(product.stock_quantity))) { message('Only ' + product.stock_quantity + ' in stock.'); return; }
      current.quantity++;
    } else cart.set(product.id,{product,quantity:1});
    renderCart(); message(product.name + ' added to your bag.',true);
    document.getElementById('checkout-panel')?.scrollIntoView({behavior:'smooth',block:'start'});
  }
  function renderProducts(products) {
    if (!grid) return;
    grid.replaceChildren();
    if (!products.length) {
      const p=document.createElement('p'); p.className='catalogue-note'; p.textContent='Products with confirmed prices and available stock will appear here. Please check back soon.';
      grid.append(p); return;
    }
    products.forEach((p,i)=>{
      const card=document.createElement('article'); card.className='live-product-card';
      const image=document.createElement('div'); image.className='live-product-image';
      if(p.image_url){const img=document.createElement('img');img.src=p.image_url;img.alt=p.name;img.loading='lazy';img.referrerPolicy='no-referrer';image.append(img);}
      else {const placeholder=document.createElement('span');placeholder.textContent='MARF';image.append(placeholder);}
      const body=document.createElement('div');body.className='live-product-info';
      const category=document.createElement('small');category.textContent=String(p.category||'').replace(/-/g,' ').toUpperCase();
      const name=document.createElement('h3');name.textContent=p.name;
      const desc=document.createElement('p');desc.textContent=p.description||'Considered everyday essential.';
      const price=document.createElement('strong');price.textContent=money(p.price_pkr);
      if(p.compare_at_price_pkr && Number(p.compare_at_price_pkr)>Number(p.price_pkr)){const old=document.createElement('del');old.textContent=money(p.compare_at_price_pkr);price.append(' ',old);}
      const stock=document.createElement('small');stock.className='stock-label';stock.textContent=Number(p.stock_quantity)<=5?'Only '+p.stock_quantity+' left':'In stock';
      const button=document.createElement('button');button.type='button';button.className='button button-gold';button.textContent='Add to bag';button.addEventListener('click',()=>addProduct(p));
      body.append(category,name,desc,price,stock,button);card.append(image,body);grid.append(card);
    });
  }
  async function init() {
    try {
      const [productsRes, settingsRes] = await Promise.all([
        client.from('products').select('id,name,slug,description,category,price_pkr,compare_at_price_pkr,image_url,stock_quantity,sku').eq('is_active',true).gt('stock_quantity',0).order('created_at',{ascending:false}),
        client.from('store_settings').select('shipping_fee_pkr').eq('id',true).maybeSingle()
      ]);
      if(productsRes.error) throw productsRes.error;
      if(settingsRes.data) shippingFee = settingsRes.data.shipping_fee_pkr == null ? null : Number(settingsRes.data.shipping_fee_pkr);
      renderProducts(productsRes.data||[]); renderCart();
    } catch(e) {
      renderProducts([]);
      message('We could not load the live catalogue right now. Please refresh or contact MARF.');
    }
  }
  document.getElementById('cod-checkout-form')?.addEventListener('submit',async event=>{
    event.preventDefault();
    if(!cart.size){message('Please add at least one in-stock product first.');return;}
    const form=event.currentTarget;
    const fd=new FormData(form);
    const items=[...cart.entries()].map(([product_id,item])=>({product_id,quantity:item.quantity}));
    const submit=form.querySelector('button[type="submit"]'); submit.disabled=true; submit.textContent='Placing request…';
    message('Submitting your order securely…');
    try{
      const {data,error}=await client.rpc('place_order',{
        p_customer_name:String(fd.get('name')||'').trim(),
        p_phone:String(fd.get('phone')||'').trim(),
        p_email:String(fd.get('email')||'').trim()||null,
        p_shipping_address:String(fd.get('address')||'').trim(),
        p_city:String(fd.get('city')||'').trim(),
        p_notes:String(fd.get('notes')||'').trim()||null,
        p_items:items
      });
      if(error) throw error;
      if(!data?.success) throw new Error('Order could not be confirmed.');
      const total=data.total_pkr==null?'Delivery charge to be confirmed':money(data.total_pkr);
      message('Order request received! Order #'+data.order_number+'. Items: '+money(data.subtotal_pkr)+'. Total: '+total+'. MARF will contact you to confirm delivery.',true);
      cart.clear(); form.reset(); renderCart();
      const waText='MARF Pakistan order request #'+data.order_number+'\nCustomer: '+String(fd.get('name')||'')+'\nPlease contact me to confirm delivery details.';
      const wa=document.getElementById('order-whatsapp-followup');
      if(wa){wa.href='https://wa.me/923404612368?text='+encodeURIComponent(waText);wa.hidden=false;}
    }catch(e){message(e.message||'Could not submit your order. Please check your details and try again.');}
    finally{submit.disabled=false;submit.textContent='Place COD order request';}
  });
  init();
})();