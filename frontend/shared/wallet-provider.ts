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
/** Explicit user action: eth_accounts is reserved for passive restoration. */
export async function requestWalletAccount(p:Pick<Provider,'request'>){const accounts=await p.request({method:'eth_requestAccounts'});const address=accounts[0];if(!/^0x[0-9a-fA-F]{40}$/.test(address??'')||/^0x0{40}$/.test(address))throw Error('Aucun compte autorisé dans le wallet.');return address.toLowerCase() as `0x${string}`;}
export async function signingChainId(p:Pick<Provider,'request'>){const value=await p.request({method:'eth_chainId'});if(!/^0x[0-9a-fA-F]+$/.test(value))throw Error('Chaîne de signature du wallet illisible.');return value as `0x${string}`;}
export function walletError(error:unknown){
 const seen=new Set<unknown>();let current:any=error,code:number|undefined,detail='';
 while(current&&!seen.has(current)){seen.add(current);if(typeof current.code==='number')code=current.code;if(typeof current.message==='string')detail=current.message;current=current.cause??current.error;}
 if(code===4001)return 'Demande refusée dans MetaMask. Vérifie l’état du compte avant de réessayer.';
 if(code===-32002)return 'Une demande attend déjà dans MetaMask. Ouvre l’extension pour la confirmer.';
 if(code===4100)return 'Accès au compte non autorisé. Clique sur Connecter MetaMask et accepte le partage de l’adresse.';
 if(code===4900||code===4901)return 'Wallet déconnecté. Ouvre MetaMask puis reconnecte le compte.';
 if(/must deposit|user.*does not exist|not funded/i.test(detail))return 'Compte Hyperliquid non activé ou non financé sur ce réseau. Vérifie le compte et le dépôt dans l’application officielle, puis réessaie.';
 return detail||(error instanceof Error?error.message:String(error));
}
