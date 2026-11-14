"""Local-only SPA preview for the exported Expo app and browser QA harness."""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit, parse_qs

ROOT = Path(__file__).resolve().parents[1]
EXPORT = ROOT / '.cache/ui-web'
SCREENS = {'home':'/', 'garden':'/garden', 'guide':'/guide', 'stats':'/stats', 'scan':'/scan', 'review':'/review'}

class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(EXPORT), **kwargs)

    def do_GET(self):
        url=urlsplit(self.path)
        if url.path=='/_capture':
            screen=parse_qs(url.query).get('screen',['home'])[0]
            target=SCREENS.get(screen,'/')
            body=('<!doctype html><html><head><meta charset="utf-8"><style>'
                  'html,body{margin:0;overflow:hidden}iframe{display:block;border:0;width:390px;height:100vh}'
                  f'</style></head><body><iframe title="EcoHanoi native UI" src="{target}"></iframe></body></html>').encode()
        elif url.path=='/_tests':
            body=(ROOT/'scripts/native-ui-tests.html').read_bytes()
        else:
            if not Path(url.path).suffix and not Path(self.translate_path(url.path)).is_file():
                self.path='/index.html'
            return super().do_GET()
        self.send_response(200)
        self.send_header('Content-Type','text/html; charset=utf-8')
        self.send_header('Content-Length',str(len(body)))
        self.end_headers();self.wfile.write(body)

if __name__=='__main__':
    if not (EXPORT/'index.html').is_file():
        raise SystemExit('Export web first: expo export --platform web --output-dir ../.cache/ui-web')
    print('Expo component preview: http://localhost:8792', flush=True)
    ThreadingHTTPServer(('127.0.0.1',8792),Handler).serve_forever()
