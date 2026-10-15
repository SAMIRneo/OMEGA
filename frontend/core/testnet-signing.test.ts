import {it,expect} from 'vitest';
import {ExchangeClient,HttpTransport} from '@nktkas/hyperliquid';
import {testnetPlan,type TestnetPlanInput} from './testnet-plan';
it('SDK signs testnet L1 actions with testnet source, expiry and IOC bracket fields',async()=>{
 const signatures:unknown[]=[],requests:Array<{endpoint:string;payload:any}>=[];
 // Non-secret signature fixture, never sent to an exchange.
 const wallet={address:'0x1111111111111111111111111111111111111111' as const,getChainId:async()=>421614,signTypedData:async(data:unknown)=>{signatures.push(data);return ('0x'+'11'.repeat(32)+'22'.repeat(32)+'1b') as `0x${string}`;}};
 const transport={isTestnet:true,async request<T>(endpoint:string,payload:unknown){requests.push({endpoint,payload});return {status:'ok',response:{type:'order',data:{statuses:[{filled:{oid:1,totalSz:'.02',avgPx:'2400'}},{resting:{oid:2}},{resting:{oid:3}}]}}} as T;}};
 const client=new ExchangeClient({wallet,transport,defaultExpiresAfter:()=>Date.now()+60000});
 const input:TestnetPlanInput={network:'testnet',asset:4,szDecimals:4,maxLeverage:20,side:'long',quantity:.02,leverage:2,stop:2380,target:2460,bid:2399.9,ask:2400,bookTime:Date.now(),now:Date.now(),equity:1000,available:1000,cloid:'0x11111111111111111111111111111111'};
 const p=testnetPlan(input);await client.order({orders:p.orders,grouping:p.grouping});
 expect(requests).toHaveLength(1);expect(requests[0].endpoint).toBe('exchange');expect(requests[0].payload.action.grouping).toBe('normalTpsl');expect(requests[0].payload.expiresAfter).toBeGreaterThan(Date.now());expect((signatures[0] as any).message.source).toBe('b');expect(new HttpTransport({isTestnet:true}).isTestnet).toBe(true);
});
