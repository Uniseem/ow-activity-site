#!/usr/bin/env bash
# Exercise the installer without network calls, containers, or a real database.
set -Eeuo pipefail
repository_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
fixture_root=$(mktemp -d "${TMPDIR:-/tmp}/ow-install-test.XXXXXX")
cleanup() {
  case "$fixture_root" in
    "${TMPDIR:-/tmp}"/ow-install-test.*) rm -rf -- "$fixture_root" ;;
    *) printf '拒绝清理意外路径：%s\n' "$fixture_root" >&2 ;;
  esac
}
trap cleanup EXIT
mkdir -p "$fixture_root/bin"
export FIXTURE_COMMANDS="$fixture_root/commands.log"

cat >"$fixture_root/bin/git" <<'MOCK'
#!/usr/bin/env bash
set -eu
if [[ "${1:-}" == -C ]]; then shift 2; fi
case "${1:-}" in
  clone) target=${*: -1}; mkdir -p "$target/.git"; touch "$target/compose.yml" "$target/Dockerfile" ;;
  remote) printf 'https://github.com/Uniseem/ow-activity-site.git\n' ;;
  status) printf '%s' "${MOCK_DIRTY:-}" ;;
  symbolic-ref) printf 'main\n' ;;
  rev-parse) printf '1234567890123456789012345678901234567890\n' ;;
  check-ref-format|pull) : ;;
  *) exit 2 ;;
esac
MOCK

cat >"$fixture_root/bin/docker" <<'MOCK'
#!/usr/bin/env bash
set -eu
if [[ "${1:-}" == compose && "${2:-}" == --project-directory ]]; then
  [[ -z "${POSTGRES_PASSWORD:-}" && -z "${NEXT_PUBLIC_SITE_URL:-}" && -z "${COMPOSE_PROJECT_NAME:-}" ]]
  [[ "${APP_GIT_COMMIT_SHA:-}" == 1234567890123456789012345678901234567890 ]]
  shift 7
  set -- compose "$@"
fi
printf '%s\n' "$*" >>"$FIXTURE_COMMANDS"
case "$*" in
  'compose version') printf 'Docker Compose version v2.29.2\n' ;;
  'compose up --help') printf '%s\n' '--wait --wait-timeout' ;;
esac
if [[ -n "${MOCK_DOCKER_FAIL:-}" && "$*" == *"$MOCK_DOCKER_FAIL"* ]]; then exit 1; fi
MOCK
chmod +x "$fixture_root/bin/git" "$fixture_root/bin/docker"
export PATH="$fixture_root/bin:$PATH"
installer="$repository_dir/scripts/install.sh"
target="$fixture_root/site"

expect_failure() {
  if bash "$installer" "$@" >"$fixture_root/result.log" 2>&1; then
    printf '预期失败却成功：%s\n' "$*" >&2
    exit 1
  fi
}

bash "$installer" --domain ow.example.com --dir "$target" >"$fixture_root/result.log"
[[ -f "$target/.env" ]]
[[ $(grep -Ec '^(POSTGRES_PASSWORD|OAUTH_ENCRYPTION_KEY|CRON_SECRET)=[0-9a-f]{64}$' "$target/.env") == 3 ]]
grep -q '^SITE_DOMAIN=ow.example.com$' "$target/.env"
grep -q '^compose run --rm migrate$' "$FIXTURE_COMMANDS"
grep -q '^compose up -d --wait --wait-timeout 180$' "$FIXTURE_COMMANDS"
cp "$target/.env" "$fixture_root/original.env"

bash "$installer" --domain ow.example.com --dir "$target" >"$fixture_root/result.log"
cmp -s "$target/.env" "$fixture_root/original.env"
POSTGRES_PASSWORD=wrong NEXT_PUBLIC_SITE_URL=https://wrong.example.com COMPOSE_PROJECT_NAME=another-site \
  bash "$installer" --domain ow.example.com --dir "$target" >"$fixture_root/result.log"
cmp -s "$target/.env" "$fixture_root/original.env"
expect_failure --domain other.example.com --dir "$target"
expect_failure --port 3200 --dir "$target"
expect_failure --port 99999 --dir "$target"
expect_failure --domain
expect_failure --unknown-option
expect_failure --repo 'https://example.com/other.git' --dir "$target"
expect_failure --domain 'https://ow.example.com' --dir "$target"
MOCK_DIRTY=' M Dockerfile' expect_failure --dir "$target"
cmp -s "$target/.env" "$fixture_root/original.env"

sed 's|NEXT_PUBLIC_SITE_URL=https://ow.example.com|NEXT_PUBLIC_SITE_URL=https://other.example.com|' "$fixture_root/original.env" >"$target/.env"
expect_failure --dir "$target"
cp "$fixture_root/original.env" "$target/.env"

: >"$FIXTURE_COMMANDS"
MOCK_DOCKER_FAIL='compose build' expect_failure --dir "$target"
! grep -q '^compose up -d' "$FIXTURE_COMMANDS"

: >"$FIXTURE_COMMANDS"
MOCK_DOCKER_FAIL='compose run --rm migrate' expect_failure --dir "$target"
! grep -q '^compose up -d --wait --wait-timeout' "$FIXTURE_COMMANDS"

: >"$FIXTURE_COMMANDS"
bash "$installer" --configure-only --domain ow.example.com --dir "$fixture_root/config-only" >"$fixture_root/result.log"
[[ -f "$fixture_root/config-only/.env" && ! -s "$FIXTURE_COMMANDS" ]]
printf '安装脚本测试通过：初次安装、密钥保留、参数校验、修改保护、构建/迁移失败中止、仅配置模式。\n'
