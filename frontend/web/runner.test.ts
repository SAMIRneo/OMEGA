import {it,expect,vi,beforeEach,afterEach} from 'vitest';
import {Window} from 'happy-dom';
import {IDBFactory} from 'fake-indexeddb';
import {webcrypto} from 'node:crypto';
import {sample,risk} from '../core/test-fixtures';
const fake=vi.hoisted(()=>({agents:{} as Record<string,string>,approved:{} as Record<string,boolean>,sent:[] as any[],beforeSend:null as null|(()=>Promise<void>),engine:null as any}));
vi.mock('@nktkas/hyperliquid',()=>({
 HttpTransport:class{isTestnet:boolean;constructor(o:any){this.isTestnet=o.isTestnet}async request(endpoint:string,payload:any){fake.sent.push({network:this.isTestnet?'testnet':'mainnet',endpoint,payload});return payload.action.type==='order'?{status:'ok',response:{data:{statuses:[{filled:{oid:1,totalSz:'1',avgPx:'2500'}},{resting:{oid:2}},{resting:{oid:3}}]}}}:{status:'ok',response:{type:'default'}};}},
 InfoClient:class{n:string;constructor({transport}:any){this.n=transport.isTestnet?'testnet':'mainnet'}async extraAgents(){return fake.approved[this.n]?[{address:fake.agents[this.n],validUntil:Date.now()+86400000}]:[];}},
 ExchangeClient:class{o:any;constructor(o:any){this.o=o;fake.agents[o.transport.isTestnet?'testnet':'mainnet']=o.wallet.address;}async updateLeverage(p:any){const nonce=await this.o.nonceManager();return this.o.transport.request('exchange',{action:{type:'updateLeverage',...p},nonce});}async order(p:any){const nonce=await this.o.nonceManager();if(fake.beforeSend)await fake.beforeSend();return this.o.transport.request('exchange',{action:{type:'order',...p},nonce});}}
}));
let dom:Window,s:any;
const owner='0x1111111111111111111111111111111111111111';
beforeEach(async()=>{
 vi.resetModules();vi.useFakeTimers({toFake:['Date']});vi.setSystemTime(Date.UTC(2026,9,14,12,0,10));fake.agents={};fake.approved={};fake.sent=[];fake.beforeSend=null;fake.engine=null;
 dom=new Window({url:'https://omega.test/#pilot'});Object.defineProperties(dom,{isSecureContext:{value:true},indexedDB:{value:new IDBFactory()},crypto:{value:webcrypto}});Object.defineProperty(dom.document,'hidden',{value:false,writable:true});
 (dom as any).RiskCore={ready:Promise.resolve(risk)};(dom as any).ethereum={request:vi.fn(async()=>[owner])};
 vi.stubGlobal('window',dom);vi.stubGlobal('document',dom.document);vi.stubGlobal('navigator',{locks:{request:async(_name:string,_options:any,fn:any)=>fn({name:_name})}});vi.stubGlobal('setInterval',vi.fn());vi.stubGlobal('fetch',vi.fn(()=>{throw Error('No real transport allowed')}));
 const snapshot=sample();snapshot.time=Date.now()/1000;snapshot.market.book!.time=Date.now();snapshot.indicators['15m']!.atr=30;
 s={snapshot,account:{assetPositions:[]},orders:[],today:[],meta:{asset:4,szDecimals:4,maxLeverage:20},book:snapshot.market.book!,equity:10000,available:10000,position:null};
 const {LiveEngine}=await import('../../shared/engine');vi.spyOn(LiveEngine.prototype,'snapshot').mockImplementation(async function(this:any){fake.engine=this;return s;});
});
afterEach(async()=>{dom.dispatchEvent(new dom.Event('pagehide'));await new Promise(setImmediate);await dom.happyDOM.abort();vi.restoreAllMocks();vi.unstubAllGlobals();vi.useRealTimers();});
async function configured(network:'testnet'|'mainnet'='testnet'){
 const {browserRequest}=await import('./runner');const state=await browserRequest('configure',{owner},network);fake.approved[network]=true;return {browserRequest,state};
}
function nextBar(){vi.setSystemTime(Date.now()+900000);s.snapshot.time=Date.now()/1000;s.snapshot.context.updatedAt=s.snapshot.time;s.book.time=Date.now();for(const tf of ['15m','1h','1d'] as const){s.snapshot.candleStatus[tf].fetchedAt=s.snapshot.time;s.snapshot.indicators[tf].lastClosedTime=Date.now()-1;}}
it('configures separate encrypted agents directly on the page with no HTTP service or secret in status',async()=>{
 const {browserRequest,state}=await configured(),main=await browserRequest('configure',{owner},'mainnet');expect(main.agent).not.toBe(state.agent);expect(state.mode).toBe('web');expect(state.active).toBe(false);expect('key' in state).toBe(false);expect('nonce' in state).toBe(false);expect(dom.localStorage.length).toBe(0);expect(fetch).not.toHaveBeenCalled();
});
it('requires mainnet consent and starts only after explicit arming without an immediate entry',async()=>{
 const {browserRequest}=await configured('mainnet');await expect(browserRequest('arm',{settings:{profile:'balanced',leverage:15}},'mainnet')).rejects.toThrow('MAINNET');
 expect((await browserRequest('arm',{settings:{profile:'balanced',leverage:15},consent:'MAINNET'},'mainnet')).active).toBe(true);expect(fake.sent).toHaveLength(0);
});
it('commits pending, quota and nonce before the browser transport sends an entry',async()=>{
 const {browserRequest}=await configured();await browserRequest('arm',{settings:{profile:'balanced',leverage:15}},'testnet');nextBar();
 const {BrowserVault}=await import('./vault'),vault=new BrowserVault((dom as any).indexedDB,webcrypto as unknown as Crypto);let checkpoint:any;
 fake.beforeSend=async()=>{checkpoint=(await vault.load('testnet'))!.ledger;};await fake.engine.tick();await vault.close();
 expect(fake.sent.filter(x=>x.payload.action.type==='order')).toHaveLength(1);expect(checkpoint.pending).not.toBeNull();expect(checkpoint.attemptCount).toBe(1);expect(checkpoint.nonce).toBeGreaterThan(0);
});
it('blocks a late entry at the transport when the tab becomes hidden during nonce/signing work',async()=>{
 const {browserRequest}=await configured();await browserRequest('arm',{settings:{profile:'balanced',leverage:15}},'testnet');nextBar();
 fake.beforeSend=async()=>{(dom.document as any).hidden=true;dom.document.dispatchEvent(new dom.Event('visibilitychange'));};await fake.engine.tick();
 expect(fake.sent.some(x=>x.payload.action.type==='order')).toBe(false);const state=await browserRequest('status',undefined,'testnet');expect(state.active).toBe(false);expect(state.pending).toBe(true);
});
it('reopens the same agent and unresolved journal after page lifecycle restart with entries disarmed',async()=>{
 const {browserRequest,state}=await configured();await browserRequest('arm',{settings:{profile:'balanced',leverage:15}},'testnet');nextBar();
 fake.beforeSend=async()=>{dom.dispatchEvent(new dom.Event('pagehide'));};await fake.engine.tick();await new Promise(setImmediate);
 const restored=await browserRequest('status',undefined,'testnet');expect(restored.agent).toBe(state.agent);expect(restored.active).toBe(false);expect(restored.pending).toBe(true);expect(fake.sent.some(x=>x.payload.action.type==='order')).toBe(false);
});
it('refuses another controlling tab and a changed MetaMask account',async()=>{
 const {browserRequest}=await configured();(dom as any).ethereum.request.mockResolvedValue(['0x2222222222222222222222222222222222222222']);await expect(browserRequest('arm',{settings:{profile:'balanced',leverage:15}},'testnet')).rejects.toThrow('propriétaire');
 vi.stubGlobal('navigator',{locks:{request:async(_n:string,_o:any,fn:any)=>fn(null)}});await expect(browserRequest('status',undefined,'mainnet')).rejects.toThrow('autre onglet');expect(fake.sent).toHaveLength(0);
});

it('keeps a prepared agent across refusal and page reopening, then preserves a confirmed valid authorization',async()=>{
 const {browserRequest}=await import('./runner');const initial=await browserRequest('configure',{owner},'testnet');
 expect((await browserRequest('configure',{owner},'testnet')).agent).toBe(initial.agent);
 dom.dispatchEvent(new dom.Event('pagehide'));await new Promise(setImmediate);expect((await browserRequest('configure',{owner},'testnet')).agent).toBe(initial.agent);
 fake.approved.testnet=true;await browserRequest('verify',{},'testnet');dom.dispatchEvent(new dom.Event('pagehide'));await new Promise(setImmediate);
 const restored=await browserRequest('configure',{owner},'testnet');expect(restored.agent).toBe(initial.agent);expect(restored.approved).toBe(true);expect(restored.active).toBe(false);
 fake.approved.testnet=false;const renewed=await browserRequest('configure',{owner},'testnet');expect(renewed.agent).not.toBe(initial.agent);expect(renewed.active).toBe(false);
});
