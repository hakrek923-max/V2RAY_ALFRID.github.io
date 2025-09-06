/* script.js - shared logic for index/manage/about/contact
   - mobile-first behavior
   - localStorage model: array of configs
   Each config:
   {
     id: 'c_...', title:'', type:'vmess', text:'', files:[{name,type,dataUrl}], createdAt: ISO string
   }
*/

const STORAGE_KEY = 'rlax_configs_v1';
const ADMIN_PASS = 'Hh2ratu/(';

/* ---------- Utilities ---------- */
function loadData(){
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch(e){ return []; }
}
function saveData(arr){ localStorage.setItem(STORAGE_KEY, JSON.stringify(arr)); }
function uid(){ return 'c_' + Date.now() + '_' + Math.random().toString(36).slice(2,8); }
function formatDate(iso){
  try{
    const d = new Date(iso);
    // Persian digits optional; we'll show localized string in Persian
    return d.toLocaleString('fa-IR', {year:'numeric', month:'2-digit', day:'2-digit'}) + ' - ' +
           d.toLocaleTimeString('fa-IR', {hour:'2-digit', minute:'2-digit', second:'2-digit'});
  }catch(e){ return iso; }
}
function fileToDataUrl(file){ return new Promise((res,rej)=>{ const r=new FileReader(); r.onload=()=>res(r.result); r.onerror=rej; r.readAsDataURL(file); }); }

