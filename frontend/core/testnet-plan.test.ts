import {it,expect} from 'vitest';
import {testnetPlan,exchangePlan,exchangeStatus,exchangeDay,type TestnetPlanInput} from './testnet-plan';
const input=():TestnetPlanInput=>({network:'testnet',asset:4,szDecimals:4,maxLeverage:20,side:'long',quantity:.02,leverage:2,stop:2380,target:2460,bid:2399.9,ask:2400,bookTime:10000,now:11000,equity:1000,available:1000,cloid:'0x11111111111111111111111111111111'});
it('only builds testnet IOC entries with two reduce-only exchange triggers',()=>{const p=testnetPlan(input());expect(p.grouping).toBe('normalTpsl');expect(p.orders).toHaveLength(3);expect(p.orders[0].r).toBe(false);expect(p.orders.slice(1).every(o=>o.r)).toBe(true);expect(Number(p.orders[0].p)).toBeLessThanOrEqual(2402.4);expect(Number(p.orders[0].p)).toBeGreaterThanOrEqual(2402.3);expect(p.loss).toBeGreaterThan(0);});
it('blocks mainnet, stale books, excessive margin, invalid stops and excessive risk',()=>{for(const change of [{network:'mainnet'},{now:16000},{available:1},{quantity:2},{stop:2500},{leverage:16},{quantity:20,equity:100000,available:100000,stop:1000}])expect(()=>testnetPlan({...input(),...change})).toThrow();});
it('reverses all exit directions for short entries and quantizes size',()=>{const p=testnetPlan({...input(),side:'short',quantity:.02009,stop:2430,target:2350});expect(p.quantity).toBe(.02);expect(p.orders[0].b).toBe(false);expect(p.orders.slice(1).every(o=>o.b&&o.r)).toBe(true);});
it('does not treat HTTP success as successful execution or protection',()=>{const s=exchangeStatus({status:'ok',response:{data:{statuses:[{filled:{oid:1,totalSz:'.02',avgPx:'2400'}},{error:'invalid trigger'},{resting:{oid:2}}]}}});expect(s.protected).toBe(false);expect(s.errors).toEqual(['invalid trigger']);expect(()=>exchangeStatus({status:'err'})).toThrow();});
it('supports mainnet only when the expected signing network matches exactly',()=>{
 expect(exchangePlan({...input(),network:'mainnet',expectedNetwork:'mainnet'}).orders).toHaveLength(3);
 expect(()=>exchangePlan({...input(),network:'mainnet',expectedNetwork:'testnet'})).toThrow();
 expect(()=>exchangePlan({...input(),network:'other',expectedNetwork:'mainnet'})).toThrow();
});
it('deduplicates partial entries and accounts for fees within the current UTC day',()=>{
 const now=Date.UTC(2026,9,15,12),f={coin:'ETH',time:now-1000,dir:'Open Long',oid:1,closedPnl:'0',fee:'.5',feeToken:'USDC'};
 expect(exchangeDay([f,{...f},{...f,dir:'Close Long',oid:2,closedPnl:'-10'},{...f,time:now-86400000,oid:3}],now)).toMatchObject({entries:1,pnl:-11.5});
 expect(()=>exchangeDay(Array(2000).fill(f),now)).toThrow();expect(()=>exchangeDay([{...f,fee:'bad'}],now)).toThrow();
});
it('rejects malformed exchange metadata, direction and client order IDs',()=>{
 for(const change of [{maxLeverage:NaN},{maxLeverage:0},{asset:-1},{asset:1.5},{szDecimals:7},{szDecimals:NaN},{side:'other'},{cloid:'bad'}])expect(()=>testnetPlan({...input(),...change} as any)).toThrow('Métadonnées');
});
it('requires a filled entry and recognized contingent protections before confirming the bracket',()=>{
 const filled={filled:{oid:1,totalSz:'.02',avgPx:'2400'}},response=(statuses:unknown[])=>({status:'ok',response:{data:{statuses}}});
 for(const statuses of [['waitingForFill','waitingForFill','waitingForFill'],[filled,{},'waitingForFill'],[{filled:{oid:1,totalSz:'NaN'}},'waitingForFill','waitingForFill']])expect(exchangeStatus(response(statuses)).protected).toBe(false);
 expect(exchangeStatus(response([filled,'waitingForFill','waitingForTrigger'])).protected).toBe(true);
});
