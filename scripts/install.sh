#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

repo_url='https://github.com/Uniseem/ow-activity-site.git'
ref='main'
install_dir="${PWD}/ow-activity-site"
domain=''
app_port='3100'
port_explicit=0
configure_only=0

usage() {
  cat <<'HELP'
用法：bash install.sh [--domain ow.example.com] [--dir /opt/ow-activity-site]
                     [--port 3100] [--repo https://github.com/用户/仓库.git]
                     [--ref main] [--configure-only]

需要已安装并可访问的 Docker Engine、Docker Compose v2、git、curl、openssl。
默认安装到当前目录的 ow-activity-site，自带 Caddy 自动 HTTPS。
首次安装须把域名解析到当前 VPS，并开放 TCP 80/443、UDP 443。
已有 .env 时保留所有配置和密钥，不接受用 --domain/--port 偷换已有配置。
--configure-only 只下载代码并生成 .env，不启动容器，便于手工 Compose 部署。
HELP
}

fail() { printf '错误：%s\n' "$*" >&2; exit 1; }
need_value() { [[ $# -ge 2 && -n "$2" && "$2" != --* ]] || fail "$1 缺少参数"; }
valid_domain() {
  [[ "$1" =~ ^([A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,63}$ && ${#1} -le 253 ]]
}

while (($#)); do
  case "$1" in
    --domain) need_value "$@"; domain=$2; shift 2 ;;
    --dir) need_value "$@"; install_dir=$2; shift 2 ;;
    --port) need_value "$@"; app_port=$2; port_explicit=1; shift 2 ;;
    --repo) need_value "$@"; repo_url=$2; shift 2 ;;
    --ref) need_value "$@"; ref=$2; shift 2 ;;
    --configure-only) configure_only=1; shift ;;
    --help|-h) usage; exit 0 ;;
    *) fail "不支持的参数：$1（使用 --help 查看说明）" ;;
  esac
done

for dependency in git curl openssl; do
  command -v "$dependency" >/dev/null || fail "请先安装 $dependency";
done
if (( ! configure_only )); then
  command -v docker >/dev/null || fail '请先安装 Docker Engine 和 Compose 插件：https://docs.docker.com/engine/install/'
  docker compose version >/dev/null 2>&1 || fail '需要 Docker Compose v2 插件（docker compose），不是 docker-compose v1'
  docker info >/dev/null 2>&1 || fail '无法连接 Docker：请启动 Docker，并使用有 Docker 权限的用户执行脚本'
  docker compose up --help | grep -q -- '--wait' || fail '请升级 Docker Compose，当前版本不支持 --wait 健康检查'
fi
[[ "$repo_url" =~ ^https://github\.com/[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+(\.git)?$ ]] || fail '--repo 必须是公开 GitHub 仓库的 HTTPS 地址'
git check-ref-format --branch "$ref" >/dev/null 2>&1 || fail '--ref 必须是合法分支名称'
[[ "$app_port" =~ ^[0-9]{1,5}$ ]] && ((10#$app_port >= 1024 && 10#$app_port <= 65535)) || fail '--port 应为 1024–65535'
app_port=$((10#$app_port))
[[ -n "$install_dir" && "$install_dir" != / ]] || fail '--dir 不能是空目录或根目录'
[[ -z "$domain" ]] || valid_domain "$domain" || fail '请输入有效公网域名，不要添加协议、端口或路径'

if [[ -e "$install_dir" && ! -d "$install_dir/.git" ]]; then
  fail "$install_dir 已存在且不是 Git 仓库，请选择其他目录；脚本不会覆盖文件"
fi
if [[ ! -d "$install_dir/.git" ]]; then
  printf '正在下载 %s（%s）…\n' "$repo_url" "$ref"
  git clone --branch "$ref" --single-branch -- "$repo_url" "$install_dir"
else
  actual_remote=$(git -C "$install_dir" remote get-url origin)
  [[ "${actual_remote%.git}" == "${repo_url%.git}" ]] || fail '已有目录的 origin 与 --repo 不同，请传入原仓库地址'
  [[ -z "$(git -C "$install_dir" status --porcelain)" ]] || fail '工作目录存在代码修改，先保存修改后再更新；.env 不受影响'
  actual_branch=$(git -C "$install_dir" symbolic-ref --short HEAD)
  [[ "$actual_branch" == "$ref" ]] || fail "当前分支是 $actual_branch，请使用 --ref $actual_branch，或自行切换分支"
  git -C "$install_dir" pull --ff-only origin "$ref"
fi
cd -- "$install_dir"
install_dir=$PWD
[[ -f compose.yml && -f Dockerfile ]] || fail '此版本缺少 Docker 部署文件，请检查仓库和分支'

# Never source a .env file as shell code, or print its secret values.
env_value() {
  awk -v key="$1" 'index($0, key "=") == 1 { value=substr($0,length(key)+2); sub(/\r$/, "", value); print value; exit }' .env
}

[[ ! -L .env ]] || fail '已有 .env 是符号链接，请改用安装目录内的独立配置文件'
if [[ -f .env ]]; then
  printf '保留 %s/.env 中的现有配置和密钥。\n' "$install_dir"
  existing_domain=$(env_value SITE_DOMAIN)
  [[ -z "$domain" || "$domain" == "$existing_domain" ]] || fail '已有 .env 的域名不同。请手动修改 SITE_DOMAIN 和 NEXT_PUBLIC_SITE_URL，再重新运行'
  existing_port=$(env_value APP_PORT)
  (( ! port_explicit )) || [[ "$app_port" == "$existing_port" ]] || fail '已有 .env 的端口不同。请手动修改 APP_PORT 后重新运行'
else
  if [[ -z "$domain" ]]; then
    [[ -r /dev/tty ]] || fail '首次安装需要 --domain ow.example.com；无交互终端时不能自动猜测域名'
    read -r -p '请输入已经解析到这台 VPS 的域名（不带 https://）：' domain </dev/tty
  fi
  valid_domain "$domain" || fail '请输入有效公网域名，不要添加协议、端口或路径'
  temporary_env=$(mktemp .env.install.XXXXXX)
  trap '[[ -z "${temporary_env:-}" ]] || rm -f -- "$temporary_env"' EXIT
  {
    printf 'COMPOSE_PROJECT_NAME=ow-activity-site\nPOSTGRES_DB=ow_activity\nPOSTGRES_USER=ow_activity\n'
    printf 'POSTGRES_PASSWORD=%s\n' "$(openssl rand -hex 32)"
    printf 'OAUTH_ENCRYPTION_KEY=%s\n' "$(openssl rand -hex 32)"
    printf 'CRON_SECRET=%s\n' "$(openssl rand -hex 32)"
    printf 'SITE_DOMAIN=%s\nNEXT_PUBLIC_SITE_URL=https://%s\n' "$domain" "$domain"
    printf 'APP_PORT=%s\nCOMPOSE_PROFILES=https\nAPP_GIT_COMMIT_SHA=\n' "$app_port"
  } >"$temporary_env"
  mv -- "$temporary_env" .env
  temporary_env=''
fi
chmod 600 .env

for secret_name in POSTGRES_PASSWORD OAUTH_ENCRYPTION_KEY CRON_SECRET; do
  value=$(env_value "$secret_name")
  [[ "$value" =~ ^[a-fA-F0-9]{64}$ ]] || fail ".env 中的 $secret_name 必须是 openssl rand -hex 32 生成的 64 位十六进制；已有数据库不能直接重设密码"
done
site_url=$(env_value NEXT_PUBLIC_SITE_URL)
[[ "$site_url" =~ ^https://[^/[:space:]]+/?$ ]] || fail '.env 中 NEXT_PUBLIC_SITE_URL 必须为 https://域名（无额外路径）'
existing_domain=$(env_value SITE_DOMAIN)
valid_domain "$existing_domain" || fail '.env 中 SITE_DOMAIN 必须为有效公网域名'
compose_profiles=$(env_value COMPOSE_PROFILES)
if [[ ",$compose_profiles," == *,https,* ]]; then
  [[ "${site_url%/}" == "https://$existing_domain" ]] || fail '使用 Caddy 时 SITE_DOMAIN 与 NEXT_PUBLIC_SITE_URL 必须指向同一个域名'
fi
for database_name in POSTGRES_USER POSTGRES_DB; do
  value=$(env_value "$database_name")
  [[ "$value" =~ ^[a-zA-Z_][a-zA-Z0-9_]{0,62}$ ]] || fail ".env 中 $database_name 请使用字母、数字和下划线，建议保留默认值"
done
existing_port=$(env_value APP_PORT)
[[ "$existing_port" =~ ^[0-9]{1,5}$ ]] && ((10#$existing_port >= 1024 && 10#$existing_port <= 65535)) || fail '.env 中 APP_PORT 应为 1024–65535'
export APP_GIT_COMMIT_SHA
APP_GIT_COMMIT_SHA=$(git rev-parse HEAD)

if (( configure_only )); then
  printf '配置完成：%s/.env\n进入该目录后运行 docker compose up -d --build --wait 即可启动。\n' "$install_dir"
  exit 0
fi

# Compose normally lets exported shell variables override .env. Use exactly
# the validated site's values, even when this shell previously managed a fork.
compose() {
  env -u COMPOSE_PROJECT_NAME -u COMPOSE_PROFILES -u COMPOSE_FILE \
    -u POSTGRES_DB -u POSTGRES_USER -u POSTGRES_PASSWORD \
    -u NEXT_PUBLIC_SITE_URL -u SITE_DOMAIN -u APP_PORT \
    -u OAUTH_ENCRYPTION_KEY -u CRON_SECRET \
    docker compose --project-directory "$install_dir" --env-file "$install_dir/.env" \
      --file "$install_dir/compose.yml" "$@"
}

# Build first: build failures leave the currently running website untouched.
compose config --quiet
printf '构建网站镜像，现有网站会保持运行…\n'
compose build --pull
compose up -d --wait db
# Abort before replacing the website if migration fails. Never reset the database.
compose run --rm migrate
compose up -d --wait --wait-timeout 180
printf '\n部署完成：%s\n首次访问 %s/admin/setup 注册管理员。\n' "$site_url" "${site_url%/}"
printf '配置目录：%s\n以后重复执行同一条安装命令即可更新，数据库卷和密钥会保留。\n' "$install_dir"
printf '若证书尚未签发，请查看 docker compose logs caddy，并检查域名解析和 80/443 端口。\n'
