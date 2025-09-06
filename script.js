// چک کردن ورود مدیر
const adminPass = "Hh2ratu/("; // رمز ورود

document.addEventListener("DOMContentLoaded", () => {
  const loginBtn = document.getElementById("loginBtn");
  if (loginBtn) {
    loginBtn.addEventListener("click", () => {
      const pass = document.getElementById("adminPassword").value;
      const msg = document.getElementById("loginMsg");
      if (pass === adminPass) {
        localStorage.setItem("admin", "true");
        window.location.href = "ads.html";
      } else {
        msg.innerText = "❌ رمز اشتباه است!";
      }
    });
  }

  // حفاظت از صفحات پنل
  if (["ads.html", "add-config.html", "configs.html"].some(p => location.href.includes(p))) {
    if (localStorage.getItem("admin") !== "true") {
      alert("دسترسی غیرمجاز 🚫");
      window.location.href = "login.html";
    }
  }

  // افزودن تبلیغ
  const addAdBtn = document.getElementById("addAdBtn");
  if (addAdBtn) {
    addAdBtn.addEventListener("click", () => {
      const file = document.getElementById("adFile").files[0];
      const caption = document.getElementById("adCaption").value;
      const ads = JSON.parse(localStorage.getItem("ads")) || [];
      ads.push({ caption, file: file ? file.name : null, date: new Date().toLocaleString("fa-IR") });
      localStorage.setItem("ads", JSON.stringify(ads));
      alert("✅ تبلیغ اضافه شد");
      location.reload();
    });
  }

  // نمایش تبلیغات
  const adsList = document.getElementById("adsList");
  if (adsList) {
    const ads = JSON.parse(localStorage.getItem("ads")) || [];
    ads.forEach(ad => {
      const div = document.createElement("div");
      div.className = "ad-box";
      div.innerHTML = `
        <strong>${ad.caption}</strong>
        <p>${ad.date}</p>
        ${ad.file ? `<p>📂 فایل: ${ad.file}</p>` : ""}
        <button class="close-ad">×</button>
      `;
      adsList.appendChild(div);
      div.querySelector(".close-ad").addEventListener("click", () => div.remove());
    });
  }

  // افزودن کانفیگ
  const addCfgBtn = document.getElementById("addCfgBtn");
  if (addCfgBtn) {
    addCfgBtn.addEventListener("click", () => {
      const title = document.getElementById("cfgTitle").value;
      const type = document.getElementById("cfgType").value;
      const text = document.getElementById("cfgText").value;
      const files = Array.from(document.getElementById("cfgFile").files).map(f => f.name);

      if (!title || !text) {
        alert("⚠️ لطفاً عنوان و متن کانفیگ را وارد کنید");
        return;
      }

      const configs = JSON.parse(localStorage.getItem("configs")) || [];
      configs.push({
        title,
        type,
        text,
        files,
        date: new Date().toLocaleString("fa-IR")
      });
      localStorage.setItem("configs", JSON.stringify(configs));
      alert("✅ کانفیگ ذخیره شد");
    });
  }

  // لیست کانفیگ‌ها برای مدیریت
  const cfgList = document.getElementById("cfgList");
  if (cfgList) {
    const configs = JSON.parse(localStorage.getItem("configs")) || [];
    configs.forEach((cfg, index) => {
      const card = document.createElement("div");
      card.className = "card";
      card.innerHTML = `
        <div class="card-title">${cfg.title} (${cfg.type})</div>
        <div class="card-meta">${cfg.date}</div>
        <p>${cfg.text}</p>
        ${cfg.files.length ? `<p>📂 فایل‌ها: ${cfg.files.join(", ")}</p>` : ""}
        <button onclick="deleteCfg(${index})">🗑 حذف</button>
        <button onclick="editCfg(${index})">✏️ ویرایش</button>
      `;
      cfgList.appendChild(card);
    });
  }
});

// حذف کانفیگ
function deleteCfg(index) {
  const configs = JSON.parse(localStorage.getItem("configs")) || [];
  configs.splice(index, 1);
  localStorage.setItem("configs", JSON.stringify(configs));
  location.reload();
}

// ویرایش کانفیگ
function editCfg(index) {
  const configs = JSON.parse(localStorage.getItem("configs")) || [];
  const cfg = configs[index];
  localStorage.setItem("editCfg", JSON.stringify({ cfg, index }));
  window.location.href = "add-config.html";
}

// پر کردن فرم برای ویرایش
if (location.href.includes("add-config.html") && localStorage.getItem("editCfg")) {
  const { cfg, index } = JSON.parse(localStorage.getItem("editCfg"));
  document.getElementById("cfgTitle").value = cfg.title;
  document.getElementById("cfgType").value = cfg.type;
  document.getElementById("cfgText").value = cfg.text;
  document.getElementById("addCfgBtn").innerText = "ویرایش";
  document.getElementById("addCfgBtn").onclick = () => {
    const configs = JSON.parse(localStorage.getItem("configs")) || [];
    configs[index] = {
      title: document.getElementById("cfgTitle").value,
      type: document.getElementById("cfgType").value,
      text: document.getElementById("cfgText").value,
      files: cfg.files,
      date: cfg.date
    };
    localStorage.setItem("configs", JSON.stringify(configs));
    localStorage.removeItem("editCfg");
    alert("✅ کانفیگ ویرایش شد");
    window.location.href = "configs.html";
  };
                              }
