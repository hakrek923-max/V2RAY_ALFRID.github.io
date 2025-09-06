/* =======================================================================
   RLAX — script.js
   Comprehensive client-side logic for the whole project
   - menu, login, admin guard
   - configs CRUD (localStorage + seed from configs.json)
   - ads CRUD + ad overlay with timer
   - file uploads to dataURL, copy/download/share
   - export/import backup, pagination, search, filters
   - toast system, utility helpers
   ======================================================================= */

/* ---------------- constants / keys ---------------- */
const STORAGE_CFG = 'rlax_configs_v_final';
const STORAGE_ADS = 'rlax_ads_v_final';
const STORAGE_ADMIN = 'rlax_admin_session';
const CONFIGS_JSON = 'assets/data/configs.json';
const ADMIN_PASS = 'Hh2ratu/(';

/* ---------------- utilities ---------------- */
function uid() {
  return 'id_' + Date.now() + '_' + Math.random().toString(36).slice(2,8);
}
function nowISO() { return new Date().toISOString(); }
function formatDate(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('fa-IR') + ' ' + d.toLocaleTimeString('fa-IR');
  } catch (e) {
    return iso || '';
  }
}
function safeJSONParse(s, fallback = []) {
  try { return JSON.parse(s || '[]'); } catch(e){ return fallback; }
}
function saveLocal(key, arr){ localStorage.setItem(key, JSON.stringify(arr)); }
function loadLocal(key){ return safeJSONParse(localStorage.getItem(key)); }
function elem(id){ return document.getElementById(id); }
function el(tag, cls, html){ const e=document.createElement(tag); if(cls) e.className=cls; if(html!==undefined) e.innerHTML=html; return e; }

/* small toast */
function toast(msg, ms=1700){
  const t = el('div','_toast', msg);
  t.style.position='fixed';
  t.style.left='50%';
  t.style.top='20%';
  t.style.transform='translateX(-50%)';
  t.style.zIndex='99999';
  document.body.appendChild(t);
  setTimeout(()=>{ t.classList.add('hide'); t.remove(); }, ms);
}

