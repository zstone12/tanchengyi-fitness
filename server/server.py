#!/usr/bin/env python3
"""谭师训练手册 · 账号与训练记录 API。

仅使用 Python 标准库。监听 127.0.0.1，由 Caddy 把 /training/api/* 反向代理过来。

    GET    /training/api/me                      当前登录用户
    POST   /training/api/register                {username, password}
    POST   /training/api/login                   {username, password}
    POST   /training/api/logout
    GET    /training/api/records?month=YYYY-MM   当月各天的训练摘要（日历用）
    GET    /training/api/records/YYYY-MM-DD      某天的完整记录
    PUT    /training/api/records/YYYY-MM-DD      {data, summary} 覆盖保存
    GET    /training/api/templates               自定义训练模板
    PUT    /training/api/templates               {templates:[...]} 覆盖保存整份模板列表
    POST   /training/api/records/import          {records:[{date,data,summary}]} 仅补充服务器上没有的日期

管理命令（需以服务用户身份运行，才能读写数据库）：
    python3 server.py passwd <用户名>     重设密码并注销该用户的全部登录
    python3 server.py users               列出用户
"""
import datetime
import getpass
import hashlib
import hmac
import json
import os
import re
import secrets
import sqlite3
import sys
import threading
import time
from collections import defaultdict, deque
from http.cookies import SimpleCookie
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlsplit

HOST = os.environ.get('TRAINING_HOST', '127.0.0.1')
PORT = int(os.environ.get('TRAINING_PORT', '3014'))
DB_PATH = os.environ.get('TRAINING_DB') or os.path.join(os.environ.get('STATE_DIRECTORY', '.'), 'training.db')
ALLOWED_ORIGINS = {o.strip() for o in os.environ.get('TRAINING_ORIGINS', 'https://zstone12.xyz').split(',') if o.strip()}
COOKIE_SECURE = os.environ.get('TRAINING_COOKIE_SECURE', '1') != '0'
MAX_USERS = int(os.environ.get('TRAINING_MAX_USERS', '500'))

PREFIX = '/training/api'
COOKIE = 'tsid'
SESSION_SECONDS = 90 * 24 * 3600
MAX_BODY = 400 * 1024
MAX_RECORD_BYTES = 32 * 1024
MAX_RECORDS_PER_USER = 3000
MAX_IMPORT = 20
USERNAME_RE = re.compile(r'^[A-Za-z0-9_一-鿿]{2,20}$')
DATE_RE = re.compile(r'^\d{4}-\d{2}-\d{2}$')
MONTH_RE = re.compile(r'^\d{4}-\d{2}$')
DAY_KEY_RE = re.compile(r'^[a-z0-9-]{1,40}$')
MAX_DAYS_PER_RECORD = 12
MAX_TEMPLATES = 60
MAX_TEMPLATE_BYTES = 64 * 1024
ROUTES = ('me', 'register', 'login', 'logout', 'records', 'templates')

_local = threading.local()
_scrypt_slots = threading.BoundedSemaphore(3)  # scrypt uses ~16 MB per call; cap concurrency.
_rate_lock = threading.Lock()
_rate = defaultdict(deque)


class ApiError(Exception):
    def __init__(self, status, message):
        super().__init__(message)
        self.status, self.message = status, message


def db():
    conn = getattr(_local, 'conn', None)
    if conn is None:
        conn = sqlite3.connect(DB_PATH, timeout=10, isolation_level=None)
        conn.row_factory = sqlite3.Row
        conn.execute('PRAGMA journal_mode=WAL')
        conn.execute('PRAGMA foreign_keys=ON')
        conn.execute('PRAGMA busy_timeout=10000')
        _local.conn = conn
    return conn


