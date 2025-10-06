/**
 * app.js — فرانت برای پروژهٔ پیام ناشناس (GitHub Pages frontend)
 * ارتباط با API امن (Flask) که این endpointها را دارد:
 *   POST /api/create_user       -> { username }  => { public_link, inbox_link, token }
 *   POST /api/send_message      -> { username, body, sender } => { ok }
 *   POST /api/validate-token    -> { username, token } => { ok, messages }
 *   POST /api/delete-message    -> { username, token, msg_id } => { ok }
 *
 * قبل از استفاده: مقدار API_BASE را به آدرس سرور Flask تنظیم کن.
 */

const API_BASE = 'https://your-api-domain.example/'; // <<< این را به آدرس سرورت تغییر بده (آخرش اسلش باشد)
const SITE_BASE = (location.origin + location.pathname).replace(/\/(?:index\.html)?$/, '/'); // base for local links (not used when we use full links from server)

function qs(sel){ return document.querySelector(sel); }
function qsa(sel){ return Array.from(document.querySelectorAll(sel)); }
function showAlert(msg, type='info'){ // simple alert area یا fallback به alert
  const area = qs('#hf-alert-area');
  if(area){
    area.innerHTML = `<div class="hf-alert hf-alert-${type}">${escapeHtml(msg)}</div>`;
    setTimeout(()=> area.innerHTML = '', 6000);
  } else {
    alert(msg);
  }
}
function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function copyToClipboard(text){
  if(navigator.clipboard && navigator.clipboard.writeText){
    return navigator.clipboard.writeText(text);
  } else {
    // fallback
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch(e){}
    document.body.removeChild(ta);
    return Promise.resolve();
  }
}

/* -------------------------
   Helper: API fetch wrapper
   ------------------------- */
async function apiPost(path, body){
  const url = new URL(path, API_BASE).toString();
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const text = await resp.text();
  let data;
  try { data = text ? JSON.parse(text) : {}; } catch(e){ data = { error: 'invalid_json', raw: text }; }
  if(!resp.ok){
    const err = data && data.error ? data.error : `HTTP ${resp.status}`;
    throw new Error(err);
  }
  return data;
}

/* -------------------------
   index.html: ساخت لینک
   ------------------------- */
async function handleCreateForm(form){
  form.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const username = form.querySelector('input[name="username"]').value.trim();
    const note = form.querySelector('input[name="note"]') ? form.querySelector('input[name="note"]').value.trim() : '';
    if(!username){
      showAlert('نام کاربری نمی‌تواند خالی باشد.', 'danger'); return;
    }
    // درخواست به سرور برای ساختن کاربر و دریافت لینک‌های امن
    try{
      // غیر فعال‌سازی دکمه
      const btn = form.querySelector('button[type="submit"]');
      if(btn) btn.disabled = true;
      const data = await apiPost('/api/create_user', { username });
      // data: { public_link, inbox_link, token }
      renderCreatedLinks(data.public_link, data.inbox_link, username, data.token);
    }catch(err){
      showAlert('خطا در ساخت لینک: ' + err.message, 'danger');
      const btn = form.querySelector('button[type="submit"]');
      if(btn) btn.disabled = false;
      console.error(err);
    }
  });
}

function renderCreatedLinks(publicLink, inboxLink, username, token){
  // نمایش لینک‌ها در DOM — فایل index.html باید ظرفی برای نمایش داشته باشد
  const containerId = '#created-links';
  let container = qs(containerId);
  if(!container){
    container = document.createElement('div');
    container.id = 'created-links';
    const anchor = qs('form');
    if(anchor) anchor.parentNode.appendChild(container);
    else document.body.appendChild(container);
  }
  container.innerHTML = `
    <div class="hf-created">
      <h3>لینک ساخته شد 🎉</h3>
      <p><strong>لینک عمومی:</strong></p>
      <div class="hf-link-row">
        <input readonly class="hf-link" value="${escapeHtml(publicLink)}" />
        <button class="hf-copy" data-link="${escapeHtml(publicLink)}">کپی</button>
      </div>
      <p style="margin-top:8px"><strong>لینک صندوق پیام (مخفی):</strong></p>
      <div class="hf-link-row">
        <input readonly class="hf-link" value="${escapeHtml(inboxLink)}" />
        <button class="hf-copy" data-link="${escapeHtml(inboxLink)}">کپی</button>
      </div>
      <p class="hf-small">لینک صندوق را محرمانه نگه دارید — فقط کسی که این لینک را دارد می‌تواند پیام‌ها را ببیند.</p>
    </div>
  `;
  // copy buttons
  qsa('.hf-copy').forEach(btn=>{
    btn.addEventListener('click', async ()=>{
      const link = btn.dataset.link;
      try{
        await copyToClipboard(link);
        showAlert('لینک کپی شد.', 'success');
      }catch(e){
        showAlert('کپی ناموفق بود.', 'danger');
      }
    });
  });
  // cache token & username in sessionStorage (اختیاری) — برای راحتی صاحب لینک
  try{
    sessionStorage.setItem('hf_username', username);
    sessionStorage.setItem('hf_token', token);
  }catch(e){}
}

