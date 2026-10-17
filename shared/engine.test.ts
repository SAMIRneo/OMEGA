import {it,expect,vi,afterEach} from 'vitest';
import {LiveEngine,type Ledger} from './engine';
import {autoPlan,networkConfig,validBook,canEvaluate,bracketConfirmed,validCandles} from './policy';
import {sample,risk} from '../frontend/core/test-fixtures';
const owner='0x1111111111111111111111111111111111111111',agent='0x2222222222222222222222222222222222222222';
function setup(network:'mainnet'|'testnet'='testnet'){
 vi.useFakeTimers();vi.setSystemTime(Date.UTC(2026,9,14,12,0,10));
 const ledger:Ledger={owner,key:'0x00',nonce:0,attemptDay:'',pending:null,owned:false,events:[]};
 const info={extraAgents:vi.fn(async()=>[{address:agent,validUntil:Date.now()+86400000}])};
 const exchange={updateLeverage:vi.fn(async()=>({status:'ok'})),order:vi.fn(async(_:any)=>({status:'ok',response:{data:{statuses:[{filled:{oid:1,totalSz:'1',avgPx:'2500'}},{resting:{oid:2}},{resting:{oid:3}}]}}})),cancel:vi.fn(async()=>({status:'ok'}))};
 const save=vi.fn(),engine=new LiveEngine(network,ledger,agent,info,exchange,risk,save);
 const snapshot=sample();snapshot.time=Date.now()/1000;snapshot.indicators['15m']!.atr=30;snapshot.market.book!.time=Date.now();
 const s={snapshot,account:{assetPositions:[]},orders:[] as any[],today:[] as any[],meta:{asset:4,szDecimals:4,maxLeverage:20},book:snapshot.market.book!,equity:10000,available:10000,position:null as any};
 vi.spyOn(engine,'snapshot').mockImplementation(async()=>s);
 return {engine,ledger,s,info,exchange,save};
}
afterEach(()=>{vi.useRealTimers();vi.restoreAllMocks();});
it('pins REST transports to the selected network and rejects an unknown network',()=>{expect(networkConfig('mainnet')).toMatchObject({isTestnet:false,apiUrl:'https://api.hyperliquid.xyz'});expect(networkConfig('testnet').isTestnet).toBe(true);expect(()=>networkConfig('other' as any)).toThrow();});
it('requires mainnet permission, verifies approval and starts after the current bar',async()=>{const f=setup('mainnet');await expect(f.engine.arm({profile:'balanced',leverage:15},undefined)).rejects.toThrow('MAINNET');await f.engine.arm({profile:'balanced',leverage:15},'MAINNET');expect(f.engine.active).toBe(true);await f.engine.tick();expect(f.exchange.order).not.toHaveBeenCalled();});
it('blocks an expired agent, existing position, exchange quota and persisted attempted day',async()=>{
 const f=setup();f.info.extraAgents.mockResolvedValue([{address:agent,validUntil:Date.now()-1}]);await expect(f.engine.arm({profile:'balanced',leverage:15},null)).rejects.toThrow('non autorisé');
 f.info.extraAgents.mockResolvedValue([{address:agent,validUntil:Date.now()+86400000}]);f.s.orders=[{coin:'ETH'}];await expect(f.engine.arm({profile:'balanced',leverage:15},null)).rejects.toThrow('existant');f.s.orders=[];
 f.s.today=[{coin:'ETH',time:Date.now(),dir:'Open Long',oid:1,closedPnl:'0',fee:'1',feeToken:'USDC'}];await expect(f.engine.arm({profile:'balanced',leverage:15},null)).rejects.toThrow('Pause');f.s.today=[];f.ledger.attemptDay='2026-10-14';f.ledger.attemptCount=4;await expect(f.engine.arm({profile:'balanced',leverage:15},null)).rejects.toThrow('Quota');
});
function eligible(f:ReturnType<typeof setup>){f.engine.active=true;f.engine.armedAt=Date.now()-20000;f.engine.lastBar=Date.now()-900000;}
it('sends an automatic bracket with persistent reservation before transmission, once per bar',async()=>{
 const f=setup();eligible(f);let reserved=false;const send=f.exchange.order.getMockImplementation()!;f.exchange.order.mockImplementation(async(p)=>{reserved=!!f.ledger.pending&&f.ledger.attemptDay==='2026-10-14';return send(p);});
 await f.engine.tick();expect(f.exchange.order).toHaveBeenCalledTimes(1);expect(reserved).toBe(true);expect(f.ledger.attemptCount).toBe(1);expect(f.ledger.lastAttemptAt).toBe(Date.now()/1000);const plan=f.exchange.order.mock.calls[0][0];expect(plan.orders).toHaveLength(3);expect(plan.orders.slice(1).every((o:any)=>o.r&&o.c)).toBe(true);expect(f.ledger.owned).toBe(true);expect(f.ledger.pending).toBeNull();
});
it('halts and preserves uncertain sends across restart, with no automatic retry',async()=>{
 const f=setup('mainnet');eligible(f);f.exchange.order.mockRejectedValue(Error('timeout'));
 await f.engine.tick();expect(f.exchange.order).toHaveBeenCalledTimes(1);expect(f.engine.active).toBe(false);expect(f.ledger.pending).not.toBeNull();
 const restored=new LiveEngine('mainnet',f.ledger,agent,f.info,f.exchange,risk,f.save);expect(restored.active).toBe(false);await restored.tick();expect(f.exchange.order).toHaveBeenCalledTimes(1);await expect(restored.arm({profile:'balanced',leverage:15},'MAINNET')).rejects.toThrow('envoi');
});
it('does not send an order after a stop arrives during leverage adjustment',async()=>{const f=setup();eligible(f);f.exchange.updateLeverage.mockImplementation(async()=>{f.engine.stop();return {status:'ok'};});await f.engine.tick();expect(f.exchange.order).not.toHaveBeenCalled();});
it('does not arm after a stop arrives while approval is being checked',async()=>{const f=setup();f.info.extraAgents.mockImplementation(async()=>{f.engine.stop();return [{address:agent,validUntil:Date.now()+86400000}];});await expect(f.engine.arm({profile:'balanced',leverage:15},null)).rejects.toThrow('interrompu');expect(f.engine.active).toBe(false);});
it('never catches up old bars or treats an acknowledgement as a filled entry',()=>{expect(canEvaluate(1000,0,0,62000)).toBe(false);expect(canEvaluate(2000,1000,1500,3000)).toBe(true);expect(bracketConfirmed({status:'ok',response:{data:{statuses:['waitingForFill','waitingForFill','waitingForFill']}}})).toBe(false);});
it('rejects stale, crossed or unsorted L2 books and discontinuous candles',()=>{
 const f=setup(),book=f.s.book;expect(()=>validBook({...book,time:Date.now()-6000},Date.now())).toThrow();expect(()=>validBook({...book,levels:[[{px:'2501',sz:'1'}],[{px:'2500',sz:'1'}]]},Date.now())).toThrow();
 const now=Date.now(),bars=Array.from({length:70},(_,i)=>({t:now-(71-i)*900000,T:now-(70-i)*900000-1,o:2500,h:2502,l:2498,c:2500,v:1}));bars[30].t+=1;expect(()=>validCandles(bars,900000,now)).toThrow();
});
it('sizes IOC by a 100 USDC budget under half equity',()=>{
 const f=setup(),c={side:'long',leverage:15,stop:2455,target:2590} as any;
 const plan=autoPlan('testnet',f.s,c);expect(plan.margin).toBeLessThanOrEqual(5000);expect(plan.loss).toBeLessThanOrEqual(100);expect(plan.leverage).toBeLessThanOrEqual(15);expect(plan.margin).toBeLessThan(4999);
});
it('continues managing the bot position after entry stop and closes reduce-only if protection is missing',async()=>{
 const f=setup();f.ledger.owned=true;f.ledger.ownedSide='long';f.ledger.ownedQuantity=1;f.ledger.protectionIds=[2,3];f.s.position={szi:'1'};f.engine.stop();await f.engine.tick();expect(f.exchange.order).toHaveBeenCalledTimes(1);expect(f.exchange.order.mock.calls[0][0].orders[0].r).toBe(true);
});
it('does not flatten a position enlarged outside the bot',async()=>{
 const f=setup();f.ledger.owned=true;f.ledger.ownedSide='long';f.ledger.ownedQuantity=1;f.s.position={szi:'2'};await f.engine.tick();expect(f.exchange.order).not.toHaveBeenCalled();expect(f.engine.reason).toContain('modifiée hors');
});
it('keeps a known filled position under surveillance when a protection is rejected',async()=>{
 const f=setup();eligible(f);f.exchange.order.mockResolvedValueOnce({status:'ok',response:{data:{statuses:[{filled:{oid:1,totalSz:'1',avgPx:'2500'}},{error:'trigger rejected'} as any,{resting:{oid:3}}]}}});
 await f.engine.tick();expect(f.engine.active).toBe(false);expect(f.ledger.owned).toBe(true);expect(f.ledger.pending).not.toBeNull();f.s.position={szi:'1'};await f.engine.tick();expect(f.exchange.order).toHaveBeenCalledTimes(2);expect(f.exchange.order.mock.calls[1][0].orders[0].r).toBe(true);
});

