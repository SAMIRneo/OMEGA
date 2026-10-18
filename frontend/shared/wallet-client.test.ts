import {afterEach,beforeEach,it,expect,vi} from 'vitest';
import {Window} from 'happy-dom';
import {ExchangeClient} from '@nktkas/hyperliquid';
const owner='0x1111111111111111111111111111111111111111' as const,agent='0x2222222222222222222222222222222222222222' as const;
beforeEach(()=>{vi.resetModules();vi.stubGlobal('window',new Window());});
afterEach(()=>vi.unstubAllGlobals());
async function setup(network:'testnet'|'mainnet',options:{reject?:number;changedAccount?:boolean;changedChain?:boolean}={}){
 const {sessionWallet}=await import('./wallet-client');let signed=0;const typed:any[]=[],sent:any[]=[];
 const request=vi.fn(async({method,params}:any)=>{
  if(method==='eth_accounts')return [options.changedAccount?agent:owner];
  if(method==='eth_chainId')return options.changedChain?'0x1':'0xa4b1';
  if(method==='eth_signTypedData_v4'){signed++;if(options.reject)throw Object.assign(Error('Approval rejected'),{code:options.reject});typed.push(JSON.parse(params[1]));return '0x'+'11'.repeat(32)+'22'.repeat(32)+'1b';}
  throw Error(method);
 });
 const wallet=sessionWallet({request} as any,owner,network);
 const client=new ExchangeClient({wallet,signatureChainId:()=> '0xa4b1',transport:{isTestnet:network==='testnet',async request<T>(_endpoint:string,payload:any){sent.push(payload);return {status:'ok',response:{type:'default'}} as T;}}});
 return {approve:()=>client.approveAgent({agentAddress:agent,agentName:'OMEGA-'+network}),request,typed,sent,signCount:()=>signed};
}
it.each(['testnet','mainnet'] as const)('sends one structured %s approval after verifying owner, wallet chain and network',async network=>{
 const fixture=await setup(network);await fixture.approve();
 expect(fixture.signCount()).toBe(1);expect(fixture.sent).toHaveLength(1);
 expect(fixture.typed[0].primaryType).toBe('HyperliquidTransaction:ApproveAgent');
 expect(fixture.typed[0].message.hyperliquidChain).toBe(network==='testnet'?'Testnet':'Mainnet');
 expect(fixture.request.mock.calls.some(c=>c[0].method==='eth_requestAccounts')).toBe(false);
});
it.each([4001,-32603])('does not retry a wallet rejection (%s) or transmit an exchange approval',async code=>{
 const fixture=await setup('testnet',{reject:code});await expect(fixture.approve()).rejects.toThrow();
 expect(fixture.signCount()).toBe(1);expect(fixture.sent).toHaveLength(0);
 const {walletError}=await import('./wallet-provider');try{await fixture.approve();}catch(error){if(code===4001)expect(walletError(error)).toContain('4001');}
});
it.each([{changedAccount:true},{changedChain:true}])('blocks a modified wallet session before requesting a signature: %j',async change=>{
 const fixture=await setup('mainnet',change);await expect(fixture.approve()).rejects.toThrow();expect(fixture.signCount()).toBe(0);expect(fixture.sent).toHaveLength(0);
});
