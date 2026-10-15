import {beforeEach,afterEach,describe,it,expect,vi} from 'vitest';
import {sample,risk} from './test-fixtures';
import type {Snapshot} from './types';
const now=Date.UTC(2026,9,14,12);
function next(){const s=sample();s.time+=900;s.context.updatedAt=s.time;for(const tf of ['15m','1h','1d'] as const){s.candleStatus[tf]!.fetchedAt=s.time;s.indicators[tf]!.lastClosedTime=s.time*1000-1;}return s;}
beforeEach(()=>{
 vi.resetModules();vi.useFakeTimers();vi.setSystemTime(now);
 const memory=new Map<string,string>();
 vi.stubGlobal('localStorage',{getItem:(key:string)=>memory.get(key)??null,setItem:(key:string,value:string)=>memory.set(key,value)});
 vi.stubGlobal('document',{hidden:false,addEventListener:vi.fn()});
 vi.stubGlobal('navigator',{locks:{request:async(_name:string,fn:()=>Promise<unknown>)=>fn()}});
 vi.stubGlobal('window',{RiskCore:{exports:risk}});
});
afterEach(()=>{vi.useRealTimers();vi.unstubAllGlobals()});
describe('Daily controller lifecycle',()=>{
 it('does not execute a setup already present at arming',async()=>{const {controller}=await import('./controller');const open=vi.fn();controller.start(sample());await controller.tick(sample(),open);expect(open).not.toHaveBeenCalled();});
 it('revalidates the latest snapshot before opening under the lock',async()=>{const {controller}=await import('./controller');controller.start(sample());const current=next();current.market.fresh=false;const open=vi.fn(),latest=vi.fn(async()=>current);await controller.tick(next(),open,latest);expect(latest).toHaveBeenCalledOnce();expect(open).not.toHaveBeenCalled();expect(controller.state.reason).toMatch(/ancien/);});
 it('stopping while a final snapshot is pending prevents the entry',async()=>{const {controller}=await import('./controller');controller.start(sample());let release!:(s:Snapshot)=>void;const latest=()=>new Promise<Snapshot>(resolve=>{release=resolve});const open=vi.fn(),pending=controller.tick(next(),open,latest);controller.stop();release(next());await pending;expect(open).not.toHaveBeenCalled();expect(controller.state.active).toBe(false);});
 it('refuses a changed signal candle during final validation',async()=>{const {controller}=await import('./controller');controller.start(sample());const changed=next();changed.indicators['15m']!.lastClosedTime!+=900000;const open=vi.fn();await controller.tick(next(),open,async()=>changed);expect(open).not.toHaveBeenCalled();expect(controller.state.reason).toMatch(/Clôture modifiée/);});
 it('opens once on a new eligible candle and never reevaluates it into a second entry',async()=>{const {controller}=await import('./controller');controller.start(sample());const open=vi.fn(async()=>({ok:true}));await controller.tick(next(),open,async()=>next());await controller.tick(next(),open,async()=>next());expect(open).toHaveBeenCalledOnce();expect(controller.state.events.at(-1)?.kind).toBe('ENTRÉE');});
 it('ignores bars missed while suspended and resumes only for a subsequent close',async()=>{const {controller}=await import('./controller');controller.start(sample());controller.suspend();vi.setSystemTime(now+900000);const open=vi.fn();await controller.tick(next(),open);await controller.tick(next(),open);expect(open).not.toHaveBeenCalled();});
});

it('isolates testnet controller logs from mainnet',async()=>{
 Object.assign(window,{BrowserAtelier:{environment:{id:'testnet'}}});
 const saved=vi.spyOn(localStorage,'setItem');
 const {controller}=await import('./controller');controller.stop();
 expect(saved).toHaveBeenCalledWith('axiom-daily-events-v1-testnet',expect.any(String));
 expect(saved).not.toHaveBeenCalledWith('axiom-daily-events-v1',expect.anything());
});
