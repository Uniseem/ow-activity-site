# VPS 部署

提供一行安装脚本和 Docker Compose 两种方式。网站、PostgreSQL、活动日期同步任务都运行在自己的 VPS；可选 Caddy 自动申请和续期 HTTPS 证书。上传的图片存入数据库，数据库使用独立持久卷。

## 一行安装

适用于已安装 **Docker Engine、Docker Compose v2 插件、git、curl、openssl** 的 Linux VPS，例如 Ubuntu / Debian。Docker 需支持 `docker compose up --wait`，执行用户需要 Docker 权限。Docker 安装方法见 [官方安装文档](https://docs.docker.com/engine/install/)。建议至少 2 核、4 GB 内存，构建时需要额外磁盘空间。

先将域名的 A / AAAA 记录解析到 VPS，开放 TCP 80、443 和 UDP 443；没有 IPv6 的服务器不要保留错误的 AAAA 记录。将下面的 `ow.example.com` 换成自己的域名：

```bash
curl -fsSL https://raw.githubusercontent.com/Uniseem/ow-activity-site/main/scripts/install.sh | bash -s -- --domain ow.example.com
```

默认目录是执行命令时所在目录下的 `ow-activity-site`。指定目录和本机监听端口：

```bash
curl -fsSL https://raw.githubusercontent.com/Uniseem/ow-activity-site/main/scripts/install.sh | bash -s -- --domain ow.example.com --dir /opt/ow-activity-site --port 3100
```

没有传入 `--domain` 时，会从终端询问，`curl | bash` 也可以输入。无终端的自动化任务必须提供域名。脚本不会自动改动系统防火墙或安装 Docker。

脚本下载代码、生成随机数据库密码和加密密钥、在这台机器上构建镜像、执行迁移、启动服务。成功后打开 `https://自己的域名/admin`，没有管理员时会转到 `/admin/setup`，可以注册首位管理员，也可以上传以前的备份 ZIP 恢复。新站点请马上做完这一步。

重复运行**同一条命令、同一个安装目录**即可更新；现有 `.env`、数据库卷、证书卷均保留。存在代码修改或仓库分支不一致时脚本会停止，不会覆盖修改。支持 `--repo https://github.com/用户名/仓库.git --ref main` 部署自己的公开 fork。

安装脚本要求使用有效公网域名和 HTTPS。生产登录 Cookie 使用 Secure 属性，不能用 `http://服务器IP:端口` 作为正常登录地址。

## 直接使用 Docker Compose

```bash
git clone https://github.com/Uniseem/ow-activity-site.git
cd ow-activity-site
cp deploy/.env.example .env
chmod 600 .env
```

编辑 `.env`：

| 配置 | 填写方法 |
| --- | --- |
| `SITE_DOMAIN` | 已解析到 VPS 的域名，例如 `ow.example.com` |
| `NEXT_PUBLIC_SITE_URL` | 对应完整地址，例如 `https://ow.example.com` |
| `POSTGRES_PASSWORD` | 单独运行 `openssl rand -hex 32` 生成 |
| `OAUTH_ENCRYPTION_KEY` | 再运行一次 `openssl rand -hex 32` 生成；保持不变 |
| `CRON_SECRET` | 再运行一次 `openssl rand -hex 32` 生成 |
| `APP_PORT` | 本机回环地址监听端口，默认 `3100` |
| `COMPOSE_PROFILES` | 使用自带 Caddy 时为 `https`；已有 HTTPS 代理时清空 |
| `COMPOSE_PROJECT_NAME` | 默认 `ow-activity-site`；同机多站点使用不同名称和端口 |

三项随机值必须分别生成，保持原始十六进制，不加引号。数据库用户名和数据库名使用默认值即可。不要把真实 `.env` 提交到 Git。

也可让脚本仅生成配置，然后自己管理 Compose：

```bash
bash scripts/install.sh --dir "$PWD" --domain ow.example.com --configure-only
```

启动：

```bash
export APP_GIT_COMMIT_SHA="$(git rev-parse HEAD)"
docker compose up -d --build --wait --wait-timeout 180
```

Compose 先等待数据库健康，再完成 Prisma 迁移，最后启动网站和每分钟的活动状态同步任务。活动日期仍按照上海时间计算。Caddy 仅在网站健康后启动。证书签发有时晚于容器启动，使用 `docker compose logs caddy` 查看进展。

网站端口只绑定 `127.0.0.1`，数据库没有公开端口。通过 Caddy 访问 HTTPS 域名即可。Caddy 根据域名自动申请证书；更多行为见 [Caddy 自动 HTTPS 文档](https://caddyserver.com/docs/automatic-https)。

## 已有 Nginx / Caddy / 其他 HTTPS 代理

将 `.env` 中的 `COMPOSE_PROFILES` 留空，保留 `NEXT_PUBLIC_SITE_URL=https://自己的域名`，自己的代理转发到 `127.0.0.1:3100`（或 `APP_PORT`）。转发原始 Host、`X-Forwarded-Host` 和 `X-Forwarded-Proto`，关闭响应缓冲以保留 Next.js 流式响应。需自己管理证书。

如果反向代理也在 Docker 中，请将它连接到同一网络并代理 `app:3000`；不能在另一个容器内用 `127.0.0.1` 访问本网站容器。

## 更新与维护

使用安装脚本的站点重复运行原安装命令。手动 Compose 部署的更新：

```bash
git pull --ff-only
export APP_GIT_COMMIT_SHA="$(git rev-parse HEAD)"
docker compose build --pull
docker compose up -d --wait db
docker compose run --rm migrate
docker compose up -d --wait --wait-timeout 180
```

构建期间原网站继续运行。Docker 在最终运行镜像内检查服务启动、登录页、静态资源和健康接口，缺少运行依赖时会中止构建，构建失败不会替换原容器。迁移失败时先处理错误再继续启动，不要执行数据库 reset。更新前可先在管理员后台导出网站备份；已经执行的数据迁移不能靠切回旧镜像自动撤销。

安装脚本只使用当前站点 `.env` 的配置，避免终端里遗留的其他站点环境变量覆盖域名、密码或 Compose 项目名。使用自带 Caddy 时，`NEXT_PUBLIC_SITE_URL` 必须与 `SITE_DOMAIN` 一致。手动执行 Compose 命令时，也应避免导出同名环境变量。

```bash
docker compose ps
docker compose logs --tail=100 app migrate
docker compose logs --tail=100 caddy scheduler
curl -fsS http://127.0.0.1:3100/api/health
```

停止容器可用 `docker compose down`，它会保留数据。**不要执行 `docker compose down -v`，也不要删除 `postgres_data` 卷**，否则会删除该站点数据库。不要修改已有数据库的 `POSTGRES_PASSWORD` 后直接重启，PostgreSQL 不会据此修改已有账号密码。

OAuth 客户端配置仍在管理员后台填写。更换域名后，更新 Google / GitHub 应用的回调地址。后台的 Vercel Deploy Hook 只对 Vercel 有用；VPS 更新用上面的命令。

同机多站点必须使用独立的 Compose 项目名、安装目录、数据库卷和本机端口；共用服务器的 80/443 时应由统一反向代理管理域名。

## 仓库镜像和验收

推到 `main` 时，GitHub Actions 在 Ubuntu 上构建 `runner`、`migrate` 镜像，并推到 `ghcr.io/uniseem/ow-activity-site`（标签为提交 SHA 和 `main`；迁移镜像带 `-migrate` 后缀）。Pull Request 会构建这两份镜像，但不推仓库。`scripts/install.sh` 和 `compose.yml` 仍在目标 VPS 上 `docker compose build`，不会去拉 GHCR。

仓库不会自动连上任何 VPS。脚本语法可以用 `bash -n scripts/install.sh` 检查，`bash deploy/test-install.sh` 用模拟 Git / Docker 看密钥是否保留、参数错误和构建 / 迁移失败会不会中止，不会启动容器或改真实数据库。第一次在目标机安装时，仍要确认镜像构建、迁移、证书和管理员登录都成功。