/* ---------- INDEX page rendering (only runs if index elements exist) ---------- */
function renderIndexUI(){
  const listArea = document.getElementById('listArea');
  const emptyNote = document.getElementById('emptyNote');
  const searchInput = document.getElementById('searchInput');
  const filters = document.querySelectorAll('.filter-btn');

  if(!listArea) return; // not index page

  function render(filtersObj = {q:'', type:'all'}){
    const data = loadData();
    let shown = data.slice();
    if(filtersObj.type && filtersObj.type !== 'all'){
      shown = shown.filter(it => (it.type||'other') === filtersObj.type);
    }
    if(filtersObj.q){
      const q = filtersObj.q.toLowerCase();
      shown = shown.filter(it => (it.title||'').toLowerCase().includes(q) || (it.text||'').toLowerCase().includes(q));
    }
    listArea.innerHTML = '';
    if(shown.length === 0){ emptyNote.style.display = 'block'; return; } else emptyNote.style.display = 'none';

    shown.forEach(cfg=>{
      const card = document.createElement('article');
      card.className = 'card fade';
      card.innerHTML = `
        <div class="meta">
          <div class="title">${escapeHtml(cfg.title)}</div>
          <div class="time">${formatDate(cfg.createdAt)}</div>
        </div>
        ${cfg.type ? `<div class="small" style="color:#0771c6;font-weight:700;margin-bottom:8px">${escapeHtml(cfg.type)}</div>` : ''}
        ${cfg.text ? `<pre aria-label="config-text">${escapeHtml(cfg.text)}</pre>` : ''}
      `;
      // files preview
      if(cfg.files && cfg.files.length){
        cfg.files.forEach(f=>{
          if(f.type && f.type.startsWith('image/')){
            const img = document.createElement('img'); img.className='thumb'; img.src = f.dataUrl; img.alt = f.name;
            card.appendChild(img);
          } else if(f.type && f.type.startsWith('video/')){
            const v = document.createElement('video'); v.className='thumb'; v.src = f.dataUrl; v.controls = true;
            card.appendChild(v);
          } else {
            // file link will be handled via download action
          }
        });
      }

      // actions
      const actions = document.createElement('div'); actions.className='actions';
      // copy
      const copyBtn = document.createElement('button'); copyBtn.className='action-btn copy'; copyBtn.innerHTML='📋 کپی';
      copyBtn.addEventListener('click', async ()=>{
        const toCopy = (cfg.text && cfg.text.trim()) ? cfg.text : (cfg.files && cfg.files[0] ? cfg.files[0].dataUrl : '');
        if(!toCopy){ alert('محتوا برای کپی وجود ندارد'); return; }
        try{ await navigator.clipboard.writeText(toCopy); toast('کپی شد'); }catch(e){ fallbackCopy(toCopy); }
      });
      actions.appendChild(copyBtn);

      // download (if files)
      if(cfg.files && cfg.files.length){
        const dlBtn = document.createElement('button'); dlBtn.className='action-btn dl'; dlBtn.innerHTML='⬇️ دانلود';
        dlBtn.addEventListener('click', ()=>{
          // if text present, download text as .txt; else download each file
          if(cfg.text && cfg.text.trim()){
            const blob = new Blob([cfg.text], {type:'text/plain;charset=utf-8'});
            const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = sanitizeFilename(cfg.title||'config') + '.txt'; a.click(); URL.revokeObjectURL(a.href);
          } else {
            // download first file
            const f = cfg.files[0];
            const a = document.createElement('a'); a.href = f.dataUrl; a.download = f.name || 'file'; a.click();
          }
        });
        actions.appendChild(dlBtn);
      } else {
        // if no file but text exists, still show download option
        if(cfg.text && cfg.text.trim()){
          const dlBtn = document.createElement('button'); dlBtn.className='action-btn dl'; dlBtn.innerHTML='⬇️ دانلود';
          dlBtn.addEventListener('click', ()=>{
            const blob = new Blob([cfg.text], {type:'text/plain;charset=utf-8'});
            const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = sanitizeFilename(cfg.title||'config') + '.txt'; a.click(); URL.revokeObjectURL(a.href);
          });
          actions.appendChild(dlBtn);
        }
      }

      // share (mobile)
      const shareBtn = document.createElement('button'); shareBtn.className='action-btn'; shareBtn.innerHTML='📲 اشتراک';
      shareBtn.addEventListener('click', async ()=>{
        const txt = (cfg.text && cfg.text.trim()) ? cfg.text : (cfg.files && cfg.files[0] ? cfg.files[0].dataUrl : '');
        if(!txt){ alert('محتوایی برای اشتراک وجود ندارد'); return; }
        if(navigator.share){
          try{
            await navigator.share({ title: cfg.title, text: cfg.text || cfg.files[0].name });
          }catch(e){ /* ignore cancel */ }
        } else {
          // fallback: copy to clipboard
          try{ await navigator.clipboard.writeText(cfg.text || cfg.files[0].dataUrl); toast('متن کپی شد، حالا اشتراک‌گذاری کن'); }
          catch(e){ fallbackCopy(cfg.text || cfg.files[0].dataUrl); }
        }
      });
      actions.appendChild(shareBtn);

      // delete if admin session active
      const isAdmin = sessionStorage.getItem('rlax_admin') === '1';
      if(isAdmin){
        const delBtn = document.createElement('button'); delBtn.className='action-btn danger'; delBtn.innerHTML='حذف';
        delBtn.addEventListener('click', ()=>{
          if(!confirm('آیا از حذف این کانفیگ مطمئنی؟')) return;
          const arr = loadData();
          const idx = arr.findIndex(x => x.id === cfg.id);
          if(idx !== -1){ arr.splice(idx,1); saveData(arr); render({ q: searchInput.value.trim(), type: currentFilter }); toast('حذف شد'); }
        });
        actions.appendChild(delBtn);
      }

      card.appendChild(actions);
      listArea.appendChild(card);
    });
  } // end render

  // helpers & events
  let currentFilter = 'all';
  window.currentFilter = currentFilter;
  const filterButtons = document.querySelectorAll('.filter-btn');
  filterButtons.forEach(btn=>{
    btn.addEventListener('click', ()=>{
      filterButtons.forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter || 'all';
      render({ q: searchInput.value.trim(), type: currentFilter });
    });
  });

  searchInput.addEventListener('input', ()=> render({ q: searchInput.value.trim(), type: currentFilter }));

  // initial render
  render({ q:'', type:'all' });

  // export function to global for deletion by index (if needed)
  window.renderIndex = render;
}

