import type {Ledger} from './engine';
import {validateSettings,type Network} from './policy';
export function validateLedger(value:any,network:Network):Ledger{
 const address=(x:unknown)=>typeof x==='string'&&/^0x[0-9a-fA-F]{40}$/.test(x)&&!/^0x0{40}$/.test(x),cloid=(x:unknown)=>typeof x==='string'&&/^0x[0-9a-fA-F]{32}$/.test(x);
 if(!value||value.storageVersion!==undefined&&value.storageVersion!==1||value.network!==undefined&&value.network!==network||!/^0x[0-9a-fA-F]{64}$/.test(value.key)||!Number.isSafeInteger(value.nonce)||value.nonce<0||value.owner!==null&&!address(value.owner)||typeof value.owned!=='boolean'||!Array.isArray(value.events)||typeof value.attemptDay!=='string'||value.attemptDay!==''&&!/^\d{4}-\d{2}-\d{2}$/.test(value.attemptDay))throw Error('État du service invalide : récupération manuelle requise.');
 if(value.attemptCount!==undefined&&(!Number.isInteger(value.attemptCount)||value.attemptCount<1||value.attemptCount>4)||value.revision!==undefined&&(!Number.isSafeInteger(value.revision)||value.revision<0))throw Error('Compteur persistant invalide.');
 if(value.pending!==null&&(!value.pending||!cloid(value.pending.cloid)||!Number.isFinite(value.pending.at)||value.pending.at<=0))throw Error('Envoi persistant invalide.');
 for(const k of ['lastAttemptAt','lastExitAt','savedAt'])if(value[k]!==undefined&&(!Number.isFinite(value[k])||value[k]<0))throw Error('Horodatage persistant invalide.');
 if(value.owned&&(!['long','short'].includes(value.ownedSide)||!Number.isFinite(value.ownedQuantity)||value.ownedQuantity<=0))throw Error('Propriété de position invalide. Vérifie le compte avant récupération.');
 if(value.protectionIds!==undefined&&(!Array.isArray(value.protectionIds)||value.protectionIds.some((x:any)=>!Number.isSafeInteger(x)||x<=0))||value.protectionCloids!==undefined&&(!Array.isArray(value.protectionCloids)||!value.protectionCloids.every(cloid)))throw Error('Protections persistantes invalides.');
 if(value.events.some((e:any)=>!e||!Number.isFinite(e.at)||typeof e.message!=='string'))throw Error('Journal persistant invalide.');
 if(value.agentApproval!==undefined&&(!value.agentApproval||!Number.isSafeInteger(value.agentApproval.preparedAt)||value.agentApproval.preparedAt<0||typeof value.agentApproval.confirmed!=='boolean'))throw Error('Préparation d’agent invalide.');
 if(value.settings!==undefined)validateSettings(value.settings);
 return value;
}
