# 上海交大守望先锋社区

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

界面使用 HeroUI 3 官方默认浅色主题及其卡片、按钮、输入框、选择器、复选框、状态标签和反馈提示，支持桌面与手机布局。保留默认品牌配色，在有封面的活动、文章卡片与悬浮胶囊导航上增加局部玻璃材质；共用组件在 `src/components/ui.tsx` 中封装。数据读取与表单处理由 Next.js Server Components / Server Actions 完成。

- 注册、登录、退出与个人资料编辑。
- Google / GitHub 一键登录：未配置或未启用时按钮置灰，管理员在后台填写 OAuth 应用信息后启用；新用户仍需审核。
- 首次打开 `/admin` 时可以注册首位管理员；第一个成功提交的账号自动获得管理权限，此后入口永久关闭。普通玩家注册仍需审核。
- 公开玩家卡片左侧约三分之一为圆角方形头像，右侧展示昵称、宣言、常用位置和常用英雄。
- 战网 ID、段位、在线时间、联系方式与备注仅本人和管理员可见。
- 头像支持 PNG、JPEG、WebP、GIF 文件或外部链接；文件最大 512 KB，存入数据库。
- 管理员审核账号与资料，普通用户修改资料后需重新审核。
- 活动列表、详情、创建、编辑与状态管理。
- 每场活动可设置独立封面，支持上传、链接和移除；未设置时使用站点默认活动封面，两者都为空时不显示图片或占位。
- 报名审核分为「待审核 / 已通过 / 已拒绝」三栏，切换时显示对应报名与数量，已取消的报名不参与审核。
- 活动按上海日期安排，报名截止日期包含当天；已发布活动在当天自动进行中，次日自动结束，草稿和已取消活动保持原状态。
- 活动类型为内战、娱乐赛、训练赛、观赛、自定义；选择自定义后通过弹窗填写名称，名称会出现在公开活动卡片和详情中。
- 账号与资料审核通过后可报名活动；报名需管理员审核，可自行取消。
- 报名检查活动状态、截止时间和已通过人数，并限制重复报名。
- 管理后台以待办为首页，活动、文章与用户采用列表进入具体操作；报名审核与活动设置分开，次要设置按需展开。
- 社区文章：后台嵌入开源 Tiptap 富文本编辑器，支持 Markdown 源码、预览、导入导出、图片、表格，以及草稿、发布、撤回和删除；前台提供文章列表、搜索、分页和阅读页。

首页将近期活动和最新文章并排展示，每栏首条突出，其余条目紧凑排列，手机上转为单栏；下方“交大玩家”以横向卡片带展示查询到的最多 8 名玩家。卡片溢出时约每 5 秒缓动切换一张，到达两端后反向；支持左右按钮、键盘与原生触摸滚动，并提供暂停按钮。鼠标停留、键盘聚焦、区域离屏、页面隐藏或系统启用“减少动态效果”时暂停自动滚动，手动操作后保持暂停，可点击继续。

有封面的活动和文章以图片铺底，文字置于中央圆角液态玻璃面板；没有封面或图片加载失败时使用普通 HeroUI 卡片。前后台顶栏采用留有边距的悬浮磨砂胶囊，向下滚动时收起，向上滚动时显示；页面顶部、菜单打开或键盘焦点位于顶栏时保持可见。公共导航切换首页、活动、文章、玩家时，同一个选中背景以非线性缓动滑向目标，导航仍使用真实链接，支持子路由、浏览器返回与新标签页。不支持 `backdrop-filter` 或偏好减少透明度时回退到实色表面。管理导航仅在后台显示。

前后台共用非线性缓动，覆盖页面切换、按钮与输入框反馈、卡片与封面悬停、菜单和弹窗进出、选项卡切换、通知及折叠设置。页面入场不重新挂载表单；系统启用“减少动态效果”时取消位移入场并缩短界面动画。动效定义位于 `src/app/motion.css`，顶栏滚动逻辑位于 `src/components/floating-header.tsx`，页面入场位于 `src/components/route-motion.tsx`。详见 [前端设计说明](./docs/前端设计说明.md) 和 [文章功能说明](./docs/文章功能说明.md)。

玩家滚动组件与步进曲线位于 `src/components/player-carousel.tsx`、`src/lib/carousel-motion.ts`，样式位于 `src/app/player-carousel.css`；胶囊导航选中背景位于 `src/components/community-navigation.tsx` 和 `src/app/nav-indicator.css`。

## 站点设置

管理员登录后进入 `/admin/customize`（后台导航中的“基本设置”），可以修改站点名称、站点简介、首页主标题与介绍、页脚信息。导航只显示站名，上传 Logo 后在站名旁显示，不再使用默认十字标识或英文副标题。

