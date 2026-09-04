interface D1Result<T = Record<string, unknown>> { results?: T[]; success: boolean }
interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<D1Result<T>>;
  run(): Promise<D1Result>;
}
interface D1Database { prepare(query: string): D1PreparedStatement }
interface AssetsBinding { fetch(request: Request): Promise<Response> }
interface Env {
  DB: D1Database;
  ASSETS: AssetsBinding;
  ADMIN_USERNAME?: string;
  ADMIN_PASSWORD?: string;
}

type UserRow = {
  id: string; username: string; password_hash: string; password_salt: string;
  role: string; status: string; display_name: string; slogan: string;
  avatar_url: string | null; battle_tag: string | null; main_role: string | null;
  main_heroes: string; rank: string | null; online_time: string | null;
  contact: string | null; extra_note: string | null; review_status: string;
  review_note: string | null; auto_review?: string | null; created_at: string; updated_at: string;
};

const COOKIE = "ow_lite_session";
const MAX_AVATAR_BYTES = 512 * 1024;
const encoder = new TextEncoder();

const json = (data: unknown, status = 200, headers: HeadersInit = {}) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", ...headers } });

const fail = (message: string, status = 400) => json({ error: message }, status);
const now = () => new Date().toISOString();
const id = () => crypto.randomUUID();

function bytesToHex(bytes: Uint8Array) {
  return [...bytes].map((value) => value.toString(16).padStart(2, "0")).join("");
}

function hexToBytes(value: string) {
  const bytes = new Uint8Array(value.length / 2);
  for (let index = 0; index < bytes.length; index++) bytes[index] = Number.parseInt(value.slice(index * 2, index * 2 + 2), 16);
  return bytes;
}

async function sha256(value: string) {
  return bytesToHex(new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(value))));
}

async function passwordHash(password: string, saltHex?: string) {
  const salt = saltHex ? hexToBytes(saltHex) : crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: 100000 }, key, 256);
  return { hash: bytesToHex(new Uint8Array(bits)), salt: bytesToHex(salt) };
}

function constantTimeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return result === 0;
}