it('permits another intraday session after cooldown but retains attempted quota across a restart',async()=>{
 const f=setup();f.ledger.attemptDay='2026-10-14';f.ledger.attemptCount=1;f.ledger.lastAttemptAt=Date.now()/1000-1800;
 await f.engine.arm({profile:'balanced',leverage:15,dailyTarget:200},null);expect(f.engine.active).toBe(true);f.engine.stop();
 f.ledger.lastAttemptAt=Date.now()/1000;await expect(f.engine.arm({profile:'balanced',leverage:15},null)).rejects.toThrow('Pause');
 const restored=new LiveEngine('testnet',f.ledger,agent,f.info,f.exchange,risk,f.save);vi.spyOn(restored,'snapshot').mockResolvedValue(f.s);
 await expect(restored.arm({profile:'balanced',leverage:15},null)).rejects.toThrow('Pause');
 f.ledger.attemptCount=4;await expect(restored.arm({profile:'balanced',leverage:15},null)).rejects.toThrow('Quota');expect(f.exchange.order).not.toHaveBeenCalled();
});

it('supervises an owned position without requesting candles or fills',async()=>{
 const f=setup();vi.mocked(f.engine.snapshot).mockRestore();
 Object.assign(f.info,{
  clearinghouseState:vi.fn(async()=>({marginSummary:{accountValue:'-10'},withdrawable:'0',assetPositions:[{position:{coin:'ETH',szi:'1',entryPx:'2500',marginUsed:'200',leverage:{value:15}}}]})),
  frontendOpenOrders:vi.fn(async()=>[]),meta:vi.fn(async()=>({universe:[{name:'ETH',szDecimals:4,maxLeverage:20}]})),
  l2Book:vi.fn(async()=>({...f.s.book,coin:'ETH',time:Date.now()})),
  candleSnapshot:vi.fn(async()=>{throw Error('Candle service unavailable')}),userFillsByTime:vi.fn(async()=>{throw Error('Fill service unavailable')})
 });
 f.ledger.owned=true;f.ledger.ownedSide='long';f.ledger.ownedQuantity=1;f.ledger.attemptDay='2026-10-14';f.ledger.attemptCount=0;
 await f.engine.tick();expect(f.exchange.order).toHaveBeenCalledOnce();expect(f.exchange.order.mock.calls[0][0].orders[0].r).toBe(true);
 expect((f.info as any).candleSnapshot).not.toHaveBeenCalled();expect((f.info as any).userFillsByTime).not.toHaveBeenCalled();
});
it.each(['2','-1'])('does not adopt an external or reversed position during reconciliation (%s ETH)',async(size)=>{
 const f=setup();f.ledger.pending={cloid:'0x11111111111111111111111111111111',at:Date.now()-10000};f.s.position={szi:size};
 Object.assign(f.info,{orderStatus:vi.fn(async()=>({status:'order',order:{order:{oid:1,side:'B'}}})),userFillsByTime:vi.fn(async()=>[{coin:'ETH',oid:1,dir:'Open Long',sz:'1'}])});
 await expect(f.engine.reconcile()).rejects.toThrow('attribution ambiguë');expect(f.ledger.pending).not.toBeNull();expect(f.ledger.owned).toBe(false);expect(f.exchange.order).not.toHaveBeenCalled();
});
it('adopts only a compatible position bounded by attributable partial fills',async()=>{
 const f=setup();f.ledger.pending={cloid:'0x11111111111111111111111111111111',at:Date.now()-10000};f.s.position={szi:'.4'};
 Object.assign(f.info,{orderStatus:vi.fn(async()=>({status:'order',order:{order:{oid:1,side:'B'}}})),userFillsByTime:vi.fn(async()=>[{coin:'ETH',oid:1,dir:'Open Long',sz:'.2'},{coin:'ETH',oid:1,dir:'Open Long',sz:'.3'}])});
 await f.engine.reconcile();expect(f.engine.snapshot).toHaveBeenCalledWith(false);expect(f.ledger.owned).toBe(true);expect(f.ledger.ownedQuantity).toBe(.4);expect(f.ledger.pending).toBeNull();expect(f.exchange.order).not.toHaveBeenCalled();
});
it('reports confirmed approval expiry and clears it when the agent is revoked',async()=>{
 const f=setup(),until=Date.now()+86400000;await f.engine.verifyApproval();expect(f.engine.status()).toMatchObject({approved:true,approvedUntil:until});
 f.info.extraAgents.mockResolvedValue([]);await f.engine.verifyApproval();expect(f.engine.status()).toMatchObject({approved:false,approvedUntil:null});
});
it('restores the last armed settings after restart but keeps entries disarmed',async()=>{
 const f=setup();await f.engine.arm({profile:'selective',leverage:3,dailyTarget:100},null);f.engine.stop();
 const restored=new LiveEngine('testnet',f.ledger,agent,f.info,f.exchange,risk,f.save);expect(restored.settings).toEqual({profile:'selective',leverage:3,dailyTarget:100});expect(restored.active).toBe(false);expect(f.exchange.order).not.toHaveBeenCalled();
});
it('halts entries on a durable-write failure without sending or retrying an order',async()=>{
 const f=setup();eligible(f);f.save.mockImplementation(()=>{throw Error('Disk full')});
 await expect(f.engine.tick()).resolves.toBeUndefined();expect(f.engine.active).toBe(false);expect(f.engine.reason).toContain('Sauvegarde du service impossible');expect(f.ledger.pending).not.toBeNull();expect(f.exchange.order).not.toHaveBeenCalled();await f.engine.tick();expect(f.exchange.order).not.toHaveBeenCalled();
});
it('awaits an asynchronous durable reservation and cancels the entry if stopped before its commit',async()=>{
 const f=setup();eligible(f);let release!:()=>void;f.save.mockImplementationOnce(()=>new Promise<void>(resolve=>{release=resolve}));
 const pending=f.engine.tick();for(let i=0;i<20&&!release;i++)await Promise.resolve();expect(release).toBeTypeOf('function');expect(f.exchange.order).not.toHaveBeenCalled();
 await f.engine.stop();release();await pending;expect(f.exchange.order).not.toHaveBeenCalled();expect(f.ledger.pending).not.toBeNull();
});

