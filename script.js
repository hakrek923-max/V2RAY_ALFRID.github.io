// باز و بسته کردن منوی سه نقطه
const menuBtn = document.getElementById("menuBtn");
const menuContent = document.getElementById("menuContent");
if (menuBtn) {
  menuBtn.addEventListener("click", () => {
    menuContent.style.display =
      menuContent.style.display === "block" ? "none" : "block";
  });
  window.addEventListener("click", (e) => {
    if (!menuBtn.contains(e.target) && !menuContent.contains(e.target)) {
      menuContent.style.display = "none";
    }
  });
}

// مدیریت لاگین ساده
function loginAdmin() {
  const pass = document.getElementById("password").value;
  if (pass === "Hh2ratu/(") {
    localStorage.setItem("admin", "true");
    window.location.href = "ads.html";
  } else {
    alert("رمز عبور اشتباه است!");
  }
}

// بارگذاری کانفیگ‌ها در صفحه اصلی
async function loadConfigs() {
  const list = document.getElementById("configList");
  if (!list) return;

  try {
    const res = await fetch("assets/data/configs.json");
    const configs = await res.json();

    configs.forEach((cfg) => {
      const card = document.createElement("div");
      card.className = "config-card";
      card.innerHTML = `
        <pre>${cfg.text}</pre>
        <div class="config-actions">
          <button class="btn-copy">کپی</button>
          <button class="btn-download">دانلود</button>
          <button class="btn-share">اشتراک</button>
        </div>
        <div class="config-meta">
          تاریخ: ${cfg.date} | زمان: ${cfg.time}
        </div>
      `;

      // دکمه‌ها
      card.querySelector(".btn-copy").onclick = () => {
        navigator.clipboard.writeText(cfg.text);
        alert("کانفیگ کپی شد!");
      };

      card.querySelector(".btn-download").onclick = () => {
        const blob = new Blob([cfg.text], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "config.txt";
        a.click();
        URL.revokeObjectURL(url);
      };

      card.querySelector(".btn-share").onclick = async () => {
        if (navigator.share) {
          await navigator.share({ text: cfg.text });
        } else {
          alert("اشتراک‌گذاری در مرورگر شما پشتیبانی نمی‌شود.");
        }
      };

      list.appendChild(card);
    });
  } catch (err) {
    console.error("خطا در بارگذاری کانفیگ‌ها:", err);
  }
}

// اجرای بارگذاری در صفحه اصلی
loadConfigs();
