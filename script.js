// باز و بسته کردن منو سه نقطه
function toggleMenu() {
  const menu = document.getElementById("menu");
  menu.style.display = menu.style.display === "block" ? "none" : "block";
}

// جستجو در کانفیگ‌ها
function filterConfigs() {
  let search = document.getElementById("search").value.toLowerCase();
  let configs = document.querySelectorAll(".config");
  configs.forEach(c => {
    c.style.display = c.textContent.toLowerCase().includes(search) ? "block" : "none";
  });
}

// لاگین پنل مدیریت
function login() {
  const pass = document.getElementById("adminPass").value;
  if (pass === "Hh2ratu/(") { // رمز عبور مخصوص تو
    document.getElementById("loginContainer").style.display = "none";
    document.getElementById("panel").style.display = "flex";
    showSection("ads"); // پیش‌فرض روی تبلیغات باز شه
  } else {
    alert("❌ رمز اشتباه است");
  }
}

// تغییر بین سکشن‌های پنل
function showSection(id) {
  document.querySelectorAll(".section").forEach(sec => sec.style.display = "none");
  document.getElementById(id).style.display = "block";

  // اگر لیست کانفیگ‌ها باز بشه → لیست رو لود کن
  if (id === "listConfigs") {
    loadConfigsList();
  }
}

// افزودن کانفیگ جدید
function addConfig() {
  const title = document.getElementById("configTitle").value;
  const content = document.getElementById("configContent").value;
  if (!title || !content) return alert("⚠️ لطفا همه فیلدها را پر کنید");

  let configs = JSON.parse(localStorage.getItem("configs") || "[]");
  configs.push({
    id: Date.now(),
    title,
    content,
    date: new Date().toLocaleString("fa-IR")
  });
  localStorage.setItem("configs", JSON.stringify(configs));

  alert("✅ کانفیگ ذخیره شد");
  document.getElementById("configTitle").value = "";
  document.getElementById("configContent").value = "";
}

// نمایش لیست کانفیگ‌ها در پنل
function loadConfigsList() {
  const ul = document.getElementById("configList");
  ul.innerHTML = "";
  let configs = JSON.parse(localStorage.getItem("configs") || "[]");

  if (configs.length === 0) {
    ul.innerHTML = "<li>هیچ کانفیگی موجود نیست</li>";
    return;
  }

  configs.forEach(cfg => {
    const li = document.createElement("li");
    li.innerHTML = `
      <b>${cfg.title}</b><br>
      <small>${cfg.date}</small><br>
      <button onclick="deleteConfig(${cfg.id})">❌ حذف</button>
    `;
    ul.appendChild(li);
  });
}

// حذف کانفیگ
function deleteConfig(id) {
  let configs = JSON.parse(localStorage.getItem("configs") || "[]");
  configs = configs.filter(cfg => cfg.id !== id);
  localStorage.setItem("configs", JSON.stringify(configs));
  loadConfigsList();
}

// نمایش کانفیگ‌ها در صفحه اصلی
window.onload = () => {
  const configsDiv = document.getElementById("configs");
  if (configsDiv) {
    let configs = JSON.parse(localStorage.getItem("configs") || "[]");
    configs.forEach(cfg => {
      const div = document.createElement("div");
      div.className = "config";
      div.innerHTML = `
        <h3>${cfg.title}</h3>
        <p>${cfg.content}</p>
        <small>${cfg.date}</small><br>
        <button onclick="copyConfig('${cfg.content}')">📋 کپی</button>
        <button onclick="shareConfig('${cfg.content}')">🔗 اشتراک‌گذاری</button>
        <button onclick="downloadConfig('${cfg.title}','${cfg.content}')">⬇️ دانلود</button>
      `;
      configsDiv.appendChild(div);
    });
  }
};

// کپی کانفیگ
function copyConfig(content) {
  navigator.clipboard.writeText(content);
  alert("📋 کانفیگ کپی شد");
}

// اشتراک‌گذاری کانفیگ
function shareConfig(content) {
  if (navigator.share) {
    navigator.share({
      title: "کانفیگ V2Ray",
      text: content
    });
  } else {
    alert("اشتراک‌گذاری توسط مرورگر شما پشتیبانی نمی‌شود");
  }
}

// دانلود فایل کانفیگ
function downloadConfig(title, content) {
  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${title}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
