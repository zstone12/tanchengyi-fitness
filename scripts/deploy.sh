#!/usr/bin/env bash
# 把仓库当前提交发布到服务器：静态站点 + 后端服务。
#
#   scripts/deploy.sh             发布 HEAD（要求工作区干净且已推送到 origin）
#   scripts/deploy.sh status      查看线上是哪个提交，以及与本地的差距
#   scripts/deploy.sh rollback    把静态站点切回上一个版本目录（不动后端）
#   scripts/deploy.sh --dry-run   只构建并显示将要发布的内容，不上传
#   scripts/deploy.sh --force     跳过「干净且已推送」检查（线上将标记为 dirty）
#
# 静态站点按版本目录发布：每次在 DEPLOY_RELEASES_DIR 下新建一个目录，
# 再把 DEPLOY_WEB_LINK 这个软链接原子地指过去，所以切换没有中间状态，回滚只是改回链接。
#
# 通过环境变量调整目标（默认值对应当前线上环境）：
#   DEPLOY_HOST          SSH 主机别名               默认 server2
#   DEPLOY_SSH_OPTS      额外的 ssh 参数，如 "-J 跳板机"
#   DEPLOY_WEB_LINK      Web 服务器读取的软链接     默认 /var/www/zy5-tools/training
#   DEPLOY_RELEASES_DIR  版本目录的存放位置         默认 /var/www/tanchengyi-releases
#   DEPLOY_APP_DIR       后端目录                   默认 /opt/zs12-training
#   DEPLOY_URL           发布后检查的公网地址       默认 https://zstone12.xyz/training/
set -euo pipefail

HOST=${DEPLOY_HOST:-server2}
WEB_LINK=${DEPLOY_WEB_LINK:-/var/www/zy5-tools/training}
RELEASES=${DEPLOY_RELEASES_DIR:-/var/www/tanchengyi-releases}
APP_DIR=${DEPLOY_APP_DIR:-/opt/zs12-training}
URL=${DEPLOY_URL:-https://zstone12.xyz/training/}
SERVICE=zs12-training
PORT=3014
KEEP=10
read -r -a SSH_OPTS <<<"${DEPLOY_SSH_OPTS:-}"
remote() { ssh -o ConnectTimeout=20 ${SSH_OPTS[@]+"${SSH_OPTS[@]}"} "$HOST" "$@"; }
public_check() {
  local code api
  if code=$(curl -sS -m 20 -o /dev/null -w '%{http_code}' "$URL" 2>/dev/null) && api=$(curl -sS -m 20 -o /dev/null -w '%{http_code}' "${URL}api/me" 2>/dev/null); then
    echo "公网检查：页面 ${code}，接口 ${api}"
  else
    echo "公网检查未能连接 ${URL}（可能是本机网络的问题，服务器端检查已通过）。"
  fi
}

cd "$(dirname "$0")/.."
MODE=deploy FORCE=0 DRY=0
for arg in "$@"; do
  case "$arg" in
    status|rollback) MODE=$arg ;;
    --force) FORCE=1 ;;
    --dry-run) DRY=1 ;;
    *) echo "未知参数：${arg}（可用：status、rollback、--dry-run、--force）" >&2; exit 2 ;;
  esac
done
SHA=$(git rev-parse --short HEAD)

if [ "$MODE" = status ]; then
  deployed=$(remote "cat '$APP_DIR/DEPLOYED' 2>/dev/null || echo '(未记录)'")
  echo "线上：${deployed}"
  echo "当前目录：$(remote "readlink '$WEB_LINK'")"
  echo "本地：${SHA} $(git log -1 --format=%s)"
  live=${deployed%% *}
  if git cat-file -e "${live}^{commit}" 2>/dev/null; then
    ahead=$(git rev-list --count "${live}..HEAD")
    if [ "$ahead" = 0 ]; then echo "线上已是本地最新提交。"; else echo "本地领先线上 ${ahead} 个提交："; git log --oneline "${live}..HEAD"; fi
  fi
  exit 0
