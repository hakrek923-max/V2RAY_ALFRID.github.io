/**
 * app.js — استاتیک، GitHub Pages friendly
 * - تولید دو نوع لینک هنگام ساخت: pretty (/u/username, /i/token) و fallback (send.html?user=..., inbox.html?user=...).
 * - پیام‌ها با localStorage نگهداری می‌شوند (بدون سرور).
 * - BASE_URL را روی دامنهٔ شما تنظیم می‌کند.
 */

// ====== تنظیمات ======
const BASE_URL = 'https://hakrek923-max.github.io/V2RAY_ALFRID.github.io/'; // <- آدرس سایت تو (حتما با / پایان)
const USE_HASH_ROUTING = false; // اگر خواستی hash routing فعال بشه (مثلاً https://.../#/u/username) true کن

// ====== کمک‌کننده‌ها ======
function qs(s){ return document.querySelector(s); }
function qsa(s){ return Array.from(document.querySelectorAll(s)); }
function showAlert(msg, type='info'){
  const area = qs('#alert-area');
  if(area) area.innerHTML = `<div class="alert alert-${type}">${escapeHtml(msg)}</div>`;
  else console.log(msg);
  setTimeout(()=>{ if(area) area.innerHTML=''; }, 4500);
}
function escapeHtml(s){ return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function copyText(text){
  if(navigator.clipboard) return navigator.clipboard.writeText(text);
  const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select();
  try{ document.execCommand('copy'); }catch(e){} document.body.removeChild(ta); return Promise.resolve();
}

// ====== توکن و ذخیره ======
function randHex(len=16){
  const chars = 'abcdef0123456789'; let s=''; for(let i=0;i<len;i++) s+=chars[Math.floor(Math.random()*chars.length)]; return s;
}
function saveTokenForUser(username, token){
  try{ localStorage.setItem(`hf_token_${username}`, token); }catch(e){}
}
function getTokenForUser(username){
  return localStorage.getItem(`hf_token_${username}`);
}
function saveMessage(username, msg){
  const key = `hf_msgs_${username}`;
  const arr = JSON.parse(localStorage.getItem(key) || '[]');
  arr.unshift(msg);
  localStorage.setItem(key, JSON.stringify(arr));
}
function getMessages(username){
  return JSON.parse(localStorage.getItem(`hf_msgs_${username}`) || '[]');
}
function deleteMessageByIndex(username, index){
  const key = `hf_msgs_${username}`;
  const arr = JSON.parse(localStorage.getItem(key) || '[]');
  if(index>=0 && index < arr.length){ arr.splice(index,1); localStorage.setItem(key, JSON.stringify(arr)); }
}

// ====== ساخت لینک (نمایش pretty + fallback) ======
function buildLinks(username, token){
  // pretty (path style)
  const prettyPublic = new URL(`u/${encodeURIComponent(username)}`, BASE_URL).toString();
  const prettyInbox  = new URL(`i/${encodeURIComponent(token)}`, BASE_URL).toString();

  // fallback (query style — حتماً این‌ها روی GitHub Pages کار می‌کنند)
  const fallbackPublic = new URL(`send.html?user=${encodeURIComponent(username)}`, BASE_URL).toString();
  const fallbackInbox  = new URL(`inbox.html?user=${encodeURIComponent(username)}&token=${encodeURIComponent(token)}`, BASE_URL).toString();

  return {
    prettyPublic, prettyInbox, fallbackPublic, fallbackInbox
  };
}

// ====== index.html handler ======
function initIndex(){
  const form = qs('#create-form');
  if(!form) return;
  form.addEventListener('submit', e=>{
    e.preventDefault();
    const username = (form.querySelector('input[name="username"]').value || '').trim();
    const note = (form.querySelector('input[name="note"]') || {}).value || '';
    if(!username){ showAlert('نام کاربری نمی‌تواند خالی باشد', 'danger'); return; }

    const token = randHex(32);
    saveTokenForUser(username, token);

    const links = buildLinks(username, token);

    // نمایش لینک‌ها: اول pretty، سپس fallback عملی (برای مطمئن شدن کارکرد)
    const out = qs('#links');
    out.innerHTML = `
      <div class="links-box">
        <h3>لینک ساخته شد 🎉</h3>

        <div style="margin-top:8px">
          <div class="small">لینک عمومی (خوانا):</div>
          <div class="link-row">
            <input readonly value="${escapeHtml(links.prettyPublic)}">
            <button data-link="${escapeHtml(links.prettyPublic)}" class="copy-btn">کپی</button>
          </div>
          <div class="small" style="margin-top:6px;color:#555">اگر این آدرس روی GitHub Pages شما روت نشده باشد، از لینکِ عملی استفاده کنید (زیر).</div>
        </div>

        <div style="margin-top:12px">
          <div class="small">لینک صندوق (خوانا):</div>
          <div class="link-row">
            <input readonly value="${escapeHtml(links.prettyInbox)}">
            <button data-link="${escapeHtml(links.prettyInbox)}" class="copy-btn">کپی</button>
          </div>
        </div>

        <hr style="margin:12px 0;border:none;border-top:1px dashed #eee">

        <div style="margin-top:8px">
          <div class="small">لینک عملی (اگر ریدایرکت/فایل path ندارید استفاده شود):</div>
          <div class="link-row">
            <input readonly value="${escapeHtml(links.fallbackPublic)}">
            <button data-link="${escapeHtml(links.fallbackPublic)}" class="copy-btn">کپی</button>
          </div>
          <div class="link-row" style="margin-top:6px">
            <input readonly value="${escapeHtml(links.fallbackInbox)}">
            <button data-link="${escapeHtml(links.fallbackInbox)}" class="copy-btn">کپی</button>
          </div>
        </div>

        <p class="small" style="margin-top:10px">لینک صندوق را محرمانه نگهدار — هرکسی آن را داشته باشد می‌تواند پیام‌ها را ببیند.</p>
      </div>
    `;

    qsa('.copy-btn').forEach(b=>{
      b.addEventListener('click', ()=>{ copyText(b.dataset.link).then(()=> showAlert('کپی شد', 'success')); });
    });

    // اگر خواستی خودکار فایل برای pretty url بسازی: اینجا میتونی ارسال به سرویس تو یا GitHub API بدی (نیاز به توکن)
    form.reset();
  });
}

// ====== send.html handler ======
function initSend(){
  const form = qs('#send-form');
  if(!form) return;
  // сначала determine username: try query param or path
  let username = null;
  try{
    // hash routing: #/u/username or path /u/username
    if(USE_HASH_ROUTING && location.hash.startsWith('#/u/')) username = decodeURIComponent(location.hash.slice(3));
    if(!username){
      const qp = new URLSearchParams(location.search).get('user');
      if(qp) username = qp;
    }
    if(!username){
      // if path like /u/username (served to send.html via pretty link), try path segments
      const parts = location.pathname.split('/').filter(Boolean);
      const uidx = parts.indexOf('u');
      if(uidx !== -1 && parts.length > uidx+1) username = decodeURIComponent(parts[uidx+1]);
    }
  }catch(e){}
  if(!username){ showAlert('نام کاربری در آدرس یافت نشد', 'danger'); return; }

  const title = qs('#send-title');
  if(title) title.innerText = `ارسال پیام ناشناس به ${username}`;

  form.addEventListener('submit', e=>{
    e.preventDefault();
    const sender = (form.querySelector('input[name="sender"]')||{}).value.trim() || '-';
    const body = (form.querySelector('textarea[name="body"]')||{}).value.trim();
    if(!body){ showAlert('متن پیام خالی است', 'danger'); return; }

    const msg = { sender, body, created: new Date().toLocaleString() };
    saveMessage(username, msg);
    showAlert('پیام ارسال شد ✅', 'success');
    form.reset();
  });
}

// ====== inbox.html handler ======
function initInbox(){
  // determine username & token from query or pretty path or hash
  let username = null, token = null;
  try{
    const qp = new URLSearchParams(location.search);
    username = qp.get('user'); token = qp.get('token');
    if(USE_HASH_ROUTING && (!username || !token)){
      const h = location.hash.replace(/^#\/?/, '');
      const parts = h.split('/');
      if(parts[0]==='i' && parts[1]){ token = parts[1]; }
      if(parts[0]==='u' && parts[1]){ username = parts[1]; }
    }
    // if path is /i/<token> => find token
    if(!token){
      const parts = location.pathname.split('/').filter(Boolean);
      const idx = parts.indexOf('i');
      if(idx !== -1 && parts.length > idx+1) token = parts[idx+1];
    }
    // if path is /u/<username> and token stored locally, use that
    if(!username){
      const parts = location.pathname.split('/').filter(Boolean);
      const idxu = parts.indexOf('u');
      if(idxu !== -1 && parts.length > idxu+1) username = parts[idxu+1];
    }
  }catch(e){ console.error(e); }

  // if token provided but username missing, try to find username saved for that token
  if(!username && token){
    // scan localStorage for any token_* matching
    for(let i=0;i<localStorage.length;i++){
      const k = localStorage.key(i);
      if(k && k.startsWith('hf_token_')){
        const uname = k.slice('hf_token_'.length);
        if(localStorage.getItem(k) === token){ username = uname; break; }
      }
    }
  }

  if(!username || !token){ showAlert('لینک نامعتبر یا پارامترها ناقص است', 'danger'); return; }

  // verify stored token matches
  const stored = getTokenForUser(username);
  if(!stored || stored !== token){
    // token mismatch — ممکن است کاربر از مرورگر دیگر آمده باشد (localStorage نداشت)
    showAlert('توکن معتبر نیست (داده‌های محلی موجود نیست).', 'danger');
    // still: we can try to render messages if present under username (without token)
    // but to be strict we bail out
    return;
  }

  // render messages
  const inboxEl = qs('#inbox');
  if(!inboxEl){ console.warn('#inbox element missing'); return; }
  function render(){
    const msgs = getMessages(username);
    if(!msgs || msgs.length===0){ inboxEl.innerHTML = '<p>هنوز پیامی دریافت نشده است.</p>'; return; }
    // build HTML list
    inboxEl.innerHTML = msgs.map((m, idx)=>`
      <div class="msg-box" data-idx="${idx}">
        <div class="msg-header">فرستنده: ${escapeHtml(m.sender)} — ${escapeHtml(m.created)}</div>
        <div class="msg-body">${escapeHtml(m.body)}</div>
        <div style="margin-top:8px"><button class="btn-delete" data-idx="${idx}">حذف</button></div>
      </div>
    `).join('');
    qsa('.btn-delete').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const id = parseInt(btn.dataset.idx);
        if(!confirm('آیا مطمئن هستید؟')) return;
        deleteMessageByIndex(username, id);
        render();
        showAlert('پیام حذف شد', 'success');
      });
    });
  }
  render();

  // clear all button (optional)
  const clearBtn = qs('#clear-all');
  if(clearBtn){
    clearBtn.addEventListener('click', ()=>{
      if(!confirm('پاک کردن همهٔ پیام‌ها؟')) return;
      localStorage.removeItem(`hf_msgs_${username}`);
      render();
      showAlert('تمام پیام‌ها حذف شد', 'success');
    });
  }
}

// ====== auto init based on page ======
document.addEventListener('DOMContentLoaded', ()=>{
  // init alert area if missing
  if(!qs('#alert-area')){
    const a = document.createElement('div'); a.id='alert-area'; a.style.position='fixed'; a.style.top='12px'; a.style.left='12px'; a.style.zIndex='9999';
    document.body.appendChild(a);
  }
  // decide page by presence of ids
  if(qs('#create-form')) initIndex();
  if(qs('#send-form')) initSend();
  if(qs('#inbox')) initInbox();
});
