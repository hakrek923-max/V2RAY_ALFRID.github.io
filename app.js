/**
 * app.js — پیام ناشناس بدون سرور، فقط با GitHub Pages
 * همه داده‌ها در localStorage ذخیره می‌شوند.
 */

// کمک‌کننده‌ها
function qs(sel){ return document.querySelector(sel); }
function qsa(sel){ return Array.from(document.querySelectorAll(sel)); }
function showAlert(msg, type='info'){
  const area = qs('#alert-area');
  if(area){
    area.innerHTML = `<div class="alert alert-${type}">${msg}</div>`;
    setTimeout(()=> area.innerHTML='', 5000);
  } else { alert(msg); }
}
function copyToClipboard(text){
  if(navigator.clipboard) return navigator.clipboard.writeText(text);
  const ta = document.createElement('textarea'); ta.value=text;
  document.body.appendChild(ta); ta.select();
  document.execCommand('copy'); document.body.removeChild(ta);
}

// تولید توکن تصادفی
function generateToken(len=16){
  const chars = 'abcdef0123456789';
  let s=''; for(let i=0;i<len;i++) s+=chars[Math.floor(Math.random()*chars.length)];
  return s;
}

// ذخیره پیام‌ها در localStorage
function saveMessage(username, msgObj){
  const key = `messages_${username}`;
  const arr = JSON.parse(localStorage.getItem(key) || '[]');
  arr.push(msgObj);
  localStorage.setItem(key, JSON.stringify(arr));
}

// خواندن پیام‌ها
function getMessages(username){
  const key = `messages_${username}`;
  return JSON.parse(localStorage.getItem(key) || '[]');
}

// ----------------------
// index.html: ساخت لینک
// ----------------------
function initIndex(){
  const form = qs('#create-form');
  if(!form) return;
  form.addEventListener('submit', e=>{
    e.preventDefault();
    const username = form.querySelector('input[name="username"]').value.trim();
    if(!username){ showAlert('نام کاربری خالی است', 'danger'); return; }
    const token = generateToken(16);
    // ذخیره توکن محلی (optional)
    localStorage.setItem(`token_${username}`, token);

    const publicLink = `send.html?user=${username}`;
    const inboxLink = `inbox.html?user=${username}&token=${token}`;

    const container = qs('#links');
    container.innerHTML = `
      <div class="links-box">
        <h3>لینک ساخته شد 🎉</h3>
        <p>لینک عمومی:</p>
        <div class="link-row">
          <input readonly value="${publicLink}"><button data-link="${publicLink}">کپی</button>
        </div>
        <p>لینک مخفی (صندوق پیام):</p>
        <div class="link-row">
          <input readonly value="${inboxLink}"><button data-link="${inboxLink}">کپی</button>
        </div>
      </div>
    `;

    qsa('.link-row button').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        copyToClipboard(btn.dataset.link).then(()=> showAlert('کپی شد', 'success'));
      });
    });
  });
}

// ----------------------
// send.html: ارسال پیام
// ----------------------
function initSend(){
  const form = qs('#send-form');
  if(!form) return;
  const username = new URLSearchParams(location.search).get('user');
  if(!username){ showAlert('نام کاربری نامعتبر', 'danger'); return; }
  qs('#send-title').innerText = `ارسال پیام ناشناس به ${username}`;

  form.addEventListener('submit', e=>{
    e.preventDefault();
    const body = form.querySelector('textarea[name="body"]').value.trim();
    if(!body){ showAlert('پیام خالی است', 'danger'); return; }
    const sender = form.querySelector('input[name="sender"]').value.trim();
    saveMessage(username, {sender: sender || '-', body, date: new Date().toLocaleString()});
    showAlert('پیام ارسال شد ✅', 'success');
    form.reset();
  });
}

// ----------------------
// inbox.html: نمایش پیام‌ها
// ----------------------
function initInbox(){
  const username = new URLSearchParams(location.search).get('user');
  const token = new URLSearchParams(location.search).get('token');
  if(!username || !token){ showAlert('لینک نامعتبر', 'danger'); return; }
  const storedToken = localStorage.getItem(`token_${username}`);
  if(token!==storedToken){ showAlert('توکن نامعتبر', 'danger'); return; }

  const container = qs('#inbox');
  function render(){
    const msgs = getMessages(username);
    if(msgs.length===0){
      container.innerHTML = '<p>هیچ پیامی دریافت نشده است.</p>'; return;
    }
    container.innerHTML = msgs.map((m,i)=>`
      <div class="msg-box">
        <div class="msg-header">فرستنده: ${m.sender} | ${m.date}</div>
        <div class="msg-body">${m.body}</div>
        <button data-id="${i}">حذف</button>
      </div>
    `).join('');
    container.querySelectorAll('button').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const id = parseInt(btn.dataset.id);
        const arr = getMessages(username);
        arr.splice(id,1);
        localStorage.setItem(`messages_${username}`, JSON.stringify(arr));
        render();
      });
    });
  }
  render();
}

// ----------------------
// auto init
// ----------------------
document.addEventListener('DOMContentLoaded', ()=>{
  initIndex();
  initSend();
  initInbox();
});
