import test from "node:test";
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { Client } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import {
  checkForUpdates,
  getUpdateSettings,
  loadUpdateCommits,
  requestDeployment,
  saveUpdateSettings,
  settingsView,
} from "../src/lib/updates/service";
import { DEFAULT_REPOSITORY } from "../src/lib/updates/shared";

const connectionString = process.env.UPDATE_TEST_DATABASE_URL;
if (!connectionString)
  throw new Error(
    "请设置 UPDATE_TEST_DATABASE_URL；测试仅操作独立临时 schema。",
  );
const key = randomBytes(32).toString("hex");
const base = "a".repeat(40),
  head = "b".repeat(40),
  other = "c".repeat(40);
const hook =
  "https://api.vercel.com/v1/integrations/deploy/prj_example/testSecret";
async function withDatabase(run: (db: PrismaClient) => Promise<void>) {
  const schema = "updates_test_" + randomUUID().replaceAll("-", "");
  assert.match(schema, /^updates_test_[a-f0-9]{32}$/);
  const client = new Client({ connectionString });
  await client.connect();
  let db: PrismaClient | undefined;
  try {
    await client.query(`CREATE SCHEMA "${schema}"`);
    await client.query(`SET search_path TO "${schema}"`);
    for (const name of (await readdir("prisma/migrations"))
      .filter((name) => /^\d/.test(name))
      .sort())
      await client.query(
        (
          await readFile(`prisma/migrations/${name}/migration.sql`, "utf8")
        ).replace('CREATE SCHEMA IF NOT EXISTS "public";', ""),
      );
    db = new PrismaClient({
      adapter: new PrismaPg(
        { connectionString, max: 4, options: `-c search_path=${schema}` },
        { schema },
      ),
    });
    await run(db);
  } finally {
    await db?.$disconnect();
    try {
      await client.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    } finally {
      await client.end();
    }
  }
}
function fakeGithub(
  options: {
    sha?: string;
    status?: string;
    total?: number;
    hookError?: "timeout" | "rejected";
  } = {},
) {
  const calls: string[] = [];
  let deployments = 0;
  const fetcher: typeof fetch = async (url, init) => {
    const path = String(url);
    calls.push(path);
    if (path.startsWith("https://api.vercel.com/")) {
      assert.equal(path, hook);
      assert.equal(init?.method, "POST");
      deployments++;
      if (options.hookError === "timeout") throw new Error("timeout");
      if (options.hookError === "rejected")
        return new Response(null, { status: 403 });
      return Response.json({ job: { id: "job-test", state: "PENDING" } });
    }
    if (path.endsWith("/ow-activity-site"))
      return Response.json({ default_branch: "main", private: false });
    if (path.includes("/commits/"))
      return Response.json({ sha: options.sha || head });
    const page = Number(new URL(path).searchParams.get("page") || 1),
      total = options.total ?? 1;
    const commits = Array.from(
      { length: Math.max(0, Math.min(100, total - (page - 1) * 100)) },
      (_, index) => ({
        sha: ((page - 1) * 100 + index + 1).toString(16).padStart(40, "0"),
        commit: {
          message: `提交 ${(page - 1) * 100 + index + 1}\n正文`,
          author: { name: "测试" },
        },
      }),
    );
    return Response.json({
      status: options.status || "ahead",
      ahead_by: total,
      total_commits: total,
      commits,
    });
  };
  return { fetcher, calls, deployments: () => deployments };
}
async function configure(db: PrismaClient) {
  const row = await getUpdateSettings(db);
  return saveUpdateSettings(
    db,
    { ...settingsView(row), deployHook: hook, clearDeployHook: false },
    "test-admin",
    key,
  );
}
test("默认仓库、Hook 加密与保留、设置冲突，以及更换来源清理旧 Hook", async () =>
  withDatabase(async (db) => {
    const row = await getUpdateSettings(db);
    assert.equal(row.repositoryUrl, DEFAULT_REPOSITORY);
    assert.equal(row.encryptedDeployHook, null);
    const saved = await configure(db);
    const stored = await getUpdateSettings(db);
    assert.ok(stored.encryptedDeployHook);
    assert.notEqual(stored.encryptedDeployHook, hook);
    assert.ok(!JSON.stringify(settingsView(stored)).includes("testSecret"));
    await assert.rejects(
      saveUpdateSettings(
        db,
        { ...saved, revision: 0, deployHook: "", clearDeployHook: false },
        "admin",
        key,
      ),
      /其他管理员/,
    );
    const retained = await saveUpdateSettings(
      db,
      { ...saved, deployHook: "", clearDeployHook: false },
      "admin",
      key,
    );
    assert.equal(retained.hasDeployHook, true);
    const changed = await saveUpdateSettings(
      db,
      {
        ...retained,
        repositoryUrl: "https://github.com/other/project",
        deployHook: "",
        clearDeployHook: false,
      },
      "admin",
      key,
    );
    assert.equal(changed.hasDeployHook, false);
  }));
