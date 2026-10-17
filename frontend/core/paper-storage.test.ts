import {it,expect} from 'vitest';
import {readPaperState,writePaperState} from './paper-storage.js';
const paper=()=>({initial:10000,cash:10000,position:null,history:[],day:'2026-10-17',dailyPnl:0,entriesToday:0,lastEntryDay:''});
function memory(){const m=new Map<string,string>();return {m,getItem:(k:string)=>m.get(k)??null,setItem:(k:string,v:string)=>{m.set(k,v)}};}
it('versions writes, confirms them and retains the previous complete state',()=>{
 const s=memory();writePaperState(s,'paper',paper(),1000);writePaperState(s,'paper',{...paper(),cash:9999,entriesToday:1},2000);
 expect(readPaperState(s,'paper')).toMatchObject({cash:9999,savedAt:2000,storageVersion:1});expect(JSON.parse(s.m.get('paper-backup-v1')!)).toMatchObject({cash:10000,savedAt:1000});
});
it('preserves corrupt or unsupported data and never silently resets capital',()=>{
 const s=memory();for(const raw of ['broken',JSON.stringify({...paper(),storageVersion:9}),JSON.stringify({...paper(),position:{side:'long'}})]){
  s.m.set('paper',raw);expect(()=>readPaperState(s,'paper')).toThrow('illisibles');expect(()=>writePaperState(s,'paper',paper())).toThrow();expect(s.m.get('paper')).toBe(raw);
 }
 s.m.delete('paper');s.m.set('paper-backup-v1',JSON.stringify(paper()));expect(()=>readPaperState(s,'paper')).toThrow('principal absent');
});
it('fails a full-storage write without replacing the primary state',()=>{
 const s=memory();writePaperState(s,'paper',paper(),1000);const before=s.m.get('paper');
 expect(()=>writePaperState({...s,setItem:()=>{throw Error('QuotaExceededError')}},'paper',{...paper(),cash:9000})).toThrow('Quota');expect(s.m.get('paper')).toBe(before);
});
