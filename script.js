/* script.js - shared logic (index/manage/about/contact)
   - mobile-first
   - storage model in localStorage:
     configs: [{id,title,type,text,files:[{name,type,dataUrl}],createdAt}]
     ads: [{id,caption,type:'image'|'video',dataUrl,delaySec,createdAt}]
   - ADMIN_PASS same as before
*/

const STORAGE_CFG = 'rlax_configs_v2';
const STORAGE_ADS = 'rlax_ads_v2';
const ADMIN_PASS = 'Hh2ratu/(';

/* ---------- Utilities ---------- */
function loadJSON(key){ try{ return JSON.parse(localStorage.getItem(key) || '[]')}catch(e){return[]} }
function saveJSON(key,arr){ localStorage.setItem(key, JSON.stringify(arr)) }
function uid(){ return 'id_' + Date.now() + '_' + Math.random().toString(36).slice(2,8) }
function formatDate(iso){
  try{
    const d = new Date(iso);
    return d.toLocaleString('fa-IR',{year:'numeric',month:'2-digit',day:'2-digit'}) + ' - ' +
           d.toLocaleTimeString('fa-IR',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
  }catch(e){ return iso }
}
function fileToDataUrl(file){ return new Promise((res,rej)=>{ const r=new FileReader(); r.onload=()=>res(r.result); r.onerror=rej; r.readAsDataURL(file); }) }
function escapeHtml(s){ if(!s) return ''; return String(s).replace(/[&<>"']/g, m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[m]) }
function sanitizeFilename(s){ return (s||'file').replace(/[^\w\-\.\u0600-\u06FF]/g,'_').slice(0,120) }

/* ---------- Toast (simple) ---------- */
function toast(msg){
  const el = document.createElement('div');
  el.textContent = msg;
  el.style.cssText = 'position:fixed;left:50%;top:18%;transform:translateX(-50%);background:#063454;color:#fff;padding:8px 12px;border-radius:8px;z-index:2200;box-shadow:0 8px 24px rgba(6,52,84,0.2)';
  document.body.appendChild(el);
  setTimeout(()=>el.remove(),1400);
}

/* ---------- INDEX page: render configs + ads ---------- */
function renderIndex(){
  const listArea = document.getElementById('listArea');
  const emptyNote = document.getElementById('emptyNote');
  const searchInput = document.getElementById('searchInput');
  if(!listArea) return;

  let currentFilter = 'all';
  const filterBtns = document.querySelectorAll('.filter-btn');
  filterBtns.forEach(b=>{
    b.addEventListener('click', ()=> {
      filterBtns.forEach(x=>x.classList.remove('active')); b.classList.add('active');
      currentFilter = b.dataset.filter || 'all';
      render();
    });
  });

  (searchInput) && searchInput.addEventListener('input', ()=>render());

  function render(){
    const all = loadJSON(STORAGE_CFG);
    let shown = all.slice();
    const q = (searchInput && searchInput.value.trim().toLowerCase()) || '';
    if(currentFilter !== 'all') shown = shown.filter(it => (it.type||'other') === currentFilter);
    if(q) shown = shown.filter(it => (it.title||'').toLowerCase().includes(q) || (it.text||'').toLowerCase().includes(q));
    listArea.innerHTML = '';
    if(shown.length === 0){ emptyNote.style.display = 'block'; return; } else emptyNote.style.display = 'none';

    shown.forEach(cfg => {
      const card = document.createElement('article'); card.className = 'card';
      const meta = document.createElement('div'); meta.className = 'meta';
      const t = document.createElement('div'); t.className='title'; t.innerHTML = escapeHtml(cfg.title || 'بدون عنوان');
      const time = document.createElement('div'); time.className='time'; time.textContent = formatDate(cfg.createdAt);
      meta.appendChild(t); meta.appendChild(time);
      card.appendChild(meta);
      if(cfg.type) {
        const typeDiv = document.createElement('div'); typeDiv.className='badge'; typeDiv.textContent = cfg.type; card.appendChild(typeDiv);
      }
      if(cfg.text){
        const pre = document.createElement('pre'); pre.textContent = cfg.text; card.appendChild(pre);
      }
      if(cfg.files && cfg.files.length){
        cfg.files.forEach(f=>{
          if(f.type && f.type.startsWith('image/')){
            const img = document.createElement('img'); img.className='thumb'; img.src = f.dataUrl; img.alt = f.name; card.appendChild(img);
          } else if(f.type && f.type.startsWith('video/')){
            const v = document.createElement('video'); v.className='thumb'; v.src = f.dataUrl; v.controls = true; card.appendChild(v);
          } else {
            // file link shown in actions
          }
        });
      }
      const actions = document.createElement('div'); actions.className='actions';
      // copy
      const copyBtn = document.createElement('button'); copyBtn.className='action-btn'; copyBtn.textContent='📋 کپی';
      copyBtn.addEventListener('click', async ()=> {
        const toCopy = cfg.text && cfg.text.trim() ? cfg.text : (cfg.files && cfg.files[0] ? cfg.files[0].dataUrl : '');
        if(!toCopy) return alert('محتوایی برای کپی وجود ندارد'); 
        try{ await navigator.clipboard.writeText(toCopy); toast('کپی شد'); }catch(e){ fallbackCopy(toCopy); }
      });
      actions.appendChild(copyBtn);
      // download
      if(cfg.files && cfg.files.length){
        const dlBtn = document.createElement('button'); dlBtn.className='action-btn'; dlBtn.textContent='⬇️ دانلود';
        dlBtn.addEventListener('click', ()=> {
          const f = cfg.files[0];
          const a = document.createElement('a'); a.href = f.dataUrl; a.download = f.name || 'file'; a.click();
        });
        actions.appendChild(dlBtn);
      } else if(cfg.text && cfg.text.trim()){
        const dlBtn = document.createElement('button'); dlBtn.className='action-btn'; dlBtn.textContent='⬇️ دانلود';
        dlBtn.addEventListener('click', ()=>{
          const blob = new Blob([cfg.text], {type:'text/plain;charset=utf-8'});
          const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = sanitizeFilename(cfg.title||'config') + '.txt'; a.click(); URL.revokeObjectURL(a.href);
        });
        actions.appendChild(dlBtn);
      }
      // share
      const shareBtn = document.createElement('button'); shareBtn.className='action-btn'; shareBtn.textContent='📲 اشتراک';
      shareBtn.addEventListener('click', async ()=>{
        const txt = cfg.text && cfg.text.trim() ? cfg.text : (cfg.files && cfg.files[0] ? cfg.files[0].dataUrl : '');
        if(!txt) return alert('محتوایی برای اشتراک وجود ندارد');
        if(navigator.share){
          try{ await navigator.share({ title: cfg.title, text: cfg.text || cfg.files[0].name }); }catch(e){}
        } else {
          try{ await navigator.clipboard.writeText(cfg.text || cfg.files[0].dataUrl); toast('متن کپی شد؛ حالا اشتراک بگذار'); }catch(e){ fallbackCopy(cfg.text || cfg.files[0].dataUrl) }
        }
      });
      actions.appendChild(shareBtn);

      // if admin: edit/delete appear (sessionStorage flag)
      const isAdmin = sessionStorage.getItem('rlax_admin') === '1';
      if(isAdmin){
        const editBtn = document.createElement('button'); editBtn.className='action-btn'; editBtn.textContent='✏️ ویرایش';
        editBtn.addEventListener('click', ()=> {
          // open manage page in same tab and populate editor via storage-event
          localStorage.setItem('rlax_edit_target', JSON.stringify({ id: cfg.id }));
          location.href = 'manage.html';
        });
        actions.appendChild(editBtn);

        const delBtn = document.createElement('button'); delBtn.className='action-btn warn'; delBtn.textContent='حذف';
        delBtn.addEventListener('click', ()=>{
          if(!confirm('آیا می‌خواهی این کانفیگ حذف شود؟')) return;
          let arr = loadJSON(STORAGE_CFG);
          arr = arr.filter(x => x.id !== cfg.id);
          saveJSON(STORAGE_CFG, arr);
          render();
          toast('حذف شد');
        });
        actions.appendChild(delBtn);
      }

      card.appendChild(actions);
      listArea.appendChild(card);
    }); // each
  } // render

  render();

  // expose for manage page
  window.renderIndex = render;
}

/* ---------- Manage page: auth + add/edit/delete configs + manage ads ---------- */
function setupManage(){
  const loginBtn = document.getElementById('loginBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  const adminPassword = document.getElementById('adminPassword');
  const loginMsg = document.getElementById('loginMsg');
  const editor = document.getElementById('editor');
  if(!loginBtn) return;

  function setSession(val){
    if(val){ sessionStorage.setItem('rlax_admin','1'); editor.style.display='block'; loginBtn.style.display='none'; logoutBtn.style.display='inline-block'; renderManageLists(); }
    else { sessionStorage.removeItem('rlax_admin'); editor.style.display='none'; loginBtn.style.display='inline-block'; logoutBtn.style.display='none'; }
  }
  const init = sessionStorage.getItem('rlax_admin') === '1';
  setSession(init);

  loginBtn.addEventListener('click', ()=> {
    if(adminPassword.value === ADMIN_PASS){
      setSession(true); adminPassword.value=''; loginMsg.textContent=''; toast('ورود موفق');
    } else { loginMsg.textContent = 'رمز اشتباه است'; }
  });
  logoutBtn.addEventListener('click', ()=> setSession(false));

  // Editor elements
  const cfgTitle = document.getElementById('cfgTitle');
  const cfgType = document.getElementById('cfgType');
  const cfgText = document.getElementById('cfgText');
  const cfgFile = document.getElementById('cfgFile');
  const addCfgBtn = document.getElementById('addCfgBtn');
  const clearEditor = document.getElementById('clearEditor');

  // manage lists containers
  const cfgList = document.getElementById('cfgList'); // dynamic created below
  const adsList = document.getElementById('adsList'); // dynamic created below

  // add or update config
  addCfgBtn.addEventListener('click', async ()=>{
    const title = (cfgTitle.value||'').trim();
    if(!title) return alert('عنوان وارد شود');
    const type = cfgType.value || 'other';
    const text = cfgText.value || '';
    const filesArr = [];
    if(cfgFile.files && cfgFile.files.length){
      for(let f of cfgFile.files){
        try{ const dataUrl = await fileToDataUrl(f); filesArr.push({name:f.name,type:f.type,dataUrl}); }catch(e){console.error(e)}
      }
    }
    let arr = loadJSON(STORAGE_CFG);
    // check if editing target present
    const editTarget = JSON.parse(localStorage.getItem('rlax_edit_target')||'null');
    if(editTarget && editTarget.id){
      // update
      const ix = arr.findIndex(x=>x.id===editTarget.id);
      if(ix!==-1){
        arr[ix].title = title; arr[ix].type=type; arr[ix].text = text;
        if(filesArr.length) arr[ix].files = filesArr;
        arr[ix].updatedAt = new Date().toISOString();
        saveJSON(STORAGE_CFG, arr);
        localStorage.removeItem('rlax_edit_target');
        toast('ویرایش شد');
      } else { alert('هدف ویرایش پیدا نشد') }
    } else {
      const entry = { id: uid(), title, type, text, files: filesArr, createdAt: new Date().toISOString() };
      arr.unshift(entry); saveJSON(STORAGE_CFG, arr);
      toast('کانفیگ ذخیره شد');
    }
    cfgTitle.value=''; cfgText.value=''; cfgFile.value=''; cfgType.value='';
    renderManageLists();
    if(typeof window.renderIndex === 'function') window.renderIndex();
  });

  clearEditor.addEventListener('click', ()=>{ cfgTitle.value=''; cfgText.value=''; cfgFile.value=''; cfgType.value=''; localStorage.removeItem('rlax_edit_target'); });

  /* ---------- Ads management ---------- */
  // create ad editor UI dynamically inside a panel for ads (we'll assume there's a container with id adsPanel)
  const adsPanel = document.getElementById('adsPanel');
  if(adsPanel){
    adsPanel.innerHTML = `
      <h3>مدیریت تبلیغات</h3>
      <div class="panel" style="margin-top:8px">
        <input id="adCaption" class="input" placeholder="کپشن تبلیغ (اختیاری)"/>
        <select id="adType" class="input" style="margin-top:8px">
          <option value="image">تصویر</option>
          <option value="video">ویدئو</option>
        </select>
        <input id="adFile" type="file" class="input" style="margin-top:8px"/>
        <input id="adDelay" class="input" placeholder="مدت تایمر قبل از نمایش دکمه بستن (ثانیه) - مثال:15" style="margin-top:8px"/>
        <div style="display:flex;gap:8px;margin-top:8px"><button id="addAdBtn" class="btn">افزودن تبلیغ</button><button id="clearAds" class="btn">پاک کردن فرم</button></div>
        <div class="small" style="margin-top:8px;color:#6b7280">تبلیغات در صفحه اصلی نمایش داده می‌شوند. فایل‌ها در مرورگر ذخیره می‌شوند.</div>
      </div>
      <div id="adsList" style="margin-top:12px"></div>
    `;

    const addAdBtn = document.getElementById('addAdBtn');
    const adCaption = document.getElementById('adCaption');
    const adType = document.getElementById('adType');
    const adFile = document.getElementById('adFile');
    const adDelay = document.getElementById('adDelay');
    const clearAdsBtn = document.getElementById('clearAds');

    addAdBtn.addEventListener('click', async ()=>{
      if(!adFile.files || !adFile.files.length) return alert('یک فایل انتخاب کنید');
      const f = adFile.files[0];
      if(adType.value === 'image' && !f.type.startsWith('image/')) return alert('لطفاً یک تصویر انتخاب کنید');
      if(adType.value === 'video' && !f.type.startsWith('video/')) return alert('لطفاً یک ویدئو انتخاب کنید');
      const dataUrl = await fileToDataUrl(f);
      const entry = { id: uid(), caption: adCaption.value||'', type: adType.value, dataUrl, delaySec: parseInt(adDelay.value || '15') || 15, createdAt: new Date().toISOString() };
      const arr = loadJSON(STORAGE_ADS); arr.unshift(entry); saveJSON(STORAGE_ADS, arr);
      adCaption.value=''; adFile.value=''; adDelay.value=''; adType.value='image';
      renderManageLists();
      toast('تبلیغ اضافه شد');
    });

    clearAdsBtn.addEventListener('click', ()=>{ adCaption.value=''; adFile.value=''; adDelay.value=''; adType.value='image' });
  }

  /* ---------- render lists inside manage page (configs + ads) ---------- */
  function renderManageLists(){
    // render configs list
    const panelCfg = document.getElementById('cfgListWrapper');
    if(panelCfg){
      const arr = loadJSON(STORAGE_CFG);
      panelCfg.innerHTML = '<h3>لیست کانفیگ‌ها</h3>';
      if(arr.length===0){ panelCfg.innerHTML += '<div class="empty">هیچ کانفیگی وجود ندارد.</div>'; }
      else {
        arr.forEach(item=>{
          const card = document.createElement('div'); card.className='card';
          card.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><div><strong>${escapeHtml(item.title)}</strong><div class="small">${escapeHtml(item.type)}</div></div>
            <div style="display:flex;gap:8px"><button class="btn edit">ویرایش</button><button class="btn del" style="color:#ef4444">حذف</button></div></div>
            <div class="small" style="margin-top:8px">آپلود: ${formatDate(item.createdAt)}</div>`;
          panelCfg.appendChild(card);
          card.querySelector('.edit').addEventListener('click', ()=>{
            // populate editor and set edit target
            cfgTitle.value = item.title; cfgType.value = item.type; cfgText.value = item.text || '';
            localStorage.setItem('rlax_edit_target', JSON.stringify({ id: item.id }));
            window.scrollTo({top:0,behavior:'smooth'});
            toast('مقدار در فرم ویرایش لود شد. برای ثبت، دکمه ذخیره را بزنید.');
          });
          card.querySelector('.del').addEventListener('click', ()=>{
            if(!confirm('آیا حذف شود؟')) return;
            let arr2 = loadJSON(STORAGE_CFG); arr2 = arr2.filter(x=>x.id !== item.id); saveJSON(STORAGE_CFG, arr2); renderManageLists(); toast('حذف شد');
            if(typeof window.renderIndex === 'function') window.renderIndex();
          });
        });
      }
    }

    // render ads list
    const adsContainer = document.getElementById('adsList');
    if(adsContainer){
      const ads = loadJSON(STORAGE_ADS);
      adsContainer.innerHTML = '<h3>تبلیغات ثبت‌شده</h3>';
      if(ads.length===0) adsContainer.innerHTML += '<div class="empty">تبلیغی ثبت نشده.</div>';
      else {
        ads.forEach(ad=>{
          const c = document.createElement('div'); c.className='card';
          c.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center"><div><strong>${escapeHtml(ad.caption||'(بدون کپشن)')}</strong><div class="small">${escapeHtml(ad.type)} • ${formatDate(ad.createdAt)}</div></div>
            <div style="display:flex;gap:8px"><button class="btn editAd">ویرایش</button><button class="btn delAd" style="color:#ef4444">حذف</button></div></div>`;
          adsContainer.appendChild(c);
          c.querySelector('.delAd').addEventListener('click', ()=>{ if(!confirm('حذف شود؟')) return; let a = loadJSON(STORAGE_ADS); a=a.filter(x=>x.id!==ad.id); saveJSON(STORAGE_ADS,a); renderManageLists(); toast('حذف شد'); });
          c.querySelector('.editAd').addEventListener('click', ()=> {
            // load ad to ad editor (simple: set ad fields in form)
            const adCaption = document.getElementById('adCaption'); const adType = document.getElementById('adType'); const adDelay = document.getElementById('adDelay');
            adCaption.value = ad.caption || ''; adType.value = ad.type || 'image'; adDelay.value = ad.delaySec || 15;
            // put indicator for edit
            localStorage.setItem('rlax_edit_ad', JSON.stringify({ id: ad.id }));
            toast('در ادیتور بارگذاری شد. فایل جدید را اگر می‌خواهی آپلود کن و سپس ذخیره کن.');
            window.scrollTo({top:0,behavior:'smooth'});
          });
        });
      }
    }
  } // renderManageLists

  // initial call
  renderManageLists();

  // If manage page loaded with edit target from index, populate
  const editTarget = JSON.parse(localStorage.getItem('rlax_edit_target')||'null');
  if(editTarget && editTarget.id){
    // find and populate
    const arr = loadJSON(STORAGE_CFG); const item = arr.find(x=>x.id===editTarget.id);
    if(item){
      document.getElementById('cfgTitle').value = item.title || '';
      document.getElementById('cfgType').value = item.type || 'other';
      document.getElementById('cfgText').value = item.text || '';
      toast('کانفیگ برای ویرایش بارگذاری شد');
    }
  }

  // handle saving edits for ads (if editing)
  // On save (addAdBtn handler earlier), if localStorage.rlax_edit_ad exists, update instead of create
  // We'll intercept by monkey patching the earlier add ad code via checking storage in addAdBtn click; but to simplify,
  // we will replace addAdBtn listener after renderManageLists so find it again:
  const adAddBtn = document.getElementById('addAdBtn');
  const adCaptionEl = document.getElementById('adCaption');
  const adTypeEl = document.getElementById('adType');
  const adFileEl = document.getElementById('adFile');
  const adDelayEl = document.getElementById('adDelay');
  if(adAddBtn){
    adAddBtn.addEventListener('click', async ()=>{
      const editAd = JSON.parse(localStorage.getItem('rlax_edit_ad')||'null');
      if(!adFileEl.files || !adFileEl.files.length){
        // if editing and no new file, keep old dataUrl
        if(!editAd) return alert('فایل انتخاب نشده');
      }
      // upload if file provided
      let dataUrl = null; let ftype = null; let fname = null;
      if(adFileEl.files && adFileEl.files[0]){
        const f = adFileEl.files[0]; dataUrl = await fileToDataUrl(f); ftype = f.type; fname = f.name;
      }
      const arr = loadJSON(STORAGE_ADS);
      if(editAd && editAd.id){
        const idx = arr.findIndex(x=>x.id === editAd.id);
        if(idx !== -1){
          arr[idx].caption = adCaptionEl.value || '';
          arr[idx].type = adTypeEl.value || 'image';
          arr[idx].delaySec = parseInt(adDelayEl.value || '15') || 15;
          if(dataUrl){ arr[idx].dataUrl = dataUrl; }
          arr[idx].updatedAt = new Date().toISOString();
          saveJSON(STORAGE_ADS, arr);
          localStorage.removeItem('rlax_edit_ad');
          toast('تبلیغ بروزرسانی شد');
        } else { alert('تبلیغ برای ویرایش پیدا نشد'); }
      } else {
        if(!dataUrl) return alert('فایل انتخاب نشده');
        const entry = { id: uid(), caption: adCaptionEl.value||'', type: adTypeEl.value||'image', dataUrl, delaySec: parseInt(adDelayEl.value||'15')||15, createdAt: new Date().toISOString() };
        arr.unshift(entry); saveJSON(STORAGE_ADS, arr); toast('تبلیغ افزوده شد');
      }
      adCaptionEl.value=''; adFileEl.value=''; adDelayEl.value=''; adTypeEl.value='image';
      renderManageLists();
    });
  }
}

/* ---------- Ads display on index with timer & close after delay ---------- */
function setupAdsOnIndex(){
  const ads = loadJSON(STORAGE_ADS);
  if(!ads || ads.length===0) return;
  // show first ad (or random)
  const ad = ads[0];
  // build overlay
  const overlay = document.createElement('div'); overlay.className='ad-overlay';
  const card = document.createElement('div'); card.className='ad-card';
  const closeBtn = document.createElement('div'); closeBtn.className='ad-close'; closeBtn.textContent='×';
  const timerEl = document.createElement('div'); timerEl.className='ad-timer'; timerEl.textContent = ad.delaySec + 's';
  card.appendChild(closeBtn); card.appendChild(timerEl);
  if(ad.type === 'image'){
    const img = document.createElement('img'); img.className='ad-media'; img.src = ad.dataUrl; card.appendChild(img);
  } else {
    const v = document.createElement('video'); v.className='ad-media'; v.src = ad.dataUrl; v.controls = true; card.appendChild(v);
  }
  const caption = document.createElement('div'); caption.className='ad-caption'; caption.textContent = ad.caption || '';
  card.appendChild(caption);
  overlay.appendChild(card);
  document.body.appendChild(overlay);

  // disable close for delay seconds, show countdown
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

  // also auto-dismiss after a max time (delay + 60s) to prevent stuck
  setTimeout(()=>{ if(document.body.contains(overlay)) overlay.remove(); }, (ad.delaySec + 60) * 1000);
}

/* ---------- global: FAB menu setup ---------- */
function setupFabMenu(){
  const fab = document.querySelector('.fab');
  const menu = document.querySelector('.fab-menu');
  if(!fab) return;
  // ensure menu element visible toggle
  fab.addEventListener('click', (e)=>{ e.stopPropagation(); if(menu){ menu.classList.toggle('hidden'); menu.style.display = (menu.style.display === 'block' ? 'none' : 'block'); } });
  document.addEventListener('click', ()=>{ if(menu) { menu.style.display = 'none'; } });
  // hide by default
  if(menu) menu.style.display = 'none';
}

/* ---------- fallback copy ---------- */
function fallbackCopy(text){
  const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select();
  try{ document.execCommand('copy'); toast('کپی شد (fallback)') }catch(e){ alert('کپی ناموفق') }
  ta.remove();
}

/* ---------- page init ---------- */
document.addEventListener('DOMContentLoaded', ()=>{
  setupFabMenu();
  renderIndex();
  setupManage();
  // show ads only on index page
  if(document.getElementById('listArea')) { setupAdsOnIndex(); }
});
