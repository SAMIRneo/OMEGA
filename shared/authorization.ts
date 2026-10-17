import type {Ledger} from './engine';
import type {Network} from './policy';

// Explicitly displayed before signature. Existing approvals retain their own expiry.
export const AUTHORIZATION_DAYS=180;
export function agentAuthorizationName(mode:'web'|'local',network:Network,now=Date.now()){
 return 'OMEGA'+(mode==='local'?'-':'web-')+network+' valid_until '+(now+AUTHORIZATION_DAYS*86400000);
}
export function reusablePreparation(ledger:Ledger,owner:string,now=Date.now()){
 const prepared=ledger.agentApproval;
 return ledger.owner?.toLowerCase()===owner.toLowerCase()&&ledger.nonce===0&&prepared?.confirmed===false&&now>=prepared.preparedAt&&now-prepared.preparedAt<86400000;
}
