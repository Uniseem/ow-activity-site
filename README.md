# 先锋活动站

一个面向小圈子的非官方守望先锋玩家活动站。第一版聚焦开放注册、管理员审核、公开玩家卡片、活动发布和报名审核。

公开玩家卡片只展示：

- 头像
- 公开昵称
- 公开宣言

战网 ID、常用位置、常用英雄、段位、在线时间、联系方式和备注只给本人和管理员查看。

## 技术栈

- Next.js App Router
- TypeScript
- Tailwind CSS
- Prisma 7
- PostgreSQL，推荐 Supabase Postgres
- bcryptjs 密码哈希
- HttpOnly Cookie Session

## 本地运行

安装依赖：

```bash
npm install
```

启动开发服务器：

```bash
npm run dev
```

打开：

```text
http://localhost:3000
```

如果还没有配置数据库，首页、活动页和玩家页会显示演示数据；注册、登录、审核、报名等真实写入功能需要先配置数据库。

## 环境变量

复制 `.env.example` 到 `.env`，然后填写真实值：

```bash
cp .env.example .env
```

Windows PowerShell 可以用：

```powershell
Copy-Item .env.example .env
```

需要的变量：

```text
DATABASE_URL
SESSION_SECRET
ADMIN_USERNAME
ADMIN_PASSWORD
NEXT_PUBLIC_SITE_URL
```

免费公网部署时，`NEXT_PUBLIC_SITE_URL` 建议先用：

```text
https://sjtu-ow.vercel.app
```

`sjtu-ow.com` 是独立 `.com` 域名，一般需要在域名注册商购买后再绑定到 Vercel。

## 初始化数据库

配置好 `DATABASE_URL` 后执行：

```bash
npm run db:push
npm run db:seed
```

`db:seed` 会创建管理员账号，用户名和密码来自：

```text
ADMIN_USERNAME
ADMIN_PASSWORD
```

如果没有设置 `ADMIN_PASSWORD`，种子脚本会使用默认密码 `ChangeMe123!`。正式部署前必须改掉。

## 常用命令

```bash
npm run dev
npm run lint
npm run build
npm run db:generate
npm run db:push
npm run db:seed
```

## 免费公网域名方案

第一版建议部署到 Vercel 免费方案，并把 Vercel 项目名设置为：

```text
sjtu-ow
```

如果这个项目名没有被占用，默认公网地址通常会是：

```text
https://sjtu-ow.vercel.app
```

如果项目名被占用，可以改成：

```text
sjtu-ow-club.vercel.app
sjtu-ow-events.vercel.app
sjtu-ow-hub.vercel.app
```

后续购买 `sjtu-ow.com` 后，只需要在 Vercel 里添加自定义域名，再把 DNS 记录指向 Vercel。

## 第一版流程

用户：

- 注册账号
- 填写资料
- 等待管理员审核
- 审核通过后公开卡片出现在玩家页
- 报名活动
- 等待管理员审核报名

管理员：

- 审核用户资料
- 通过或拒绝公开展示
- 创建和编辑活动
- 查看报名名单
- 通过或拒绝报名
- 管理用户状态

## 部署建议

第一版推荐：

```text
前端和服务端：Vercel
数据库：Supabase Postgres
公网地址：sjtu-ow.vercel.app
邮件验证：第一版不做
```

Vercel 环境变量需要和本地 `.env` 保持一致。部署后在 Vercel 控制台执行或本地连接生产数据库执行：

```bash
npm run db:push
npm run db:seed
```

## 版权说明

本站应作为非官方玩家社区活动工具使用，不应写成官方平台或授权平台。项目内封面图是抽象电竞风格自制图片，没有使用暴雪或守望先锋官方素材。
