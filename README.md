# 先锋活动站

面向守望先锋校园玩家的非官方社区活动站，统一使用 Next.js + React 全栈架构，部署到 Vercel。数据库使用在 Vercel Storage 中创建和管理的 Neon Postgres。

## 架构

```text
浏览器 → Next.js App Router / React
       → Server Components 读取数据、Server Actions 处理表单
       → Prisma 7 + pg 连接池
       → Neon Postgres（Vercel Marketplace）
```

- Next.js 16、React 19、TypeScript、Tailwind CSS 4、HeroUI 3。
- 页面、登录会话、权限校验、资料与报名审核都运行在同一个 Next.js 项目中。
- 服务端使用 Node.js runtime，由 Vercel 托管；无需独立后端服务。
- 运行时通过 `DATABASE_URL` 连接 Neon 连接池；迁移优先使用 `DATABASE_URL_UNPOOLED`。
- Vercel Functions 通过 `attachDatabasePool` 管理空闲连接，开发环境复用 Prisma 客户端。
- bcrypt 保存密码哈希，HttpOnly Cookie 保存随机会话令牌，数据库仅存令牌哈希；会话有效期 14 天。

Vercel 原独立 Postgres 产品已停止提供，新项目通过 Marketplace 接入。这里采用 Vercel 管理的 Neon 集成，详见 [Vercel Postgres 文档](https://vercel.com/docs/postgres)。

## 功能

界面统一使用 HeroUI 3 的卡片、按钮、输入框、选择器、复选框、状态标签和反馈提示，支持桌面与手机布局。主题变量在 `src/app/globals.css` 中配置，共用组件在 `src/components/ui.tsx` 中封装；数据读取与表单处理仍由 Next.js Server Components / Server Actions 完成。

- 注册、登录、退出与个人资料编辑。
- 公开玩家卡片展示头像、昵称、宣言、常用位置和常用英雄。
- 战网 ID、段位、在线时间、联系方式与备注仅本人和管理员可见。
- 头像支持 PNG、JPEG、WebP、GIF 文件或外部链接；文件最大 512 KB，存入数据库。
- 管理员审核账号与资料，普通用户修改资料后需重新审核。
- 活动列表、详情、创建、编辑与状态管理。
- 报名审核分为「待审核 / 已通过 / 已拒绝」三栏，切换时显示对应报名与数量，已取消的报名不参与审核。
- 活动按上海日期安排，报名截止日期包含当天；已发布活动在当天自动进行中，次日自动结束，草稿和已取消活动保持原状态。
- 活动类型为内战、娱乐赛、训练赛、观赛、自定义；选择自定义后通过弹窗填写名称，名称会出现在公开活动卡片和详情中。
- 账号与资料审核通过后可报名活动；报名需管理员审核，可自行取消。
- 报名检查活动状态、截止时间和已通过人数，并限制重复报名。
- 管理后台包含用户管理、资料审核、报名审核和概览统计。

## 站点设置

管理员登录后进入 `/admin/customize`（后台导航中的“站点设置”），可以修改站点名称、名称旁标识、副标题、站点简介、首页主标题与介绍、页脚信息。

- 品牌图片：导航 Logo、浏览器标签页图标、首页背景图、活动默认封面，支持链接或上传 PNG/JPEG/WebP/GIF（每张最大 2 MB）。
- 主题色：调整按钮、选中状态等位置使用的品牌主色。
- 点击“保存设置”后生效，无需重新部署；支持撤销未保存修改和恢复默认图片。多人同时编辑时会提示版本冲突，防止覆盖其他管理员的修改。

配置存于 `SiteSettings`，图片存于 `SiteAsset`，通过 `/api/site-assets/[id]` 提供公开的只读图片。上传和修改均需要已通过审核的管理员权限。

`src/lib/site-copy.ts` 定义基础品牌文案，`src/lib/site-config.ts` 定义默认值与校验规则。功能按钮、表单提示和状态标签保持固定；活动及玩家数据在对应管理页面编辑。

升级已有部署时执行 `npm run db:deploy` 应用新增迁移；Vercel 的构建命令会自动执行。无数据库的本地预览继续使用默认配置。

运行 `npm test` 验证文案回退、配置边界和图片校验；`npm run lint`、`npm run typecheck`、`npm run build` 检查完整项目。

## 本地运行

使用 Node.js 22 或更新版本，在仓库根目录执行 `npm ci`，然后复制模板：

```powershell
Copy-Item .env.example .env.local
```

macOS / Linux 使用 `cp .env.example .env.local`。Next.js、Prisma CLI 和管理员初始化脚本都会读取根目录 `.env.local`，已有的进程环境变量优先。

**仅预览页面**：保持 `DATABASE_URL` 为空，运行 `npm run dev`，打开 `http://localhost:3000`。首页、活动页和玩家页使用演示数据；写入功能需要数据库。Vercel 构建要求配置真实数据库。

**使用完整功能**：在 `.env.local` 填写数据库地址、管理员用户名及密码，然后执行：

```bash
npm run db:deploy
npm run db:seed
npm run dev
```

初始化只创建或更新管理员，不创建示例活动。重复运行 `db:seed` 会将该管理员的密码更新为当前 `ADMIN_PASSWORD`，不会删除已有玩家或活动。

## 环境变量

| 变量 | 用途 |
| --- | --- |
| `DATABASE_URL` | 应用运行时必需，使用 Neon 提供的 pooled PostgreSQL 连接地址 |
| `DATABASE_URL_UNPOOLED` | 迁移和初始化优先使用的直连地址；本地普通 PostgreSQL 可省略，回退到 `DATABASE_URL` |
| `ADMIN_USERNAME` | 运行 `db:seed` 时的管理员用户名，默认 `admin` |
| `ADMIN_PASSWORD` | 运行 `db:seed` 时必填，至少 8 字符、最多 72 字节、首尾无空白，无默认密码 |
| `NEXT_PUBLIC_SITE_URL` | 可选的完整网站地址；未设置时使用 Vercel 项目域名，本地回退到 `http://localhost:3000` |

管理员环境变量只供初始化脚本使用，正常登录从数据库校验密码。会话由随机令牌和数据库记录管理，无需额外的会话密钥环境变量。

## 数据库与构建命令

| 命令 | 用途 |
| --- | --- |
| `npm run dev` | 本地开发服务器 |
| `npm run build` | 生成 Prisma 客户端并构建 Next.js，不修改数据库 |
| `npm start` | 运行已构建应用 |
| `npm run lint` | ESLint 检查 |
| `npm run typecheck` | 生成 Next.js 路由类型并执行 TypeScript 检查 |
| `npm run db:migrate -- --name change_name` | 在开发数据库生成并应用新迁移 |
| `npm run db:deploy` | 应用已有迁移，适用于新库初始化和部署 |
| `npm run db:seed` | 创建或更新管理员 |
| `npm run db:generate` | 重新生成 Prisma 客户端 |
| `npm run db:push` | 开发原型用，直接同步结构，不生成迁移历史 |
| `npm run vercel-build` | 应用已有迁移，然后构建应用；由 Vercel 配置调用 |

新数据库从 `prisma/migrations/20260905000000_init` 初始化。后续使用 `db:migrate` 生成迁移文件，与代码一起保存。已有表但没有迁移历史的数据库需要先建立基线，见 [Vercel 部署说明](./VERCEL.md)。

## 目录

```text
src/app/               页面、布局与 Server Actions
src/components/        React 组件
src/lib/               会话、数据访问、格式化、头像和演示数据
prisma/schema.prisma   数据模型
prisma/migrations/     版本化 SQL 迁移
prisma/seed.ts         管理员初始化
public/                静态资源
env.config.ts          Prisma 和脚本的环境变量加载
prisma.config.ts       Prisma CLI 配置
vercel.json            Vercel 构建配置
```

完整部署步骤见 [VERCEL.md](./VERCEL.md)。

## 版权说明

本项目为非官方玩家社区工具，不代表上海交通大学、暴雪或守望先锋官方。封面为抽象电竞风格自制图片。
