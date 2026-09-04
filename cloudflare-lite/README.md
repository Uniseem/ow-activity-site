# Cloudflare Lite

轻量版使用 Cloudflare Worker Static Assets + Worker API + D1，不包含 Next.js、OpenNext、Prisma 或 PostgreSQL 驱动。

## 本地运行

复制 `.dev.vars.example` 为 `.dev.vars`，设置本地管理员账号，然后执行：

```powershell
npm.cmd run db:local
npm.cmd run dev
```

## Cloudflare 部署

D1 数据库已经创建在 APAC 区域并写入 `wrangler.jsonc`。首次部署前设置管理员 Secrets：

```powershell
npx wrangler secret put ADMIN_USERNAME
npx wrangler secret put ADMIN_PASSWORD
```

然后执行：

```powershell
npm.cmd run deploy
```

数据库结构已经写入远程 D1。如果将来修改 `schema.sql`，执行：

```powershell
npm.cmd run db:remote
```

成功后地址为：

```text
https://sjtu-ow.<你的 workers.dev 子域名>.workers.dev
```

绑定 `.com` 域名时，在 Cloudflare 控制台进入 Worker 的 Settings → Domains & Routes → Add Custom Domain。
