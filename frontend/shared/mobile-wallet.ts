import type {Provider} from './wallet-provider';
import {setRemoteProvider} from './wallet-provider';

let client:Awaited<ReturnType<typeof import('@metamask/connect-evm').createEVMClient>>|undefined;
/** Loaded only after an explicit click. No signature or bot start is requested. */
export async function connectMobileWallet(){
 const {createEVMClient}=await import('@metamask/connect-evm');
 client??=await createEVMClient({dapp:{name:'OMEGA',url:location.origin},api:{supportedNetworks:{'0x1':'https://ethereum-rpc.publicnode.com'}},ui:{headless:true,preferExtension:false},analytics:{enabled:false},skipAutoAnnounce:true});
 const provider=client.getProvider(),dialog=document.createElement('dialog');dialog.className='wallet-pairing';dialog.setAttribute('aria-labelledby','wallet-pairing-title');
 const title=document.createElement('h2');title.id='wallet-pairing-title';title.textContent='Relier MetaMask sur téléphone';
 const note=document.createElement('p');note.textContent='Préparation de la connexion sécurisée…';note.setAttribute('role','status');
 const qr=document.createElement('div');qr.className='wallet-pairing-qr';
 const cancel=document.createElement('button');cancel.className='button';cancel.textContent='Annuler la connexion';cancel.type='button';
 const privacy=document.createElement('p');privacy.className='micro';privacy.textContent='Scanne depuis MetaMask. Sélectionne un seul compte. Aucun ordre ni autorisation de trading à cette étape.';
 dialog.append(title,note,qr,privacy,cancel);document.body.append(dialog);dialog.showModal();
 let cancelled=false,rejectCancel:(reason:Error)=>void=()=>{};
 const cancellation=new Promise<never>((_,reject)=>{rejectCancel=reject;});
 const abort=()=>{cancelled=true;rejectCancel(Error('Connexion annulée. Tu peux réessayer.'));void client!.disconnect().catch(()=>{});};
 cancel.addEventListener('click',abort);dialog.addEventListener('cancel',event=>{event.preventDefault();abort();});
 const display=async(uri:string)=>{try{const {default:QRCode}=await import('qr-code-styling');if(!dialog.isConnected||cancelled)return;qr.replaceChildren();new QRCode({width:240,height:240,type:'svg',data:uri,dotsOptions:{color:'#142638'},backgroundOptions:{color:'#ffffff'}}).append(qr);note.textContent='Dans MetaMask, ouvre le scanner et scanne ce QR code.';}catch{abort();}};
 provider.on('display_uri',display);
 let result:Awaited<ReturnType<typeof client.connect>>;
 try{result=await Promise.race([client.connect({chainIds:['0x1']}),cancellation]);}
 finally{provider.removeListener('display_uri',display);dialog.close();dialog.remove();}
 if(result.accounts.length!==1){await client.disconnect();throw Error('Sélectionne un seul compte dans MetaMask pour relier OMEGA, puis réessaie.');}
 // Remote sessions may merge several previously authorized accounts. Never pick an arbitrary first account.
 const check=(accounts:readonly string[])=>{if(accounts.length!==1)throw Error('La session MetaMask contient plusieurs comptes. Reconnecte un seul compte.');return accounts;};
 const listeners=new Map<Function,Function>();
 const wrapped:Provider={request:(async(args:any)=>{const value=await provider.request(args.method==='eth_requestAccounts'?{method:'eth_accounts'}:args);return args.method==='eth_accounts'||args.method==='eth_requestAccounts'?check(value as string[]):value;}) as Provider['request'],on:(event:string,handler:(...args:any[])=>void)=>{const listener=event==='accountsChanged'?(accounts:string[])=>handler(accounts.length===1?accounts:[]):handler;listeners.set(handler,listener);provider.on(event as any,listener);},removeListener:(event:string,handler:(...args:any[])=>void)=>{provider.removeListener(event as any,(listeners.get(handler)??handler) as any);listeners.delete(handler);}};
 setRemoteProvider(wrapped);
}
