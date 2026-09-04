const app = document.querySelector("#app");
const nav = document.querySelector("#nav");
const toast = document.querySelector("#toast");

const state = { user: null, players: [], events: [], eventParticipants: [], admin: null };
const routes = [
  ["home", "首页"], ["players", "玩家"], ["events", "活动"],
  ["me", "我的"], ["admin", "管理"],
];

const esc = (value = "") => String(value).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]);
const list = (value) => Array.isArray(value) ? value : (() => { try { return JSON.parse(value || "[]"); } catch { return []; } })();
const formatDate = (value) => value ? new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "未设置";
const route = () => location.hash.replace("#", "") || "home";
const statusText = (value) => ({ PENDING: "待审核", APPROVED: "已通过", REJECTED: "未通过", BANNED: "已停用", OPEN: "报名中", CLOSED: "已截止", FINISHED: "已结束" }[value] || value || "未知");
const avatarTypes = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);
const maxAvatarBytes = 512 * 1024;

function notify(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(notify.timer);
  notify.timer = setTimeout(() => toast.classList.remove("show"), 2600);
}

async function api(path, options = {}) {
  const response = await fetch(path, { credentials: "same-origin", ...options, headers: { "content-type": "application/json", ...(options.headers || {}) } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "请求失败，请稍后重试。");
  return data;
}

async function refresh() {
  const data = await api("/api/bootstrap");
  Object.assign(state, data);
  state.admin = null;
  render();
}

function renderNav() {
  nav.innerHTML = routes.filter(([key]) => key !== "admin" || state.user?.role === "ADMIN").map(([key, label]) =>
    `<button data-route="${key}" class="${route() === key ? "active" : ""}">${label}</button>`).join("") +
    (state.user ? `<button id="logout">退出</button>` : `<button data-route="login" class="${route() === "login" ? "active" : ""}">登录</button>`);
  nav.querySelectorAll("[data-route]").forEach((button) => button.addEventListener("click", () => location.hash = button.dataset.route));
  nav.querySelector("#logout")?.addEventListener("click", async () => { await api("/api/logout", { method: "POST", body: "{}" }); await refresh(); location.hash = "home"; });
}

function avatar(player) {
  return player.avatarUrl ? `<span class="avatar"><img alt="" src="${esc(player.avatarUrl)}"></span>` : `<span class="avatar">${esc((player.displayName || "OW").slice(0, 2))}</span>`;
}

function playerCard(player) {
  return `<article class="card"><div class="profile-top">${avatar(player)}<div><h3>${esc(player.displayName)}</h3><span class="status approved">已认证玩家</span></div></div><p>${esc(player.slogan || "这个玩家还没有留下公开宣言。")}</p><div class="tags">${player.mainRole ? `<span class="tag">${esc(player.mainRole)}</span>` : ""}${list(player.mainHeroes).map((hero) => `<span class="tag">${esc(hero)}</span>`).join("")}</div></article>`;
}

function eventCard(event) {
  const allowed = state.user && !["BANNED", "REJECTED"].includes(state.user.status);
  const participants = state.eventParticipants.filter((player) => player.eventId === event.id);
  const capacity = Number(event.max_participants) > 0 ? `${Number(event.approved_count || 0)} / ${Number(event.max_participants)}` : "不限";
  return `<article class="card event-card"><div class="actions"><span class="status ${String(event.status).toLowerCase()}">${statusText(event.status)}</span><span class="tag">${esc(event.type)}</span></div><h3>${esc(event.title)}</h3><p>${esc(event.description)}</p><div class="event-meta"><span>时间：${formatDate(event.start_time)}</span><span>发起人：${esc(event.creator_name || "管理员")}</span><span>名额：${capacity}</span>${event.requirements ? `<span>要求：${esc(event.requirements)}</span>` : ""}${event.voice_channel ? `<span>语音：${esc(event.voice_channel)}</span>` : ""}</div>${participants.length ? `<div class="participant-list"><strong>已加入玩家</strong>${participants.map((player) => `<div class="participant-card">${avatar(player)}<div><b>${esc(player.displayName)}</b><div class="tags">${player.mainRole ? `<span class="tag">${esc(player.mainRole)}</span>` : ""}${list(player.mainHeroes).slice(0, 3).map((hero) => `<span class="tag">${esc(hero)}</span>`).join("")}</div></div></div>`).join("")}</div>` : ""}${event.status === "OPEN" ? `<button class="button primary small ${allowed ? "join" : "login-to-join"}" data-id="${esc(event.id)}">${allowed ? "加入活动" : "注册或登录后加入"}</button>` : ""}</article>`;
}

function renderHome() {
  app.innerHTML = `<section class="hero"><p class="eyebrow">SJTU Overwatch Community</p><h1>上海交大守望先锋</h1><p>面向上海交大守望先锋玩家的非官方社区平台。认识队友、发布活动并组织下一场对局；战网 ID、联系方式等私人信息不会公开展示。</p><div class="actions"><button class="button primary" data-go="events">查看活动</button><button class="button" data-go="players">认识玩家</button></div></section>`;
}

function renderPlayers() {
  app.innerHTML = `<div class="section-head"><div><p class="eyebrow">Players</p><h2>公开玩家卡片</h2><p>这里只显示经过管理员审核的昵称、头像、宣言、位置和英雄。</p></div></div>${state.players.length ? `<section class="grid">${state.players.map(playerCard).join("")}</section>` : `<div class="empty">还没有审核通过的公开玩家。</div>`}`;
}

function renderEvents() {
  app.innerHTML = `<div class="section-head"><div><p class="eyebrow">Events</p><h2>活动大厅</h2><p>已注册玩家可直接加入；未注册玩家请先创建账号。报名时可沿用或修改位置和段位，段位仅管理员可见。</p></div></div>${state.events.length ? `<section class="grid">${state.events.map(eventCard).join("")}</section>` : `<div class="empty">管理员还没有发布活动。</div>`}`;
  app.querySelectorAll(".join").forEach((button) => button.addEventListener("click", () => openRegistration(button.dataset.id)));
  app.querySelectorAll(".login-to-join").forEach((button) => button.addEventListener("click", () => location.hash = "login"));
}

function renderLogin() {
  app.innerHTML = `<section class="form-shell"><div class="card"><div class="tabs"><button class="button primary" data-tab="login">登录</button><button class="button" data-tab="register">注册</button></div><div id="auth-form"></div></div></section>`;
  const host = app.querySelector("#auth-form");
  const showLogin = () => {
    host.innerHTML = `<form id="login-form"><label>用户名<input name="username" required autocomplete="username"></label><label>密码<input name="password" type="password" required autocomplete="current-password"></label><button class="button primary">登录</button></form>`;
    host.querySelector("form").addEventListener("submit", submitLogin);
  };
  const showRegister = () => {
    host.innerHTML = `<form id="register-form"><label>用户名（登录用：英文、数字、下划线，3–24 位）<input name="username" pattern="[A-Za-z0-9_]{3,24}" minlength="3" maxlength="24" required></label><label>密码<input name="password" type="password" minlength="8" required></label><label>公开昵称（2–20 个字符，可用中文）<input name="displayName" minlength="2" maxlength="20" required></label><label>公开宣言<input name="slogan" maxlength="80"></label><button class="button primary">创建账号</button></form>`;
    host.querySelector("form").addEventListener("submit", submitRegister);
  };
  app.querySelectorAll("[data-tab]").forEach((button) => button.addEventListener("click", () => button.dataset.tab === "login" ? showLogin() : showRegister()));
  showLogin();
}

function renderMe() {
  if (!state.user) { renderLogin(); return; }
  const user = state.user;
  const externalAvatar = String(user.avatarUrl || "").startsWith("http") ? user.avatarUrl : "";
  app.innerHTML = `<section class="form-shell"><div class="section-head"><div><p class="eyebrow">Profile</p><h2>我的资料</h2></div><span class="status ${String(user.reviewStatus).toLowerCase()}">${statusText(user.reviewStatus)}</span></div><div class="notice">每次修改公开资料后，都需要管理员重新审核。</div><div class="card"><form id="profile-form"><div class="form-row"><label>公开昵称<input name="displayName" value="${esc(user.displayName)}" required></label><label>上传头像<input name="avatarFile" type="file" accept="image/png,image/jpeg,image/webp,image/gif"><small>PNG、JPEG、WebP 或 GIF，最大 512 KB</small></label></div><label>或使用头像 URL<input name="avatarUrl" value="${esc(externalAvatar)}" placeholder="https://..."></label>${user.avatarUrl ? `<label><span><input name="removeAvatar" type="checkbox"> 删除当前头像</span></label>` : ""}<label>公开宣言<input name="slogan" value="${esc(user.slogan || "")}" maxlength="80"></label><div class="form-row"><label>战网 ID（仅管理员可见）<input name="battleTag" value="${esc(user.battleTag || "")}"></label><label>常用位置<select name="mainRole"><option value="">未设置</option>${["TANK","DAMAGE","SUPPORT","FLEX"].map((role) => `<option ${user.mainRole === role ? "selected" : ""}>${role}</option>`).join("")}</select></label></div><label>常用英雄（用逗号分隔）<input name="mainHeroes" value="${esc(list(user.mainHeroes).join(", "))}"></label><div class="form-row"><label>段位<input name="rank" value="${esc(user.rank || "")}"></label><label>在线时间<input name="onlineTime" value="${esc(user.onlineTime || "")}"></label></div><label>联系方式（仅管理员可见）<input name="contact" value="${esc(user.contact || "")}"></label><label>备注（仅管理员可见）<textarea name="extraNote">${esc(user.extraNote || "")}</textarea></label><button class="button primary">保存并提交审核</button></form></div></section>`;
  app.querySelector("form").addEventListener("submit", submitProfile);
}

async function renderAdmin() {
  if (state.user?.role !== "ADMIN") { location.hash = "home"; return; }
  if (!state.admin) state.admin = await api("/api/admin");
  const pending = state.admin.users.filter((user) => user.role !== "ADMIN");
  const regs = state.admin.registrations;
  app.innerHTML = `<div class="section-head"><div><p class="eyebrow">Admin</p><h2>管理控制台</h2><p>自动审核只做初筛，管理员可以在这里复查并随时改判。</p></div></div><section class="card"><h3>创建活动</h3><form id="event-form"><div class="form-row"><label>活动名称<input name="title" required></label><label>活动类型<select name="type"><option>FUN</option><option>SCRIM</option><option>TRAINING</option><option>CUSTOM</option><option>COMPETITIVE</option><option>WATCH</option></select></label></div><label>活动说明<textarea name="description" required></textarea></label><div class="form-row"><label>开始时间<input name="startTime" type="datetime-local" required></label><label>报名截止<input name="signupDeadline" type="datetime-local"></label></div><div class="form-row"><label>最大人数（填 0 表示不限）<input name="maxParticipants" type="number" min="0" value="0" required></label><label>语音频道<input name="voiceChannel"></label></div><label>报名要求<input name="requirements"></label><button class="button primary">发布活动</button></form></section><br><section><h3>玩家审核与复查</h3><div class="admin-list">${pending.length ? pending.map((user) => `<div class="admin-item"><div><div class="profile-top">${avatar(user)}<div><strong>${esc(user.displayName)}</strong> <span class="muted">@${esc(user.username)}</span> <span class="status ${String(user.status).toLowerCase()}">${statusText(user.status)}</span><p>${esc(user.slogan || "无公开宣言")}</p></div></div><p class="muted">位置：${esc(user.mainRole || "未填")} · 段位（后台可见）：${esc(user.rank || "未填")} · 英雄：${esc(list(user.mainHeroes).join("、") || "未填")}</p><p class="muted">自动审核：${esc(user.autoReview || "无风险标记")} · 审核备注：${esc(user.reviewNote || "无")}</p></div><div class="actions"><button class="button small user-decision" data-id="${user.id}" data-decision="APPROVED">通过</button><button class="button small user-decision" data-id="${user.id}" data-decision="PENDING">待审</button><button class="button danger small user-decision" data-id="${user.id}" data-decision="REJECTED">拒绝</button><button class="button danger small user-decision" data-id="${user.id}" data-decision="BANNED">停用</button></div></div>`).join("") : `<div class="empty">没有玩家记录。</div>`}</div></section><br><section><h3>活动报名记录</h3><div class="admin-list">${regs.length ? regs.map((item) => `<div class="admin-item"><div><strong>${esc(item.display_name)}</strong> 报名 <strong>${esc(item.event_title)}</strong><p>位置：${esc(item.preferred_role || "未填")} · 段位（仅后台）：${esc(item.rank || "未填")} · 状态：${statusText(item.status)}</p><p>${esc(item.note || "无备注")}</p></div><div class="actions"><button class="button small approve-reg" data-id="${item.id}">通过</button><button class="button danger small reject-reg" data-id="${item.id}">拒绝</button></div></div>`).join("") : `<div class="empty">没有报名记录。</div>`}</div></section>`;
  app.querySelector("#event-form").addEventListener("submit", submitEvent);
  bindReviewButtons();
}

async function submitLogin(event) {
  event.preventDefault(); const values = Object.fromEntries(new FormData(event.currentTarget));
  try { await api("/api/login", { method: "POST", body: JSON.stringify(values) }); await refresh(); location.hash = "me"; notify("登录成功。"); } catch (error) { notify(error.message); }
}
async function submitRegister(event) {
  event.preventDefault(); const values = Object.fromEntries(new FormData(event.currentTarget));
  try { await api("/api/register", { method: "POST", body: JSON.stringify(values) }); await refresh(); location.hash = "me"; notify("注册成功，请完善资料并等待审核。"); } catch (error) { notify(error.message); }
}
async function submitProfile(event) {
  event.preventDefault(); const values = Object.fromEntries(new FormData(event.currentTarget)); values.mainHeroes = String(values.mainHeroes || "").split(/[,，]/).map((v) => v.trim()).filter(Boolean);
  const file = values.avatarFile;
  delete values.avatarFile;
  if (values.removeAvatar === "on") values.avatarUrl = "";
  delete values.removeAvatar;
  if (file instanceof File && file.size) {
    if (file.size > maxAvatarBytes) { notify("头像不能超过 512 KB。"); return; }
    if (!avatarTypes.has(file.type)) { notify("头像只支持 PNG、JPEG、WebP 或 GIF。"); return; }
    values.avatarUrl = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(file); });
  } else if (!values.avatarUrl && state.user?.avatarUrl) {
    delete values.avatarUrl;
  }
  try { await api("/api/me", { method: "PATCH", body: JSON.stringify(values) }); await refresh(); notify("资料已提交审核。"); } catch (error) { notify(error.message); }
}
async function submitEvent(event) {
  event.preventDefault(); const values = Object.fromEntries(new FormData(event.currentTarget));
  try { await api("/api/admin/events", { method: "POST", body: JSON.stringify(values) }); await refresh(); state.admin = null; await renderAdmin(); notify("活动已发布。"); } catch (error) { notify(error.message); }
}
async function openRegistration(eventId) {
  const preferredRole = prompt("希望使用的位置（TANK / DAMAGE / SUPPORT / FLEX）：", state.user?.mainRole || "FLEX");
  if (preferredRole === null) return;
  const rank = prompt("本次活动使用的段位（默认沿用资料，仅管理员可见）：", state.user?.rank || "");
  if (rank === null) return;
  const note = prompt("报名备注（可留空）：", "");
  try { await api(`/api/events/${eventId}/register`, { method: "POST", body: JSON.stringify({ preferredRole, rank, note, heroes: state.user?.mainHeroes || [], voiceAvailable: true }) }); notify("报名已提交。"); } catch (error) { notify(error.message); }
}
function bindReviewButtons() {
  const review = async (kind, targetId, approved, decision) => { try { await api(`/api/admin/${kind}/${targetId}/review`, { method: "POST", body: JSON.stringify({ approved, decision }) }); state.admin = null; await refresh(); await renderAdmin(); notify("审核结果已保存。"); } catch (error) { notify(error.message); } };
  app.querySelectorAll(".user-decision").forEach((b) => b.onclick = () => review("users", b.dataset.id, b.dataset.decision === "APPROVED", b.dataset.decision));
  app.querySelectorAll(".approve-reg").forEach((b) => b.onclick = () => review("registrations", b.dataset.id, true));
  app.querySelectorAll(".reject-reg").forEach((b) => b.onclick = () => review("registrations", b.dataset.id, false));
}

async function render() {
  renderNav();
  const current = route();
  if (current === "home") renderHome();
  else if (current === "players") renderPlayers();
  else if (current === "events") renderEvents();
  else if (current === "login") renderLogin();
  else if (current === "me") renderMe();
  else if (current === "admin") await renderAdmin();
  else location.hash = "home";
  app.querySelectorAll("[data-go]").forEach((button) => button.addEventListener("click", () => location.hash = button.dataset.go));
}

window.addEventListener("hashchange", render);
refresh().catch((error) => { app.innerHTML = `<div class="empty">${esc(error.message)}<br><small>请确认 D1 数据库已经初始化。</small></div>`; });