fi

if [ "$MODE" = rollback ]; then
  remote bash -s -- "$WEB_LINK" "$APP_DIR" <<'REMOTE'
set -euo pipefail
WEB_LINK=$1 APP_DIR=$2
[ -f "$APP_DIR/PREVIOUS" ] || { echo "没有可回滚的上一个版本记录。" >&2; exit 1; }
read -r prev_sha prev_dir < "$APP_DIR/PREVIOUS"
[ -d "$prev_dir" ] || { echo "上一个版本目录已不存在：$prev_dir" >&2; exit 1; }
current=$(readlink "$WEB_LINK")
ln -sfn "$prev_dir" "$WEB_LINK.next"
mv -T "$WEB_LINK.next" "$WEB_LINK"
echo "$(cut -d' ' -f1 "$APP_DIR/DEPLOYED") $current" > "$APP_DIR/PREVIOUS"
echo "$prev_sha $(date '+%Y-%m-%d %H:%M:%S %Z') rollback" > "$APP_DIR/DEPLOYED"
echo "静态站点已切回 $prev_dir"
REMOTE
  public_check
  exit 0
fi

if [ "$FORCE" = 0 ]; then
  [ -z "$(git status --porcelain)" ] || { echo "工作区有未提交的改动，先提交（或用 --force）。" >&2; exit 1; }
  git fetch -q origin
  [ "$(git rev-parse HEAD)" = "$(git rev-parse '@{u}')" ] || { echo "HEAD 尚未推送到 origin，先 git push（或用 --force）。" >&2; exit 1; }
else
  [ -z "$(git status --porcelain)" ] || SHA="${SHA}-dirty"
fi

BUILD=$(mktemp -d)
trap 'rm -rf "$BUILD"' EXIT
mkdir -p "$BUILD/web" "$BUILD/server"
cp -Rp dist/. "$BUILD/web/"
cp -p server/server.py "server/$SERVICE.service" "$BUILD/server/"
find "$BUILD" -name .DS_Store -delete

# 给 index.html 里引用的本地 JS/CSS 打上内容哈希，文件一变地址就变，浏览器不会用到旧缓存。
python3 - "$BUILD/web" <<'PY'
import hashlib, os, re, sys
root = sys.argv[1]
path = os.path.join(root, 'index.html')
html = open(path, encoding='utf-8').read()
def stamp(match):
    target = os.path.join(root, match.group(2))
    if not os.path.isfile(target):
        return match.group(0)
    digest = hashlib.sha1(open(target, 'rb').read()).hexdigest()[:10]
    return f'{match.group(1)}="{match.group(2)}?v={digest}"'
html, count = re.subn(r'\b(href|src)="([A-Za-z0-9._-]+\.(?:js|css))(?:\?v=[^"]*)?"', stamp, html)
open(path, 'w', encoding='utf-8').write(html)
print(f'已为 {count} 个 JS/CSS 引用打上内容哈希')
PY

echo "准备发布 ${SHA} 到 ${HOST}：$(find "$BUILD/web" -type f | wc -l | tr -d ' ') 个静态文件 + 后端"
if [ "$DRY" = 1 ]; then
  grep -o -E '[A-Za-z0-9._-]+\.(js|css)\?v=[0-9a-f]+' "$BUILD/web/index.html"
  echo "（dry-run，未上传）"
  exit 0
fi

STAGE=$(remote 'mktemp -d /tmp/training-release.XXXXXX')
COPYFILE_DISABLE=1 tar -czf - -C "$BUILD" web server | remote "cat > '$STAGE/release.tgz'"

remote bash -s -- "$STAGE" "$WEB_LINK" "$RELEASES" "$APP_DIR" "$SERVICE" "$PORT" "$SHA" "$KEEP" <<'REMOTE'
set -euo pipefail
STAGE=$1 WEB_LINK=$2 RELEASES=$3 APP_DIR=$4 SERVICE=$5 PORT=$6 SHA=$7 KEEP=$8
trap 'rm -rf "$STAGE"' EXIT
if [ -e "$WEB_LINK" ] && [ ! -L "$WEB_LINK" ]; then
  echo "$WEB_LINK 不是软链接，无法按版本目录发布。请先把它改成指向版本目录的软链接。" >&2
  exit 1
