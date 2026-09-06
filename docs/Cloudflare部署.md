# 全 Cloudflare 部署

这条路径用 Cloudflare Workers 跑 Next.js，D1 存账号、文章、活动和设置，R2 存上传图片和 Next.js 缓存，Workers Assets 提供静态文件。不需要 Vercel、Neon、外部 PostgreSQL 或 Hyperdrive。Google / GitHub 登录和 GitHub 更新检查仍会访问各自的 API；管理员填的外链图片不会自动镜像进 R2。

适配器是 OpenNext，现有 App Router 和 HeroUI 不用拆。OpenNext 在 Windows 上经常过不了符号链接，本仓库在 GitHub Actions 的 Ubuntu 上打包。`npm run cf:build`、`cf:preview`、`cf:deploy` 都会先打 OpenNext 包，请在 Linux 或 Actions 里跑。创建 D1 / R2、写入密钥、对远端执行 `cf:db:deploy` 不依赖这套打包，已登录 Wrangler 的机器都可以。

## 首次部署

需要 Node.js 22 或更高版本，以及已开通 Workers、D1、R2 的账号。完整 Next.js 与 Prisma 产物通常要用 Workers 付费计划的包大小和 CPU 配额，以 Wrangler 报出来的体积为准。

### 创建 D1 和 R2

```bash
git clone https://github.com/Uniseem/ow-activity-site.git
cd ow-activity-site
npm ci
npx wrangler login
npx wrangler d1 create ow-activity-site
npx wrangler r2 bucket create ow-activity-site-assets
npx wrangler r2 bucket create ow-activity-site-cache
```

编辑 `wrangler.jsonc`：

- 把 `d1_databases[0].database_id` 的全零占位换成创建 D1 时得到的 ID。
- 按需改 Worker 名称、D1 名称和 R2 桶名；改 Worker 名称时同步改 `WORKER_SELF_REFERENCE.service`。
- 在 `vars` 里设置 `SITE_URL` 为最终访问地址，例如 `https://ow.example.com`。保留 `DATABASE_PROVIDER: "d1"`。

把改过 D1 ID 的 `wrangler.jsonc` 提交到要发布的分支。Actions 和 Wrangler 都读仓库里的这份文件，占位全零不能发布。

生成并写入加密密钥：

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
npx wrangler secret put OAUTH_ENCRYPTION_KEY
```

把上一条命令打出的 64 位十六进制贴进提示。不要把密钥提交到 Git。

### 发布 Worker

**GitHub Actions（推荐）**

1. 仓库 Settings → Secrets and variables → Actions 增加 `CLOUDFLARE_API_TOKEN`（能发布该 Worker，并能对绑定的 D1 跑迁移）和 `CLOUDFLARE_ACCOUNT_ID`。
2. 推到 `main` 或开 Pull Request 时，CI 会跑单测并执行 `npm run cf:build`，把 `.open-next` 存成 Artifact，保留 7 天。
3. 要发布：Actions → **CI** → Run workflow，勾选「打包完成后部署到 Cloudflare Workers」。

勾选后，当次工作流会应用 D1 迁移并执行 `npx wrangler deploy`。不勾选只打包，不动远端 Worker。也可以把 Artifact 解压成仓库根目录的 `.open-next`，再在本机跑 `npx wrangler deploy`，不必重新打 OpenNext 包。

**Linux 本机**

```bash
npm run cf:db:deploy
npm run cf:deploy
```

`cf:deploy` 会先构建再发布。不要用 `npm run vercel-build`，也不要对 D1 执行 PostgreSQL 的 `db:deploy`。

**Cloudflare Workers Builds**

构建命令用 `npm run cf:build`，部署命令用 `npm run cf:db:deploy && npx opennextjs-cloudflare deploy`。构建账号需要对应的 D1 迁移权限。

打开 `/admin`，没有管理员时会转到 `/admin/setup`。数据库保证并发注册只能成功一位。入口关闭后用已有账号登录。

自定义域名在 Workers「设置 → 域和路由」里添加。改域名后同步 `SITE_URL`，重新部署，并改 Google / GitHub 的回调地址。

## 本地验证

```bash
cp .dev.vars.example .dev.vars
npm run cf:db:local
npm run cf:preview
```

`cf:preview` 会先打包，请在 Linux 上执行。本地 D1 和 R2 在 `.wrangler`，默认不碰远端。日常 PostgreSQL 开发仍用 `npm run dev`；要让 Next.js 开发服务器连本地 D1，设置 `DATABASE_PROVIDER=d1` 后再启动。

```bash
npm run test:cloudflare
```

这项测试用独立、不持久化的本地 D1 / R2，检查注册竞争、审核人数上限、OAuth 重复回调、日期同步和覆盖恢复回滚，不打 OpenNext 包。

## 更新、日期状态与备份

代码进仓库后，用上面的 Actions 勾选部署；或在 Linux 上：

```bash
git pull --ff-only
npm ci
npm run cf:db:deploy
npm run cf:deploy
```

活动状态在读首页、活动列表和详情时按上海日期同步：当天进行中，次日已结束。没有外部 Cron 也能在有人访问时改对状态。当前配置没有注册后台定时处理器，没人访问时不会单独同步。

后台「备份与恢复」打出的 ZIP 可以和 Vercel、VPS 互迁。D1 里的文字和 R2 里的媒体一起导出。恢复先把校验过的媒体写到新的不可变 R2 键，再用一个 D1 batch 换掉业务数据和引用；失败不会留下半份库。原账号、密码哈希、OAuth 绑定会被备份覆盖，已有会话失效，要用备份里的账号重新登录。目标站继续用自己的域名和加密环境变量。

恢复成功后，旧 R2 对象先留着，好让同时进行的备份还能读到对应图片；不会自动清空整个桶。以后清理要对照当前 SiteAsset 引用和正在进行的备份，避免误删。

网站里的 Vercel Deploy Hook 只对 Vercel 有效。Cloudflare 上可以看 GitHub 更新记录，发布请用 Actions、Workers Builds 或上面的命令。

## 数据迁移维护

PostgreSQL 模型在 `prisma/schema.prisma`，Cloudflare 模型在 `prisma/cloudflare/schema.prisma`。D1 把英雄数组存成 JSON，应用边界仍返回字符串数组；媒体字节在 R2，D1 只保存不可变对象键和大小。以后加字段要同时改两份模型和各自的迁移。

Cloudflare 迁移在 `prisma/cloudflare/migrations`。可以用 Prisma `migrate diff` 生成 SQLite SQL，必须检查后再交给 Wrangler。当前 Prisma 版本生成 JSON 默认值时，确认 SQL 用带引号的 `'[]'`、`'{}'`。

D1 没有 Prisma 交互事务。本站关键多表写入走 D1 原生 batch，通用客户端直接拒绝 `$transaction`。新业务不能把 PostgreSQL 事务拆成多次独立写入来绕过报错。

Cloudflare 构建脚本会清掉 OpenNext 自动拷进产物的 `.env`。运行时用 `wrangler.jsonc` 的 vars 和 `wrangler secret`，避免把本机 Vercel 数据库地址打进 Worker。

参考：[OpenNext 配置](https://opennext.js.org/cloudflare/get-started)、[Prisma D1](https://www.prisma.io/docs/guides/deployment/cloudflare-d1)、[D1 batch 事务](https://developers.cloudflare.com/d1/worker-api/d1-database/)、[D1 限制](https://developers.cloudflare.com/d1/platform/limits/)。
