import {beforeEach,afterEach,it,expect,vi} from 'vitest';
import {Window} from 'happy-dom';
import {readFileSync} from 'node:fs';
const fake=vi.hoisted(()=>({states:{} as Record<string,any>,approvals:[] as string[],commands:[] as any[]}));
vi.mock('@nktkas/hyperliquid',()=>({HttpTransport:class{isTestnet:boolean;constructor(o:any){this.isTestnet=o.isTestnet;}},InfoClient:class{async clearinghouseState(){return {marginSummary:{accountValue:'1200'},withdrawable:'1000',assetPositions:[]};}},ExchangeClient:class{network:string;constructor(o:any){this.network=o.transport.isTestnet?'testnet':'mainnet';}async approveAgent(){fake.approvals.push(this.network);fake.states[this.network].approved=true;}}}));
vi.mock('./web/runner',()=>({browserRequest:async(path:string,body:any,network:string)=>{fake.commands.push({path,body,network});const state=fake.states[network];if(path==='configure')state.owner=body.owner;if(path==='arm')state.active=true;return {...state};}}));
let dom:Window,permission:ReturnType<typeof vi.fn>;const owner='0x1111111111111111111111111111111111111111';
const el=(id:string)=>dom.document.getElementById(id)! as any;
async function settle(){await vi.dynamicImportSettled();for(let i=0;i<8;i++)await new Promise(done=>setTimeout(done,0));}
beforeEach(()=>{vi.resetModules();fake.approvals=[];fake.commands=[];fake.states=Object.fromEntries(['testnet','mainnet'].map((network,i)=>[network,{network,owner:null,agent:'0x'+String(i+2).repeat(40),approved:false,active:false,busy:false,events:[]} ]));dom=new Window({url:'https://omega.test/#pilot'});dom.document.write(readFileSync(new URL('./index.html',import.meta.url),'utf8'));permission=vi.fn(async({method}:any)=>method==='eth_chainId'?'0x1':[owner]);(dom as any).ethereum={request:permission,on(){},removeListener(){}};vi.stubGlobal('window',dom);vi.stubGlobal('document',dom.document);vi.stubGlobal('location',dom.location);vi.stubGlobal('navigator',{locks:{request:async(_name:string,callback:()=>any)=>callback()}});vi.stubGlobal('setInterval',vi.fn());});
afterEach(()=>{dom.happyDOM.abort();vi.unstubAllGlobals();});
it.each(['testnet','mainnet'] as const)('connects once, authorizes both agents and explicitly starts %s through the real Bot UI',async network=>{
 (dom as any).BrowserAtelier={environment:{id:network},setAddress:vi.fn(async()=>{})};await import('./wallet-connection');await import('./runner-ui');await settle();
 el('next-step-action').click();await settle();expect(el('connect-address').textContent).toBe(owner);expect(el('next-step-action').dataset.target).toBe('authorize');
 el('runner-both-networks').checked=true;el('next-step-action').click();await settle();expect(fake.approvals).toEqual(['testnet','mainnet']);expect(fake.commands.some(c=>c.path==='arm')).toBe(false);expect(el('next-step-action').dataset.target).toBe('ready');
 if(network==='mainnet'){el('runner-mainnet').checked=true;el('runner-mainnet').dispatchEvent(new dom.Event('change'));}
 el('next-step-action').click();await settle();expect(fake.states[network].active).toBe(true);expect(fake.commands.find(c=>c.path==='arm').body.consent).toBe(network==='mainnet'?'MAINNET':undefined);
 expect(permission.mock.calls.filter(c=>c[0].method==='eth_requestAccounts')).toHaveLength(1);
});