it('reuses an unused recent prepared identity after a refusal without clearing quota or calling the exchange',async()=>{
 const f=setup();f.ledger.agentApproval={preparedAt:Date.now(),confirmed:false};f.ledger.attemptCount=2;
 expect(await f.engine.prepareAgent(owner)).toBe(false);expect(f.info.extraAgents).not.toHaveBeenCalled();expect(f.ledger.attemptCount).toBe(2);expect(f.exchange.order).not.toHaveBeenCalled();
});
it('retains a confirmed valid agent, then requires rotation after revocation without resetting its nonce',async()=>{
 const f=setup();f.ledger.agentApproval={preparedAt:Date.now(),confirmed:false};
 expect(await f.engine.verifyApproval()).toBe(true);expect(f.ledger.agentApproval.confirmed).toBe(true);expect(f.save).toHaveBeenCalled();expect(await f.engine.prepareAgent(owner)).toBe(false);
 f.ledger.nonce=123;f.info.extraAgents.mockResolvedValue([]);expect(await f.engine.prepareAgent(owner)).toBe(true);expect(f.ledger.nonce).toBe(123);
});
it('does not rotate on unavailable approval reads, stale sessions or unresolved execution',async()=>{
 const f=setup();const key=f.ledger.key;f.info.extraAgents.mockRejectedValue(Error('offline'));await expect(f.engine.prepareAgent(owner)).rejects.toThrow('offline');expect(f.ledger.key).toBe(key);
 f.ledger.pending={cloid:('0x'+'1'.repeat(32)) as `0x${string}`,at:Date.now()};await expect(f.engine.prepareAgent(owner)).rejects.toThrow('résous');expect(f.ledger.pending).not.toBeNull();
});
it('does not treat an old or already used preparation as reusable',async()=>{
 const f=setup();f.info.extraAgents.mockResolvedValue([]);f.ledger.agentApproval={preparedAt:Date.now()-86400000,confirmed:false};expect(await f.engine.prepareAgent(owner)).toBe(true);
 f.ledger.agentApproval.preparedAt=Date.now();f.ledger.nonce=1;expect(await f.engine.prepareAgent(owner)).toBe(true);
});

it('cancels agent preparation if stop interrupts approval verification',async()=>{
 const f=setup();let finish!:(value:any)=>void;f.info.extraAgents.mockImplementation(()=>new Promise(resolve=>{finish=resolve;}));
 const preparation=f.engine.prepareAgent(owner);await f.engine.stop();finish([]);await expect(preparation).rejects.toThrow('interrompue');expect(f.engine.busy).toBe(false);expect(f.engine.active).toBe(false);
});
