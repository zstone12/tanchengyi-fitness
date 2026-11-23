#!/usr/bin/env bash
# 把仓库当前提交发布到服务器：静态站点 + 后端服务。
#
#   scripts/deploy.sh             发布 HEAD（要求工作区干净且已推送到 origin）
#   scripts/deploy.sh status      查看线上是哪个提交，以及与本地的差距
#   scripts/deploy.sh --dry-run   只构建并显示将要发布的内容，不上传
#   scripts/deploy.sh --force     跳过「干净且已推送」检查（线上将标记为 dirty）
#
# 通过环境变量调整目标（默认值对应当前线上环境）：
#   DEPLOY_HOST       SSH 主机别名                 默认 server2
#   DEPLOY_SSH_OPTS   额外的 ssh 参数，如 "-J 跳板机"
#   DEPLOY_WEB_DIR    静态文件目录                 默认 /var/www/zy5-tools/training
#   DEPLOY_APP_DIR    后端目录                     默认 /opt/zs12-training
#   DEPLOY_URL        发布后检查的公网地址         默认 https://zstone12.xyz/training/
set -euo pipefail

HOST=${DEPLOY_HOST:-server2}
WEB_DIR=${DEPLOY_WEB_DIR:-/var/www/zy5-tools/training}
APP_DIR=${DEPLOY_APP_DIR:-/opt/zs12-training}
URL=${DEPLOY_URL:-https://zstone12.xyz/training/}
SERVICE=zs12-training
PORT=3014
read -r -a SSH_OPTS <<<"${DEPLOY_SSH_OPTS:-}"
remote() { ssh -o ConnectTimeout=20 ${SSH_OPTS[@]+"${SSH_OPTS[@]}"} "$HOST" "$@"; }

cd "$(dirname "$0")/.."
MODE=deploy FORCE=0 DRY=0
for arg in "$@"; do
  case "$arg" in
    status) MODE=status ;;
    --force) FORCE=1 ;;
    --dry-run) DRY=1 ;;
    *) echo "未知参数：${arg}（可用：status、--dry-run、--force）" >&2; exit 2 ;;
  esac
done
SHA=$(git rev-parse --short HEAD)

if [ "$MODE" = status ]; then
  deployed=$(remote "cat '$APP_DIR/DEPLOYED' 2>/dev/null || echo '(未记录)'")
  echo "线上：$deployed"
  echo "本地：$SHA $(git log -1 --format=%s)"
  live=${deployed%% *}
  if git cat-file -e "$live^{commit}" 2>/dev/null; then
    ahead=$(git rev-list --count "$live..HEAD")
    [ "$ahead" = 0 ] && echo "线上已是本地最新提交。" || { echo "本地领先线上 $ahead 个提交："; git log --oneline "$live..HEAD"; }
  fi
  exit 0
fi

if [ "$FORCE" = 0 ]; then
  [ -z "$(git status --porcelain)" ] || { echo "工作区有未提交的改动，先提交（或用 --force）。" >&2; exit 1; }
  git fetch -q origin
  [ "$(git rev-parse HEAD)" = "$(git rev-parse '@{u}')" ] || { echo "HEAD 尚未推送到 origin，先 git push（或用 --force）。" >&2; exit 1; }
else
  [ -z "$(git status --porcelain)" ] || SHA="$SHA-dirty"
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

remote bash -s -- "$STAGE" "$WEB_DIR" "$APP_DIR" "$SERVICE" "$PORT" "$SHA" <<'REMOTE'
set -euo pipefail
STAGE=$1 WEB_DIR=$2 APP_DIR=$3 SERVICE=$4 PORT=$5 SHA=$6
trap 'rm -rf "$STAGE"' EXIT
tar -xzf "$STAGE/release.tgz" -C "$STAGE" --no-same-owner --warning=no-unknown-keyword
python3 -m py_compile "$STAGE/server/server.py"

# 发布前备份（不含体积大且不变的 media），只保留最近 10 份。
BACKUPS=/root/backups/training
mkdir -p "$BACKUPS" "$APP_DIR"
BACKUP="$BACKUPS/$(date +%Y%m%d-%H%M%S).tgz"
tar -czf "$BACKUP" --exclude="$(basename "$WEB_DIR")/media" -C "$(dirname "$WEB_DIR")" "$(basename "$WEB_DIR")" -C "$APP_DIR" server.py 2>/dev/null \
  || tar -czf "$BACKUP" --exclude="$(basename "$WEB_DIR")/media" -C "$(dirname "$WEB_DIR")" "$(basename "$WEB_DIR")"
ls -1t "$BACKUPS"/*.tgz | tail -n +11 | xargs -r rm -f
echo "已备份到 $BACKUP"

health() { for _ in 1 2 3 4 5 6 7 8 9 10; do curl -fsS -m 3 -o /dev/null "http://127.0.0.1:$PORT/training/api/me" && return 0; sleep 0.5; done; return 1; }
restart=0
if ! cmp -s "$STAGE/server/$SERVICE.service" "/etc/systemd/system/$SERVICE.service"; then
  install -m 644 "$STAGE/server/$SERVICE.service" "/etc/systemd/system/$SERVICE.service"
  systemctl daemon-reload
  systemctl enable -q "$SERVICE"
  restart=1
fi
if ! cmp -s "$STAGE/server/server.py" "$APP_DIR/server.py"; then
  [ -f "$APP_DIR/server.py" ] && cp -p "$APP_DIR/server.py" "$APP_DIR/server.py.prev"
  install -m 644 "$STAGE/server/server.py" "$APP_DIR/server.py"
  restart=1
fi
if [ "$restart" = 1 ]; then
  systemctl restart "$SERVICE"
  if health; then echo "后端已更新并重启"; else
    echo "后端重启后健康检查失败，正在回滚 server.py" >&2
    if [ -f "$APP_DIR/server.py.prev" ]; then cp -p "$APP_DIR/server.py.prev" "$APP_DIR/server.py"; systemctl restart "$SERVICE"; fi
    journalctl -u "$SERVICE" -n 15 --no-pager >&2
    exit 1
  fi
else
  health || { echo "后端未改动，但健康检查失败" >&2; exit 1; }
  echo "后端无改动"
fi

# 后端确认可用后再换静态文件；index.html 最后替换，避免页面引用到还没传完的文件。
mv "$STAGE/web/index.html" "$STAGE/index.html"
cp -R "$STAGE/web/." "$WEB_DIR/"
cp "$STAGE/index.html" "$WEB_DIR/index.html"
chmod -R u=rwX,go=rX "$WEB_DIR"
echo "$SHA $(date '+%Y-%m-%d %H:%M:%S %Z')" > "$APP_DIR/DEPLOYED"
echo "静态文件已更新"
REMOTE

echo "线上版本：$(remote "cat '$APP_DIR/DEPLOYED'")"
if code=$(curl -sS -m 20 -o /dev/null -w '%{http_code}' "$URL" 2>/dev/null) && api=$(curl -sS -m 20 -o /dev/null -w '%{http_code}' "${URL}api/me" 2>/dev/null); then
  echo "公网检查：页面 ${code}，接口 ${api}"
else
  echo "公网检查未能连接 ${URL}（可能是本机网络的问题，服务器端健康检查已通过）。"
fi