/* ---------- MANAGE page logic (runs on manage.html) ---------- */
function setupManagePage(){
  const loginBtn = document.getElementById('loginBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  const adminPassword = document.getElementById('adminPassword');
  const loginMsg = document.getElementById('loginMsg');
  const editor = document.getElementById('editor');

  if(!loginBtn) return; // not manage page

  function setSession(val){
    if(val){ sessionStorage.setItem('rlax_admin','1'); editor.style.display='block'; loginBtn.style.display='none'; logoutBtn.style.display='inline-block'; }
    else { sessionStorage.removeItem('rlax_admin'); editor.style.display='none'; loginBtn.style.display='inline-block'; logoutBtn.style.display='none'; }
  }
  const initSession = sessionStorage.getItem('rlax_admin') === '1';
  setSession(initSession);

  loginBtn.addEventListener('click', ()=>{
    if(adminPassword.value === ADMIN_PASS){
      setSession(true); adminPassword.value=''; loginMsg.textContent=''; alert('ورود موفق');
      renderIndex(); // refresh homepage data if any
    } else {
      loginMsg.textContent = 'رمز اشتباه است';
    }
  });
  logoutBtn.addEventListener('click', ()=>{ setSession(false); });

  // add config
  const addBtn = document.getElementById('addCfgBtn');
  const cfgTitle = document.getElementById('cfgTitle');
  const cfgType = document.getElementById('cfgType');
  const cfgText = document.getElementById('cfgText');
  const cfgFile = document.getElementById('cfgFile');
  const clearEditor = document.getElementById('clearEditor');

  addBtn.addEventListener('click', async ()=>{
    const title = (cfgTitle.value || '').trim();
    if(!title) return alert('عنوان را وارد کنید');
    const type = cfgType.value || 'other';
    const text = cfgText.value || '';
    const files = [];
    if(cfgFile.files && cfgFile.files.length){
      for(let f of cfgFile.files){
        try{
          const dataUrl = await fileToDataUrl(f);
          files.push({ name: f.name, type: f.type, dataUrl });
        }catch(e){ console.error(e) }
      }
    }
    const entry = { id: uid(), title, type, text, files, createdAt: new Date().toISOString() };
    const arr = loadData(); arr.unshift(entry); saveData(arr);
    // reset
    cfgTitle.value=''; cfgText.value=''; cfgFile.value='';
    alert('کانفیگ ذخیره شد'); // small notification
  });

  clearEditor.addEventListener('click', ()=>{ cfgTitle.value=''; cfgText.value=''; cfgFile.value=''; cfgType.value=''; });
}

/* ---------- global helpers ---------- */
function escapeHtml(s){ if(!s) return ''; return String(s).replace(/[&<>"']/g, (m)=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[m]); }
function sanitizeFilename(s){ return (s||'config').replace(/[^\w\-\.]/g,'_').slice(0,120); }
function fallbackCopy(text){ const ta=document.createElement('textarea'); ta.value=text; document.body.appendChild(ta); ta.select(); try{ document.execCommand('copy'); alert('کپی شد (fallback)'); }catch(e){ alert('عملیات کپی ناموفق بود'); } ta.remove(); }
function toast(msg){ /* tiny toast using alert for simplicity (can be upgraded) */ if(window.navigator && window.navigator.vibrate) navigator.vibrate(10); const el = document.createElement('div'); el.textContent=msg; el.style.cssText = 'position:fixed;left:50%;top:18%;transform:translateX(-50%);background:#063454;color:#fff;padding:8px 12px;border-radius:8px;z-index:2000;box-shadow:0 8px 24px rgba(6,52,84,0.2)'; document.body.appendChild(el); setTimeout(()=>el.remove(),1400); }

/* ---------- FAB menu (index) ---------- */
function setupFab(){
  const fab = document.querySelector('.fab');
  const menu = document.querySelector('.fab-menu');
  if(!fab) return;
  fab.addEventListener('click', (e)=>{
    e.stopPropagation();
    if(menu){ menu.classList.toggle('hidden'); }
  });
  document.addEventListener('click', ()=>{ if(menu) menu.classList.add('hidden'); });
}

/* ---------- Init detection ---------- */
document.addEventListener('DOMContentLoaded', ()=>{
  setupFab();
  renderIndexUI();
  setupManagePage();
});
