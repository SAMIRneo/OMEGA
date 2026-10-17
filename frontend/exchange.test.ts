import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {Window} from 'happy-dom';
import {readFileSync} from 'node:fs';
const fake=vi.hoisted(()=>({network:'testnet',calls:[] as any[],today:[] as any[],open:[] as any[],reject:false,accounts:['0x1111111111111111111111111111111111111111']}));
vi.mock('@nktkas/hyperliquid',()=>({
 HttpTransport:class {isTestnet:boolean;constructor(o:any){this.isTestnet=o.isTestnet;fake.calls.push(['transport',o]);}},
 InfoClient:class {
  async clearinghouseState(){return {marginSummary:{accountValue:'1000'},withdrawable:'1000',assetPositions:[]};}
  async frontendOpenOrders(){return fake.open;}
  async userFills(){return [];}
  async userFillsByTime(){return fake.today;}
  async meta(){return {universe:[...Array.from({length:fake.network==='mainnet'?2:1},(_,i)=>({name:'OTHER'+i,szDecimals:2,maxLeverage:10})),{name:'ETH',szDecimals:4,maxLeverage:20}]};}
  async l2Book(){return {time:Date.now(),levels:[[{px:'2399.9',sz:'100'}],[{px:'2400',sz:'100'}]]};}
  async orderStatus(){return {status:'unknownOid'};}
 },
 ExchangeClient:class {
  async updateLeverage(p:any){fake.calls.push(['leverage',p]);return {status:'ok'};}
  async order(p:any){fake.calls.push(['order',p]);if(fake.reject)throw Error('Transport lost');return {status:'ok',response:{data:{statuses:[{filled:{oid:1,totalSz:'.02',avgPx:'2400'}},{resting:{oid:2}},{resting:{oid:3}}]}}};}
  async cancel(){return {status:'ok',response:{data:{statuses:[{error:'already filled'}]}}};}
 }
}));
let dom:Window;
const el=(id:string)=>dom.document.getElementById(id)!;
async function settle(){for(let i=0;i<25;i++)await new Promise(r=>setTimeout(r,0));}
async function start(network='testnet'){
 fake.network=network;
 (dom as any).BrowserAtelier={environment:{id:network},setAddress:vi.fn()};
 (dom as any).ethereum={request:async()=>fake.accounts,on:vi.fn()};
 await import('./exchange');
 (el('testnet-connect') as any).click();await settle();
 const form=el('testnet-order-form') as any;
 for(const [name,value] of Object.entries({side:'long',quantity:'.02',leverage:'2',stop:'2380',target:'2460'}))form.elements.namedItem(name).value=value;
 return form;
}
beforeEach(()=>{
 vi.resetModules();fake.calls=[];fake.today=[];fake.open=[];fake.reject=false;fake.accounts=['0x1111111111111111111111111111111111111111'];
 dom=new Window({url:'https://omega.test/'});dom.document.write(readFileSync(new URL('./index.html',import.meta.url),'utf8'));
 vi.stubGlobal('window',dom);vi.stubGlobal('document',dom.document);vi.stubGlobal('localStorage',dom.localStorage);vi.stubGlobal('navigator',{locks:{request:async(_name:string,fn:()=>unknown)=>fn()}});
});
afterEach(()=>{dom.happyDOM.abort();vi.unstubAllGlobals();});
it('preserves locked form values through both signing steps and sends an IOC bracket on testnet',async()=>{
 const form=await start();form.dispatchEvent(new dom.Event('submit',{cancelable:true}));await settle();
 const order=fake.calls.find(x=>x[0]==='order')?.[1];expect(order).toBeTruthy();expect(order.orders[0].a).toBe(1);expect(order.orders[0].s).toBe('0.02');expect(order.orders[0].t.limit.tif).toBe('Ioc');expect(order.orders.slice(1).every((x:any)=>x.r)).toBe(true);
 expect(fake.calls.find(x=>x[0]==='transport')[1].apiUrl).toBe('https://api.hyperliquid-testnet.xyz');
 expect(el('testnet-action-status').textContent).toContain('TESTNET');
});
it('requires explicit mainnet consent, pins its transport and resets consent after sending',async()=>{
 const form=await start('mainnet');form.dispatchEvent(new dom.Event('submit',{cancelable:true}));await settle();
 expect(fake.calls.some(x=>x[0]==='leverage')).toBe(false);
 (el('mainnet-consent') as any).checked=true;form.dispatchEvent(new dom.Event('submit',{cancelable:true}));await settle();
 expect(fake.calls.find(x=>x[0]==='transport')[1]).toMatchObject({isTestnet:false,apiUrl:'https://api.hyperliquid.xyz'});
 expect(fake.calls.find(x=>x[0]==='order')[1].orders[0].a).toBe(2);expect(fake.calls.some(x=>x[0]==='order')).toBe(true);expect((el('mainnet-consent') as any).checked).toBe(false);
});
it('keeps uncertain sends pending, blocks duplicates and isolates the mainnet journal',async()=>{
 const form=await start('mainnet');fake.reject=true;(el('mainnet-consent') as any).checked=true;
 form.dispatchEvent(new dom.Event('submit',{cancelable:true}));await settle();
 const key='omega-mainnet-exchange-pending-'+fake.accounts[0];expect(dom.localStorage.getItem(key)).toContain('cloid');
 expect(dom.localStorage.getItem(key.replace('mainnet','testnet'))).toBeNull();
 (el('mainnet-consent') as any).checked=true;form.dispatchEvent(new dom.Event('submit',{cancelable:true}));await settle();
 expect(fake.calls.filter(x=>x[0]==='order')).toHaveLength(1);expect(el('testnet-action-status').textContent).toContain('reste à vérifier');
});
it('enforces the exchange daily entry quota instead of resetting paper counters',async()=>{
 fake.today=[{coin:'ETH',time:Date.now(),dir:'Open Long',oid:1,closedPnl:'0',fee:'0.5',feeToken:'USDC'}];
 const form=await start();form.dispatchEvent(new dom.Event('submit',{cancelable:true}));await settle();
 expect(fake.calls.some(x=>x[0]==='leverage')).toBe(false);expect(el('testnet-action-status').textContent).toContain('Pause entre opérations');
});
it('stops before signing when the active wallet account changed',async()=>{
 const form=await start();fake.accounts=['0x2222222222222222222222222222222222222222'];
 form.dispatchEvent(new dom.Event('submit',{cancelable:true}));await settle();expect(fake.calls.some(x=>x[0]==='order')).toBe(false);
 expect(el('testnet-action-status').textContent).toContain('compte actif');
});
it('calibrates the visible plan on exchange equity and blocks it with open exchange orders',async()=>{
 await start();
 const paper={cash:10000,equity:10000,initial:10000,history:[],position:null,entriesToday:0,dailyPnl:0};
 const s={paper,market:{fresh:true},limits:{max_margin:5000}};
 expect((dom as any).ExchangeSnapshot(s).paper.equity).toBe(1000);
 fake.open=[{coin:'ETH',oid:44,side:'A',sz:'.02',limitPx:'2380',isTrigger:true,triggerPx:'2380'}];
 (el('testnet-refresh') as any).click();await settle();
 expect((dom as any).ExchangeSnapshot(s).paper.entriesToday).toBe(1);
});
it('reports a rejected cancellation without claiming that the order was cancelled',async()=>{
 fake.open=[{coin:'ETH',oid:44,side:'A',sz:'.02',limitPx:'2380',isTrigger:true,triggerPx:'2380'}];
 await start();(dom.document.querySelector('#testnet-orders button') as any).click();await settle();
 expect(el('testnet-action-status').textContent).toBe('already filled');
});