def init_db():
    db().executescript('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY,
            username TEXT NOT NULL,
            username_key TEXT NOT NULL UNIQUE,
            salt BLOB NOT NULL,
            password_hash BLOB NOT NULL,
            created_at INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS sessions (
            token_hash TEXT PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            expires_at INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS sessions_user ON sessions(user_id);
        CREATE TABLE IF NOT EXISTS records (
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            date TEXT NOT NULL,
            data TEXT NOT NULL,
            summary TEXT NOT NULL,
            done INTEGER NOT NULL,
            updated_at INTEGER NOT NULL,
            PRIMARY KEY (user_id, date)
        ) WITHOUT ROWID;
        CREATE TABLE IF NOT EXISTS templates (
            user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
            data TEXT NOT NULL,
            updated_at INTEGER NOT NULL
        );
    ''')


def hash_password(password, salt):
    with _scrypt_slots:
        return hashlib.scrypt(password.encode('utf-8'), salt=salt, n=2 ** 14, r=8, p=1, dklen=32)


def token_hash(token):
    return hashlib.sha256(token.encode('ascii', 'ignore')).hexdigest()


def now_ms():
    return time.time_ns() // 1_000_000


def limit(bucket, key, count, seconds):
    """Sliding-window limiter kept in memory; enough for a single small instance."""
    now = time.monotonic()
    with _rate_lock:
        hits = _rate[(bucket, key)]
        while hits and now - hits[0] > seconds:
            hits.popleft()
        if len(hits) >= count:
            raise ApiError(429, '操作太频繁，请稍后再试。')
        hits.append(now)
        if len(_rate) > 20000:
            for stale in [k for k, v in _rate.items() if not v or now - v[-1] > 3600]:
                del _rate[stale]


def check_credentials(body):
    username, password = body.get('username'), body.get('password')
    if not isinstance(username, str) or not isinstance(password, str):
        raise ApiError(400, '请填写用户名和密码。')
    username = username.strip()
    if not USERNAME_RE.match(username):
        raise ApiError(400, '用户名需为 2～20 位的中文、字母、数字或下划线。')
    if not 8 <= len(password) <= 128:
        raise ApiError(400, '密码长度需为 8～128 位。')
    return username, password


def valid_date(value):
    if not isinstance(value, str) or not DATE_RE.match(value):
        raise ApiError(400, '日期格式不正确。')
    try:
        parsed = datetime.date.fromisoformat(value)
    except ValueError:
        raise ApiError(400, '日期格式不正确。')
    if not 2020 <= parsed.year <= 2100:
        raise ApiError(400, '日期超出范围。')
    return value


def number(value, integer=False):
    if isinstance(value, bool) or not isinstance(value, (int, float)) or value != value or value < 0 or value > 1e9:
        return 0
    return int(value) if integer else round(float(value), 2)


def clean_record(body):
    """Returns (data_json, summary_json, done). The set data is stored as sent; the summary is rebuilt field by field."""
    data, summary = body.get('data'), body.get('summary')
    if not isinstance(data, dict) or not isinstance(summary, dict):
        raise ApiError(400, '记录格式不正确。')
    kept = {}
    for key in ('sets', 'weights', 'reps', 'layouts', 'plans'):
        part = data.get(key, {})
        if not isinstance(part, dict):
            raise ApiError(400, '记录格式不正确。')
        kept[key] = part
    data_json = json.dumps(kept, ensure_ascii=False, separators=(',', ':'))
    if len(data_json.encode('utf-8')) > MAX_RECORD_BYTES:
        raise ApiError(413, '单日记录过大。')
    days = {}
    raw_days = summary.get('days')
    if isinstance(raw_days, dict):
        for day, item in raw_days.items():
            if len(days) >= MAX_DAYS_PER_RECORD:
                break
            if isinstance(day, str) and DAY_KEY_RE.match(day) and isinstance(item, dict) and number(item.get('done'), True) > 0:
                days[day] = {'done': number(item.get('done'), True), 'volume': number(item.get('volume'))}
                # The label lets the calendar name a custom session even after its template is gone.
                if isinstance(item.get('label'), str) and item['label'].strip():
                    days[day]['label'] = re.sub(r'[<>&"\'`\\]', '', item['label']).strip()[:12]
    done = number(summary.get('done'), True)
    clean = {'done': done, 'volume': number(summary.get('volume')), 'days': days}
    return data_json, json.dumps(clean, ensure_ascii=False, separators=(',', ':')), done


class Handler(BaseHTTPRequestHandler):
    server_version = 'zs12-training'
    sys_version = ''
    protocol_version = 'HTTP/1.1'
    timeout = 20

    def log_message(self, fmt, *args):
        pass

    # ---- plumbing -------------------------------------------------------
    def client_ip(self):
        forwarded = self.headers.get('X-Forwarded-For', '')
        return forwarded.split(',')[-1].strip() or self.client_address[0]

    def send_json(self, status, payload, cookie=None):
        body = json.dumps(payload, ensure_ascii=False, separators=(',', ':')).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Cache-Control', 'no-store')
        self.send_header('X-Content-Type-Options', 'nosniff')
        if cookie:
            self.send_header('Set-Cookie', cookie)
        self.end_headers()
        self.wfile.write(body)

    def cookie_header(self, token, max_age):
        parts = [f'{COOKIE}={token}', 'Path=/training', 'HttpOnly', 'SameSite=Lax', f'Max-Age={max_age}']
        if COOKIE_SECURE:
            parts.append('Secure')
        return '; '.join(parts)

    def read_body(self):
        if 'application/json' not in self.headers.get('Content-Type', ''):
            raise ApiError(415, '请求格式不正确。')
        try:
            length = int(self.headers.get('Content-Length', ''))
        except ValueError:
            raise ApiError(411, '请求格式不正确。')
        if length < 0 or length > MAX_BODY:
            self.close_connection = True
            raise ApiError(413, '请求内容过大。')
        try:
            body = json.loads(self.rfile.read(length) or b'{}')
        except (ValueError, UnicodeDecodeError):
            raise ApiError(400, '请求格式不正确。')
        if not isinstance(body, dict):
            raise ApiError(400, '请求格式不正确。')
        return body

    def session_token(self):
        try:
            morsel = SimpleCookie(self.headers.get('Cookie', '')).get(COOKIE)
        except Exception:
            return None
        return morsel.value if morsel else None

    def current_user(self):
        token = self.session_token()
        if not token:
            return None
        return db().execute(
            'SELECT u.id, u.username FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > ?',
            (token_hash(token), int(time.time()))).fetchone()

    def require_user(self):
        user = self.current_user()
        if not user:
            raise ApiError(401, '请先登录。')
        return user

    def start_session(self, user_id):
        token = secrets.token_urlsafe(32)
        conn = db()
        conn.execute('DELETE FROM sessions WHERE expires_at <= ?', (int(time.time()),))
        conn.execute('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)',
                     (token_hash(token), user_id, int(time.time()) + SESSION_SECONDS))
        return self.cookie_header(token, SESSION_SECONDS)

    def dispatch(self, method):
        try:
            url = urlsplit(self.path)
            if not url.path.startswith(PREFIX + '/'):
                raise ApiError(404, '接口不存在。')
            # Cookies are SameSite=Lax; this origin check is the second CSRF barrier for writes.
            if method != 'GET' and self.headers.get('Origin') not in ALLOWED_ORIGINS:
                raise ApiError(403, '请求来源不被允许。')
            route = url.path[len(PREFIX) + 1:].strip('/')
            head = route.split('/')[0]
            handler = getattr(self, f'{method.lower()}_{head}', None) if head in ROUTES else None
            if not handler:
                raise ApiError(404, '接口不存在。')
            handler(route.split('/')[1:], parse_qs(url.query))
        except ApiError as error:
            self.send_json(error.status, {'error': error.message})
        except sqlite3.Error as error:
            print(f'database error: {error!r}', file=sys.stderr, flush=True)
            self.send_json(503, {'error': '服务暂时不可用，请稍后再试。'})
        except (BrokenPipeError, ConnectionResetError):
            self.close_connection = True
        except Exception as error:
            print(f'unhandled error: {error!r}', file=sys.stderr, flush=True)
            self.send_json(500, {'error': '服务器出错了，请稍后再试。'})

    def do_GET(self):
        self.dispatch('GET')

    def do_POST(self):
        self.dispatch('POST')

    def do_PUT(self):
        self.dispatch('PUT')

    # ---- account --------------------------------------------------------
    def get_me(self, rest, query):
        user = self.current_user()
        self.send_json(200, {'user': {'username': user['username']} if user else None})

    def post_register(self, rest, query):
        body = self.read_body()
        limit('register', self.client_ip(), 5, 3600)
        username, password = check_credentials(body)
        conn = db()
        if conn.execute('SELECT COUNT(*) FROM users').fetchone()[0] >= MAX_USERS:
            raise ApiError(403, '注册名额已满，请联系站点管理员。')
        salt = secrets.token_bytes(16)
        try:
            cursor = conn.execute(
                'INSERT INTO users (username, username_key, salt, password_hash, created_at) VALUES (?, ?, ?, ?, ?)',
                (username, username.lower(), salt, hash_password(password, salt), int(time.time())))
        except sqlite3.IntegrityError:
            raise ApiError(409, '这个用户名已被注册。')
        print(f'registered user id={cursor.lastrowid}', file=sys.stderr, flush=True)
        self.send_json(200, {'user': {'username': username}}, self.start_session(cursor.lastrowid))

    def post_login(self, rest, query):
        body = self.read_body()
        username, password = body.get('username'), body.get('password')
        if not isinstance(username, str) or not isinstance(password, str) or len(password) > 128:
            raise ApiError(400, '请填写用户名和密码。')
        username = username.strip()
        limit('login-ip', self.client_ip(), 20, 600)
        limit('login-user', username.lower()[:40], 10, 600)
        row = db().execute('SELECT id, username, salt, password_hash FROM users WHERE username_key = ?',
                           (username.lower(),)).fetchone()
        # Hash even when the user is unknown so timing does not reveal which usernames exist.
        digest = hash_password(password, row['salt'] if row else b'\0' * 16)
        if not row or not hmac.compare_digest(digest, row['password_hash']):
            raise ApiError(401, '用户名或密码不正确。')
        self.send_json(200, {'user': {'username': row['username']}}, self.start_session(row['id']))

    def post_logout(self, rest, query):
        token = self.session_token()
        if token:
            db().execute('DELETE FROM sessions WHERE token_hash = ?', (token_hash(token),))
        self.send_json(200, {'ok': True}, self.cookie_header('', 0))

    # ---- records --------------------------------------------------------
    def get_records(self, rest, query):
        user = self.require_user()
        if rest:
            row = db().execute('SELECT date, data, summary, updated_at FROM records WHERE user_id = ? AND date = ?',
                               (user['id'], valid_date(rest[0]))).fetchone()
            record = None
            if row:
                record = {'date': row['date'], 'data': json.loads(row['data']), 'summary': json.loads(row['summary']),
                          'updatedAt': row['updated_at']}
            self.send_json(200, {'record': record})
            return
        month = (query.get('month') or [''])[0]
        if not MONTH_RE.match(month):
            raise ApiError(400, '月份格式不正确。')
        rows = db().execute(
            'SELECT date, summary, updated_at FROM records WHERE user_id = ? AND date >= ? AND date <= ? AND done > 0 ORDER BY date',
            (user['id'], month + '-01', month + '-31')).fetchall()
        self.send_json(200, {'records': [
            {'date': r['date'], 'summary': json.loads(r['summary']), 'updatedAt': r['updated_at']} for r in rows]})

    def put_records(self, rest, query):
        user = self.require_user()
        if len(rest) != 1:
            raise ApiError(404, '接口不存在。')
        date = valid_date(rest[0])
        data_json, summary_json, done = clean_record(self.read_body())
        limit('write', user['id'], 240, 60)
        conn = db()
        exists = conn.execute('SELECT 1 FROM records WHERE user_id = ? AND date = ?', (user['id'], date)).fetchone()
        if not exists and conn.execute('SELECT COUNT(*) FROM records WHERE user_id = ?',
                                       (user['id'],)).fetchone()[0] >= MAX_RECORDS_PER_USER:
            raise ApiError(403, '记录数量已达上限。')
        updated = now_ms()
        conn.execute(
            'INSERT INTO records (user_id, date, data, summary, done, updated_at) VALUES (?, ?, ?, ?, ?, ?) '
            'ON CONFLICT(user_id, date) DO UPDATE SET data = excluded.data, summary = excluded.summary, '
            'done = excluded.done, updated_at = excluded.updated_at',
            (user['id'], date, data_json, summary_json, done, updated))
        self.send_json(200, {'updatedAt': updated})

    def post_records(self, rest, query):
        user = self.require_user()
        if rest != ['import']:
            raise ApiError(404, '接口不存在。')
        records = self.read_body().get('records')
        if not isinstance(records, list) or len(records) > MAX_IMPORT:
            raise ApiError(400, '记录格式不正确。')
        limit('import', user['id'], 60, 600)
        conn = db()
        count = conn.execute('SELECT COUNT(*) FROM records WHERE user_id = ?', (user['id'],)).fetchone()[0]
        imported = 0
        for item in records:
            if not isinstance(item, dict) or count + imported >= MAX_RECORDS_PER_USER:
                continue
            date = valid_date(item.get('date'))
            data_json, summary_json, done = clean_record(item)
            cursor = conn.execute(
                'INSERT OR IGNORE INTO records (user_id, date, data, summary, done, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
                (user['id'], date, data_json, summary_json, done, now_ms()))
            imported += cursor.rowcount
        self.send_json(200, {'imported': imported})


    # ---- templates ------------------------------------------------------
    def get_templates(self, rest, query):
        user = self.require_user()
        row = db().execute('SELECT data, updated_at FROM templates WHERE user_id = ?', (user['id'],)).fetchone()
        self.send_json(200, {'templates': json.loads(row['data']) if row else [], 'updatedAt': row['updated_at'] if row else 0})

    def put_templates(self, rest, query):
        user = self.require_user()
        templates = self.read_body().get('templates')
        if not isinstance(templates, list) or len(templates) > MAX_TEMPLATES or not all(isinstance(t, dict) for t in templates):
            raise ApiError(400, '模板格式不正确。')
        data_json = json.dumps(templates, ensure_ascii=False, separators=(',', ':'))
        if len(data_json.encode('utf-8')) > MAX_TEMPLATE_BYTES:
            raise ApiError(413, '模板内容过大。')
        limit('write', user['id'], 240, 60)
        updated = now_ms()
        db().execute('INSERT INTO templates (user_id, data, updated_at) VALUES (?, ?, ?) '
                     'ON CONFLICT(user_id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at',
                     (user['id'], data_json, updated))
        self.send_json(200, {'updatedAt': updated})


def admin(argv):
    init_db()
    conn = db()
    if argv[:1] == ['users']:
        for row in conn.execute('SELECT u.id, u.username, u.created_at, (SELECT COUNT(*) FROM records r WHERE r.user_id = u.id) AS n FROM users u ORDER BY u.id'):
            print(row['id'], row['username'], datetime.date.fromtimestamp(row['created_at']), f'{row["n"]} 天记录', sep='\t')
        return 0
    if argv[:1] == ['passwd'] and len(argv) == 2:
        row = conn.execute('SELECT id FROM users WHERE username_key = ?', (argv[1].lower(),)).fetchone()
        if not row:
            print('没有这个用户。', file=sys.stderr)
            return 1
        password = getpass.getpass('新密码（8～128 位）：')
        if not 8 <= len(password) <= 128 or password != getpass.getpass('再输入一次：'):
            print('密码不符合要求或两次输入不一致。', file=sys.stderr)
            return 1
        salt = secrets.token_bytes(16)
        conn.execute('UPDATE users SET salt = ?, password_hash = ? WHERE id = ?', (salt, hash_password(password, salt), row['id']))
        conn.execute('DELETE FROM sessions WHERE user_id = ?', (row['id'],))
        print('密码已重设，该用户需要重新登录。')
        return 0
    print(__doc__, file=sys.stderr)
    return 2


def main():
    if len(sys.argv) > 1:
        sys.exit(admin(sys.argv[1:]))
    init_db()
    server = ThreadingHTTPServer((HOST, PORT), Handler)
    server.daemon_threads = True
    print(f'zs12-training listening on {HOST}:{PORT}, db={DB_PATH}', file=sys.stderr, flush=True)
    server.serve_forever()


if __name__ == '__main__':
    main()
