const bases=['axiom-eth-daily-paper-v1','axiom-eth-daily-paper-v1-backup-v1','axiom-leverage','omega-strategy-profile','omega-daily-target','axiom-daily-events-v1','axiom-daily-evaluation-v1','omega-research-last-v2'];
const keys=new Set(bases.flatMap(key=>[key,key+'-testnet']));
// Paper backup suffix comes after the network suffix.
keys.add('axiom-eth-daily-paper-v1-testnet-backup-v1');keys.delete('axiom-eth-daily-paper-v1-backup-v1-testnet');
export const dataKeys=[...keys].sort();
const canonical=(entries:Record<string,string>)=>JSON.stringify(Object.fromEntries(Object.entries(entries).sort(([a],[b])=>a<b?-1:a>b?1:0)));
async function digest(entries:Record<string,string>){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(canonical(entries)))),n=>n.toString(16).padStart(2,'0')).join('');}
export interface DataArchive {app:'OMEGA';version:1;createdAt:string;entries:Record<string,string>;sha256:string}
export async function createArchive(storage:Pick<Storage,'getItem'>):Promise<DataArchive>{
 const entries:Record<string,string>={};for(const key of dataKeys){const raw=storage.getItem(key);if(raw!==null)entries[key]=raw;}
 if(canonical(entries).length>5*1024*1024)throw Error('Sauvegarde trop volumineuse. Exporte aussi les journaux CSV.');
 return {app:'OMEGA',version:1,createdAt:new Date().toISOString(),entries,sha256:await digest(entries)};
}
export async function verifyArchive(raw:string):Promise<DataArchive>{
 if(raw.length>6*1024*1024)throw Error('Fichier trop volumineux.');const value=JSON.parse(raw);
 if(!value||value.app!=='OMEGA'||value.version!==1||!value.entries||typeof value.entries!=='object'||Array.isArray(value.entries)||!Number.isFinite(Date.parse(value.createdAt))||typeof value.sha256!=='string')throw Error('Format de sauvegarde inconnu.');
 if(Object.entries(value.entries).some(([key,data])=>!keys.has(key)||typeof data!=='string'||data.length>5*1024*1024))throw Error('Contenu non autorisé dans la sauvegarde.');
 if(await digest(value.entries)!==value.sha256)throw Error('Empreinte différente : fichier modifié ou incomplet.');
 return value;
}
