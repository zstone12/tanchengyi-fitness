#!/usr/bin/env python3
"""本地开发预览：静态文件取自 ../dist，/api/* 转发给本机的 server.py（等同线上的 /training/api/*）。

    TRAINING_DB=/tmp/training-dev.db TRAINING_COOKIE_SECURE=0 TRAINING_ORIGINS=http://127.0.0.1:8765 python3 server/server.py
    python3 server/dev.py        # 打开 http://127.0.0.1:8765/training/
"""
import functools
import http.client
import os
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

DIST = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'dist')
API = ('127.0.0.1', int(os.environ.get('TRAINING_PORT', '3014')))


class Dev(SimpleHTTPRequestHandler):
    def log_message(self, fmt, *args):
        pass

    def end_headers(self):
        # Unversioned asset URLs would otherwise be served from the browser cache while developing.
        if not self.path.startswith('/training/api/'):
            self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def translate_path(self, path):
        return super().translate_path(path[len('/training'):] if path.startswith('/training/') else path)

    def proxy(self):
        body = self.rfile.read(int(self.headers.get('Content-Length') or 0))
        upstream = http.client.HTTPConnection(*API, timeout=20)
        headers = {k: v for k, v in self.headers.items() if k.lower() not in ('host', 'connection')}
        upstream.request(self.command, self.path, body, headers)
        response = upstream.getresponse()
        payload = response.read()
        self.send_response(response.status)
        for key, value in response.getheaders():
            if key.lower() not in ('transfer-encoding', 'connection'):
                self.send_header(key, value)
        self.end_headers()
        self.wfile.write(payload)
        upstream.close()

    def do_GET(self):
        if self.path.startswith('/training/api/'):
            self.proxy()
        else:
            super().do_GET()

    def do_POST(self):
        self.proxy()

    def do_PUT(self):
        self.proxy()


if __name__ == '__main__':
    ThreadingHTTPServer(('127.0.0.1', 8765), functools.partial(Dev, directory=DIST)).serve_forever()
