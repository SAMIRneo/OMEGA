import type {EIP1193Provider} from 'viem';
export type Provider=EIP1193Provider & {isMetaMask?:boolean;providers?:Provider[];on?:(event:string,handler:(...args:any[])=>void)=>void;removeListener?:(event:string,handler:(...args:any[])=>void)=>void};
let announced:Provider|undefined,fallback:Provider|undefined,remote:Provider|undefined;
// Select MetaMask explicitly when more than one wallet extension is installed.
window.addEventListener('eip6963:announceProvider',((event:CustomEvent<{info:{rdns:string};provider:Provider}>)=>{
 if(typeof event.detail?.provider?.request!=='function')return;
 if(event.detail.info?.rdns==='io.metamask')announced=event.detail.provider;else fallback??=event.detail.provider;
}) as EventListener);
window.dispatchEvent(new window.Event('eip6963:requestProvider'));
export function walletProvider():Provider|undefined{
 const injected=(window as Window & {ethereum?:Provider}).ethereum;
 return remote??announced??injected?.providers?.find(p=>p.isMetaMask)??injected??fallback;
}
export function setRemoteProvider(provider:Provider){remote=provider;window.dispatchEvent(new window.Event('omega-wallet-provider'));}
/** Keep only the RPC stage in errors; never log signatures or pairing payloads. */
export async function walletRequest(p:Pick<Provider,'request'>,args:{method:string;params?:any}){
 try{return await (p.request as any)(args);}catch(cause){const error=new Error('Demande MetaMask : '+args.method,{cause});Object.assign(error,{walletMethod:args.method});throw error;}
}
/** Explicit user action: eth_accounts is reserved for passive restoration. */
export async function requestWalletAccount(p:Pick<Provider,'request'>){const accounts=await walletRequest(p,{method:'eth_requestAccounts'});const address=accounts[0];if(!/^0x[0-9a-fA-F]{40}$/.test(address??'')||/^0x0{40}$/.test(address))throw Error('Aucun compte autorisé dans le wallet.');return address.toLowerCase() as `0x${string}`;}
/** Authorization is a separate user action, but does not need a second account permission dialog. */
export async function authorizedWalletAccount(p:Pick<Provider,'request'>){
 try{const accounts=await p.request({method:'eth_accounts'});if(accounts.length){const address=accounts[0];if(!/^0x[0-9a-fA-F]{40}$/.test(address)||/^0x0{40}$/.test(address))throw Error('Compte wallet illisible.');return address.toLowerCase() as `0x${string}`;}}
 catch(error){if((error as {code?:number})?.code!==4100)throw error;}
 return requestWalletAccount(p);
}
export async function signingChainId(p:Pick<Provider,'request'>){const value=await p.request({method:'eth_chainId'});if(!/^0x[0-9a-fA-F]+$/.test(value))throw Error('Chaîne de signature du wallet illisible.');return value as `0x${string}`;}
export function walletError(error:unknown){
 const seen=new Set<unknown>();let current:any=error,code:number|undefined,detail='',method='';
 while(current&&!seen.has(current)){seen.add(current);if(typeof current.walletMethod==='string')method=current.walletMethod;if(typeof current.code==='number')code=current.code;if(typeof current.message==='string')detail=current.message;current=current.cause??current.error;}
 if(code===4001)return (method==='eth_signTypedData_v4'?'Signature structurée refusée par MetaMask':method==='eth_requestAccounts'?'Connexion du compte refusée par MetaMask':'Demande refusée dans MetaMask')+' (4001). Aucun renvoi automatique. Si MetaMask affiche une alerte de sécurité, consulte son détail avant de réessayer.';
 if(code===-32002)return 'Une demande attend déjà dans MetaMask. Ouvre l’extension pour la confirmer.';
 if(code===4100)return 'Accès au compte non autorisé. Clique sur Connecter MetaMask et accepte le partage de l’adresse.';
 if(code===4900||code===4901)return 'Wallet déconnecté. Ouvre MetaMask puis reconnecte le compte.';
 if(code===4200||code===-32601)return 'Cette demande de signature n’est pas prise en charge par ce wallet. Hyperliquid exige une signature structurée EIP-712 ; vérifie la compatibilité du compte MetaMask et de tout appareil matériel associé.';
 if(/must deposit|user.*does not exist|not funded/i.test(detail))return 'Compte Hyperliquid non activé ou non financé sur ce réseau. Vérifie le compte et le dépôt dans l’application officielle, puis réessaie.';
 return detail||(error instanceof Error?error.message:String(error));
}
