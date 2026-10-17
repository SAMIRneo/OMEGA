import {validateLedger} from '../../runner/ledger';
import type {Ledger} from '../../runner/engine';
import type {Network} from '../../runner/policy';
interface RecordData {version:1;network:Network;agent:`0x${string}`;owner:string;revision:number;savedAt:number;iv:ArrayBuffer;cipher:ArrayBuffer}
const encoder=new TextEncoder(),aad=(r:RecordData)=>encoder.encode(['OMEGA-web-v1',r.network,r.agent.toLowerCase(),r.owner.toLowerCase(),r.revision].join(':'));
export class BrowserVault {
 private opening:Promise<IDBDatabase>|null=null;
 constructor(private factory:IDBFactory=window.indexedDB,private crypt:Crypto=window.crypto,private name='omega-web-vault-v1'){}
 private db(){
  if(!this.factory||!this.crypt?.subtle)throw Error('Coffre indisponible. Utilise HTTPS et un navigateur avec IndexedDB et Web Crypto.');
  return this.opening??=new Promise<IDBDatabase>((resolve,reject)=>{const r=this.factory.open(this.name,1);r.onupgradeneeded=()=>r.result.createObjectStore('vault');r.onblocked=()=>reject(Error('Coffre bloqué : ferme les autres onglets OMEGA.'));r.onerror=()=>reject(Error('Impossible d’ouvrir le coffre du navigateur.'));r.onsuccess=()=>{r.result.onversionchange=()=>{r.result.close();this.opening=null;};resolve(r.result);};});
 }
 private async transaction<T>(mode:IDBTransactionMode,action:(store:IDBObjectStore,set:(v:T)=>void,fail:(e:unknown)=>void)=>void):Promise<T>{
  const db=await this.db();return new Promise<T>((resolve,reject)=>{let value:T,error:unknown;const tx=db.transaction('vault',mode,{durability:'strict'});const fail=(e:unknown)=>{error=e;try{tx.abort();}catch{reject(e);}};tx.oncomplete=()=>resolve(value);tx.onabort=tx.onerror=()=>reject(error??Error('Sauvegarde du coffre non confirmée.'));try{action(tx.objectStore('vault'),v=>{value=v;},fail);}catch(e){fail(e);}});
 }
 private get(key:string){return this.transaction<any>('readonly',(s,set)=>{const r=s.get(key);r.onsuccess=()=>set(r.result);});}
 private async master(create:boolean):Promise<CryptoKey>{
  let key=await this.get('wrapping-key');if(!key){if(!create)throw Error('Clé de chiffrement absente. Conserve le coffre et vérifie le compte Hyperliquid.');const candidate=await this.crypt.subtle.generateKey({name:'AES-GCM',length:256},false,['encrypt','decrypt']);key=await this.transaction<CryptoKey>('readwrite',(s,set)=>{const r=s.get('wrapping-key');r.onsuccess=()=>{if(r.result)set(r.result);else{s.put(candidate,'wrapping-key');set(candidate);}};});}
  if(key.type!=='secret'||key.extractable!==false||key.algorithm?.name!=='AES-GCM')throw Error('Clé de chiffrement invalide.');return key;
 }
 async load(network:Network):Promise<{ledger:Ledger;agent:`0x${string}`}|null>{
  const r=await this.get(network) as RecordData|undefined;if(!r){if(await this.get('backup-'+network))throw Error('État web absent mais copie présente : vérification manuelle requise.');return null;}
  try{
   if(r.version!==1||r.network!==network||!Number.isSafeInteger(r.revision)||r.revision<1||!/^0x[0-9a-fA-F]{40}$/.test(r.agent)||!/^0x[0-9a-fA-F]{40}$/.test(r.owner)||r.iv.byteLength!==12)throw Error('Invalid record');
   const raw=await this.crypt.subtle.decrypt({name:'AES-GCM',iv:new Uint8Array(r.iv),additionalData:aad(r)},await this.master(false),r.cipher),ledger=validateLedger(JSON.parse(new TextDecoder().decode(raw)),network);
   if(ledger.owner?.toLowerCase()!==r.owner.toLowerCase()||ledger.revision!==r.revision||ledger.savedAt!==r.savedAt)throw Error('Invalid binding');return {ledger,agent:r.agent};
  }catch{throw Error('Coffre web illisible ou modifié : aucun nouvel agent créé. Vérifie le compte et conserve les données.');}
 }
 async save(ledger:Ledger,agent:`0x${string}`,network:Network,expected:number|null,guard:()=>boolean=()=>true){
  const next={...ledger,network,storageVersion:1 as const,revision:(expected??0)+1,savedAt:Date.now()};validateLedger(next,network);if(!next.owner)throw Error('Propriétaire requis pour le coffre web.');
  const r:RecordData={version:1,network,agent,owner:next.owner,revision:next.revision,savedAt:next.savedAt,iv:this.crypt.getRandomValues(new Uint8Array(12)).buffer,cipher:new ArrayBuffer(0)};
  r.cipher=await this.crypt.subtle.encrypt({name:'AES-GCM',iv:new Uint8Array(r.iv),additionalData:aad(r)},await this.master(true),encoder.encode(JSON.stringify(next)));
  await this.transaction<void>('readwrite',(s,set,fail)=>{const get=s.get(network);get.onsuccess=()=>{try{const previous=get.result as RecordData|undefined;if(!guard())throw Error('Cet onglet ne contrôle plus le bot.');if((previous?.revision??null)!==expected)throw Error('État modifié par un autre onglet : recharge OMEGA.');if(previous)s.put(previous,'backup-'+network);s.put(r,network);set(undefined);}catch(e){fail(e);}};});
  return {revision:next.revision,savedAt:next.savedAt,storageVersion:1 as const};
 }
 async close(){if(this.opening)(await this.opening).close();this.opening=null;}
}
