import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:net";
import { resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";

// Run inside the final Docker stage, where /app/node_modules contains only
// Next.js-traced runtime dependencies. No database or credentials are used.
const appDirectory = resolve(process.argv[2] || "/app");
const reservation = createServer();
reservation.listen(0, "127.0.0.1");
await once(reservation, "listening");
const port = reservation.address().port;
await new Promise((resolveClose) => reservation.close(resolveClose));
const child = spawn(process.execPath, [resolve(appDirectory, "server.js")], {
  cwd: appDirectory,
  env: {
    ...process.env,
    NODE_ENV: "production",
    HOSTNAME: "127.0.0.1",
    PORT: String(port),
    DATABASE_URL: "",
    DATABASE_URL_UNPOOLED: "",
    VERCEL: "",
    SITE_URL: "https://standalone-check.example.com",
  },
  stdio: ["ignore", "pipe", "pipe"],
});
const exited = once(child, "exit");
let output = "";
for (const stream of [child.stdout, child.stderr]) {
  stream.on("data", (chunk) => {
    output = (output + chunk.toString()).slice(-8_000);
  });
}
const origin = `http://127.0.0.1:${port}`;
try {
  let response;
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (child.exitCode !== null) throw new Error("standalone 服务提前退出");
    try {
      response = await fetch(`${origin}/api/health`, {
        signal: AbortSignal.timeout(2_000),
      });
      break;
    } catch {
      await delay(200);
    }
  }
  assert.ok(response, "standalone 服务未在时限内启动");
  assert.equal(response.status, 503, "无数据库时健康检查应返回 503");
  assert.deepEqual(await response.json(), { ok: false });
  const login = await fetch(`${origin}/login`, {
    signal: AbortSignal.timeout(15_000),
  });
  assert.equal(login.status, 200, "登录页无法在独立运行镜像内渲染");
  const html = await login.text();
  const staticPath = html.match(/(?:src|href)="(\/_next\/static\/[^\"]+)"/)?.[1];
  assert.ok(staticPath, "登录页没有找到 Next.js 静态资源");
  const asset = await fetch(new URL(staticPath.replaceAll("&amp;", "&"), origin), {
    signal: AbortSignal.timeout(5_000),
  });
  assert.equal(asset.status, 200, "standalone 镜像缺少静态资源");
  console.log("standalone 镜像检查通过：服务启动、健康检查、登录页、静态资源。");
} catch (error) {
  console.error(output);
  throw error;
} finally {
  if (child.exitCode === null) {
    child.kill("SIGTERM");
    const forceStop = setTimeout(() => child.kill("SIGKILL"), 5_000);
    await exited;
    clearTimeout(forceStop);
  }
}