function cookieValue(request: Request, name: string) {
  const match = request.headers.get("cookie")?.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function publicUser(user: UserRow | null) {
  if (!user) return null;
  return {
    id: user.id, username: user.username, role: user.role, status: user.status,
    displayName: user.display_name, slogan: user.slogan, avatarUrl: avatarUrlForUser(user),
    battleTag: user.battle_tag, mainRole: user.main_role,
    mainHeroes: safeArray(user.main_heroes), rank: user.rank, onlineTime: user.online_time,
    contact: user.contact, extraNote: user.extra_note, reviewStatus: user.review_status,
    reviewNote: user.review_note, autoReview: user.auto_review, createdAt: user.created_at,
  };
}

function publicPlayer(user: UserRow | null) {
  if (!user) return null;
  return {
    id: user.id,
    displayName: user.display_name,
    slogan: user.slogan,
    avatarUrl: avatarUrlForUser(user),
    mainRole: user.main_role,
    mainHeroes: safeArray(user.main_heroes),
  };
}

function avatarUrlForUser(user: UserRow) {
  if (!user.avatar_url) return null;
  return user.avatar_url.startsWith("data:")
    ? `/api/avatars/${encodeURIComponent(user.id)}`
    : user.avatar_url;
}

function safeArray(value: string | null) {
  try { const parsed = JSON.parse(value || "[]"); return Array.isArray(parsed) ? parsed : []; } catch { return []; }
}

async function currentUser(request: Request, env: Env) {
  const token = cookieValue(request, COOKIE);
  if (!token) return null;
  const tokenHash = await sha256(token);
  const user = await env.DB.prepare(`SELECT u.* FROM users u JOIN sessions s ON s.user_id = u.id WHERE s.token_hash = ? AND s.expires_at > ?`).bind(tokenHash, now()).first<UserRow>();
  return user;
}

async function requireUser(request: Request, env: Env) {
  const user = await currentUser(request, env);
  if (!user) throw new Response(JSON.stringify({ error: "请先登录。" }), { status: 401, headers: { "content-type": "application/json" } });
  return user;
}

async function requireAdmin(request: Request, env: Env) {
  const user = await requireUser(request, env);
  if (user.role !== "ADMIN" || user.status !== "APPROVED") throw new Response(JSON.stringify({ error: "需要管理员权限。" }), { status: 403, headers: { "content-type": "application/json" } });
  return user;
}

async function body(request: Request) {
  if (!request.headers.get("content-type")?.includes("application/json")) throw fail("请求格式不正确。", 415);
  return (await request.json()) as Record<string, unknown>;
}

function text(value: unknown, max = 500) { return typeof value === "string" ? value.trim().slice(0, max) : ""; }

function autoReview(username: string, displayName: string) {
  if (/^(test|tester|temp|bot|spam|abc)([_-]?\d*)?$/i.test(username) || /^(测试|用户|玩家)(\d+)?$/.test(displayName)) return "REJECTED";
  if (/(.)\1\1\1/.test(username) || /(.)\1\1\1/.test(displayName)) return "REVIEW";
  return "CLEAR";
}

function isHttpAvatar(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function isImageSignature(type: string, bytes: Uint8Array) {
  if (type === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (type === "image/png") return bytesToHex(bytes.slice(0, 8)) === "89504e470d0a1a0a";
  if (type === "image/webp") return new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" && new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP";
  if (type === "image/gif") return ["GIF87a", "GIF89a"].includes(new TextDecoder().decode(bytes.slice(0, 6)));
  return false;
}

function validateAvatar(value: unknown, current: string | null) {
  if (value === undefined) return current;
  const avatar = text(value, 750000);
  if (!avatar) return null;
  if (isHttpAvatar(avatar)) return avatar;

  const match = avatar.match(/^data:(image\/(?:png|jpeg|webp|gif));base64,([A-Za-z0-9+/=]+)$/);
  if (!match) throw fail("头像只支持 PNG、JPEG、WebP 或 GIF。", 400);

  let binary: string;
  try { binary = atob(match[2]); } catch { throw fail("头像文件无效。", 400); }
  if (binary.length > MAX_AVATAR_BYTES) throw fail("头像不能超过 512 KB。", 413);

  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  if (!isImageSignature(match[1], bytes)) throw fail("头像文件格式不正确。", 400);
  return avatar;
}

async function createSession(userId: string, request: Request, env: Env) {
  const token = bytesToHex(crypto.getRandomValues(new Uint8Array(32)));
  const expiresAt = new Date(Date.now() + 14 * 86400000).toISOString();
  await env.DB.prepare("INSERT INTO sessions (token_hash,user_id,expires_at,created_at) VALUES (?,?,?,?)").bind(await sha256(token), userId, expiresAt, now()).run();
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return `${COOKIE}=${token}; Path=/; HttpOnly${secure}; SameSite=Lax; Max-Age=1209600`;
}

async function ensureAdmin(username: string, password: string, env: Env) {
  let user = await env.DB.prepare("SELECT * FROM users WHERE username = ?").bind(username).first<UserRow>();
  if (!user) {
    const timestamp = now();
    const hashed = await passwordHash(password);
    const userId = id();
    await env.DB.prepare(`INSERT INTO users (id,username,password_hash,password_salt,role,status,display_name,slogan,review_status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)`)
      .bind(userId, username, hashed.hash, hashed.salt, "ADMIN", "APPROVED", "管理员", "上海交大守望先锋管理员", "APPROVED", timestamp, timestamp).run();
    user = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(userId).first<UserRow>();
  }
  return user;
}

async function handleApi(request: Request, env: Env) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  const avatarMatch = path.match(/^\/api\/avatars\/([^/]+)$/);
  if (method === "GET" && avatarMatch) {
    const avatarOwner = await env.DB.prepare("SELECT * FROM users WHERE id=?")
      .bind(decodeURIComponent(avatarMatch[1]))
      .first<UserRow>();
    if (!avatarOwner?.avatar_url) return fail("头像不存在。", 404);

    const isPublic = avatarOwner.status === "APPROVED" && avatarOwner.review_status === "APPROVED";
    if (!isPublic) {
      const viewer = await currentUser(request, env);
      if (!viewer || (viewer.id !== avatarOwner.id && viewer.role !== "ADMIN")) return fail("无权查看该头像。", 403);
    }

    const match = avatarOwner.avatar_url.match(/^data:(image\/(?:png|jpeg|webp|gif));base64,([A-Za-z0-9+/=]+)$/);
    if (!match) return Response.redirect(avatarOwner.avatar_url, 302);

    const binary = atob(match[2]);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return new Response(bytes, {
      headers: {
        "content-type": match[1],
        "cache-control": isPublic ? "public, max-age=86400" : "private, no-store",
        "x-content-type-options": "nosniff",
      },
    });
  }

  if (method === "GET" && path === "/api/bootstrap") {
    const user = await currentUser(request, env);
    const players = await env.DB.prepare("SELECT * FROM users WHERE status='APPROVED' AND review_status='APPROVED' ORDER BY created_at DESC LIMIT 100").all<UserRow>();
    const events = await env.DB.prepare(`SELECT e.*, u.display_name AS creator_name, (SELECT COUNT(*) FROM registrations r WHERE r.event_id=e.id AND r.status='APPROVED') AS approved_count FROM events e JOIN users u ON u.id=e.created_by WHERE e.status != 'DRAFT' ORDER BY e.start_time ASC LIMIT 100`).all();
    const eventParticipants = await env.DB.prepare(`SELECT r.event_id, r.preferred_role, r.heroes, u.id, u.display_name, u.avatar_url FROM registrations r JOIN users u ON u.id=r.user_id WHERE r.status='APPROVED' ORDER BY r.created_at ASC LIMIT 500`).all<UserRow & { event_id: string; preferred_role: string | null; heroes: string }>();
    return json({ user: publicUser(user), players: (players.results || []).map(publicPlayer), events: events.results || [], eventParticipants: (eventParticipants.results || []).map((item) => ({ eventId: item.event_id, id: item.id, displayName: item.display_name, avatarUrl: avatarUrlForUser(item), mainRole: item.preferred_role, mainHeroes: safeArray(item.heroes) })) });
  }

  if (method === "POST" && path === "/api/register") {
    const data = await body(request);
    const username = text(data.username, 24);
    const password = text(data.password, 72);
    const displayName = text(data.displayName, 20);
    const slogan = text(data.slogan, 80);
    if (!/^[a-zA-Z0-9_]{3,24}$/.test(username)) return fail("用户名需要 3–24 位，只能包含字母、数字和下划线。");
    if (password.length < 8) return fail("密码至少需要 8 位。");
    if (displayName.length < 2) return fail("昵称至少需要 2 个字符。");
    if (await env.DB.prepare("SELECT id FROM users WHERE username=?").bind(username).first()) return fail("用户名已经存在。", 409);
    const timestamp = now();
    const automated = autoReview(username, displayName);
    const hashed = await passwordHash(password);
    const userId = id();
    await env.DB.prepare(`INSERT INTO users (id,username,password_hash,password_salt,display_name,slogan,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)`)
      .bind(userId, username, hashed.hash, hashed.salt, displayName, slogan, timestamp, timestamp).run();
    if (automated !== "CLEAR") {
      await env.DB.prepare("UPDATE users SET status='REJECTED', review_status='REJECTED', review_note=?, auto_review=? WHERE id=?")
        .bind("[自动审核] 疑似测试或刷号账号，请管理员复核。", automated, userId).run();
    }
    return json({ ok: true }, 201, { "set-cookie": await createSession(userId, request, env) });
  }

  if (method === "POST" && path === "/api/login") {
    const data = await body(request);
    const username = text(data.username, 24);
    const password = text(data.password, 72);
    let user: UserRow | null = null;
    if (env.ADMIN_USERNAME && env.ADMIN_PASSWORD && constantTimeEqual(username, env.ADMIN_USERNAME) && constantTimeEqual(password, env.ADMIN_PASSWORD)) {
      user = await ensureAdmin(username, password, env);
    } else {
      user = await env.DB.prepare("SELECT * FROM users WHERE username=?").bind(username).first<UserRow>();
      if (user) {
        const hashed = await passwordHash(password, user.password_salt);
        if (!constantTimeEqual(hashed.hash, user.password_hash)) user = null;
      }
    }
    if (!user) return fail("用户名或密码不正确。", 401);
    if (user.status === "BANNED" || user.status === "REJECTED") return fail("账号未通过审核，暂时不能加入活动。", 403);
    return json({ user: publicUser(user) }, 200, { "set-cookie": await createSession(user.id, request, env) });
  }

  if (method === "POST" && path === "/api/logout") {
    const token = cookieValue(request, COOKIE);
    if (token) await env.DB.prepare("DELETE FROM sessions WHERE token_hash=?").bind(await sha256(token)).run();
    return json({ ok: true }, 200, { "set-cookie": `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0` });
  }

  if (method === "PATCH" && path === "/api/me") {
    const user = await requireUser(request, env);
    const data = await body(request);
    const displayName = text(data.displayName, 20);
    if (displayName.length < 2) return fail("昵称至少需要 2 个字符。");
    const heroes = Array.isArray(data.mainHeroes) ? data.mainHeroes.map((v) => text(v, 24)).filter(Boolean).slice(0, 12) : [];
    const avatarUrl = validateAvatar(data.avatarUrl, user.avatar_url);
    await env.DB.prepare(`UPDATE users SET display_name=?,slogan=?,avatar_url=?,battle_tag=?,main_role=?,main_heroes=?,rank=?,online_time=?,contact=?,extra_note=?,review_status='PENDING',updated_at=? WHERE id=?`)
      .bind(displayName, text(data.slogan, 80), avatarUrl, text(data.battleTag, 40) || null, text(data.mainRole, 20) || null, JSON.stringify(heroes), text(data.rank, 40) || null, text(data.onlineTime, 100) || null, text(data.contact, 100) || null, text(data.extraNote, 500) || null, now(), user.id).run();
    return json({ ok: true });
  }

  const registrationMatch = path.match(/^\/api\/events\/([^/]+)\/register$/);
  if (method === "POST" && registrationMatch) {
    const user = await requireUser(request, env);
    if (user.status === "BANNED") return fail("账号已被停用。", 403);
    const event = await env.DB.prepare("SELECT * FROM events WHERE id=? AND status='OPEN'").bind(registrationMatch[1]).first<Record<string, unknown>>();
    if (!event) return fail("活动不存在或未开放。", 404);
    const data = await body(request);
    const heroes = Array.isArray(data.heroes) ? data.heroes.map((v) => text(v, 24)).filter(Boolean).slice(0, 12) : [];
    try {
      const timestamp = now();
      await env.DB.prepare(`INSERT INTO registrations (id,event_id,user_id,preferred_role,rank,heroes,voice_available,note,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)`)
        .bind(id(), registrationMatch[1], user.id, text(data.preferredRole, 20) || user.main_role || null, text(data.rank, 40) || user.rank || null, JSON.stringify(heroes.length ? heroes : safeArray(user.main_heroes)), data.voiceAvailable ? 1 : 0, text(data.note, 300) || null, "APPROVED", timestamp, timestamp).run();
      return json({ ok: true }, 201);
    } catch { return fail("你已经报名过这个活动。", 409); }
  }

  if (method === "GET" && path === "/api/admin") {
    await requireAdmin(request, env);
    const users = await env.DB.prepare("SELECT * FROM users ORDER BY created_at DESC LIMIT 200").all<UserRow>();
    const registrations = await env.DB.prepare(`SELECT r.*,u.display_name,u.username,e.title AS event_title FROM registrations r JOIN users u ON u.id=r.user_id JOIN events e ON e.id=r.event_id ORDER BY r.created_at DESC LIMIT 300`).all();
    return json({ users: (users.results || []).map(publicUser), registrations: registrations.results || [] });
  }

  const userReviewMatch = path.match(/^\/api\/admin\/users\/([^/]+)\/review$/);
  if (method === "POST" && userReviewMatch) {
    await requireAdmin(request, env);
    const data = await body(request);
    const decision = text(data.decision, 20) || (data.approved === true ? "APPROVED" : "REJECTED");
    const next = ["APPROVED", "REJECTED", "BANNED", "PENDING"].includes(decision) ? decision : "REJECTED";
    await env.DB.prepare("UPDATE users SET status=?,review_status=?,review_note=?,updated_at=? WHERE id=? AND role!='ADMIN'")
      .bind(next, next === "BANNED" ? "REJECTED" : next, text(data.note, 300) || null, now(), userReviewMatch[1]).run();
    return json({ ok: true });
  }

  if (method === "POST" && path === "/api/admin/events") {
    const admin = await requireAdmin(request, env);
    const data = await body(request);
    const title = text(data.title, 80);
    const startTime = text(data.startTime, 40);
    const maxParticipants = Number(data.maxParticipants);
    if (!title || !startTime || !Number.isFinite(maxParticipants) || maxParticipants < 0) return fail("请填写完整的活动信息。");
    const timestamp = now();
    await env.DB.prepare(`INSERT INTO events (id,title,description,type,start_time,signup_deadline,max_participants,requirements,voice_channel,status,created_by,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`)
      .bind(id(), title, text(data.description, 2000), text(data.type, 20) || "FUN", new Date(startTime).toISOString(), text(data.signupDeadline, 40) ? new Date(text(data.signupDeadline, 40)).toISOString() : null, Math.floor(maxParticipants), text(data.requirements, 500) || null, text(data.voiceChannel, 200) || null, "OPEN", admin.id, timestamp, timestamp).run();
    return json({ ok: true }, 201);
  }

  const regReviewMatch = path.match(/^\/api\/admin\/registrations\/([^/]+)\/review$/);
  if (method === "POST" && regReviewMatch) {
    const admin = await requireAdmin(request, env);
    const data = await body(request);
    await env.DB.prepare("UPDATE registrations SET status=?,reviewed_by=?,reviewed_at=?,updated_at=? WHERE id=?")
      .bind(data.approved === true ? "APPROVED" : "REJECTED", admin.id, now(), now(), regReviewMatch[1]).run();
    return json({ ok: true });
  }

  return fail("接口不存在。", 404);
}

const worker = {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      const url = new URL(request.url);
      if (url.pathname.startsWith("/api/")) return await handleApi(request, env);
      return env.ASSETS.fetch(request);
    } catch (error) {
      if (error instanceof Response) return error;
      console.error(error);
      return fail("服务器暂时无法处理请求。", 500);
    }
  },
};

export default worker;