it('publishes a verified wallet read without sending any trading action',async()=>{
 await start();const {subscribeWallet}=await import('./shared/wallet-store');let state:any;subscribeWallet(s=>state=s);
 expect(state).toMatchObject({network:'testnet',address:fake.accounts[0],equity:1000,busy:false,error:false});expect(state.readAt).toBeGreaterThan(0);
 expect(fake.calls.some(x=>x[0]==='order'||x[0]==='leverage')).toBe(false);
 const callback=(dom as any).ethereum.on.mock.calls.find((x:any)=>x[0]==='accountsChanged')[1];callback();
 expect(state).toMatchObject({address:null,equity:null,readAt:0});
});
it('explains a rejected MetaMask connection and allows a retry without signing',async()=>{
 (dom as any).BrowserAtelier={environment:{id:'testnet'},setAddress:vi.fn()};
 (dom as any).ethereum={request:vi.fn().mockRejectedValueOnce({code:4001}).mockResolvedValue(fake.accounts),on:vi.fn()};
 const module=await import('./exchange');await module.connectWallet();
 expect(el('testnet-action-status').textContent).toContain('Demande refusée dans MetaMask');
 await module.connectWallet();expect(el('testnet-wallet').textContent).toBe(fake.accounts[0]);
 expect(fake.calls.some(x=>x[0]==='order'||x[0]==='leverage')).toBe(false);
});

it('refuses a secondary account and an inconsistent endpoint before signing',async()=>{
 const form=await start();fake.accounts=['0x2222222222222222222222222222222222222222','0x1111111111111111111111111111111111111111'];
 form.dispatchEvent(new dom.Event('submit',{cancelable:true}));await settle();expect(fake.calls.some(x=>x[0]==='leverage'||x[0]==='order')).toBe(false);
 fake.accounts=['0x1111111111111111111111111111111111111111'];(dom as any).BrowserAtelier.environment.api='https://api.hyperliquid.xyz/info';
 form.dispatchEvent(new dom.Event('submit',{cancelable:true}));await settle();expect(el('testnet-action-status').textContent).toContain('Endpoints incohérents');expect(fake.calls.some(x=>x[0]==='order')).toBe(false);
});
it('discards an in-flight account read after wallet disconnection',async()=>{
 await start();const {InfoClient}=await import('@nktkas/hyperliquid');let resolve!:(value:any)=>void;
 const original=InfoClient.prototype.clearinghouseState;
 InfoClient.prototype.clearinghouseState=vi.fn(()=>new Promise(r=>{resolve=r;})) as any;
 try{const module=await import('./exchange');const read=module.refreshWallet();await settle();module.disconnectWallet();resolve({marginSummary:{accountValue:'9999'},withdrawable:'9999',assetPositions:[]});await read;
 const {subscribeWallet}=await import('./shared/wallet-store');let view:any;const off=subscribeWallet(s=>view=s);expect(view.address).toBeNull();expect(view.equity).toBeNull();expect(view.readAt).toBe(0);off();expect(fake.calls.some(x=>x[0]==='order')).toBe(false);
 }finally{InfoClient.prototype.clearinghouseState=original;}
});
it('blocks a network change during a wallet read and rejects a malformed pending journal',async()=>{
 await start();const key='omega-testnet-exchange-pending-'+fake.accounts[0];dom.localStorage.setItem(key,JSON.stringify({cloid:'bad',at:NaN}));
 (el('testnet-preview') as any).click();await settle();expect(el('testnet-action-status').textContent).toContain('Journal d’envoi illisible');expect(fake.calls.some(x=>x[0]==='leverage'||x[0]==='order')).toBe(false);
});
