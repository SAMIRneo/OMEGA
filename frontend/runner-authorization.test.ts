import {it,expect,vi,beforeEach,afterEach} from 'vitest';
import {Window} from 'happy-dom';
import {readFileSync} from 'node:fs';
const fake=vi.hoisted(()=>({states:{} as Record<string,any>,signatures:[] as any[],refuseMainnet:false,requests:[] as string[]}));
vi.mock('./web/runner',()=>({browserRequest:vi.fn(async(path:string,body:any,network:string)=>{
 fake.requests.push(path);const s=fake.states[network];if(path==='configure'){s.owner=body.owner;s.agent=network==='mainnet'?'0x3333333333333333333333333333333333333333':'0x2222222222222222222222222222222222222222';}return {...s};
})}));
vi.mock('@nktkas/hyperliquid',()=>({HttpTransport:class{isTestnet:boolean;constructor(o:any){this.isTestnet=o.isTestnet}},ExchangeClient:class{network:string;constructor(o:any){this.network=o.transport.isTestnet?'testnet':'mainnet'}async approveAgent(p:any){fake.signatures.push({network:this.network,...p});if(this.network==='mainnet'&&fake.refuseMainnet)throw Object.assign(Error('User refused'),{code:4001});fake.states[this.network].approved=true;fake.states[this.network].approvedUntil=Date.now()+86400000;}}}));
let dom:Window;
const owner='0x1111111111111111111111111111111111111111';
beforeEach(()=>{
 vi.resetModules();fake.signatures=[];fake.requests=[];fake.refuseMainnet=false;fake.states={testnet:{network:'testnet',approved:false,active:false},mainnet:{network:'mainnet',approved:false,active:false}};
 dom=new Window({url:'https://omega.test/#pilot'});dom.document.write(readFileSync(new URL('./index.html',import.meta.url),'utf8'));(dom as any).BrowserAtelier={environment:{id:'testnet'},setAddress:vi.fn()};(dom as any).ethereum={request:vi.fn(async()=>[owner])};
 vi.stubGlobal('window',dom);vi.stubGlobal('document',dom.document);vi.stubGlobal('location',dom.location);vi.stubGlobal('navigator',{locks:{request:async(_name:string,fn:any)=>fn()}});vi.stubGlobal('setInterval',vi.fn());
});
afterEach(async()=>{await dom.happyDOM.abort();vi.unstubAllGlobals();});
async function settle(){await vi.dynamicImportSettled();await new Promise(resolve=>setTimeout(resolve,0));await vi.dynamicImportSettled();}
async function authorize(){(dom.document.getElementById('runner-authorize') as unknown as HTMLButtonElement).click();await settle();}
it('authorizes distinct networks once, keeps approvals on return and never starts the bot during setup',async()=>{
 await import('./runner-ui');await settle();await authorize();
 expect(fake.signatures.map(x=>x.network)).toEqual(['testnet','mainnet']);expect(fake.signatures[0].agentAddress).not.toBe(fake.signatures[1].agentAddress);expect(fake.signatures.every(x=>/ valid_until \d+$/.test(x.agentName))).toBe(true);
 expect(fake.requests).not.toContain('arm');expect(dom.localStorage.getItem('omega-wallet-session-v1')).toContain(owner);
 await authorize();expect(fake.signatures).toHaveLength(2);expect(fake.requests).not.toContain('arm');
});
it('retains a successful Testnet approval after a Mainnet refusal and retries only the missing network',async()=>{
 fake.refuseMainnet=true;await import('./runner-ui');await settle();await authorize();expect(fake.states.testnet.approved).toBe(true);expect(fake.states.mainnet.approved).toBe(false);expect(dom.document.getElementById('runner-status')?.textContent).toContain('refusée');
 fake.refuseMainnet=false;await authorize();expect(fake.signatures.map(x=>x.network)).toEqual(['testnet','mainnet','mainnet']);expect(fake.requests).not.toContain('arm');
});