- 品牌图片：导航 Logo、浏览器标签页图标直接在“品牌信息”中编辑，支持链接或上传 PNG/JPEG/WebP/GIF（每张最大 2 MB）、预览与清除。首页配图和活动默认封面收在“可选配图”；活动优先使用自己的封面，未设置时使用这里的默认封面。
- 主题：固定采用 HeroUI 官方默认配色，不再提供主色选择器。旧版颜色配置保留存储兼容，但不参与界面渲染。
- 点击“保存设置”后生效，无需重新部署；支持撤销未保存修改和清除图片。多人同时编辑时会提示版本冲突，防止覆盖其他管理员的修改。

配置存于 `SiteSettings`，图片存于 `SiteAsset`，通过 `/api/site-assets/[id]` 提供公开的只读图片。上传和修改均需要已通过审核的管理员权限。

`src/lib/site-copy.ts` 定义基础品牌文案，`src/lib/site-config.ts` 定义默认值与校验规则。功能按钮、表单提示和状态标签保持固定；活动及玩家数据在对应管理页面编辑。

升级已有部署时执行 `npm run db:deploy` 应用新增迁移；Vercel 的构建命令会自动执行。无数据库的本地预览继续使用默认配置。

运行 `npm test` 验证文案回退、配置边界和图片校验；`npm run lint`、`npm run typecheck`、`npm run build` 检查完整项目。

## 第三方登录

管理员进入 `/admin/oauth`（后台“第三方登录”），分别填写 Google、GitHub 的 Client ID 和 Client Secret，勾选启用后保存。页面提供各平台的回调地址和应用创建入口；配置不完整时不能启用，停用后登录页按钮立即变灰。

Google 需要创建 Web 应用 OAuth 客户端，GitHub 需要创建 OAuth App。回调地址分别是站点域名下的 `/api/auth/google/callback` 和 `/api/auth/github/callback`，以后台显示的完整地址为准。Google 只请求基本资料与邮箱，GitHub 只请求 `read:user user:email`，不会申请仓库权限。

部署环境需设置 `OAUTH_ENCRYPTION_KEY`（64 位随机十六进制字符），用于 AES-256-GCM 加密客户端密钥及登录流程 cookie。密钥保存到数据库后不会回显，Client Secret 留空表示保留，清除密钥前须关闭对应登录方式。加密密钥应长期保留；更换后需在后台重新填写客户端密钥。

已有账号可在个人中心绑定 Google 或 GitHub，绑定后保留原资料和权限；不会因为邮箱相同自动合并账号。直接使用第三方注册的新账号没有密码，使用对应平台登录，账号与资料均进入待审核状态。第三方登录不会创建管理员，也不会重新开放首次管理员注册。

OAuth 使用授权码、S256 PKCE、一次性 state 和 HttpOnly cookie；Google ID token 额外校验签名、发行方、受众、有效期、nonce 与已验证邮箱。账号关联使用 Google `sub` 或 GitHub 数字 ID，不保存平台的 access token 或 refresh token。邮箱只在本人登录方式区域显示。

`npm test` 验证加密、状态校验、Google 签名及 GitHub 令牌交换；设置 `OAUTH_TEST_DATABASE_URL` 后运行 `npm run test:oauth`，验证配置保存、并发注册、绑定权限、停用和回调防重放。数据库测试创建独立临时 schema，完成后清理。

## 本地运行

使用 Node.js 22 或更新版本，在仓库根目录执行 `npm ci`，然后复制模板：

```powershell
Copy-Item .env.example .env.local
```

macOS / Linux 使用 `cp .env.example .env.local`。Next.js、Prisma CLI 和管理员初始化脚本都会读取根目录 `.env.local`，已有的进程环境变量优先。

**仅预览页面**：保持 `DATABASE_URL` 为空，运行 `npm run dev`，打开 `http://localhost:3000`。首页、活动页和玩家页使用演示数据；写入功能需要数据库。Vercel 构建要求配置真实数据库。

**使用完整功能**：在 `.env.local` 填写数据库地址，然后执行：

```bash
npm run db:deploy
npm run dev
```

打开 `/admin`，设置首位管理员的用户名、昵称与密码，注册成功后直接进入后台。初始化不创建示例活动；多个访客同时提交时，仅一人能成功。已有管理员的站点升级后不会开放注册，管理员之后被封禁或删除也不会重新开放。

需要命令行初始化或恢复管理员时，仍可设置 `ADMIN_USERNAME` 和 `ADMIN_PASSWORD` 后运行 `npm run db:seed`。该命令会关闭网页首次注册入口，并创建或更新指定管理员；重复执行会重设其密码，不会删除其他用户和活动。

