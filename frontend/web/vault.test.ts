import {it,expect,vi,afterEach} from 'vitest';
import {IDBFactory,IDBObjectStore} from 'fake-indexeddb';
import {webcrypto} from 'node:crypto';
import {privateKeyToAccount} from 'viem/accounts';
import {BrowserVault} from './vault';
import type {Ledger} from '../../runner/engine';
const owner='0x1111111111111111111111111111111111111111',key=('0x'+'2'.repeat(64)) as `0x${string}`,agent=privateKeyToAccount(key).address;
const stores:BrowserVault[]=[];
function fixture(){const factory=new IDBFactory(),name='test-vault',vault=new BrowserVault(factory,webcrypto as unknown as Crypto,name);stores.push(vault);const ledger:Ledger={network:'testnet',owner,key,nonce:123,attemptDay:'2026-10-17',attemptCount:2,pending:{cloid:('0x'+'3'.repeat(32)) as `0x${string}`,at:1000},owned:false,events:[]};return {factory,name,vault,ledger};}
async function store(factory:IDBFactory,name:string,key:string,value?:any){const db=await new Promise<IDBDatabase>((resolve,reject)=>{const r=factory.open(name,1);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});try{return await new Promise<any>((resolve,reject)=>{const tx=db.transaction('vault',value===undefined?'readonly':'readwrite');const r=value===undefined?tx.objectStore('vault').get(key):tx.objectStore('vault').put(value,key);let result:any;r.onsuccess=()=>result=r.result;tx.oncomplete=()=>resolve(result);tx.onabort=()=>reject(tx.error);});}finally{db.close();}}
afterEach(async()=>{vi.restoreAllMocks();for(const s of stores.splice(0))await s.close();});
it('encrypts the entire ledger, persists a nonextractable master key and reopens the same identity',async()=>{
 const f=fixture();await f.vault.save(f.ledger,agent,'testnet',null);const raw=await store(f.factory,f.name,'testnet'),master=await store(f.factory,f.name,'wrapping-key');
 expect(raw.key).toBeUndefined();expect(new TextDecoder().decode(raw.cipher)).not.toContain(key);expect(master.extractable).toBe(false);await expect(webcrypto.subtle.exportKey('raw',master)).rejects.toThrow();
 const reopened=new BrowserVault(f.factory,webcrypto as unknown as Crypto,f.name);stores.push(reopened);expect((await reopened.load('testnet'))!.ledger).toMatchObject({key,nonce:123,attemptCount:2,pending:f.ledger.pending,revision:1});expect(await reopened.load('mainnet')).toBeNull();
});
it('rejects changed ciphertext or network binding without restoring a previous generation',async()=>{
 const f=fixture();await f.vault.save(f.ledger,agent,'testnet',null);await f.vault.save({...f.ledger,nonce:124},agent,'testnet',1);
 const raw=await store(f.factory,f.name,'testnet');new Uint8Array(raw.cipher)[0]^=1;await store(f.factory,f.name,'testnet',raw);await expect(f.vault.load('testnet')).rejects.toThrow('illisible');
 await store(f.factory,f.name,'mainnet',raw);await expect(f.vault.load('mainnet')).rejects.toThrow('illisible');expect((await store(f.factory,f.name,'backup-testnet')).revision).toBe(1);
});
it('rejects stale writers and lost-tab ownership before committing a new generation',async()=>{
 const f=fixture();await f.vault.save(f.ledger,agent,'testnet',null);await expect(f.vault.save({...f.ledger,nonce:124},agent,'testnet',null)).rejects.toThrow('autre onglet');
 await expect(f.vault.save(f.ledger,agent,'testnet',1,()=>false)).rejects.toThrow('contrôle plus');expect((await f.vault.load('testnet'))!.ledger.nonce).toBe(123);
});
it('keeps the previous record on a transaction failure',async()=>{
 const f=fixture();await f.vault.save(f.ledger,agent,'testnet',null);const original=IDBObjectStore.prototype.put;
 vi.spyOn(IDBObjectStore.prototype,'put').mockImplementation(function(this:IDBObjectStore,value:any,k?:IDBValidKey){if(k==='testnet')throw Error('QuotaExceededError');return original.call(this,value,k);});
 await expect(f.vault.save({...f.ledger,nonce:124},agent,'testnet',1)).rejects.toThrow('Quota');expect((await f.vault.load('testnet'))!.ledger.nonce).toBe(123);expect(await store(f.factory,f.name,'backup-testnet')).toBeUndefined();
});
