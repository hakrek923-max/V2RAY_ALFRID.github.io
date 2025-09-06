/* script.js - shared logic for site
   - mobile-first
   - configs stored as combination of configs.json (read-only) + localStorage (user-added)
   - ads stored in localStorage
   - admin password client-side: Hh2ratu/(
*/

const STORAGE_CFG = 'rlax_configs_v2'; // local adds/edits stored here
const STORAGE_ADS = 'rlax_ads_v2';
const ADMIN_PASS = 'Hh2ratu/(';

/* ---------- Utilities ---------- */
function loadJSONFile(url){
  return fetch(url).then(r=> r.ok ? r.json() : []).catch(()=>[]);
}
function loadLocal(key){ try{ return JSON.parse(localStorage.getItem(key)||'[]') }catch(e){ return [] } }
function saveLocal(key,arr){ localStorage.setItem(key, JSON.stringify(arr)) }
function uid(){ return 'id_' + Date.now() + '_' + Math.random().toString(36).slice(2,8) }
function formatDate(iso){
  try{
    const d = new Date(iso);
    return d.toLocaleString('fa-IR',{year:'numeric',month:'2-digit',day:'2-digit'}) + ' - ' +
           d.toLocaleTimeString('fa-IR',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
  }catch(e){ return iso }
}
function fileToDataUrl(file){ return new Promise((res,rej)=>{ const r=new FileReader(); r.onload=()=>res(r.result); r.onerror=rej; r.readAsDataURL(file); }) }
function escapeHtml(s){ if(!s) return ''; return String(s).replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
function sanitizeFilename(s){ return (s||'file').replace(/[^\w\-\.\u0600-\u06FF]/g,'_').slice(0,120) }

/* tiny toast */
function toast(msg){
  const el = document.createElement('div');
  el.textContent = msg;
  el.style.cssText = 'position:fixed;left:50%;top:18%;transform:translateX(-50%);background:#063454;color:#fff;padding:8px 12px;border-radius:8px;z-index:2200;box-shadow:0 8px 24px rgba(6,52,84,0.2)';
  document.body.appendChild(el);
  setTimeout(()=>el.remove(),1400);
}

/* fallback copy */
function fallbackCopy(text){
  const ta=document.createElement('textarea'); ta.value=text; document.body.appendChild(ta); ta.select();
  try{ document.execCommand('copy'); toast('کپی شد (fallback)') }catch(e){ alert('کپی ناموفق') }
  ta.remove();
}

/* ---------- INDEX: render configs (configs.json + local) ---------- */
async function renderIndex(){
  const listArea = document.getElementById('listArea');
  const emptyNote = document.getElementById('emptyNote');
  const searchInput = document.getElementById('searchInput');
  if(!listArea) return;

  // combine initial JSON + local storage entries
  const base = await loadJSONFile('configs.json').catch(()=>[]);
  const local = loadLocal(STORAGE_CFG);
  // ensure newest first: local then base
  let data = local.concat(base);

  let currentFilter = 'all';
  const filterBtns = document.querySelectorAll('.filter-btn');
  filterBtns.forEach(b=>{
    b.addEventListener('click', ()=> {
      filterBtns.forEach(x=>x.classList.remove('active')); b.classList.add('active');
      currentFilter = b.dataset.filter || 'all';
      doRender();
    });
  });
  if(searchInput) searchInput.addEventListener('input', ()=> doRender());

  function doRender(){
    const q = (searchInput && searchInput.value.trim().toLowerCase()) || '';
    let shown = data.slice();
    if(currentFilter !== 'all') shown = shown.filter(it => (it.type||'other') === currentFilter);
    if(q) shown = shown.filter(it => (it.title||'').toLowerCase().includes(q) || (it.text||'').toLowerCase().includes(q));
    listArea.innerHTML = '';
    if(shown.length === 0){ emptyNote.style.display = 'block'; return; } else emptyNote.style.display = 'none';

    shown.forEach(cfg => {
      const card = document.createElement('article'); card.className = 'card';
      const meta = document.createElement('div'); meta.className = 'meta';
      const t = document.createElement('div'); t.className = 'title'; t.innerHTML = escapeHtml(cfg.title || 'بدون عنوان');
      const time = document.createElement('div'); time.className='time'; time.textContent = formatDate(cfg.createdAt || cfg.date || new Date().toISOString());
      meta.appendChild(t); meta.appendChild(time);
      card.appendChild(meta);
      if(cfg.type){
        const typeDiv = document.createElement('div'); typeDiv.className='badge'; typeDiv.textContent = cfg.type; card.appendChild(typeDiv);
      }
      if(cfg.text){
        const pre = document.createElement('pre'); pre.textContent = cfg.text; card.appendChild(pre);
      }
      if(cfg.files && cfg.files.length){
        cfg.files.forEach(f=>{
          if(f.type && f.type.startsWith('image/')){
            const img = document.createElement('img'); img.className='thumb'; img.src = f.dataUrl || f.url; img.alt = f.name; card.appendChild(img);
          } else if(f.type && f.type.startsWith('video/')){
            const v = document.createElement('video'); v.className='thumb'; v.src = f.dataUrl || f.url; v.controls = true; card.appendChild(v);
          }
        });
      }

      const actions = document.createElement('div'); actions.className='actions';
      // copy
      const copyBtn = document.createElement('button'); copyBtn.className='action-btn'; copyBtn.textContent='📋 کپی';
      copyBtn.addEventListener('click', async ()=> {
        const toCopy = cfg.text && cfg.text.trim() ? cfg.text : (cfg.files && cfg.files[0] ? (cfg.files[0].dataUrl || cfg.files[0].url) : '');
        if(!toCopy) return alert('محتوایی برای کپی وجود ندارد'); 
        try{ await navigator.clipboard.writeText(toCopy); toast('کپی شد'); }catch(e){ fallbackCopy(toCopy); }
      });
      actions.appendChild(copyBtn);

      // download
      if(cfg.files && cfg.files.length){
        const dlBtn = document.createElement('button'); dlBtn.className='action-btn'; dlBtn.textContent='⬇️ دانلود';
        dlBtn.addEventListener('click', ()=> {
          const f = cfg.files[0];
          const a = document.createElement('a'); a.href = f.dataUrl || f.url; a.download = f.name || 'file'; a.click();
        });
        actions.appendChild(dlBtn);
      } else if(cfg.text && cfg.text.trim()){
        const dlBtn = document.createElement('button'); dlBtn.className='action-btn'; dlBtn.textContent='⬇️ دانلود';
        dlBtn.addEventListener('click', ()=> {
          const blob = new Blob([cfg.text], {type:'text/plain;charset=utf-8'});
          const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = sanitizeFilename(cfg.title||'config') + '.txt'; a.click(); URL.revokeObjectURL(a.href);
        });
        actions.appendChild(dlBtn);
      }

      // share
      const shareBtn = document.createElement('button'); shareBtn.className='action-btn'; shareBtn.textContent='📲 اشتراک';
      shareBtn.addEventListener('click', async ()=>{
        const txt = cfg.text && cfg.text.trim() ? cfg.text : (cfg.files && cfg.files[0] ? (cfg.files[0].dataUrl || cfg.files[0].url) : '');
        if(!txt) return alert('محتوایی برای اشتراک وجود ندارد');
        if(navigator.share){
          try{ await navigator.share({ title: cfg.title, text: cfg.text || cfg.files[0].name }); }catch(e){}
        } else {
          try{ await navigator.clipboard.writeText(cfg.text || cfg.files[0].dataUrl || cfg.files[0].url); toast('متن کپی شد؛ حالا اشتراک بگذار'); }catch(e){ fallbackCopy(cfg.text || cfg.files[0].dataUrl || cfg.files[0].url) }
        }
      });
      actions.appendChild(shareBtn);

      // admin edit/delete (if session)
      const isAdmin = sessionStorage.getItem('rlax_admin') === '1';
      if(isAdmin){
        const editBtn = document.createElement('button'); editBtn.className='action-btn'; editBtn.textContent='✏️ ویرایش';
        editBtn.addEventListener('click', ()=> {
          localStorage.setItem('rlax_edit_target', JSON.stringify({ id: cfg.id }));
          location.href = 'manage.html';
        });
        actions.appendChild(editBtn);

        const delBtn = document.createElement('button'); delBtn.className='action-btn warn'; delBtn.textContent='حذف';
        delBtn.addEventListener('click', ()=>{
          if(!confirm('آیا حذف شود؟')) return;
          // remove from local storage only (we cannot remove from configs.json)
          let arr = loadLocal(STORAGE_CFG);
          arr = arr.filter(x => x.id !== cfg.id);
          saveLocal(STORAGE_CFG, arr);
          toast('حذف شد');
          doRender();
        });
        actions.appendChild(delBtn);
      }

      card.appendChild(actions);
      listArea.appendChild(card);
    });
  } // doRender

  doRender();
}

/* ---------- MANAGE: login, add/edit/delete configs, ads ---------- */
function setupManage(){
  const loginBtn = document.getElementById('loginBtn');
  if(!loginBtn) return; // not on manage page
  const adminPassword = document.getElementById('adminPassword');
  const loginMsg = document.getElementById('loginMsg');
  const loginArea = document.getElementById('loginArea');
  const dashboard = document.getElementById('dashboard');

  function setLogged(on){
    if(on){
      sessionStorage.setItem('rlax_admin','1');
      loginArea.style.display='none';
      dashboard.style.display='flex';
      // show ads section by default
      showSection('ads');
      renderManageLists();
    } else {
      sessionStorage.removeItem('rlax_admin');
      loginArea.style.display='block';
      dashboard.style.display='none';
    }
  }
  const already = sessionStorage.getItem('rlax_admin') === '1';
  if(already) setLogged(true);

  loginBtn.addEventListener('click', ()=> {
    if(adminPassword.value === ADMIN_PASS){
      setLogged(true); adminPassword.value=''; loginMsg.textContent=''; toast('ورود موفق');
    } else {
      loginMsg.textContent = 'رمز اشتباه است';
    }
  });

  // logout
  const logoutBtn = document.getElementById('logoutBtn');
  logoutBtn.addEventListener('click', ()=> { setLogged(false); });

  // menu toggle
  const sideMenu = document.getElementById('sideMenu');
  const menuToggle = document.getElementById('menuToggle');
  let menuOpen = false;
  menuToggle.addEventListener('click', ()=> {
    menuOpen = !menuOpen; sideMenu.style.right = menuOpen ? '0' : '-260px';
  });

  // add/edit configs
  const cfgTitle = document.getElementById('cfgTitle');
  const cfgType = document.getElementById('cfgType');
  const cfgText = document.getElementById('cfgText');
  const cfgFile = document.getElementById('cfgFile');
  const addCfgBtn = document.getElementById('addCfgBtn');
  const clearEditor = document.getElementById('clearEditor');

  addCfgBtn.addEventListener('click', async ()=>{
    const title = (cfgTitle.value||'').trim();
    if(!title) return alert('عنوان وارد کنید');
    const type = cfgType.value || 'other';
    const text = cfgText.value || '';
    const files = [];
    if(cfgFile.files && cfgFile.files.length){
      for(let f of cfgFile.files){
        try{ const dataUrl = await fileToDataUrl(f); files.push({ name: f.name, type: f.type, dataUrl }); }catch(e){ console.error(e) }
      }
    }
    const editTarget = JSON.parse(localStorage.getItem('rlax_edit_target')||'null');
    let arr = loadLocal(STORAGE_CFG);
    if(editTarget && editTarget.id){
      const ix = arr.findIndex(x=>x.id === editTarget.id);
      if(ix !== -1){
        arr[ix].title = title; arr[ix].type = type; arr[ix].text = text;
        if(files.length) arr[ix].files = files;
        arr[ix].updatedAt = new Date().toISOString();
        saveLocal(STORAGE_CFG, arr); localStorage.removeItem('rlax_edit_target'); toast('ویرایش شد');
      } else { alert('هدف ویرایش پیدا نشد') }
    } else {
      const entry = { id: uid(), title, type, text, files, createdAt: new Date().toISOString() };
      arr.unshift(entry); saveLocal(STORAGE_CFG, arr); toast('کانفیگ ذخیره شد');
    }
    cfgTitle.value=''; cfgText.value=''; cfgFile.value=''; cfgType.value='';
    renderManageLists();
    if(typeof window.renderIndex === 'function') window.renderIndex();
  });

  clearEditor.addEventListener('click', ()=>{ cfgTitle.value=''; cfgText.value=''; cfgFile.value=''; cfgType.value=''; localStorage.removeItem('rlax_edit_target'); });

  /* Ads management */
  const adFile = document.getElementById('adFile');
  const adCaption = document.getElementById('adCaption');
  const addAdBtn = document.getElementById('addAdBtn');

  addAdBtn.addEventListener('click', async ()=>{
    if(!adFile.files || !adFile.files.length) return alert('فایل انتخاب نشده');
    const f = adFile.files[0];
    if(!f.type.startsWith('image') && !f.type.startsWith('video')) return alert('نوع فایل نامعتبر است');
    const dataUrl = await fileToDataUrl(f);
    const ad = { id: uid(), caption: adCaption.value||'', type: f.type.startsWith('video') ? 'video' : 'image', dataUrl, delaySec:15, createdAt: new Date().toISOString() };
    const ads = loadLocal(STORAGE_ADS);
    ads.unshift(ad); saveLocal(STORAGE_ADS, ads); toast('تبلیغ اضافه شد');
    adFile.value=''; adCaption.value='';
    renderManageLists();
  });

  // render lists (configs + ads) inside manage page
  function renderManageLists(){
    const cfgWrapper = document.getElementById('cfgList');
    const adsWrapper = document.getElementById('adsList');
    if(cfgWrapper){
      const arr = loadLocal(STORAGE_CFG);
      cfgWrapper.innerHTML = '';
      if(arr.length===0) cfgWrapper.innerHTML = '<div class="empty">هیچ کانفیگی ثبت نشده.</div>';
      else {
        arr.forEach(item=>{
          const card = document.createElement('div'); card.className='card';
          card.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><div><strong>${escapeHtml(item.title)}</strong><div class="small">${escapeHtml(item.type)}</div></div>
            <div style="display:flex;gap:8px"><button class="action-btn edit">ویرایش</button><button class="action-btn warn del">حذف</button></div></div>
            <div class="small" style="margin-top:8px">آپلود: ${formatDate(item.createdAt)}</div>`;
          cfgWrapper.appendChild(card);
          card.querySelector('.edit').addEventListener('click', ()=> {
            document.getElementById('cfgTitle').value = item.title || '';
            document.getElementById('cfgType').value = item.type || 'other';
            document.getElementById('cfgText').value = item.text || '';
            localStorage.setItem('rlax_edit_target', JSON.stringify({ id: item.id }));
            toast('مقدار در فرم ویرایش لود شد');
            window.scrollTo({top:0,behavior:'smooth'});
          });
          card.querySelector('.del').addEventListener('click', ()=> {
            if(!confirm('آیا حذف شود؟')) return;
            let arr2 = loadLocal(STORAGE_CFG); arr2 = arr2.filter(x=>x.id !== item.id); saveLocal(STORAGE_CFG, arr2); renderManageLists(); toast('حذف شد');
            if(typeof window.renderIndex === 'function') window.renderIndex();
          });
        });
      }
    }
    if(adsWrapper){
      const arr = loadLocal(STORAGE_ADS);
      adsWrapper.innerHTML = '';
      if(arr.length===0) adsWrapper.innerHTML = '<div class="empty">تبلیغی ثبت نشده.</div>';
      else {
        arr.forEach((ad, i)=>{
          const c = document.createElement('div'); c.className='card';
          c.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center"><div><strong>${escapeHtml(ad.caption||'(بدون کپشن)')}</strong><div class="small">${escapeHtml(ad.type)} • ${formatDate(ad.createdAt)}</div></div>
            <div style="display:flex;gap:8px"><button class="action-btn delAd" style="color:#ef4444">حذف</button></div></div>`;
          if(ad.type === 'image') c.innerHTML += `<img src="${ad.dataUrl}" style="width:100%;margin-top:8px;border-radius:8px">`;
          else c.innerHTML += `<video src="${ad.dataUrl}" controls style="width:100%;margin-top:8px;border-radius:8px"></video>`;
          adsWrapper.appendChild(c);
          c.querySelector('.delAd').addEventListener('click', ()=> {
            if(!confirm('حذف شود؟')) return;
            let arr2 = loadLocal(STORAGE_ADS); arr2 = arr2.filter(x=>x.id !== ad.id); saveLocal(STORAGE_ADS, arr2); renderManageLists(); toast('حذف شد');
          });
        });
      }
    }
  }

  // if manage page loaded with edit target from index, populate
  const editTarget = JSON.parse(localStorage.getItem('rlax_edit_target')||'null');
  if(editTarget && editTarget.id){
    const arr = loadLocal(STORAGE_CFG); const item = arr.find(x=>x.id === editTarget.id);
    if(item){
      document.getElementById('cfgTitle').value = item.title || '';
      document.getElementById('cfgType').value = item.type || 'other';
      document.getElementById('cfgText').value = item.text || '';
      toast('کانفیگ بارگذاری شد برای ویرایش');
    }
  }

  renderManageLists();
}

/* ---------- Ads on index: show with timer and close button after delay ---------- */
function setupAdsOnIndex(){
  const ads = loadLocal(STORAGE_ADS);
  if(!ads || ads.length === 0) return;
  const ad = ads[0]; // show first
  const overlay = document.createElement('div'); overlay.className = 'ad-overlay';
  const card = document.createElement('div'); card.className = 'ad-card';
  const closeBtn = document.createElement('div'); closeBtn.className = 'ad-close'; closeBtn.textContent = '×';
  const timerEl = document.createElement('div'); timerEl.className = 'ad-timer'; timerEl.textContent = (ad.delaySec || 15) + 's';
  card.appendChild(closeBtn); card.appendChild(timerEl);
  if(ad.type === 'image') {
    const img = document.createElement('img'); img.className='ad-media'; img.src = ad.dataUrl; card.appendChild(img);
  } else {
    const vid = document.createElement('video'); vid.className='ad-media'; vid.src = ad.dataUrl; vid.controls = true; card.appendChild(vid);
  }
  const caption = document.createElement('div'); caption.className='ad-caption'; caption.textContent = ad.caption || '';
  card.appendChild(caption);
  overlay.appendChild(card);
  document.body.appendChild(overlay);

  let remaining = parseInt(ad.delaySec || 15);
  closeBtn.style.display = 'none';
  timerEl.textContent = remaining + 's';
  const iv = setInterval(()=> {
    remaining--;
    if(remaining <= 0){
      clearInterval(iv);
      timerEl.style.display = 'none';
      closeBtn.style.display = 'block';
      closeBtn.addEventListener('click', ()=> overlay.remove());
    } else {
      timerEl.textContent = remaining + 's';
    }
  }, 1000);

  // auto remove after extended time to avoid stuck
  setTimeout(()=>{ if(document.body.contains(overlay)) overlay.remove(); }, (ad.delaySec + 60) * 1000);
}

/* ---------- FAB menu global ---------- */
function setupFab(){
  const fab = document.querySelector('.fab');
  const menu = document.querySelector('.fab-menu');
  if(!fab) return;
  fab.addEventListener('click', (e)=>{ e.stopPropagation(); if(menu){ menu.style.display = (menu.style.display === 'block' ? 'none' : 'block'); } });
  document.addEventListener('click', ()=>{ if(menu) menu.style.display = 'none'; });
  if(menu) menu.style.display = 'none';
}

/* ---------- Init on DOMContentLoaded ---------- */
document.addEventListener('DOMContentLoaded', ()=>{
  setupFab();
  renderIndex();
  setupManage();
  // show ads on index only
  if(document.getElementById('listArea')) { setupAdsOnIndex(); }
});
