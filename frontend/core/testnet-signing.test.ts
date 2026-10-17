import {it,expect} from 'vitest';
import {ExchangeClient,HttpTransport} from '@nktkas/hyperliquid';
import {exchangePlan,type TestnetPlanInput} from './testnet-plan';
it.each(['testnet','mainnet'] as const)('SDK signs %s L1 actions with the correct source, expiry and IOC bracket fields',async(network)=>{
 const signatures:unknown[]=[],requests:Array<{endpoint:string;payload:any}>=[];
 // Non-secret signature fixture, never sent to an exchange.
 const wallet={address:'0x1111111111111111111111111111111111111111' as const,getChainId:async()=>421614,signTypedData:async(data:unknown)=>{signatures.push(data);return ('0x'+'11'.repeat(32)+'22'.repeat(32)+'1b') as `0x${string}`;}};
 const transport={isTestnet:network==='testnet',async request<T>(endpoint:string,payload:unknown){requests.push({endpoint,payload});return {status:'ok',response:{type:'order',data:{statuses:[{filled:{oid:1,totalSz:'.02',avgPx:'2400'}},{resting:{oid:2}},{resting:{oid:3}}]}}} as T;}};
 const client=new ExchangeClient({wallet,transport,defaultExpiresAfter:()=>Date.now()+60000});
 const input:TestnetPlanInput={network,asset:4,szDecimals:4,maxLeverage:20,side:'long',quantity:.02,leverage:2,stop:2380,target:2460,bid:2399.9,ask:2400,bookTime:Date.now(),now:Date.now(),equity:1000,available:1000,cloid:'0x11111111111111111111111111111111'};
 const p=exchangePlan({...input,expectedNetwork:network});await client.order({orders:p.orders,grouping:p.grouping});
 expect(requests).toHaveLength(1);expect(requests[0].endpoint).toBe('exchange');expect(requests[0].payload.action.grouping).toBe('normalTpsl');expect(requests[0].payload.expiresAfter).toBeGreaterThan(Date.now());expect((signatures[0] as any).message.source).toBe(network==='testnet'?'b':'a');expect(new HttpTransport({isTestnet:true}).isTestnet).toBe(true);
});

it.each(['testnet','mainnet'] as const)('separates %s agent-approval signing from L1 signing and keeps nonces unique',async network=>{
 const signatures:any[]=[],payloads:any[]=[];let nonce=Date.now();
 const wallet={address:'0x1111111111111111111111111111111111111111' as const,getChainId:async()=>421614,signTypedData:async(data:unknown)=>{signatures.push(data);return ('0x'+'11'.repeat(32)+'22'.repeat(32)+'1b') as `0x${string}`;}};
 const transport={isTestnet:network==='testnet',async request<T>(_endpoint:string,payload:any){payloads.push(payload);return {status:'ok',response:{type:'default'}} as T;}};
 const client=new ExchangeClient({wallet,transport,nonceManager:()=>++nonce,defaultExpiresAfter:()=>Date.now()+60000});
 await client.updateLeverage({asset:network==='mainnet'?4:1,isCross:false,leverage:2});await client.updateLeverage({asset:network==='mainnet'?4:1,isCross:false,leverage:3});
 await client.approveAgent({agentAddress:'0x2222222222222222222222222222222222222222',agentName:'OMEGA-'+network});
 expect(new Set(payloads.map(p=>p.nonce)).size).toBe(3);expect(payloads[1].nonce).toBeGreaterThan(payloads[0].nonce);
 expect(signatures[0].message.source).toBe(network==='testnet'?'b':'a');
 expect(payloads[2].action.hyperliquidChain).toBe(network==='testnet'?'Testnet':'Mainnet');
 expect(signatures[2].message.hyperliquidChain).toBe(payloads[2].action.hyperliquidChain);expect(payloads[2].action.signatureChainId).toBe('0x1');expect(signatures[2].domain.chainId).toBe(1);
});

it.each(['testnet','mainnet'] as const)('produces recoverable offline signatures for %s orders and agent approval',async network=>{
 const {privateKeyToAccount}=await import('viem/accounts');const {recoverTypedDataAddress}=await import('viem');
 // Public deterministic test key; never funded and never transmitted.
 const account=privateKeyToAccount(('0x'+'11'.repeat(32)) as `0x${string}`),signed:Array<{data:any;signature:`0x${string}`}>=[];
 const wallet={...account,signTypedData:async(data:any)=>{const signature=await account.signTypedData(data);signed.push({data,signature});return signature;}};
 const transport={isTestnet:network==='testnet',async request<T>(){return {status:'ok',response:{type:'default'}} as T;}};
 const client=new ExchangeClient({wallet,transport});await client.updateLeverage({asset:1,isCross:false,leverage:2});await client.approveAgent({agentAddress:'0x2222222222222222222222222222222222222222',agentName:'OMEGA-'+network});
 expect(signed[0].data.message.source).toBe(network==='testnet'?'b':'a');expect(signed[1].data.message.hyperliquidChain).toBe(network==='testnet'?'Testnet':'Mainnet');
 for(const {data,signature} of signed)expect((await recoverTypedDataAddress({...data,signature})).toLowerCase()).toBe(account.address.toLowerCase());
});
it.each(['testnet','mainnet'] as const)('accepts the web agent name and 30-day expiry in the real SDK on %s',async network=>{
 let payload:any;const wallet={address:'0x1111111111111111111111111111111111111111' as const,getChainId:async()=>1,signTypedData:async(_data:unknown)=>('0x'+'11'.repeat(32)+'22'.repeat(32)+'1b') as `0x${string}`};
 const client=new ExchangeClient({wallet,transport:{isTestnet:network==='testnet',request:async<T>(_endpoint:string,data:any)=>{payload=data;return {status:'ok',response:{type:'default'}} as T;}}});
 const name='OMEGAweb-'+network;expect(name.length).toBeLessThanOrEqual(16);await client.approveAgent({agentAddress:'0x2222222222222222222222222222222222222222',agentName:name+' valid_until '+(Date.now()+30*86400000)});expect(payload.action.hyperliquidChain).toBe(network==='testnet'?'Testnet':'Mainnet');
});
