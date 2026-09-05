# 全 Cloudflare 部署

这条部署路径使用 Cloudflare Workers 运行 Next.js，D1 保存账号、文章、活动和设置，R2 保存上传图片及 Next.js 缓存，Workers Assets 提供静态文件。无需 Vercel、Neon、外部 PostgreSQL 或 Hyperdrive。Google/GitHub 登录和 GitHub 更新检查仍调用各自的第三方 API；管理员自行填写的外部图片链接不会自动镜像。

当前适配器为 OpenNext，保留现有 Next.js App Router 和 HeroUI。建议在 Linux、macOS 或 Cloudflare Workers Builds 构建；OpenNext 官方不保证 Windows 完整兼容。

## 首次部署

需要 Node.js 22 或更高版本以及已开通 Workers、D1、R2 的 Cloudflare 账号。完整 Next.js 与 Prisma 产物通常需要 Workers 付费计划的包大小和 CPU 配额；以 Wrangler 的实际打包结果为准。

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

- 将 `d1_databases[0].database_id` 的全零占位值换成创建 D1 时得到的 ID。
- 按需修改 Worker 名称、D1 名称及 R2 桶名；修改 Worker 名称时同时修改 `WORKER_SELF_REFERENCE.service`。
- 在 `vars` 中设置 `SITE_URL` 为最终访问地址，例如 `https://ow.example.com`。保留 `DATABASE_PROVIDER: "d1"`。

生成并录入 OAuth/更新配置加密密钥：

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
npx wrangler secret put OAUTH_ENCRYPTION_KEY
```

把上一条命令生成的 64 位十六进制文本粘贴到密钥提示中。不要把密钥提交到 Git。随后应用 D1 迁移并部署：

```bash
npm run cf:db:deploy
npm run cf:deploy
```

访问 `/admin/setup` 创建第一位管理员。数据库初始化记录保证并发注册只能成功一位。首次管理员入口关闭后，使用既有账号登录。

自定义域名在 Cloudflare Workers 的“设置 → 域和路由”中添加；修改域名后同步 `SITE_URL`，重新部署，并调整 Google/GitHub OAuth 回调地址。

## 本地验证

```bash
cp .dev.vars.example .dev.vars
npm run cf:db:local
npm run cf:preview
```

本地 D1 和 R2 位于 `.wrangler`，默认不会访问远端数据。`cf:preview` 会先构建，再在 Workers 运行时提供预览。常规 PostgreSQL 开发仍使用 `npm run dev`；要在 Next.js 开发服务器访问本地 D1，设置 `DATABASE_PROVIDER=d1` 后启动。

```bash
npm run test:cloudflare
```

集成测试使用独立、不持久化的本地 D1/R2，检查注册竞争、审核人数上限、OAuth 重复回调、日期同步及覆盖恢复回滚。

## 更新、日期状态与备份

```bash
git pull --ff-only
npm ci
npm run cf:db:deploy
npm run cf:deploy
```

也可把仓库接入 Cloudflare Workers Builds，构建命令使用 `npm run cf:build`，部署命令使用 `npm run cf:db:deploy && npx opennextjs-cloudflare deploy`。构建需要相应 D1 迁移权限。不要用 `npm run vercel-build`，也不要对 D1 执行 PostgreSQL 的 `db:deploy`。

活动状态在读取首页、活动列表和详情时按上海日期自动同步：当天进行中，次日已结束。不需要外部 Cron 才能得到正确的页面状态；当前 Cloudflare 配置未注册后台定时处理器，无人访问时不会单独触发同步。

后台“备份与恢复”生成的 ZIP 可与 Vercel、VPS 部署互相迁移。D1 保存的文字数据与 R2 媒体一起导出。恢复先把已验证的媒体写到新的不可变 R2 键，再由一个 D1 batch 原子替换业务数据和媒体引用；失败不会留下半份数据库。原有账号、密码哈希、OAuth 绑定会被备份覆盖；已有会话失效，需要用备份中的账号重新登录。目标站点仍使用自己的域名和加密环境变量。

成功恢复后的旧 R2 对象暂时保留，使同时进行的备份仍能读到对应图片；不会自动删除整个桶。后续清理应根据当前 SiteAsset 引用和正在进行的备份核对，避免误删。

网站内的 Vercel Deploy Hook 只适用于 Vercel。Cloudflare 上可查看 GitHub 更新记录，但发布更新请使用 Workers Builds 或上述命令。

## 数据迁移维护

PostgreSQL 模型在 `prisma/schema.prisma`，Cloudflare 模型在 `prisma/cloudflare/schema.prisma`。D1 将英雄数组保存为 JSON，应用边界仍返回字符串数组；媒体字节在 R2，D1 只保存不可变对象键和大小。以后新增字段必须同步两份模型及各自迁移。

Cloudflare 迁移放在 `prisma/cloudflare/migrations`。可用 Prisma `migrate diff` 生成 SQLite SQL，但必须检查结果再交给 Wrangler；当前 Prisma 版本生成 JSON 默认值时需要确认 SQL 使用带引号的 `'[]'`、`'{}'`。

D1 不支持 Prisma 交互事务。本站关键多表写入使用 D1 原生 batch，通用客户端直接拒绝 `$transaction`。新增业务不得把 PostgreSQL 事务改成多次独立写入来绕过报错。

Cloudflare 构建脚本会清除 OpenNext 自动复制到产物的 `.env` 配置；部署运行时请使用 `wrangler.jsonc` 的 vars 与 `wrangler secret`，避免把本地 Vercel 数据库凭证一起打包。

参考：[OpenNext 配置](https://opennext.js.org/cloudflare/get-started)、[Prisma D1](https://www.prisma.io/docs/guides/deployment/cloudflare-d1)、[D1 batch 事务](https://developers.cloudflare.com/d1/worker-api/d1-database/)、[D1 限制](https://developers.cloudflare.com/d1/platform/limits/)。
