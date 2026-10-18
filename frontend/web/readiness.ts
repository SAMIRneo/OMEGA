import {BrowserVault} from './vault';
import {walletProvider} from '../shared/wallet-provider';
export interface Readiness {secure:boolean;wallet:boolean;locks:boolean;crypto:boolean;vault:boolean;memory:boolean;retained:boolean|null;error:string}
/** No account request, signature, permission prompt or agent is created by this check. */
export async function browserReadiness():Promise<Readiness>{
 const result:Readiness={secure:window.isSecureContext===true,wallet:!!walletProvider(),locks:!!window.navigator.locks,crypto:!!window.crypto?.subtle,vault:false,memory:false,retained:null,error:''};
 try{const key='omega-storage-check';window.localStorage.setItem(key,'1');result.memory=window.localStorage.getItem(key)==='1';window.localStorage.removeItem(key);}catch{/* Account preference cannot be saved. */}
 if(result.secure&&result.crypto){const vault=new BrowserVault();try{await vault.checkStorage();result.vault=true;}catch(error){result.error=error instanceof Error?error.message:String(error);}finally{await vault.close().catch(()=>{/* An unsuccessful open has no database to close. */});}}
 try{result.retained=await window.navigator.storage?.persisted()??null;}catch{/* Storage persistence policy is unknown. */}
 return result;
}
