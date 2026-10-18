import {it,expect,vi,beforeEach,afterEach} from 'vitest';
import {Window} from 'happy-dom';
import {readFileSync} from 'node:fs';
const fake=vi.hoisted(()=>({signatures:[] as any[],rejectMain:false,unavailableTest:false}));
vi.mock('@nktkas/hyperliquid',()=>({HttpTransport:class{isTestnet:boolean;constructor(o:any){this.isTestnet=o.isTestnet}},ExchangeClient:class{options:any;constructor(o:any){this.options=o}async approveAgent(p:any){const n=this.options.transport.isTestnet?'testnet':'mainnet';fake.signatures.push({network:n,...p});if(n==='mainnet'&&fake.rejectMain)throw {code:4001};states[n].approved=true;states[n].approvedUntil=Number(p.agentName.split('valid_until ')[1]);}}}));
vi.mock('./web/runner',()=>({browserRequest:vi.fn(async(path:string,body:any,n:string)=>{calls.push({path:'web/'+path+'?network='+n,body});if(n==='testnet'&&fake.unavailableTest)throw Error('Testnet offline');if(path==='configure'){states[n].owner=body.owner;states[n].approved=false;}if(path==='arm')states[n].active=true;return {...states[n],mode:'web'};})}));
const owner='0x1111111111111111111111111111111111111111';
let dom:Window,states:Record<string,any>,calls:{path:string;body:any}[],permission:ReturnType<typeof vi.fn>,restarted=false;
const el=(id:string)=>dom.document.getElementById(id)!;
async function settle(){await vi.dynamicImportSettled();for(let i=0;i<8;i++)await new Promise(r=>setTimeout(r,0));}
beforeEach(()=>{
 vi.resetModules();fake.signatures=[];fake.rejectMain=false;fake.unavailableTest=false;calls=[];restarted=false;
 dom=new Window({url:'http://127.0.0.1:8766/#pilot'});dom.document.write(readFileSync(new URL('./index.html',import.meta.url),'utf8'));(dom.document.getElementById('runner-both-networks') as any).checked=true;
 states=Object.fromEntries(['testnet','mainnet'].map((n,i)=>[n,{network:n,agent:'0x'+String(i+2).repeat(40),owner:null,approved:false,active:false,busy:false,events:[],reason:'À l’arrêt.'}]));
 permission=vi.fn(async()=>[owner]);(dom as any).ethereum={request:permission};(dom as any).BrowserAtelier={environment:{id:'testnet'},setAddress:vi.fn()};
 vi.stubGlobal('window',dom);vi.stubGlobal('document',dom.document);vi.stubGlobal('location',dom.location);vi.stubGlobal('setInterval',vi.fn());
 vi.stubGlobal('navigator',{locks:{request:async(_name:string,fn:()=>any)=>fn()}});
 vi.stubGlobal('fetch',vi.fn(async(path:string,options:any)=>{
  const body=options?.body?JSON.parse(options.body):null;calls.push({path,body});
  if(path.endsWith('/session'))return {ok:true,status:200,json:async()=>({token:'local-session'})};
  if(restarted){restarted=false;return {ok:false,status:401,json:async()=>({error:'expired'})};}
  const url=new URL(path,dom.location.origin),n=url.searchParams.get('network')!,state=states[n];
  if(url.pathname.endsWith('/configure')){state.owner=body.owner;state.approved=false;}
  return {ok:true,status:200,json:async()=>({...state})};
 }));
});
afterEach(()=>{dom.happyDOM.abort();vi.unstubAllGlobals();});
it('configures both networks once, then reuses verified agents without rotating or signing again',async()=>{
 await import('./runner-ui');await settle();(el('runner-authorize') as any).click();await settle();
 expect(fake.signatures.map(x=>x.network)).toEqual(['testnet','mainnet']);expect(calls.filter(x=>x.path.includes('/configure'))).toHaveLength(2);
 expect(fake.signatures.every(x=>Number(x.agentName.split('valid_until ')[1])>Date.now()+179*86400000)).toBe(true);
 expect(permission.mock.calls[0][0].method).toBe('eth_requestAccounts');expect(calls.some(x=>x.path.includes('/arm'))).toBe(false);
 (el('runner-authorize') as any).click();await settle();expect(fake.signatures).toHaveLength(2);expect(calls.filter(x=>x.path.includes('/configure'))).toHaveLength(2);
 expect(el('runner-network-mainnet').textContent).toContain('autorisé jusqu’au');
});
it('retains the first approval after rejection of the second and signs only the missing network on retry',async()=>{
 await import('./runner-ui');await settle();fake.rejectMain=true;(el('runner-authorize') as any).click();await settle();
 expect(states.testnet.approved).toBe(true);expect(states.mainnet.approved).toBe(false);expect(el('runner-network-testnet').textContent).toContain('autorisé');
 fake.rejectMain=false;(el('runner-setup-networks') as any).click();await settle();expect(fake.signatures.map(x=>x.network)).toEqual(['testnet','mainnet','mainnet']);
 expect(calls.filter(x=>x.path.includes('/configure?network=testnet'))).toHaveLength(1);expect(calls.some(x=>x.path.includes('/arm'))).toBe(false);
});
it('can configure only the selected network and renews a stale local HTTP session once',async()=>{
 await import('./runner-ui');await settle();(el('runner-both-networks') as any).checked=false;
 (el('runner-authorize') as any).click();await settle();expect(fake.signatures.map(x=>x.network)).toEqual(['testnet']);
 const previous=calls.filter(x=>x.path.endsWith('/session')).length;restarted=true;(el('runner-refresh') as any).click();await settle();
 expect(calls.filter(x=>x.path.endsWith('/session'))).toHaveLength(previous+1);expect(el('runner-service').textContent).toContain('Connecté');
});

