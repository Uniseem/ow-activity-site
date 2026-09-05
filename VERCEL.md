# 部署到 Vercel

Vercel 托管 Next.js 页面和服务端逻辑，Vercel Storage 中的 Neon Postgres 保存账号、会话、资料、活动与报名。

## 创建项目和数据库

1. 在 Vercel 导入 GitHub 仓库，根目录选择仓库根目录，框架选择 **Next.js**。
2. 在项目的 **Storage / Marketplace** 添加 **Neon Postgres**，选择由 Vercel 管理的集成并关联当前项目。
3. 数据库地区尽量与 Vercel Functions 地区一致。
4. 确认环境变量有 `DATABASE_URL` 和 `DATABASE_URL_UNPOOLED`，分别为连接池和直连地址。若集成设置了变量前缀，需映射为这里的变量名。
5. Preview 绑定独立的 Neon 数据库分支，Production 绑定生产分支。构建会执行迁移，两个环境分别使用自己的地址。

Vercel 原独立 Postgres 产品已停止提供，新项目通过 Marketplace 接入。参考 [官方说明](https://vercel.com/docs/postgres) 和 [Neon 集成](https://vercel.com/marketplace/neon)。

## 构建配置

活动日期统一按 `Asia/Shanghai` 处理。`vercel.json` 配置每日上海时间 00:00 的状态同步任务，请在 Vercel 生产环境设置随机的 `CRON_SECRET`，用于验证定时请求。新迁移会保留旧活动的上海日期，并将已移除的活动类型转为带原名称的自定义类型。

Vercel 的定时调用可能延迟，因此活动页面、后台和报名操作也会在读取数据前同步状态。定时任务仅在生产部署运行；本地和预览环境通过请求时同步保持状态正确。参考 [Vercel 定时任务配置](https://vercel.com/docs/cron-jobs/quickstart) 与 [调度限制](https://vercel.com/docs/cron-jobs/usage-and-pricing)。

`vercel.json` 已设置：

```text
Install Command: npm ci
Build Command: npm run vercel-build
Framework: Next.js
```

安装依赖时生成 Prisma 客户端。构建先执行 `prisma migrate deploy`，然后重新生成客户端并执行 `next build`，避免依赖缓存带来旧客户端。

应用使用 Node.js runtime，不需要独立 API 服务或静态导出目录。部署构建必须提供有效数据库连接；管理员初始化不会在构建中自动执行。纯本地构建使用 `npm run build`，不会修改数据库。

## 初始化管理员

在本地 `.env.local` 配置目标数据库地址，并设置 `ADMIN_USERNAME`、`ADMIN_PASSWORD`。也可以用 Vercel CLI 拉取目标环境的变量；生产环境示例：

```bash
npx vercel link
npx vercel env pull .env.local --environment=production
```

确认关联的是当前项目和预期环境，在 `.env.local` 补充管理员用户名及密码，然后运行：

```bash
npm run db:deploy
npm run db:seed
```

初始化只创建或更新该管理员，不生成演示活动。重复执行会重设该账号密码，其他用户和活动保留。完成后可从 `.env.local` 移除管理员密码；Vercel 运行时也不需要这个密码环境变量。

## 域名

默认使用 Vercel 分配的域名。页面元数据自动读取 `VERCEL_PROJECT_PRODUCTION_URL` 或 `VERCEL_URL`。

绑定自定义域名后，可将 `NEXT_PUBLIC_SITE_URL` 设置为完整 HTTPS 地址。数据库连接、管理员密码都不要使用 `NEXT_PUBLIC_` 前缀。

## 后续数据库更新

在开发数据库修改 `prisma/schema.prisma` 后执行：

```bash
npm run db:migrate -- --name describe_change
```

保存生成的迁移文件，下次构建会通过 `db:deploy` 应用迁移。部署命令不使用 `db:push` 或 `migrate reset`。

如果接入此前通过 `db:push` 建表、但没有迁移历史的 PostgreSQL 数据库，先核对它与当前模型完全一致：

```bash
npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code
```

只有检查返回退出码 `0`，并确认这些表已存在时，才把初始迁移标记为已执行：

```bash
npx prisma migrate resolve --applied 20260905000000_init
npm run db:deploy
```

新建空数据库直接运行 `db:deploy`，不执行基线标记。这些迁移用于 PostgreSQL 结构初始化，不包含其他数据库已有业务数据的导入。

## 部署后验证

- 打开首页、玩家页、活动页，确认读取真实数据库。
- 使用管理员登录 `/login`。
- 注册普通账号并填写资料，在后台审核。
- 创建活动、提交报名、审核报名并取消报名。
- 验证公开玩家卡片没有返回战网 ID、段位和联系方式。

连接池按 [Vercel 官方建议](https://vercel.com/kb/guide/connection-pooling-with-functions) 在模块中复用，并注册空闲连接回收。
