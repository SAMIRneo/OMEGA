"""Local UI and agent API; no exchange endpoint or wallet signing."""
import argparse
import gzip
import hashlib
import json
import pathlib
import secrets
import socket
import sys
import time
import threading
import urllib.parse
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from engine import Engine, ROOT

def run(port):
    config = json.loads((ROOT/'config.json').read_text(encoding='utf-8'))
    engine = Engine(config)
    token = secrets.token_urlsafe(32)
    instance_id = secrets.token_hex(8)
    (ROOT/'data').mkdir(exist_ok=True)
    allowed = {f'127.0.0.1:{port}',f'localhost:{port}'}
    agent_connection = {'lastSeen':None,'transport':None}
    connection_lock = threading.Lock()
    class Handler(BaseHTTPRequestHandler):
        def valid(self):
            host = self.headers.get('Host')
            origin = self.headers.get('Origin')
            return host in allowed and (not origin or origin in {f'http://{h}' for h in allowed})

        def send(self, code, data, mime='application/json; charset=utf-8'):
            payload = json.dumps(data,ensure_ascii=False,allow_nan=False).encode() if mime.startswith('application/json') else data
            asset = not mime.startswith('application/json')
            etag = '"'+hashlib.sha256(payload).hexdigest()+'"' if asset else None
            if asset and self.headers.get('If-None-Match')==etag:
                self.send_response(304)
                self.send_header('ETag',etag)
                self.end_headers()
                return
            compressed = 'gzip' in self.headers.get('Accept-Encoding','') and len(payload)>1024
            if compressed:
                payload = gzip.compress(payload,compresslevel=4)
            self.send_response(code)
            self.send_header('Content-Type',mime)
            self.send_header('Content-Length',str(len(payload)))
            self.send_header('Cache-Control','no-cache' if asset else 'no-store')
            self.send_header('Vary','Accept-Encoding')
            if etag:self.send_header('ETag',etag)
            if compressed:self.send_header('Content-Encoding','gzip')
            self.send_header('X-Content-Type-Options','nosniff')
            self.send_header('Content-Security-Policy',"default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self'; connect-src 'self'; frame-ancestors 'none'")
            self.end_headers()
            self.wfile.write(payload)

        def do_GET(self):
            if not self.valid():
                self.send(403,{'error':'Origine refusée'})
                return
            path = urllib.parse.urlsplit(self.path).path
            if path == '/api/state':
                data=engine.snapshot()
                data['instanceId']=instance_id
                if self.headers.get('X-Atelier-Agent')=='mcp-client':
                    with connection_lock:
                        agent_connection.update(lastSeen=time.time(),transport='MCP stdio')
                query=urllib.parse.parse_qs(urllib.parse.urlsplit(self.path).query)
                if query.get('view')==['ui']:
                    tf=query.get('timeframe',['5m'])[0]
                    if tf not in ('5m','15m','30m','1h','4h','1d','1w'):
                        self.send(400,{'error':'Horizon invalide'})
                        return
                    data['candlesByTimeframe']={tf:data['candlesByTimeframe'].get(tf,[])[-300:]}
                    data.pop('candles',None)
                    data['paper']['events']=data['paper']['events'][-20:]
                    data['research']['tradeCount']=len(data['research'].get('trades',[]))
                    data['research'].pop('trades',None)
                    data['uiTimeframe']=tf
                elif query.get('view')==['agent']:
                    data.pop('candles',None)
                    data.pop('candlesByTimeframe',None)
                    data['research']['tradeCount']=len(data['research'].get('trades',[]))
                    data['research'].pop('trades',None)
                    data['paper']['events']=data['paper']['events'][-20:]
                with connection_lock:
                    data['agentConnection']=dict(agent_connection)
                self.send(200,data)
            elif path == '/api/session':
                self.send(200,{'token':token})
            elif path == '/api/health':
                self.send(200,{'mode':'paper','exchangeActions':False})
            elif path == '/api/agent-config':
                self.send(200,{'mcpServers':{'eth-atelier':{'command':sys.executable,'args':[str(ROOT/'agent_bridge.py')],'env':{'ATELIER_URL':f'http://127.0.0.1:{port}'}}}})
            elif path == '/api/candles':
                query=urllib.parse.parse_qs(urllib.parse.urlsplit(self.path).query)
                tf=query.get('timeframe',['5m'])[0]
                try:limit=int(query.get('limit',['100'])[0])
                except ValueError:
                    self.send(400,{'error':'Nombre de bougies invalide'})
                    return
                if tf not in ('5m','15m','30m','1h','4h','1d','1w') or not 10<=limit<=300:
                    self.send(400,{'error':'Horizon invalide ou limite hors plage 10–300'})
                    return
                with engine.lock:
                    candles=[dict(b) for b in engine.bars.get(tf,[])[-limit:]]
                    status=dict(engine.candle_status.get(tf,{}))
                self.send(200,{'timeframe':tf,'candles':candles,'status':status})
            elif path in ('/','/style.css','/ui.js','/pilot.js','/risk-core.js','/local-adapter.js','/icon.svg'):
                file = ROOT/'web'/('index.html' if path=='/' else path[1:])
                mime = {'html':'text/html; charset=utf-8','css':'text/css; charset=utf-8','js':'text/javascript; charset=utf-8','svg':'image/svg+xml'}[file.suffix[1:]]
                self.send(200,file.read_bytes(),mime)
            else:
                self.send(404,{'error':'Route inconnue'})

        def do_POST(self):
            if not self.valid() or not secrets.compare_digest(self.headers.get('Authorization',''),'Bearer '+token):
                self.send(403,{'error':'Authentification locale requise'})
                return
            try:
                length = int(self.headers.get('Content-Length','0'))
                if length<0 or length>8192:
                    raise ValueError('Corps trop volumineux')
                args = json.loads(self.rfile.read(length) or b'{}')
                if not isinstance(args,dict):
                    raise ValueError('Objet JSON requis')
                if self.path == '/api/paper/open':
                    result = engine.open(args)
                elif self.path == '/api/paper/close':
                    result = engine.close()
                elif self.path == '/api/account':
                    address = args.get('address','')
                    if address:
                        account = engine.client.account(address)
                    else:
                        account = None
                    with engine.lock:
                        engine.config['account'] = address or '0x'+'0'*40
                        engine.account = account
                        engine.account_time = time.time() if account else 0
                        engine.account_error = None
                    result = {'ok':True}
                else:
                    self.send(404,{'error':'Route inconnue'})
                    return
                self.send(200,result)
            except (ValueError,KeyError,TypeError) as error:
                self.send(400,{'error':str(error)})
            except Exception:
                self.send(502,{'error':'Service Hyperliquid indisponible. Réessayez.'})

        def log_message(self, *args):
            pass
    class LocalServer(ThreadingHTTPServer):
        allow_reuse_address = False
        def server_bind(self):
            if hasattr(socket,'SO_EXCLUSIVEADDRUSE'):
                self.socket.setsockopt(socket.SOL_SOCKET,socket.SO_EXCLUSIVEADDRUSE,1)
            super().server_bind()
    server = LocalServer(('127.0.0.1',port),Handler)
    (ROOT/'data'/'agent-token.txt').write_text(token,encoding='utf-8')
    print(f'ETH Atelier : http://127.0.0.1:{port}',flush=True)
    engine.start()
    try:
        server.serve_forever()
    finally:
        server.server_close()
        engine.stop.set()
        with engine.lock:
            engine.persist()

if __name__=='__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('--port',type=int,default=8765)
    run(parser.parse_args().port)