/* file -> dataURL */
function fileToDataUrl(file){
  return new Promise((res, rej)=>{
    const r = new FileReader();
    r.onload = ()=>res(r.result);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

/* sanitize filename */
function sanitizeFilename(name='file'){ return (''+name).replace(/[^\w\-\.\u0600-\u06FF]/g,'_').slice(0,120); }

/* clipboard fallback */
async function copyToClipboard(text){
  try {
    await navigator.clipboard.writeText(text);
    toast('کپی شد');
  } catch(e){
    const ta = document.createElement('textarea');
    ta.value = text; document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); toast('کپی شد (fallback)'); } catch(_) { alert('کپی ناموفق') }
    ta.remove();
  }
}

/* download blob/text as file */
function downloadFile(filename, content, mime='text/plain'){
  const blob = new Blob([content], {type: mime});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; document.body.appendChild(a);
  a.click(); URL.revokeObjectURL(url); a.remove();
}

/* safe share */
async function shareFallback(title, text){
  if(navigator.share){
    try { await navigator.share({title, text}); return; } catch(e) { /* ignore */ }
  }
  // fallback to copy
  await copyToClipboard(text);
  alert('متن کپی شد؛ حالا آن را به اشتراک بگذارید');
}

/* ---------------- app-level: load seed configs.json ---------------- */
async function loadSeedConfigs(){
  try {
    const resp = await fetch(CONFIGS_JSON, {cache:'no-store'});
    if(!resp.ok) return [];
    const json = await resp.json();
    return Array.isArray(json) ? json : [];
  } catch(e){
    console.warn('seed load failed', e);
    return [];
  }
}

/* ---------------- merge local + seed configs ----------------
   logic: local (user-added) first (newest), then seed from configs.json
   supports objects with fields: id,title,type,text,files(createdAt)
-------------------------------------------------------------- */
async function getAllConfigs(){
  const local = loadLocal(STORAGE_CFG) || [];
  const seed = await loadSeedConfigs();
  // ensure unique ids: local may include clones; seed keep original ids
  return local.concat(seed);
}

/* ---------------- render index (config list with search/filter/pagination) ---------------- */
async function renderIndexUI(){
  const listArea = elem('listArea') || elem('configList') || elem('listContainer');
  const searchInput = elem('searchInput') || elem('searchBox');
  const filterBtns = document.querySelectorAll('.filter-btn');
  if(!listArea) return;

  let all = await getAllConfigs();

  // pagination state
  let page = 1, perPage = 8;
  function getFiltered(){
    const q = (searchInput && searchInput.value.trim().toLowerCase()) || '';
    let arr = all.slice();
    // filter by active filter button
    let active = document.querySelector('.filter-btn.active');
    if(active && active.dataset && active.dataset.filter && active.dataset.filter !== 'all'){
      arr = arr.filter(it => (it.type||'other') === active.dataset.filter);
    }
    if(q) arr = arr.filter(it => (it.title||'').toLowerCase().includes(q) || (it.text||'').toLowerCase().includes(q));
    return arr;
  }

  function render(){
    const arr = getFiltered();
    const total = arr.length;
    const totalPages = Math.max(1, Math.ceil(total / perPage));
    if(page > totalPages) page = totalPages;
    const start = (page-1)*perPage, end = start + perPage;
    const pageItems = arr.slice(start,end);

    listArea.innerHTML = '';
    if(pageItems.length === 0){
      listArea.innerHTML = `<div class="empty">هیچ کانفیگی یافت نشد.</div>`;
      renderPagination(totalPages);
      return;
    }

    pageItems.forEach(cfg => {
      const card = el('article','card');
      // meta
      const meta = el('div','meta');
      const t = el('div','title', escapeHtml(cfg.title || 'بدون عنوان'));
      const time = el('div','time', formatDate(cfg.createdAt || cfg.date || nowISO()));
      meta.appendChild(t); meta.appendChild(time);
      card.appendChild(meta);

      // badge
      if(cfg.type) card.appendChild( el('div','badge', escapeHtml(cfg.type)) );

      // text pre
      if(cfg.text) {
        const pre = el('pre','','');
        pre.textContent = cfg.text;
        card.appendChild(pre);
      }

      // files
      if(cfg.files && Array.isArray(cfg.files) && cfg.files.length){
        cfg.files.forEach(f=>{
          if(f.type && f.type.startsWith('image')){
            const img = el('img','thumb'); img.src = f.dataUrl || f.url; img.alt = f.name || '';
            card.appendChild(img);
          } else if(f.type && f.type.startsWith('video')){
            const v = el('video','thumb'); v.src = f.dataUrl || f.url; v.controls = true;
            card.appendChild(v);
          }
        });
      }

      // actions
      const actions = el('div','actions');
      const copyBtn = el('button','action-btn','📋 کپی'); copyBtn.onclick = ()=> { copyToClipboard(cfg.text || (cfg.files && cfg.files[0] && (cfg.files[0].dataUrl||cfg.files[0].url)) || ''); };
      actions.appendChild(copyBtn);

      // download (file or text)
      const dlBtn = el('button','action-btn','⬇️ دانلود');
      dlBtn.onclick = ()=>{
        if(cfg.files && cfg.files.length){
          const f = cfg.files[0];
          if(f.dataUrl) downloadDataUrlFile(f.dataUrl, f.name || (sanitizeFilename(cfg.title||'file')));
          else if(f.url) window.open(f.url,'_blank');
        } else if(cfg.text && cfg.text.trim()){
          downloadFile(sanitizeFilename(cfg.title||'config') + '.txt', cfg.text);
        } else {
          toast('فایلی برای دانلود وجود ندارد');
        }
      };
      actions.appendChild(dlBtn);

      // share
      const shareBtn = el('button','action-btn','📲 اشتراک');
      shareBtn.onclick = ()=> shareFallback(cfg.title || 'کانفیگ', cfg.text || '');
      actions.appendChild(shareBtn);

      // admin edit/delete
      if(sessionStorage.getItem(STORAGE_ADMIN) === '1'){
        const editBtn = el('button','action-btn','✏️ ویرایش');
        editBtn.onclick = ()=> { localStorage.setItem('rlax_edit_target', JSON.stringify({id: cfg.id})); location.href = 'add-config.html'; };
        actions.appendChild(editBtn);

        const delBtn = el('button','action-btn warn','حذف');
        delBtn.onclick = ()=>{
          if(!confirm('آیا حذف شود؟')) return;
          let arrLocal = loadLocal(STORAGE_CFG);
          arrLocal = arrLocal.filter(x => x.id !== cfg.id);
          saveLocal(STORAGE_CFG, arrLocal);
          toast('حذف شد');
          all = all.filter(x => x.id !== cfg.id);
          render();
        };
        actions.appendChild(delBtn);
      }

      card.appendChild(actions);
      listArea.appendChild(card);
    });

    renderPagination(Math.max(1, Math.ceil(getFiltered().length / perPage)));
  }

  // pagination controls
  function renderPagination(totalPages){
    let pgWrap = elem('pagination');
    if(!pgWrap){
      pgWrap = el('div','pagin'); pgWrap.id='pagination';
      listArea.parentNode.appendChild(pgWrap);
    }
    pgWrap.innerHTML = '';
    const info = el('div','small',`صفحه ${page} از ${totalPages}`);
    pgWrap.appendChild(info);
    const nav = el('div','row');
    const prev = el('button','action-btn small','قبلی'); prev.onclick = ()=>{ if(page>1) page--; render(); };
    const next = el('button','action-btn small','بعدی'); next.onclick = ()=>{ if(page<totalPages) page++; render(); };
    nav.appendChild(prev); nav.appendChild(next);
    pgWrap.appendChild(nav);
  }

  // filters
  filterBtns.forEach(b=>{
    b.addEventListener('click', ()=>{
      filterBtns.forEach(x=>x.classList.remove('active'));
      b.classList.add('active');
      page = 1;
      render();
    });
  });

  if(searchInput) searchInput.addEventListener('input', ()=> { page=1; render(); });

  // initial render
  render();
}

/* ---------------- helper: download dataURL as file ---------------- */
function downloadDataUrlFile(dataUrl, filename){
  try {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = sanitizeFilename(filename || 'file');
    document.body.appendChild(a);
    a.click();
    a.remove();
  } catch(e){ console.error(e); toast('دانلود ناموفق'); }
}

/* ---------------- admin login / guard ---------------- */
function setupLoginPage(){
  const btn = elem('loginBtn') || elem('doLogin');
  if(!btn) return;
  btn.addEventListener('click', ()=>{
    const pass = (elem('adminPassword') && elem('adminPassword').value) || '';
    if(pass === ADMIN_PASS){
      sessionStorage.setItem(STORAGE_ADMIN, '1');
      toast('ورود موفق');
      // redirect to ads page or dashboard
      location.href = 'ads.html';
    } else {
      toast('رمز اشتباه است');
      if(elem('loginMsg')) elem('loginMsg').textContent = 'رمز اشتباه است';
    }
  });
}
function requireAdminOnPages(){
  const adminPages = ['ads.html','add-config.html','configs.html','manage.html'];
  const href = location.href.split('/').pop();
  if(adminPages.includes(href)){
    if(sessionStorage.getItem(STORAGE_ADMIN) !== '1'){
      alert('ابتدا وارد شوید');
      location.href = 'login.html';
    }
  }
}

/* ---------------- manage: add/edit/delete configs (separate pages) ---------------- */
function setupAddConfigPage(){
  const addBtn = elem('addCfgBtn');
  if(!addBtn) return;
  // if edit target present, populate
  const editRaw = localStorage.getItem('rlax_edit_target');
  if(editRaw){
    try {
      const target = JSON.parse(editRaw);
      if(target && target.id){
        const arr = loadLocal(STORAGE_CFG);
        const item = arr.find(x=>x.id === target.id);
        if(item){
          if(elem('cfgTitle')) elem('cfgTitle').value = item.title || '';
          if(elem('cfgType')) elem('cfgType').value = item.type || 'other';
          if(elem('cfgText')) elem('cfgText').value = item.text || '';
          addBtn.textContent = 'ویرایش کانفیگ';
        }
      }
    } catch(e){}
  }

  addBtn.addEventListener('click', async ()=>{
    const title = (elem('cfgTitle') && elem('cfgTitle').value.trim()) || '';
    const type = (elem('cfgType') && elem('cfgType').value) || 'other';
    const text = (elem('cfgText') && elem('cfgText').value) || '';
    const fileInput = elem('cfgFile');
    const files = [];

    if(title.length < 2){ return toast('عنوان معتبر وارد کنید'); }

    if(fileInput && fileInput.files && fileInput.files.length){
      for(let f of fileInput.files){
        try {
          const dataUrl = await fileToDataUrl(f);
          files.push({ name: f.name, type: f.type, dataUrl });
        } catch(e){ console.warn('file read err', e); }
      }
    }

    // if editing
    const editRawNow = localStorage.getItem('rlax_edit_target');
    if(editRawNow){
      try {
        const target = JSON.parse(editRawNow);
        let arr = loadLocal(STORAGE_CFG);
        const ix = arr.findIndex(x => x.id === target.id);
        if(ix !== -1){
          arr[ix].title = title; arr[ix].type = type; arr[ix].text = text;
          if(files.length) arr[ix].files = files;
          arr[ix].updatedAt = nowISO();
          saveLocal(STORAGE_CFG, arr);
          localStorage.removeItem('rlax_edit_target');
          toast('ویرایش انجام شد');
          setTimeout(()=> location.href = 'configs.html', 700);
          return;
        }
      } catch(e){ console.warn(e); }
    }

    // create
    const entry = { id: uid(), title, type, text, files, createdAt: nowISO() };
    const arr = loadLocal(STORAGE_CFG);
    arr.unshift(entry);
    saveLocal(STORAGE_CFG, arr);
    toast('کانفیگ ذخیره شد');
    // reset
    if(elem('cfgTitle')) elem('cfgTitle').value = '';
    if(elem('cfgText')) elem('cfgText').value = '';
    if(elem('cfgFile')) elem('cfgFile').value = '';
  });
}

/* ---------------- configs list page (manage) ---------------- */
function setupConfigsPage(){
  const wrap = elem('cfgList');
  if(!wrap) return;
  function render(){
    const arr = loadLocal(STORAGE_CFG);
    wrap.innerHTML = '';
    if(arr.length === 0) return wrap.appendChild( el('div','empty','هیچ کانفیگی ثبت نشده.') );
    arr.forEach((cfg, idx)=>{
      const card = el('div','card');
      card.innerHTML = `<div style="display:flex;justify-content:space-between;gap:8px"><div><strong>${escapeHtml(cfg.title)}</strong><div class="small">${escapeHtml(cfg.type)}</div></div>
        <div style="display:flex;gap:8px"><button class="action-btn edit">✏️ ویرایش</button><button class="action-btn warn del">حذف</button></div></div>
        <div class="small" style="margin-top:8px">آپلود: ${formatDate(cfg.createdAt)}</div>`;
      // attach handlers
      card.querySelector('.edit').addEventListener('click', ()=>{
        localStorage.setItem('rlax_edit_target', JSON.stringify({id: cfg.id}));
        toast('آماده ویرایش'); setTimeout(()=> location.href='add-config.html', 300);
      });
      card.querySelector('.del').addEventListener('click', ()=>{
        if(!confirm('آیا حذف شود؟')) return;
        let arr = loadLocal(STORAGE_CFG); arr = arr.filter(x=> x.id !== cfg.id); saveLocal(STORAGE_CFG, arr); render(); toast('حذف شد');
      });
      wrap.appendChild(card);
    });
  }
  render();
}

/* ---------------- ads management (add/list) ---------------- */
function setupAdsPage(){
  const addBtn = elem('addAdBtn');
  if(!addBtn) return;
  addBtn.addEventListener('click', async ()=>{
    const fileInput = elem('adFile');
    const caption = (elem('adCaption') && elem('adCaption').value.trim()) || '';
    if(!fileInput || !fileInput.files || !fileInput.files.length) return toast('یک فایل انتخاب کنید');
    const f = fileInput.files[0];
    if(!f.type.startsWith('image') && !f.type.startsWith('video')) return toast('فایل باید تصویر یا ویدئو باشد');
    const dataUrl = await fileToDataUrl(f);
    const ad = { id: uid(), caption, type: f.type.startsWith('video') ? 'video' : 'image', dataUrl, delaySec:15, createdAt: nowISO() };
    const ads = loadLocal(STORAGE_ADS); ads.unshift(ad); saveLocal(STORAGE_ADS, ads);
    toast('تبلیغ ذخیره شد'); if(elem('adCaption')) elem('adCaption').value=''; if(elem('adFile')) elem('adFile').value='';
    renderAdsList();
  });
  renderAdsList();
}
function renderAdsList(){
  const wrap = elem('adsList');
  if(!wrap) return;
  const arr = loadLocal(STORAGE_ADS);
  wrap.innerHTML = '';
  if(arr.length === 0) return wrap.appendChild( el('div','empty','هیچ تبلیغاتی وجود ندارد') );
  arr.forEach(ad=>{
    const c = el('div','card');
    c.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center"><div><strong>${escapeHtml(ad.caption||'(بدون کپشن)')}</strong><div class="small">${escapeHtml(ad.type)} • ${formatDate(ad.createdAt)}</div></div>
      <div style="display:flex;gap:8px"><button class="action-btn delAd">حذف</button></div></div>`;
    if(ad.type==='image') c.innerHTML += `<img src="${ad.dataUrl}" style="width:100%;margin-top:8px;border-radius:10px">`; else c.innerHTML += `<video src="${ad.dataUrl}" controls style="width:100%;margin-top:8px;border-radius:10px"></video>`;
    wrap.appendChild(c);
    c.querySelector('.delAd').addEventListener('click', ()=>{
      if(!confirm('آیا حذف شود؟')) return;
      let arr2 = loadLocal(STORAGE_ADS); arr2 = arr2.filter(x=> x.id !== ad.id); saveLocal(STORAGE_ADS, arr2); renderAdsList(); toast('حذف شد');
    });
  });
}

/* ---------------- show ad overlay on index ---------------- */
function setupAdOverlayOnIndex(){
  const list = loadLocal(STORAGE_ADS);
  if(!list || list.length === 0) return;
  const ad = list[0];
  const overlay = el('div','ad-overlay');
  const card = el('div','ad-card');
  const closeBtn = el('div','ad-close','×');
  const timerEl = el('div','ad-timer', (ad.delaySec || 15) + 's');
  card.appendChild(closeBtn); card.appendChild(timerEl);
  if(ad.type==='image'){ const img = el('img','ad-media'); img.src = ad.dataUrl; card.appendChild(img); } else { const v = el('video','ad-media'); v.src = ad.dataUrl; v.controls = true; card.appendChild(v); }
  const caption = el('div','ad-caption', ad.caption || '');
  card.appendChild(caption); overlay.appendChild(card); document.body.appendChild(overlay);
  closeBtn.style.display = 'none';
  let remaining = parseInt(ad.delaySec || 15);
  timerEl.textContent = remaining + 's';
  const iv = setInterval(()=>{ remaining--; if(remaining<=0){ clearInterval(iv); timerEl.style.display='none'; closeBtn.style.display='block'; closeBtn.addEventListener('click', ()=> overlay.remove()); } else timerEl.textContent = remaining + 's'; }, 1000);
  setTimeout(()=>{ if(document.body.contains(overlay)) overlay.remove(); }, (ad.delaySec + 60)*1000);
}

/* ---------------- export/import configs (backup) ---------------- */
function exportConfigs(){
  const arr = loadLocal(STORAGE_CFG);
  const content = JSON.stringify({ exportedAt: nowISO(), configs: arr }, null, 2);
  downloadFile('rlax_configs_backup.json', content, 'application/json');
}
function importConfigs(file){
  if(!file) return toast('فایلی انتخاب نشده');
  const r = new FileReader();
  r.onload = (e)=>{
    try {
      const json = JSON.parse(e.target.result);
      if(Array.isArray(json.configs)) {
        saveLocal(STORAGE_CFG, json.configs);
        toast('درون‌ریزی انجام شد');
      } else toast('فرمت فایل اشتباه است');
    } catch(e){ toast('خواندن فایل با خطا مواجه شد'); }
  };
  r.readAsText(file);
}

/* ---------------- menu/fab logic ---------------- */
function setupFabMenu(){
  const fab = document.querySelector('.fab');
  const menu = document.querySelector('.fab-menu');
  if(!fab || !menu) return;
  fab.addEventListener('click', (e)=>{ e.stopPropagation(); menu.style.display = (menu.style.display === 'block') ? 'none' : 'block'; });
  document.addEventListener('click', ()=>{ if(menu) menu.style.display='none'; });
}

/* ---------------- global helpers for escape HTML ---------------- */
function escapeHtml(s){
  if(s===undefined || s===null) return '';
  return String(s).replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}

/* ---------------- misc: pagination helper (not heavy virtualization) ---------------- */
/* omitted heavy virtualization for simplicity; implemented in renderIndexUI */

/* ---------------- init on DOMContentLoaded ---------------- */
document.addEventListener('DOMContentLoaded', ()=>{

  // setup ui menus
  setupFabMenu();
  // setup login guard
  setupLoginPage();
  requireAdminOnPages();

  // wire pages
  renderIndexUI();     // index (if present)
  setupAddConfigPage(); // add-config (if present)
  setupConfigsPage();   // configs list (if present)
  setupAdsPage();       // ads page (if present)
  setupAdOverlayOnIndex(); // show ad overlay on index if exists

  // helper bindings for export/import buttons (if present)
  const expBtn = elem('exportCfgBtn');
  if(expBtn) expBtn.addEventListener('click', exportConfigs);
  const impEl = elem('importCfgInput');
  if(impEl) impEl.addEventListener('change', (ev)=> importConfigs(ev.target.files[0]));

  // search binding fallback
  const search = elem('searchBox') || elem('searchInput');
  if(search) search.addEventListener('input', ()=> { /* renderIndexUI handles reactive search via event listeners inside */ });

  // side menu toggle binding (admin pages)
  const menuToggle = elem('menuToggle');
  const sideMenu = elem('sideMenu');
  if(menuToggle && sideMenu){
    let menuOpen = false;
    menuToggle.addEventListener('click', ()=> {
      menuOpen = !menuOpen; sideMenu.style.right = menuOpen ? '0' : '-280px';
    });
  }
});

/* =======================================================================
   END OF script.js
   (This file intentionally long to provide robust client-side functionality)
   ======================================================================= */