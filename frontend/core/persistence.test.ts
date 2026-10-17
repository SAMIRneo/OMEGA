import {it,expect,afterEach} from 'vitest';
import {mkdtempSync,rmSync,readFileSync,writeFileSync,unlinkSync,existsSync,mkdirSync,readdirSync,statSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {loadLedger,saveLedger} from '../../runner/persistence';
import type {Ledger} from '../../runner/engine';
const dirs:string[]=[];
function fixture(){const dir=mkdtempSync(join(tmpdir(),'omega-persistence-'));dirs.push(dir);return {dir,file:join(dir,'testnet.json'),ledger:{network:'testnet',owner:null,key:'0x'+'1'.repeat(64),nonce:123,attemptDay:'2026-10-17',attemptCount:2,pending:{cloid:'0x'+'2'.repeat(32),at:1000},owned:false,events:[],settings:{profile:'balanced',leverage:3,dailyTarget:200}} as Ledger};}
afterEach(()=>{for(const dir of dirs.splice(0))rmSync(dir,{recursive:true,force:true});});
it('persists identities, pending, quota and settings across reads with an atomic previous generation',()=>{
 const f=fixture();saveLedger(f.file,f.ledger,'testnet');f.ledger.nonce++;saveLedger(f.file,f.ledger,'testnet');
 expect(loadLedger(f.file,'testnet')).toMatchObject({nonce:124,attemptCount:2,pending:f.ledger.pending,settings:{leverage:3},storageVersion:1,revision:2});expect(JSON.parse(readFileSync(f.file+'.bak','utf8')).nonce).toBe(123);
 if(process.platform!=='win32')expect(statSync(f.file).mode&0o777).toBe(0o600);expect(readdirSync(f.dir).some(x=>x.endsWith('.tmp'))).toBe(false);
});
it('refuses corruption and a missing primary rather than restoring stale nonces from the backup',()=>{
 const f=fixture();saveLedger(f.file,f.ledger,'testnet');saveLedger(f.file,f.ledger,'testnet');writeFileSync(f.file,'broken');expect(()=>loadLedger(f.file,'testnet')).toThrow('démarrage bloqué');expect(()=>saveLedger(f.file,f.ledger,'testnet')).toThrow();expect(readFileSync(f.file,'utf8')).toBe('broken');unlinkSync(f.file);expect(()=>loadLedger(f.file,'testnet')).toThrow('récupération manuelle');expect(existsSync(f.file+'.bak')).toBe(true);
});
it('rejects wrong-network or malformed critical state without writing a file',()=>{
 const f=fixture();for(const change of [{network:'mainnet'},{attemptCount:0},{pending:{cloid:'bad',at:1000}},{storageVersion:2},{settings:{profile:'other',leverage:3}},{owned:true}])expect(()=>saveLedger(f.file,{...f.ledger,...change} as any,'testnet')).toThrow();expect(existsSync(f.file)).toBe(false);
});
it('keeps the primary intact if writing its backup fails',()=>{
 const f=fixture();saveLedger(f.file,f.ledger,'testnet');const before=readFileSync(f.file,'utf8');mkdirSync(f.file+'.bak');f.ledger.nonce++;
 expect(()=>saveLedger(f.file,f.ledger,'testnet')).toThrow();expect(readFileSync(f.file,'utf8')).toBe(before);expect(readdirSync(f.dir).some(x=>x.endsWith('.tmp'))).toBe(false);
});