/* -------------------------
   send.html: ارسال پیام
   ------------------------- */
function getQueryParam(name){
  try{
    return (new URLSearchParams(window.location.search)).get(name);
  }catch(e){ return null; }
}

async function handleSendForm(form){
  // پر کردن عنوان صفحه با نام کاربر
  const username = getQueryParam('user') || getQueryParam('username');
  if(username){
    const title = qs('header h1') || qs('h1') || document.title;
    if(qs('header h1')) qs('header h1').innerText = `ارسال پیام ناشناس به ${username}`;
  }
  form.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const sender = form.querySelector('input[name="sender_name"]').value.trim();
    const body = form.querySelector('textarea[name="body"]').value.trim();
    const user = username;
    if(!user){ showAlert('نام کاربری در آدرس وجود ندارد.', 'danger'); return; }
    if(!body){ showAlert('متن پیام نمی‌تواند خالی باشد.', 'danger'); return; }
    try{
      const submitBtn = form.querySelector('button[type="submit"]');
      if(submitBtn) submitBtn.disabled = true;
      const data = await apiPost('/api/send_message', { username: user, body, sender });
      showAlert('پیام با موفقیت ارسال شد ✅', 'success');
      form.reset();
      if(submitBtn) setTimeout(()=> submitBtn.disabled=false, 800);
    }catch(err){
      showAlert('خطا در ارسال پیام: ' + err.message, 'danger');
      const submitBtn = form.querySelector('button[type="submit"]');
      if(submitBtn) submitBtn.disabled = false;
    }
  });
}

/* -------------------------
   inbox.html: دریافت و مدیریت پیام‌ها
   ------------------------- */
async function loadInboxUI(containerSelector='body'){
  const username = getQueryParam('user');
  const token = getQueryParam('token') || sessionStorage.getItem('hf_token');
  if(!username || !token){
    showAlert('پارامترهای لینک معتبر نیستند (user و token لازم است).', 'danger');
    return;
  }
  // نشانگر بارگذاری
  const container = qs(containerSelector) || document.body;
  const area = qs('#inbox-area') || document.createElement('div');
  area.id = 'inbox-area';
  container.appendChild(area);
  area.innerHTML = `<div class="hf-loading">در حال بارگذاری پیام‌ها...</div>`;

  try{
    const resp = await apiPost('/api/validate-token', { username, token });
    if(!resp.ok){ showAlert('توکن معتبر نیست.', 'danger'); area.innerHTML = ''; return; }
    const msgs = resp.messages || [];
    renderInbox(area, username, token, msgs);
  }catch(err){
    showAlert('خطا در دریافت پیام‌ها: ' + err.message, 'danger');
    area.innerHTML = '';
    console.error(err);
  }
}

function renderInbox(area, username, token, msgs){
  const escapedUser = escapeHtml(username);
  if(!Array.isArray(msgs)) msgs = [];
  if(msgs.length === 0){
    area.innerHTML = `
      <div class="hf-inbox-header">
        <h2>صندوق پیام — ${escapedUser}</h2>
        <p class="hf-small">هیچ پیامی دریافت نشده است.</p>
      </div>`;
    return;
  }
  let rows = msgs.map(m=>{
    const id = m.id;
    const created = escapeHtml(m.created_at || m.created || '');
    const sender = escapeHtml(m.sender_name || '-');
    const body = escapeHtml(m.body || '');
    return `
      <tr data-id="${id}">
        <td class="hf-td-time">${created}</td>
        <td class="hf-td-sender">${sender}</td>
        <td class="hf-td-body">${body}</td>
        <td class="hf-td-actions">
          <button class="hf-btn hf-delete" data-id="${id}">حذف</button>
        </td>
      </tr>`;
  }).join('');
  area.innerHTML = `
    <div class="hf-inbox-header">
      <h2>صندوق پیام — ${escapedUser}</h2>
      <p class="hf-small">تعداد پیام: <strong>${msgs.length}</strong></p>
    </div>
    <div class="hf-inbox-table">
      <table>
        <thead><tr><th>تاریخ</th><th>نام فرستنده</th><th>متن پیام</th><th>حذف</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <div style="margin-top:12px">
      <button id="hf-clear-all" class="hf-btn hf-danger">حذف همه پیام‌ها</button>
      <button id="hf-refresh" class="hf-btn">بروزرسانی</button>
    </div>
  `;

  // حذف یک پیام
  area.querySelectorAll('.hf-delete').forEach(btn=>{
    btn.addEventListener('click', async (e)=>{
      const id = btn.dataset.id;
      if(!confirm('آیا می‌خواهید این پیام را حذف کنید؟')) return;
      try{
        await apiPost('/api/delete-message', { username, token, msg_id: id });
        showAlert('پیام حذف شد.', 'success');
        // حذف ردیف از DOM
        const tr = area.querySelector(`tr[data-id="${id}"]`);
        if(tr) tr.remove();
      }catch(err){
        showAlert('خطا در حذف پیام: ' + err.message, 'danger');
      }
    });
  });

  // حذف همه
  qs('#hf-clear-all').addEventListener('click', async ()=>{
    if(!confirm('آیا مطمئن هستید که می‌خواهید همه پیام‌ها را حذف کنید؟')) return;
    try{
      // حذف تک‌تک: یا پیاده‌سازی سروری برای حذف همه. اینجا از حذف تک‌تک استفاده می‌کنیم
      for(const m of msgs){
        await apiPost('/api/delete-message', { username, token, msg_id: m.id });
      }
      showAlert('تمام پیام‌ها حذف شدند.', 'success');
      // پاک کردن جدول
      const tbody = area.querySelector('tbody');
      if(tbody) tbody.innerHTML = '';
    }catch(err){
      showAlert('خطا در حذف همه پیام‌ها: ' + err.message, 'danger');
    }
  });

  // refresh
  qs('#hf-refresh').addEventListener('click', ()=>{
    loadInboxUI('#inbox-area');
  });
}