test("自动检查缓存与并发租约只请求一次 GitHub，提交分页不遗漏且固定当前部署", async () =>
  withDatabase(async (db) => {
    await configure(db);
    const github = fakeGithub({ total: 205 });
    const results = await Promise.all(
      Array.from({ length: 4 }, () =>
        checkForUpdates(db, base, key, false, github.fetcher),
      ),
    );
    const result = results.find((r) => r.status === "available")!;
    assert.ok(result);
    assert.equal(result.total, 205);
    assert.equal(result.commits.length, 100);
    assert.equal(github.calls.length, 3);
    await checkForUpdates(db, base, key, false, github.fetcher);
    assert.equal(github.calls.length, 3);
    const second = await loadUpdateCommits(
      db,
      base,
      head,
      result.revision,
      2,
      github.fetcher,
    );
    const third = await loadUpdateCommits(
      db,
      base,
      head,
      result.revision,
      3,
      github.fetcher,
    );
    assert.equal(
      new Set([...result.commits, ...second, ...third].map((c) => c.sha)).size,
      205,
    );
    await assert.rejects(
      loadUpdateCommits(db, base, other, result.revision, 2, github.fetcher),
      /版本信息已变化/,
    );
    const afterDeployment = await checkForUpdates(
      db,
      head,
      key,
      false,
      github.fetcher,
    );
    assert.equal(afterDeployment.status, "current");
    assert.equal(afterDeployment.total, 0);
  }));
test("不存在部署标识、分支落后和历史分叉均不会误启用更新", async () =>
  withDatabase(async (db) => {
    await configure(db);
    const github = fakeGithub();
    assert.equal(
      (await checkForUpdates(db, "", key, false, github.fetcher)).status,
      "unknown",
    );
    assert.equal(github.calls.length, 0);
    const behind = await checkForUpdates(
      db,
      base,
      key,
      false,
      fakeGithub({ status: "behind", total: 0 }).fetcher,
    );
    assert.equal(behind.status, "current");
    assert.equal(behind.canDeploy, false);
    const diverged = await checkForUpdates(
      db,
      other,
      key,
      false,
      fakeGithub({ status: "diverged", total: 2 }).fetcher,
    );
    assert.equal(diverged.status, "diverged");
    assert.equal(diverged.canDeploy, false);
    await assert.rejects(
      requestDeployment(
        db,
        other,
        head,
        diverged.revision,
        key,
        github.fetcher,
      ),
      /版本或设置已变化/,
    );
  }));
test("确认更新只提交一次部署，保留旧版本直至新构建生效", async () =>
  withDatabase(async (db) => {
    await configure(db);
    const github = fakeGithub();
    const result = await checkForUpdates(db, base, key, false, github.fetcher);
    const requests = await Promise.allSettled(
      Array.from({ length: 3 }, () =>
        requestDeployment(db, base, head, result.revision, key, github.fetcher),
      ),
    );
    assert.equal(requests.filter((r) => r.status === "fulfilled").length, 1);
    assert.equal(github.deployments(), 1);
    const row = await getUpdateSettings(db);
    assert.equal(row.deployJobId, "job-test");
    const pending = await checkForUpdates(db, base, key, false, github.fetcher);
    assert.equal(pending.currentSha, base);
    assert.equal(pending.status, "available");
    assert.equal(pending.canDeploy, false);
    assert.ok(pending.requestedAt);
  }));
test("远端新增提交和配置更改拒绝旧确认，超时不自动重发部署", async () =>
  withDatabase(async (db) => {
    await configure(db);
    const github = fakeGithub();
    const result = await checkForUpdates(db, base, key, false, github.fetcher);
    await assert.rejects(
      requestDeployment(
        db,
        base,
        head,
        result.revision,
        key,
        fakeGithub({ sha: other }).fetcher,
      ),
      /又有新提交/,
    );
    const timeout = fakeGithub({ hookError: "timeout" });
    await assert.rejects(
      requestDeployment(db, base, head, result.revision, key, timeout.fetcher),
      /可能已受理/,
    );
    await assert.rejects(
      requestDeployment(db, base, head, result.revision, key, timeout.fetcher),
      /近期已提交/,
    );
    assert.equal(timeout.deployments(), 1);
    await configure(db);
    await assert.rejects(
      requestDeployment(db, base, head, result.revision, key, github.fetcher),
      /版本或设置已变化/,
    );
  }));
