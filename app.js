const $ = (s) => document.querySelector(s);
const accessModal = $("#accessModal");
const passwordInput = $("#workspacePassword");
const createButton = $("#createButton");
const toast = $("#toast");
let toastTimer;
let sessionCount = 0;
let accountCount = 0;
let latestPassword = "";

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 3200);
}
function setAccessModal(open) {
  accessModal.classList.toggle("hidden", !open);
  if (open) setTimeout(() => passwordInput.focus(), 100);
}
function getPassword() { return sessionStorage.getItem("wink_workspace_password") || ""; }
function setStatus(label, foot = "Siap saat diperlukan") {
  $("#serviceMetric").textContent = label;
  $("#serviceFoot").textContent = foot;
  $("#sidebarStatus").textContent = label === "Idle" ? "Menunggu request" : label;
  $("#headerStatus").textContent = label === "Idle" ? "Menunggu koneksi API" : label;
}
function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
}
function safeUrl(value) {
  try { const u = new URL(value); return ["https:", "http:"].includes(u.protocol) ? u.href : ""; }
  catch { return ""; }
}
function copyValue(value) {
  const text = String(value ?? "");
  if (!text) return showToast("Tidak ada nilai untuk disalin.");
  navigator.clipboard?.writeText(text).then(() => showToast("Berhasil disalin ke clipboard."))
    .catch(() => showToast("Clipboard tidak tersedia. Salin nilai secara manual."));
}
function field(label, value, full = false) {
  return `<div class="detail-field ${full ? "full" : ""}"><div class="detail-label"><span>${escapeHtml(label)}</span><button type="button" class="copy-button" data-copy="${encodeURIComponent(String(value ?? ""))}">Copy ↗</button></div><div class="detail-value">${escapeHtml(value || "—")}</div></div>`;
}
function renderAccount(account, totalCredits) {
  const user = account.user || {};
  const avatar = safeUrl(user.avatar_url);
  const name = user.screen_name || account.email || "Wink account";
  const profile = safeUrl(user.url);
  $("#emptyState").classList.add("hidden");
  $("#resultCounter").textContent = "1 ACCOUNT";
  $("#resultArea").classList.remove("hidden");
  $("#resultArea").innerHTML = `
    <article class="account-card">
      <div class="account-top">
        ${avatar ? `<img class="account-avatar" src="${escapeHtml(avatar)}" alt="" referrerpolicy="no-referrer">` : `<div class="account-avatar account-avatar-fallback">W</div>`}
        <div class="account-identity"><strong>${escapeHtml(name)}</strong><small>${escapeHtml(account.email || "Email tidak tersedia")}</small></div>
        <span class="success-tag">✓ SUCCESS</span>
      </div>
      <div class="account-fields">
        ${field("EMAIL", account.email)}
        ${field("PASSWORD", account.password)}
        ${field("TOKEN", account.token, true)}
        ${field("UID", account.uid)}
        ${field("CREDITS", account.credits)}
      </div>
      <div class="account-meta">
        ${user.gender ? `<span class="meta-pill">Gender · ${escapeHtml(user.gender)}</span>` : ""}
        ${user.follower_count != null ? `<span class="meta-pill">Followers · ${escapeHtml(user.follower_count)}</span>` : ""}
        ${user.fan_count != null ? `<span class="meta-pill">Fans · ${escapeHtml(user.fan_count)}</span>` : ""}
        ${user.be_like_count != null ? `<span class="meta-pill">Likes · ${escapeHtml(user.be_like_count)}</span>` : ""}
        ${user.vip_type != null ? `<span class="meta-pill">VIP · ${escapeHtml(user.vip_type)}</span>` : ""}
        ${totalCredits != null ? `<span class="meta-pill">Total credits · ${escapeHtml(totalCredits)}</span>` : ""}
        ${profile ? `<a class="meta-pill" href="${escapeHtml(profile)}" target="_blank" rel="noopener noreferrer">Open profile ↗</a>` : ""}
      </div>
    </article>`;
  $("#resultArea").querySelectorAll("[data-copy]").forEach(btn => btn.addEventListener("click", () => {
    let value = "";
    try { value = decodeURIComponent(btn.dataset.copy); } catch {}
    copyValue(value);
  }));
}
function addActivity(title, description, status) {
  const list = $("#activityList");
  const empty = list.querySelector(".activity-empty");
  if (empty) empty.remove();
  const row = document.createElement("div");
  row.className = "activity-row";
  const time = new Date().toLocaleTimeString("id-ID", {hour:"2-digit", minute:"2-digit"});
  row.innerHTML = `<div class="activity-mark">${status === "Success" ? "✓" : "!"}</div><div class="activity-info"><strong>${escapeHtml(title)}</strong><small>${escapeHtml(description)} · ${time}</small></div><span class="activity-status">${escapeHtml(status)}</span>`;
  list.prepend(row);
}
$("#accessForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const value = passwordInput.value.trim();
  if (!value) return;
  sessionStorage.setItem("wink_workspace_password", value);
  passwordInput.value = "";
  setAccessModal(false);
  showToast("Password tersimpan untuk sesi tab ini.");
});
$("#closeModal").addEventListener("click", () => setAccessModal(false));
$("#settingsButton").addEventListener("click", () => {
  setAccessModal(true);
  passwordInput.value = "";
});
$("#createForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!getPassword()) return setAccessModal(true);
  createButton.disabled = true;
  createButton.querySelector(".button-text").textContent = "Creating...";
  setStatus("Working", "Request sedang diproses");
  sessionCount++;
  $("#sessionMetric").textContent = String(sessionCount);
  try {
    const response = await fetch("/api/create-wink", {
      method: "POST",
      headers: {"Content-Type":"application/json", "x-dashboard-password": getPassword()},
      body: JSON.stringify({count: 1})
    });
    const data = await response.json().catch(() => ({}));
    if (response.status === 401 || response.status === 403) {
      sessionStorage.removeItem("wink_workspace_password");
      setAccessModal(true);
      throw new Error("Password workspace salah atau belum dikonfigurasi.");
    }
    if (!response.ok || data.status !== true || !Array.isArray(data.result?.accounts) || !data.result.accounts.length) {
      throw new Error(data.message || data.msg || "Request gagal. Periksa konfigurasi API dan coba lagi.");
    }
    const account = data.result.accounts[0];
    renderAccount(account, data.result.totalCredits);
    accountCount++;
    $("#accountMetric").textContent = String(accountCount);
    addActivity("Create Wink request", "1 account returned", "Success");
    setStatus("Connected", "Request terakhir berhasil");
    showToast("Create Wink berhasil.");
  } catch (error) {
    setStatus("Error", "Request tidak berhasil");
    addActivity("Create Wink request", error.message || "Request gagal", "Failed");
    showToast(error.message || "Terjadi kesalahan saat membuat akun.");
  } finally {
    createButton.disabled = false;
    createButton.querySelector(".button-text").textContent = "Create Wink";
  }
});
$("#clearActivity").addEventListener("click", () => {
  $("#activityList").innerHTML = '<div class="activity-empty">Riwayat aktivitas dibersihkan.</div>';
  showToast("Riwayat aktivitas browser dibersihkan.");
});
$("#mobileMenu").addEventListener("click", () => $("#sidebar").classList.toggle("open"));
document.addEventListener("click", (event) => {
  const sidebar = $("#sidebar");
  if (window.innerWidth <= 700 && sidebar.classList.contains("open") && !sidebar.contains(event.target) && !$("#mobileMenu").contains(event.target)) sidebar.classList.remove("open");
});
if (!getPassword()) setTimeout(() => setAccessModal(true), 450);