/* -------------------------
   Auto-init based on page
   ------------------------- */
document.addEventListener('DOMContentLoaded', ()=>{
  // optional small alert area
  if(!qs('#hf-alert-area')){
    const a = document.createElement('div'); a.id = 'hf-alert-area';
    a.style.position = 'fixed'; a.style.top = '12px'; a.style.left='12px'; a.style.zIndex='9999';
    document.body.appendChild(a);
  }

  // find forms and initialize appropriate handlers
  const createForm = qs('form#create-user') || qs('form#createUser') || (qs('form') && qs('form').dataset.hf === 'create');
  const sendForm = qs('form#send-form') || qs('form[name="sendForm"]') || (qs('form') && qs('form').dataset.hf === 'send');
  const inboxTable = qs('table#inbox-table') || qs('table');

  // index page (create)
  if(createForm){
    handleCreateForm(createForm);
    return;
  }

  // send page
  if(sendForm){
    handleSendForm(sendForm);
    return;
  }

  // inbox page
  if(inboxTable){
    // ensure container for inbox exists
    const container = qs('#inbox-area') || document.body;
    loadInboxUI('#inbox-area');
    return;
  }

  // fallback: if none found, we try to wire generic forms
  const genericForm = qs('form');
  if(genericForm){
    // check query params to decide send or create
    const user = getQueryParam('user') || getQueryParam('username');
    if(user){
      // send form
      handleSendForm(genericForm);
    } else {
      // create form
      handleCreateForm(genericForm);
    }
  }
});

/* -------------------------
   Utilities
   ------------------------- */
function getQueryParam(name){
  try{ return new URLSearchParams(window.location.search).get(name); }
  catch(e){ return null; }
}

/* -------------------------
   Optional: small CSS via JS insertion (برای هشدارها/دکمه‌ها)
   ------------------------- */
(function insertHFStyles(){
  const css = `
  .hf-alert{padding:10px 14px;border-radius:8px;margin-bottom:8px;box-shadow:0 6px 18px rgba(0,0,0,0.06)}
  .hf-alert-info{background:#f0f8ff;color:#055}
  .hf-alert-success{background:#e6ffef;color:#065}
  .hf-alert-danger{background:#ffecec;color:#a00}
  .hf-created{margin-top:12px;padding:12px;background:#fff;border-radius:10px;box-shadow:0 6px 18px rgba(0,0,0,0.04)}
  .hf-link-row{display:flex;gap:8px;align-items:center;margin-top:6px}
  .hf-link{flex:1;padding:8px;border-radius:8px;border:1px solid #eee}
  .hf-copy{padding:8px 10px;border-radius:8px;border:0;background:linear-gradient(90deg,#4D96FF,#FF6B6B);color:#fff;cursor:pointer}
  .hf-small{color:#666;font-size:13px}
  .hf-btn{padding:8px 10px;border-radius:8px;border:0;background:linear-gradient(90deg,#4D96FF,#7b61ff);color:#fff;cursor:pointer;margin-left:8px}
  .hf-danger{background:linear-gradient(90deg,#ff7b7b,#ffb3b3);color:#700}
  table#inbox-table, table{width:100%;border-collapse:collapse}
  table th, table td{padding:8px;border-bottom:1px dashed #eee;text-align:right}
  `;
  const s = document.createElement('style'); s.type='text/css'; s.appendChild(document.createTextNode(css));
  document.head.appendChild(s);
})();
