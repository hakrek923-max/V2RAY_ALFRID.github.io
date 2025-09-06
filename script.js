/* --------------------------
   RLAX Project JavaScript
   - Mobile-first
   - LocalStorage data
--------------------------- */

const STORAGE_CFG = 'rlax_configs';
const STORAGE_ADS = 'rlax_ads';
const ADMIN_PASS = 'Hh2ratu/(';

/* -------- Utilities -------- */
function loadLocal(key){ try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch(e){ return [] } }
function saveLocal(key, arr){ localStorage.setItem(key, JSON.stringify(arr)); }
function uid(){ return 'id_' + Date.now() + '_' + Math.random().toString(36).slice(2,8); }
function formatDate(iso){
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('fa-IR') + ' ' + d.toLocaleTimeString('fa-IR');
  } catch(e){ return iso }
}
function toast(msg){
  const el = document.createElement('div');
  el.textContent = msg;
  el.style.cssText = 'position:fixed;left:50%;top:20px;transform:translateX(-50%);background:#0ea5e9;color:#fff;padding:8px 12px;border-radius:8px;z-index:2200;animation:toastAnim .3s';
  document.body.appendChild(el);
  setTimeout(()=>el.remove(),2000);
}
async function fileToDataUrl(file){
  return new Promise((res,rej)=>{ const r=new FileReader(); r.onload=()=>res(r.result); r.onerror=rej; r.readAsDataURL(file); });
}

/* -------- Menu -------- */
function setupMenu(){
  const menuBtn = document.getElementById('menuToggle');
  const sideMenu = document.getElementById('sideMenu');
  if(!menuBtn || !sideMenu) return;
  let open = false;
  menuBtn.addEventListener('click', ()=>{
    open = !open;
    sideMenu.style.right = open ? '0' : '-260px';
  });
}

/* -------- Index Page -------- */
function renderIndex(){
  const listArea = document.getElementById('listArea');
  if(!listArea) return;
  const arr = loadLocal(STORAGE_CFG);
  listArea.innerHTML = '';
  if(arr.length === 0){ listArea.innerHTML = '<div class="empty">هیچ کانفیگی وجود ندارد.</div>'; return; }
  arr.forEach(cfg=>{
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <div class="title">${cfg.title}</div>
      <div class="time">${formatDate(cfg.createdAt)}</div>
      ${cfg.text ? `<pre>${cfg.text}</pre>` : ''}
    `;
    const actions = document.createElement('div');
    actions.className = 'actions';
    const copyBtn = document.createElement('button');
    copyBtn.className='action-btn'; copyBtn.textContent='📋 کپی';
    copyBtn.onclick = ()=>{ navigator.clipboard.writeText(cfg.text||''); toast('کپی شد'); };
    const dlBtn = document.createElement('button');
    dlBtn.className='action-btn'; dlBtn.textContent='⬇️ دانلود';
    dlBtn.onclick = ()=>{
      const blob = new Blob([cfg.text||''], {type:'text/plain;charset=utf-8'});
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = cfg.title+'.txt';
      a.click(); URL.revokeObjectURL(a.href);
    };
    actions.append(copyBtn, dlBtn);
    card.appendChild(actions);
    listArea.appendChild(card);
  });
}

/* -------- Login Page -------- */
function setupLogin(){
  const loginBtn = document.getElementById('loginBtn');
  if(!loginBtn) return;
  loginBtn.addEventListener('click', ()=>{
    const pass = document.getElementById('adminPassword').value;
    if(pass === ADMIN_PASS){
      sessionStorage.setItem('rlax_admin','1');
      location.href='ads.html';
    } else toast('رمز اشتباه است');
  });
}

/* -------- Ads Page -------- */
function setupAds(){
  if(!document.getElementById('adsList')) return;
  const addBtn = document.getElementById('addAdBtn');
  addBtn.addEventListener('click', async ()=>{
    const file = document.getElementById('adFile').files[0];
    const caption = document.getElementById('adCaption').value;
    if(!file) return toast('فایل انتخاب نشده');
    const dataUrl = await fileToDataUrl(file);
    const ad = {id:uid(),caption,type:file.type.startsWith('video')?'video':'image',dataUrl,createdAt:new Date().toISOString()};
    const ads = loadLocal(STORAGE_ADS); ads.unshift(ad); saveLocal(STORAGE_ADS,ads); toast('تبلیغ ذخیره شد'); renderAds();
  });
  renderAds();
}
function renderAds(){
  const wrap = document.getElementById('adsList');
  if(!wrap) return;
  const ads = loadLocal(STORAGE_ADS);
  wrap.innerHTML='';
  if(ads.length===0){ wrap.innerHTML='<div class="empty">تبلیغی وجود ندارد.</div>'; return; }
  ads.forEach(ad=>{
    const c=document.createElement('div'); c.className='card';
    c.innerHTML=`<div class="title">${ad.caption}</div><div class="time">${formatDate(ad.createdAt)}</div>`;
    if(ad.type==='image') c.innerHTML+=`<img src="${ad.dataUrl}" class="thumb">`;
    else c.innerHTML+=`<video src="${ad.dataUrl}" controls class="thumb"></video>`;
    wrap.appendChild(c);
  });
}

/* -------- Add Config Page -------- */
function setupAddConfig(){
  if(!document.getElementById('cfgTitle')) return;
  document.getElementById('addCfgBtn').addEventListener('click', ()=>{
    const title=document.getElementById('cfgTitle').value;
    const text=document.getElementById('cfgText').value;
    if(!title) return toast('عنوان لازم است');
    const arr=loadLocal(STORAGE_CFG);
    arr.unshift({id:uid(),title,text,createdAt:new Date().toISOString()});
    saveLocal(STORAGE_CFG,arr);
    toast('کانفیگ ذخیره شد');
    document.getElementById('cfgTitle').value='';
    document.getElementById('cfgText').value='';
  });
}

/* -------- Configs List Page -------- */
function setupConfigs(){
  const wrap=document.getElementById('cfgList');
  if(!wrap) return;
  const arr=loadLocal(STORAGE_CFG);
  wrap.innerHTML='';
  if(arr.length===0){ wrap.innerHTML='<div class="empty">هیچ کانفیگی ثبت نشده.</div>'; return; }
  arr.forEach(cfg=>{
    const c=document.createElement('div'); c.className='card';
    c.innerHTML=`<div class="title">${cfg.title}</div><div class="time">${formatDate(cfg.createdAt)}</div>`;
    wrap.appendChild(c);
  });
}

/* -------- Run on page load -------- */
document.addEventListener('DOMContentLoaded', ()=>{
  setupMenu();
  renderIndex();
  setupLogin();
  setupAds();
  setupAddConfig();
  setupConfigs();
});
