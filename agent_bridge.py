"""MCP stdio adapter for local clients. Simulated actions only."""
import json
import pathlib
import sys
import os
import urllib.request
from urllib.parse import urlencode

ROOT = pathlib.Path(__file__).parent
TOOLS = [
    {"name":"btc_state","description":"BTC market, indicators, account read-only and paper balance. Descriptive signals only.","inputSchema":{"type":"object","properties":{},"additionalProperties":False}},
    {"name":"btc_candles","description":"Read 10 to 300 raw BTC candles for one timeframe; latest candle may be incomplete.","inputSchema":{"type":"object","properties":{"timeframe":{"type":"string","enum":["5m","15m","30m","1h","4h","1d","1w"]},"limit":{"type":"integer","minimum":10,"maximum":300,"default":100}},"required":["timeframe"],"additionalProperties":False}},
    {"name":"paper_open","description":"Open a simulated BTC position, subject to risk and freshness checks. No real funds.","inputSchema":{"type":"object","properties":{"side":{"type":"string","enum":["long","short"]},"margin":{"type":"number","exclusiveMinimum":0},"stop":{"type":"number","exclusiveMinimum":0},"target":{"type":"number","exclusiveMinimum":0}},"required":["side","margin","stop","target"],"additionalProperties":False}},
    {"name":"paper_close","description":"Close the simulated BTC position. No exchange order.","inputSchema":{"type":"object","properties":{},"additionalProperties":False}}
]

def call(name,args):
    routes={'btc_state':'/api/state?view=agent','btc_candles':'/api/candles','paper_open':'/api/paper/open','paper_close':'/api/paper/close'}
    if name not in routes:
        raise ValueError('Unknown tool')
    headers={'X-Atelier-Agent':'mcp-client'}
    body=None
    if name in ('paper_open','paper_close'):
        headers.update({'Authorization':'Bearer '+(ROOT/'data'/'agent-token.txt').read_text().strip(),'Content-Type':'application/json'})
        body=json.dumps(args).encode()
    if name=='btc_candles':
        routes[name]+='?'+urlencode({'timeframe':args.get('timeframe',''),'limit':args.get('limit',100)})
    req=urllib.request.Request(os.environ.get('ATELIER_URL','http://127.0.0.1:8765').rstrip('/')+routes[name],body,headers)
    with urllib.request.urlopen(req,timeout=15) as response:
        return json.load(response)

def handle(msg):
    method=msg.get('method')
    if 'id' not in msg:
        return None
    base={'jsonrpc':'2.0','id':msg['id']}
    if method=='initialize':
        return {**base,'result':{'protocolVersion':'2024-11-05','capabilities':{'tools':{}},'serverInfo':{'name':'btc-atelier','version':'0.1.0'}}}
    if method=='ping':
        return {**base,'result':{}}
    if method=='tools/list':
        return {**base,'result':{'tools':TOOLS}}
    if method=='tools/call':
        try:
            params=msg['params']
            value=call(params['name'],params.get('arguments',{}))
            result={'content':[{'type':'text','text':json.dumps(value,ensure_ascii=False)}]}
        except Exception as error:
            result={'isError':True,'content':[{'type':'text','text':str(error)}]}
        return {**base,'result':result}
    return {**base,'error':{'code':-32601,'message':'Method not found'}}

if __name__=='__main__':
    sys.stdin.reconfigure(encoding='utf-8')
    sys.stdout.reconfigure(encoding='utf-8')
    for line in sys.stdin:
        try:
            result=handle(json.loads(line))
        except Exception:
            result={'jsonrpc':'2.0','id':None,'error':{'code':-32700,'message':'Parse error'}}
        if result is not None:
            print(json.dumps(result,ensure_ascii=False),flush=True)
