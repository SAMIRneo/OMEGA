/** Wallet signing session, separate from public-address lookup and runner approval. */
export interface WalletView {
 network:string; address:string|null; busy:boolean; readAt:number;
 equity:number|null; withdrawable:number|null; position:{size:number;entry:number}|null;
 openOrders:number; message:string; error:boolean;
}
let current:WalletView={network:'',address:null,busy:false,readAt:0,equity:null,withdrawable:null,position:null,openOrders:0,message:'',error:false};
const subscribers=new Set<(state:WalletView)=>void>();
export function publishWallet(state:WalletView){current=state;for(const fn of subscribers)fn(state);}
export function subscribeWallet(fn:(state:WalletView)=>void){subscribers.add(fn);fn(current);return ()=>subscribers.delete(fn);}
