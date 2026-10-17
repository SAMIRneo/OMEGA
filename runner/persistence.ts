import {existsSync,readFileSync,openSync,writeFileSync,fsyncSync,closeSync,renameSync,unlinkSync,chmodSync} from 'node:fs';
import {dirname} from 'node:path';
import {randomUUID} from 'node:crypto';
import type {Ledger} from './engine';
import type {Network} from './policy';
import {validateLedger} from './ledger';
export {validateLedger} from './ledger';
export function loadLedger(file:string,network:Network):Ledger|null{
 if(!existsSync(file)){if(existsSync(file+'.bak'))throw Error('État principal absent mais sauvegarde présente : récupération manuelle requise.');return null;}
 try{return validateLedger(JSON.parse(readFileSync(file,'utf8')),network);}catch{throw Error('État '+network+' illisible : démarrage bloqué. Conserve les fichiers et vérifie le compte.');}
}
function atomic(file:string,raw:string){
 const temp=file+'.'+randomUUID()+'.tmp';let fd:number|undefined;
 try{fd=openSync(temp,'wx',0o600);writeFileSync(fd,raw);fsyncSync(fd);closeSync(fd);fd=undefined;renameSync(temp,file);if(process.platform!=='win32'){const dir=openSync(dirname(file),'r');try{fsyncSync(dir);}finally{closeSync(dir);}}}
 finally{if(fd!==undefined)closeSync(fd);if(existsSync(temp))unlinkSync(temp);}
}
export function saveLedger(file:string,ledger:Ledger,network:Network){
 validateLedger(ledger,network);const previous=loadLedger(file,network);
 const next={...ledger,storageVersion:1 as const,revision:(ledger.revision??0)+1,savedAt:Date.now()};
 validateLedger(next,network);
 if(previous)atomic(file+'.bak',JSON.stringify(previous));
 atomic(file,JSON.stringify(next));Object.assign(ledger,next);if(process.platform!=='win32')chmodSync(file,0o600);
}