it('authorizes both networks and explicitly starts from the hosted page without a local service',async()=>{
 dom.location.href='https://omega.test/#pilot';(dom as any).BrowserAtelier.environment.id='mainnet';await import('./runner-ui');await settle();
 expect(el('web-mode-note').hasAttribute('hidden')).toBe(false);expect(el('runner-mainnet-row').hasAttribute('hidden')).toBe(false);(el('runner-authorize') as any).click();await settle();
 expect(fake.signatures.map(x=>x.network)).toEqual(['testnet','mainnet']);expect(fake.signatures.every(x=>x.agentName.startsWith('OMEGAweb-'))).toBe(true);expect(fetch).not.toHaveBeenCalled();
 expect((el('runner-start') as any).disabled).toBe(true);(el('runner-mainnet') as any).checked=true;el('runner-mainnet').dispatchEvent(new dom.Event('change'));(el('runner-start') as any).click();await settle();
 expect(calls.find(x=>x.path==='web/arm?network=mainnet')?.body.consent).toBe('MAINNET');expect(states.mainnet.active).toBe(true);expect(fetch).not.toHaveBeenCalled();
});

it('does not disconnect the selected mainnet runtime when only testnet verification is unavailable',async()=>{
 dom.location.href='https://omega.test/#pilot';(dom as any).BrowserAtelier.environment.id='mainnet';states.mainnet.owner=owner;states.mainnet.approved=true;fake.unavailableTest=true;
 await import('./runner-ui');await settle();expect(el('runner-service').textContent).toContain('Mode web · MAINNET');expect(el('runner-network-testnet').textContent).toContain('à vérifier');
 (el('runner-mainnet') as any).checked=true;el('runner-mainnet').dispatchEvent(new dom.Event('change'));expect((el('runner-start') as any).disabled).toBe(false);
 expect(fake.signatures).toHaveLength(0);expect(calls.some(x=>x.path.includes('/arm'))).toBe(false);
});
it('authorizes mainnet independently when testnet is unavailable',async()=>{
 dom.location.href='https://omega.test/#pilot';fake.unavailableTest=true;
 await import('./runner-ui');await settle();(el('runner-authorize-mainnet') as any).click();await settle();
 expect(fake.signatures.map(x=>x.network)).toEqual(['mainnet']);expect(states.mainnet.approved).toBe(true);
 expect(calls.some(x=>x.path.includes('/arm'))).toBe(false);
});
it('keeps an authorization error visible after a background refresh',async()=>{
 await import('./runner-ui');await settle();fake.rejectMain=true;(el('runner-authorize-mainnet') as any).click();await settle();
 const error=el('runner-status').textContent;expect(error).toContain('refusée');
 (el('runner-refresh') as any).click();await settle();expect(el('runner-status').textContent).toBe(error);
});
