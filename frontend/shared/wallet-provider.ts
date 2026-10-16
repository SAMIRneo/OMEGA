import type {EIP1193Provider} from 'viem';
type Provider=EIP1193Provider & {isMetaMask?:boolean;providers?:Provider[];on?:(event:string,handler:()=>void)=>void;removeListener?:(event:string,handler:()=>void)=>void};
let announced:Provider|undefined;
// Select MetaMask explicitly when more than one wallet extension is installed.
window.addEventListener('eip6963:announceProvider',((event:CustomEvent<{info:{rdns:string};provider:Provider}>)=>{
 if(event.detail?.info?.rdns==='io.metamask')announced=event.detail.provider;
}) as EventListener);
window.dispatchEvent(new window.Event('eip6963:requestProvider'));
export function walletProvider():Provider|undefined{
 const injected=(window as Window & {ethereum?:Provider}).ethereum;
 return announced??injected?.providers?.find(p=>p.isMetaMask)??injected;
}
export function walletError(error:unknown){
 const code=(error as {code?:number})?.code;
 if(code===4001)return 'Demande refusée dans MetaMask. Vérifie l’état du compte avant de réessayer.';
 if(code===-32002)return 'Une demande attend déjà dans MetaMask. Ouvre l’extension pour la confirmer.';
 return error instanceof Error?error.message:String(error);
}