fi
tar -xzf "$STAGE/release.tgz" -C "$STAGE" --no-same-owner --warning=no-unknown-keyword
python3 -m py_compile "$STAGE/server/server.py"

# 1. 新版本目录先就位（此时还没有流量）。
RELEASE="$RELEASES/$(date +%Y%m%d-%H%M%S)-$SHA"
mkdir -p "$RELEASES" "$APP_DIR"
cp -R "$STAGE/web" "$RELEASE"
chmod -R u=rwX,go=rX "$RELEASE"

# 2. 后端有变化才更新；重启后不健康就回滚 server.py，并放弃这次发布。
health() { for _ in 1 2 3 4 5 6 7 8 9 10; do curl -fsS -m 3 -o /dev/null "http://127.0.0.1:$PORT/training/api/me" && return 0; sleep 0.5; done; return 1; }
restart=0
if ! cmp -s "$STAGE/server/$SERVICE.service" "/etc/systemd/system/$SERVICE.service"; then
  install -m 644 "$STAGE/server/$SERVICE.service" "/etc/systemd/system/$SERVICE.service"
  systemctl daemon-reload
  systemctl enable -q "$SERVICE"
  restart=1
fi
if ! cmp -s "$STAGE/server/server.py" "$APP_DIR/server.py"; then
  if [ -f "$APP_DIR/server.py" ]; then cp -p "$APP_DIR/server.py" "$APP_DIR/server.py.prev"; fi
  install -m 644 "$STAGE/server/server.py" "$APP_DIR/server.py"
  restart=1
fi
if [ "$restart" = 1 ]; then
  systemctl restart "$SERVICE"
  if health; then echo "后端已更新并重启"; else
    echo "后端重启后健康检查失败，正在回滚 server.py；静态站点未切换。" >&2
    if [ -f "$APP_DIR/server.py.prev" ]; then cp -p "$APP_DIR/server.py.prev" "$APP_DIR/server.py"; systemctl restart "$SERVICE"; fi
    journalctl -u "$SERVICE" -n 15 --no-pager >&2
    rm -rf "$RELEASE"
    exit 1
  fi
else
  health || { echo "后端未改动，但健康检查失败；静态站点未切换。" >&2; rm -rf "$RELEASE"; exit 1; }
  echo "后端无改动"
fi

# 3. 原子切换软链接，并记下上一个版本供 rollback 使用。
previous=$(readlink "$WEB_LINK" 2>/dev/null || true)
ln -sfn "$RELEASE" "$WEB_LINK.next"
mv -T "$WEB_LINK.next" "$WEB_LINK"
if [ -n "$previous" ]; then echo "$(cut -d' ' -f1 "$APP_DIR/DEPLOYED" 2>/dev/null || echo unknown) $previous" > "$APP_DIR/PREVIOUS"; fi
echo "$SHA $(date '+%Y-%m-%d %H:%M:%S %Z')" > "$APP_DIR/DEPLOYED"
echo "静态站点已切换到 $RELEASE"

# 4. 只清理本脚本创建的旧版本目录（名字形如 20261123-063547-abc1234），保留最近 $KEEP 个，且不动上一个版本。
find "$RELEASES" -mindepth 1 -maxdepth 1 -type d -regextype posix-extended -regex '.*/[0-9]{8}-[0-9]{6}-[0-9a-f]{7,}(-dirty)?' | sort | head -n -"$KEEP" | while read -r old; do
  if [ "$old" != "$RELEASE" ] && [ "$old" != "$previous" ]; then rm -rf "$old"; echo "已清理旧版本 $old"; fi
done
REMOTE

echo "线上版本：$(remote "cat '$APP_DIR/DEPLOYED'")"
public_check