`npm test` 包含首次管理员表单校验。设置 `ADMIN_SETUP_TEST_DATABASE_URL` 后运行 `npm run test:admin-setup`，可验证数据库并发注册、失败回滚及旧站点升级；测试创建独立临时 schema，并在完成后清理。

## 管理员更新提醒

管理员登录后，页面会主动检查 GitHub；登录期间每 5 分钟检查一次。发现当前部署之后的新提交时弹出更新提示，每条 commit 显示一行首行说明，超过 100 条可继续加载。普通用户不会触发检查或看到更新信息。“稍后再说”只对本次登录有效，下一次登录或出现新的提交时会再次提示。

在 **后台 → 版本更新** 设置公开 GitHub 仓库链接，默认为 `https://github.com/Uniseem/ow-activity-site`；分支留空表示默认分支。检查以构建时固定的 commit SHA 为基准，部署请求、关闭提醒和保存配置都不会推进版本号。无法比较的仓库、分叉历史和网络失败会显示实际原因。

管理员可以填写 Vercel Deploy Hook，之后在提示中确认更新以触发生产部署。Hook 使用 `OAUTH_ENCRYPTION_KEY` 加密保存且不回显；未配置时仍提示更新，但无法触发部署。更换仓库或分支时需重新填写对应 Hook。Vercel 接受请求只表示开始部署，部署成功并刷新页面后才会读取新版本。多位管理员同时确认只会发出一个部署请求，10 分钟内防止重复触发。

Deploy Hook 只部署其绑定的仓库分支，不会自动合并上游仓库；监测上游时需先同步代码。详细设置见 [Vercel 部署说明](./VERCEL.md)。`npm run test:updates` 使用 `UPDATE_TEST_DATABASE_URL` 在独立临时 schema 验证缓存、并发、配置及部署流程，外部部署请求使用模拟响应。

## 环境变量

| 变量                    | 用途                                                                                 |
| ----------------------- | ------------------------------------------------------------------------------------ |
| `DATABASE_URL`          | 应用运行时必需，使用 Neon 提供的 pooled PostgreSQL 连接地址                          |
| `DATABASE_URL_UNPOOLED` | 迁移和初始化优先使用的直连地址；本地普通 PostgreSQL 可省略，回退到 `DATABASE_URL`    |
| `ADMIN_USERNAME`        | 运行 `db:seed` 时的管理员用户名，默认 `admin`                                        |
| `ADMIN_PASSWORD`        | 运行 `db:seed` 时必填，至少 8 字符、最多 72 字节、首尾无空白，无默认密码             |
| `NEXT_PUBLIC_SITE_URL`  | 可选的完整网站地址；未设置时使用 Vercel 项目域名，本地回退到 `http://localhost:3000` |
| `OAUTH_ENCRYPTION_KEY`  | OAuth 密钥与 Deploy Hook 的加密密钥，64 位随机十六进制字符；各项配置在后台填写       |
| `APP_GIT_COMMIT_SHA`    | 可选，当前构建的完整 commit SHA；无 Git 元数据的 CLI 部署需显式传入                  |

管理员环境变量只供初始化脚本使用，正常登录从数据库校验密码。会话由随机令牌和数据库记录管理，无需额外的会话密钥环境变量。

## 数据库与构建命令

| 命令                                       | 用途                                           |
| ------------------------------------------ | ---------------------------------------------- |
| `npm run dev`                              | 本地开发服务器                                 |
| `npm run build`                            | 生成 Prisma 客户端并构建 Next.js，不修改数据库 |
| `npm start`                                | 运行已构建应用                                 |
| `npm run lint`                             | ESLint 检查                                    |
| `npm run typecheck`                        | 生成 Next.js 路由类型并执行 TypeScript 检查    |
| `npm run db:migrate -- --name change_name` | 在开发数据库生成并应用新迁移                   |
| `npm run db:deploy`                        | 应用已有迁移，适用于新库初始化和部署           |
| `npm run db:seed`                          | 创建或更新管理员                               |
| `npm run db:generate`                      | 重新生成 Prisma 客户端                         |
| `npm run db:push`                          | 开发原型用，直接同步结构，不生成迁移历史       |
| `npm run vercel-build`                     | 应用已有迁移，然后构建应用；由 Vercel 配置调用 |

新数据库从 `prisma/migrations/20260905000000_init` 初始化。后续使用 `db:migrate` 生成迁移文件，与代码一起保存。已有表但没有迁移历史的数据库需要先建立基线，见 [Vercel 部署说明](./VERCEL.md)。

本次活动独立封面使用迁移 `20260906010000_event_cover`，为 `Event` 增加 `coverUrl`。现有活动保持空值并回落到站点默认封面。部署这版代码时需执行 `npm run db:deploy`；Vercel 的 `vercel-build` 已包含该步骤。本地数据库已应用此迁移，生产环境仍需在部署时执行。

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
