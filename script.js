const ADMIN_PASS = "Hh2ratu/(";

// ---------- Data ----------
function loadData(){
  try { return JSON.parse(localStorage.getItem("rlax_configs")||"[]"); }
  catch(e){ return []; }
}
function saveData(arr){
  localStorage.setItem("rlax_configs", JSON.stringify(arr));
}

// ---------- List render ----------
function renderList(filter={q:"", type:"all"}){
  const listArea = document.getElementById("listArea");
  if(!listArea) return; // فقط صفحه اصلی
  const emptyNote = document.getElementById("emptyNote");
  let data = loadData();

  if(filter.type!=="all"){
    data = data.filter(it=>it.type===filter.type);
  }
  if(filter.q){
    data = data.filter(it=>it.title.includes(filter.q));
  }

  listArea.innerHTML="";
  if(data.length===0){ emptyNote.style.display="block"; return; }
  emptyNote.style.display="none";

  data.forEach((it,i)=>{
    const div = document.createElement("div");
    div.className="card";
    div.innerHTML = `
      <strong>${it.title}</strong> <span class="badge">${it.type}</span>
      <div class="date">📅 ${it.date||""}</div>
      <pre>${it.text||""}</pre>
    `;
    listArea.appendChild(div);
  });
}

// ---------- Add config ----------
function setupManage(){
  const loginBtn=document.getElementById("loginBtn");
  const logoutBtn=document.getElementById("logoutBtn");
  const loginMsg=document.getElementById("loginMsg");
  const editor=document.getElementById("editor");

  let logged=false;
  if(loginBtn){
    loginBtn.onclick=()=>{
      const pass=document.getElementById("adminPassword").value;
      if(pass===ADMIN_PASS){ logged=true; editor.style.display="block"; logoutBtn.style.display="inline"; loginBtn.style.display="none"; }
      else { loginMsg.textContent="رمز اشتباه"; }
    };
    logoutBtn.onclick=()=>{ logged=false; editor.style.display="none"; logoutBtn.style.display="none"; loginBtn.style.display="inline"; };
  }

  const addBtn=document.getElementById("addCfgBtn");
  if(addBtn){
    addBtn.onclick=()=>{
      const arr=loadData();
      const now=new Date();
      arr.push({
        title:document.getElementById("cfgTitle").value,
        type:document.getElementById("cfgType").value,
        text:document.getElementById("cfgText").value,
        date: now.toLocaleString("fa-IR")
      });
      saveData(arr);
      alert("ثبت شد");
    };
  }
}

// ---------- Fab menu ----------
const fab=document.getElementById("fabMenu");
if(fab){
  const menu=document.getElementById("fabOptions");
  fab.onclick=()=>menu.classList.toggle("hidden");
}

// ---------- Search & Filter ----------
const search=document.getElementById("searchInput");
if(search){
  search.oninput=()=>renderList({q:search.value});
}
document.querySelectorAll("[data-filter]").forEach(btn=>{
  btn.onclick=()=>renderList({q:search.value, type:btn.dataset.filter});
});

// ---------- Init ----------
document.addEventListener("DOMContentLoaded", ()=>{
  renderList();
  setupManage();
});
