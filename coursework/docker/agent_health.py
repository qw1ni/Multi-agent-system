"""HTTP /health для контейнера parser_agent. Логи пишет в stdout."""

import os
from http.server import BaseHTTPRequestHandler, HTTPServer
import urllib.request


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path.rstrip("/") != "/health":
            self.send_response(404)
            self.end_headers()
            return
        url = os.environ["PARSER_SERVER_URL"].rstrip("/") + "/"
        try:
            with urllib.request.urlopen(url, timeout=3) as response:
                ok = response.status == 200
        except Exception:
            ok = False
        body = b"ok" if ok else b"parser unavailable"
        self.send_response(200 if ok else 503)
        self.send_header("Content-Type", "text/plain; charset=utf-8")
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, fmt, *args):
        print("%s - %s" % (self.address_string(), fmt % args), flush=True)


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "8003"))
    print(f"parser_agent слушает 0.0.0.0:{port}", flush=True)
    HTTPServer(("0.0.0.0", port), Handler).serve_forever()
