const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'../frontend/legacy');
function fixture(network="mainnet",seed=[]){let clock=Date.UTC(2026,9,14,10),metadataFails=false;const requests=[],memory=new Map(seed),events={};const book={coin:'ETH',time:clock,levels:[[{px:'2499.9',sz:'100'}],[{px:'2500.1',sz:'100'}]]};class Clock extends Date{constructor(...a){super(...(a.length?a:[clock]))}static now(){return clock}}
if(network==="testnet")memory.set("omega-network","testnet");
const urls=[];
const bars=Array.from({length:300},(_,i)=>({t:clock-(301-i)*300000,T:clock-(300-i)*300000-1,o:'2500',c:'2500',h:'2502',l:'2498',v:'10'}));const c={Date:Clock,URL,AbortController,WebAssembly,atob,document:{hidden:false,addEventListener:(k,f)=>events[k]=f},navigator:{locks:{request:async(k,f)=>f()}},location:{href:'https://example.test/'},localStorage:{getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v),removeItem:k=>memory.delete(k)},setInterval(){},setTimeout(){return 1},clearTimeout(){},WebSocket:class{readyState=1;constructor(url){urls.push(url);c.socket=this}send(){}close(){this.readyState=3}},fetch:async(url,o)=>{urls.push(url);const b=JSON.parse(o.body);requests.push(b);if(metadataFails&&b.type==='metaAndAssetCtxs')throw Error('offline');return {ok:true,json:async()=>b.type==='l2Book'?book:b.type==='metaAndAssetCtxs'?[{universe:[{name:'ETH',maxLeverage:25}]},[{markPx:'2500'}]]:b.type==='clearinghouseState'?{marginSummary:{accountValue:'12'},assetPositions:[]}:b.type==='openOrders'||b.type==='userFills'?[]:bars}}};c.window=c;vm.createContext(c);vm.runInContext(fs.readFileSync(path.join(root,'risk-core.js'),'utf8').replace(/export \{\};/g,''),c);vm.runInContext(fs.readFileSync(path.join(root,'../core/indicators.js'),'utf8').replace('export function features','function features'),c);vm.runInContext(fs.readFileSync(path.join(root,'browser-engine.js'),'utf8').replace(/import \{features\} from '[^']+';/,'').replace(/export \{\};/g,''),c);return {c,book,bars,requests,memory,urls,clock:()=>clock,advance:n=>clock+=n,failMeta:()=>metadataFails=true,api:c.BrowserAtelier};}
async function snapshot(f){await f.c.RiskCore.ready;return f.api.request('/api/state?timeframe=5m')}
const open=(f,a={})=>f.api.request('/api/paper/open',{body:JSON.stringify({side:'long',margin:5000,stop:2490,target:2520,...a})});
test('ETH only; constant series has neutral RSI, ATR 4, zero MACD',async()=>{const f=fixture();const s=await snapshot(f),a=s.indicators['5m'];assert.equal(a.rsi,50);assert.ok(Math.abs(a.atr-4)<1e-10);assert.equal(a.macd,0);assert.equal(a.previousEma50,2500);assert.equal(s.limits.leverage,15);for(const b of f.requests){if(b.coin)assert.equal(b.coin,'ETH');if(b.req)assert.equal(b.req.coin,'ETH');}});
test('long/short roundtrips account for both fees; old BTC balance isolated',async()=>{for(const side of ['long','short']){const f=fixture();f.memory.set('btc-atelier-web-paper-v1',JSON.stringify({cash:900,history:[]}));await snapshot(f);await open(f,side==='long'?{}:{side,stop:2510,target:2480});let s=await snapshot(f);assert.equal(s.paper.position.leverage,15);await assert.rejects(open(f));await f.api.request('/api/paper/close');s=await snapshot(f);assert.equal(s.paper.position,null);assert.ok(s.paper.cash<10000);assert.ok(Math.abs(s.paper.cash-10000-s.paper.history[0].netPnl)<1e-10);assert.ok(Math.abs(s.paper.dailyPnl-s.paper.history[0].netPnl)<1e-10);}});
test('limits reject bad parameters, high risk, stale data and hidden page',async()=>{const f=fixture();await snapshot(f);for(const a of [{margin:6},{margin:-1},{stop:-1},{side:'invalid'},{stop:100}])await assert.rejects(open(f,a));f.c.document.hidden=true;await assert.rejects(open(f));f.c.document.hidden=false;f.advance(30000);await snapshot(f);await assert.rejects(open(f));});
test('stale metadata is rejected even when retries fail',async()=>{const f=fixture();await snapshot(f);f.failMeta();f.advance(130000);f.book.time=f.clock();await snapshot(f);await assert.rejects(open(f),/Métadonnées/);});
test('stop execution and wallet data are observable, no exchange request',async()=>{const f=fixture();await snapshot(f);await open(f);f.book.levels[0][0].px='2470';f.book.levels[1][0].px='2470.1';let s=await snapshot(f);assert.equal(s.paper.position,null);assert.equal(s.paper.history[0].reason,'Stop observé');await f.api.setAddress('0x'+'1'.repeat(40),true);s=await snapshot(f);assert.equal(s.account.perpetuals.marginSummary.accountValue,'12');assert.equal(f.memory.get('eth-wallet'),'0x'+'1'.repeat(40));f.api.disconnect();s=await snapshot(f);assert.equal(s.account,null);assert.equal(f.memory.get('eth-wallet'),undefined);assert.ok(f.requests.every(r=>['l2Book','candleSnapshot','metaAndAssetCtxs','clearinghouseState','openOrders','userFills'].includes(r.type)));});
test('HTML contains static UI targets and local assets; sensitive values absent',()=>{const html=fs.readFileSync(path.join(root,'../index.html'),'utf8'),ui=fs.readFileSync(path.join(root,'ui.js'),'utf8');for(const m of ui.matchAll(/\$\('([^']+)'\)/g))assert.ok(html.includes('id="'+m[1]+'"'),m[1]);for(const m of html.matchAll(/(?:src|href)="\.\/([^"#]+)"/g))assert.ok(fs.existsSync(path.join(root,'..',m[1])),m[1]);assert.equal(/0x[a-fA-F0-9]{40}/.test(html),false);assert.equal(/coin:'BTC'/.test(fs.readFileSync(path.join(root,'browser-engine.js'),'utf8').replace(/export \{\};/g,'')),false);});
test('missing Rust module blocks browser entries',async()=>{const f=fixture();await snapshot(f);f.c.RiskCore={ready:Promise.resolve(null),exports:null};await assert.rejects(open(f),/Calcul du risque/);assert.equal((await snapshot(f)).paper.position,null);});

test('one entry per UTC day persists through a close; half margin and max leverage enforced',async()=>{const f=fixture();await snapshot(f);await assert.rejects(open(f,{margin:4999}));await assert.rejects(open(f,{leverage:16}));await open(f);await f.api.request('/api/paper/close');let s=await snapshot(f);assert.equal(s.paper.entriesToday,1);assert.equal(s.paper.lastEntryDay,'2026-10-14');await assert.rejects(open(f,{margin:Math.floor(s.paper.cash*.5*100)/100}),/quotidienne/);});
test('observed end-of-day closes the simulated position',async()=>{const f=fixture();await snapshot(f);await open(f);f.advance((13*60+55)*60000);f.book.time=f.clock();const s=await snapshot(f);assert.equal(s.paper.position,null);assert.equal(s.paper.history[0].reason,'Fin de journée observée');});

test('concurrent requests for the same missing horizon share one network call',async()=>{const f=fixture();await snapshot(f);const before=f.requests.filter(r=>r.req?.interval==='30m').length;await Promise.all(Array.from({length:5},()=>f.api.request('/api/state?timeframe=30m')));assert.equal(f.requests.filter(r=>r.req?.interval==='30m').length-before,1);});

test('warm snapshots return cached data while a slow candle refresh is still pending',async()=>{const f=fixture();await snapshot(f);f.advance(61000);f.book.time=f.clock();f.c.socket.onmessage({data:JSON.stringify({channel:'l2Book',data:f.book})});const original=f.c.fetch;let release;f.c.fetch=(url,options)=>JSON.parse(options.body).type==='candleSnapshot'?new Promise(resolve=>{release=()=>original(url,options).then(resolve)}):original(url,options);const state=await snapshot(f);assert.equal(state.market.fresh,true);assert.ok(state.candlesByTimeframe['5m'].length>0);assert.equal(typeof release,'function');release();});

test('failed candle refresh retains data, exposes its error, and backs off retries',async()=>{const f=fixture();await snapshot(f);const original=f.c.fetch;let failures=0;f.c.fetch=(url,options)=>{if(JSON.parse(options.body).type==='candleSnapshot'){failures++;return Promise.reject(Error('offline candles'));}return original(url,options)};f.advance(61000);f.book.time=f.clock();let s=await snapshot(f);await new Promise(setImmediate);s=await snapshot(f);assert.match(s.candleStatus['5m'].error,/offline/);assert.ok(s.candlesByTimeframe['5m'].length>0);const count=failures;await snapshot(f);assert.equal(failures,count);});

test('browser EMA MACD RSI ATR and trend match an independent TA-Lib reference',()=>{const f=fixture(),raw=Array.from({length:300},(_,i)=>{const close=2500+.07*i+Math.sin(i*.23)*14+Math.cos(i*.07)*8;return {t:i*900000,T:(i+1)*900000-1,o:close,h:close+2,l:close-2,c:close,v:10+i%9}}),expected=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/indicator-reference.json'),'utf8')),actual=f.api.features(raw,301*900000);for(const key of ['ema20','ema50','ema200','previousEma20','previousEma50','rsi','atr','histogram','adx','plusDI','minusDI','cmf','obvChange20'])assert.ok(Math.abs(expected[key]-actual[key])<1e-9,key+': '+actual[key]+' vs '+expected[key]);assert.equal(actual.trend,expected.trend);});


test('testnet routes all market and account reads to testnet and isolates storage',async()=>{
 const mainPaper={initial:10000,cash:1234,position:null,history:[],entriesToday:0};
 const f=fixture('testnet',[['axiom-eth-daily-paper-v1',JSON.stringify(mainPaper)],['eth-wallet','0x'+'2'.repeat(40)]]);
 let s=await snapshot(f);assert.equal(s.paper.cash,10000);assert.equal(s.environment.id,'testnet');assert.equal(s.account,null);
 await f.api.setAddress('0x'+'1'.repeat(40),true);await open(f);await f.api.request('/api/paper/close');
 assert.ok(f.urls.every(url=>url.includes('api.hyperliquid-testnet.xyz')));
 assert.equal(JSON.parse(f.memory.get('axiom-eth-daily-paper-v1')).cash,1234);
 assert.ok(f.memory.has('axiom-eth-daily-paper-v1-testnet'));assert.equal(f.memory.get('eth-wallet'),'0x'+'2'.repeat(40));
 assert.equal(f.memory.get('eth-wallet-testnet'),'0x'+'1'.repeat(40));
});

test('network switch validates the target and refuses an open position',async()=>{
 const f=fixture();await snapshot(f);await assert.rejects(f.api.request('/api/network',{body:'{"network":"invalid"}'}),/Réseau/);
 await open(f);await assert.rejects(f.api.request('/api/network',{body:'{"network":"testnet"}'}),/position/);
 assert.equal(f.memory.get('omega-network'),undefined);await f.api.request('/api/paper/close');
 await f.api.request('/api/network',{body:'{"network":"testnet"}'});assert.equal(f.memory.get('omega-network'),'testnet');
});

test('crossed, stale, malformed and out-of-order books cannot overwrite valid data',async()=>{
 const f=fixture();await snapshot(f);const send=data=>f.c.socket.onmessage({data:JSON.stringify({channel:'l2Book',data})});
 for(const change of [{coin:'BTC'},{time:f.clock()-20000},{time:f.clock()-1},{levels:[[{px:'2600',sz:'1'}],[{px:'2500',sz:'1'}]]},{levels:[[{px:'2499',sz:'NaN'}],[{px:'2500',sz:'1'}]]}]){
  send({...f.book,...change});const s=await snapshot(f);assert.equal(s.market.mid,2500);assert.equal(s.market.book.time,f.clock());
 }
});

test('rate limiting pauses network requests and preserves the last valid candles',async()=>{
 const f=fixture();await snapshot(f);await new Promise(setImmediate);f.advance(61000);f.book.time=f.clock();f.c.socket.onmessage({data:JSON.stringify({channel:'l2Book',data:f.book})});
 let calls=0;f.c.fetch=async()=>{calls++;return {ok:false,status:429,headers:{get:()=> '30'}}};
 await snapshot(f);await new Promise(setImmediate);const count=calls;const s=await snapshot(f);assert.equal(calls,count);assert.ok(s.candlesByTimeframe['5m'].length);assert.ok(s.connection.retryAt>f.clock());assert.match(s.connection.error,/429/);
});

test('websocket disconnect uses progressive reconnect and REST keeps market available',async()=>{
 const f=fixture();await snapshot(f);let delay=0;f.c.setTimeout=(_fn,ms)=>{delay=ms;return 1};
 f.c.socket.readyState=3;f.c.socket.onclose();const first=delay;f.c.socket.onclose();assert.ok(delay>first);assert.ok(first>=1600&&first<=2400);
 f.advance(6000);f.book.time=f.clock();const s=await snapshot(f);assert.equal(s.market.fresh,true);assert.equal(s.connection.source,'rest');
});

test('strategy settings validate and persist separately per network',async()=>{for(const network of ['mainnet','testnet']){const f=fixture(network);await snapshot(f);await f.api.request('/api/settings',{body:JSON.stringify({strategy_profile:'aggressive'})});assert.equal((await snapshot(f)).limits.strategy_profile,'aggressive');assert.equal(f.memory.get('omega-strategy-profile'+(network==='testnet'?'-testnet':'')),'aggressive');await assert.rejects(f.api.request('/api/settings',{body:JSON.stringify({strategy_profile:'unknown'})}));await open(f);await assert.rejects(f.api.request('/api/settings',{body:JSON.stringify({strategy_profile:'balanced'})}));}});
