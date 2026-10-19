import {assertEnvironment,networkConfig} from '../core/networks.js';
import {publishWallet,type WalletView} from './wallet-store';
import {walletProvider,requestWalletAccount,walletError,type Provider} from './wallet-provider';
import {rememberedWallet,rememberWallet,forgetWallet} from './wallet-memory';

const network=assertEnvironment(window.BrowserAtelier.environment).id;
const empty=():WalletView=>({network,address:null,busy:false,readAt:0,equity:null,withdrawable:null,position:null,openOrders:0,message:'Connecte ton compte. Aucun ordre ni signature à cette étape.',error:false});
let view=empty(),provider:Provider|undefined,revision=0,operation:Promise<void>|null=null,manualBusy=false;
const emit=()=>publishWallet({...view,busy:!!operation||manualBusy});
const report=(message:string,error=false)=>{view={...view,message,error};emit();};
export const walletSession=()=>({...view,busy:!!operation||manualBusy});
export const sessionProvider=()=>provider;
export function setWalletActivity(busy:boolean){manualBusy=busy;emit();}
function detach(){provider?.removeListener?.('accountsChanged',accountsChanged);provider?.removeListener?.('disconnect',disconnected);}
function invalidate(message:string,forget=false,error=true){revision++;if(forget)forgetWallet();view={...empty(),message,error};emit();}
function disconnected(){invalidate('MetaMask déconnecté : nouvelles entrées web arrêtées. Compte et agents conservés. Reconnecte le wallet.');}
function accountsChanged(accounts:unknown){
 const selected=Array.isArray(accounts)&&typeof accounts[0]==='string'?accounts[0].toLowerCase():null;
 if(selected===view.address)return;
 if(selected&&selected===rememberedWallet()){if(!operation)void restoreWallet();return;}
 if(!selected){invalidate('MetaMask verrouillé ou accès suspendu. Le compte et les agents restent mémorisés. Déverrouille MetaMask pour reprendre.',false,false);return;}
 invalidate('Le compte actif de MetaMask a changé. Connecte le compte souhaité.',true);
}
function bind(next:Provider,address:string){detach();provider=next;provider.on?.('accountsChanged',accountsChanged);provider.on?.('disconnect',disconnected);view={...empty(),address:address.toLowerCase()};emit();}
function check(version:number){if(version!==revision||window.BrowserAtelier.environment?.id!==network)throw Error('Session wallet modifiée. Reconnecte le compte.');}
async function read(version:number){
 if(!view.address||!provider)throw Error('Connecte le wallet Hyperliquid.');
 const owner=view.address;
 const {InfoClient,HttpTransport}=await import('@nktkas/hyperliquid');
 const state=await new InfoClient({transport:new HttpTransport(networkConfig(network))}).clearinghouseState({user:owner as `0x${string}`});
 check(version);if(view.address!==owner)throw Error('Compte modifié pendant la lecture.');
 if(!Number.isFinite(Number(state.marginSummary.accountValue))||!Number.isFinite(Number(state.withdrawable)))throw Error('Solde Hyperliquid illisible. Actualise la lecture du compte.');
 const position=state.assetPositions.find(x=>x.position.coin==='ETH'&&Number(x.position.szi)!==0)?.position;
 view={...view,readAt:Date.now(),equity:Number(state.marginSummary.accountValue),withdrawable:Number(state.withdrawable),position:position?{size:Number(position.szi),entry:Number(position.entryPx)}:null};emit();
}
function perform(fn:(version:number)=>Promise<void>){
 if(operation)return operation;
 if(manualBusy)return Promise.resolve();
 const version=revision;
 const task=Promise.resolve().then(()=>fn(version)).catch(error=>{if(version===revision)report(walletError(error),true);});
 operation=task;emit();void task.finally(()=>{if(operation===task){operation=null;emit();}});return task;
}
async function finish(version:number){
 await read(version);check(version);
 await window.BrowserAtelier.setAddress(view.address!,false);check(version);
 const saved=rememberWallet(view.address!);
 report(saved?'Compte mémorisé sur ce navigateur. Les autorisations du bot restent distinctes pour Testnet et Mainnet.':'Compte connecté, mais mémorisation indisponible. Autorise le stockage du site pour retrouver automatiquement ce compte.');
}
export function connectWallet(options:{mobile?:boolean}={}){return perform(async version=>{
 detach();provider=undefined;view=empty();emit();
 report('Ouvre MetaMask et autorise uniquement le partage de ton adresse.');
 if(options.mobile||!walletProvider()){await (await import('./wallet-help')).openWalletHelp();check(version);report('Ouvre OMEGA avec l’extension ou dans le navigateur MetaMask, puis connecte ton compte sur cet appareil.');return;}
 const next=walletProvider();if(!next)throw Error('Aucun wallet compatible détecté.');
 const address=await requestWalletAccount(next);check(version);bind(next,address);rememberWallet(address);await finish(version);
});}
export function restoreWallet(){
 const expected=rememberedWallet();if(!expected||view.address)return Promise.resolve();
 return perform(async version=>{
  const next=walletProvider();if(!next){report('Installe ou ouvre MetaMask, puis reconnecte ton compte mémorisé.');return;}
  const accounts=await next.request({method:'eth_accounts'});check(version);
  if(!accounts.length){detach();provider=next;provider.on?.('accountsChanged',accountsChanged);provider.on?.('disconnect',disconnected);report('Déverrouille MetaMask pour reprendre ton compte mémorisé. Aucune nouvelle autorisation du bot.');return;}
  if(accounts[0].toLowerCase()!==expected){forgetWallet();throw Error('Le compte actif de MetaMask a changé. Connecte le compte souhaité.');}
  bind(next,expected);await finish(version);
 });
}
export function disconnectWallet(){detach();provider=undefined;invalidate('Compte oublié sur ce navigateur. Les autorisations des agents et les ordres Hyperliquid ne sont pas révoqués.',true,false);}
export async function resetWalletConnection(){
 if(operation||manualBusy)throw Error('Termine ou annule la demande wallet en cours avant de réinitialiser.');
 disconnectWallet();report('Connexion réinitialisée. Reconnecte le compte souhaité ; les agents chiffrés et les ordres sont conservés.');
}
export const refreshWallet=()=>perform(async version=>{await read(version);report('Compte '+network.toUpperCase()+' actualisé.');});
export async function requireWallet(){
 if(manualBusy)throw Error('Une opération manuelle est en cours. Attends sa fin avant d’autoriser le bot.');
 if(operation)await operation;
 if(!view.address||!provider)await connectWallet();
 if(!view.address||!provider)throw Error(view.message||'Connecte le wallet.');
 const version=revision,accounts=await provider.request({method:'eth_accounts'});check(version);
 if(accounts[0]?.toLowerCase()!==view.address)throw Error('Compte actif modifié. Reconnecte le compte souhaité.');
 return {provider,owner:view.address as `0x${string}`};
}
window.addEventListener('focus',()=>{if(!view.address&&rememberedWallet())void restoreWallet();});
window.addEventListener('axiom-state',()=>{if(view.address&&!document.hidden&&!operation&&!manualBusy&&Date.now()-view.readAt>15000)void refreshWallet();});
// Preserve network-switch guards even when the manual-order module has never been opened.
window.TestnetGate??=async()=>{
 if(operation||manualBusy)throw Error('Une opération wallet est en cours.');
 if(!view.address)return;
 if(window.localStorage.getItem('omega-'+network+'-exchange-pending-'+view.address))throw Error('Un envoi manuel reste à vérifier avant de changer de réseau.');
 const version=revision;await read(version);
 const {InfoClient,HttpTransport}=await import('@nktkas/hyperliquid');
 const orders=await new InfoClient({transport:new HttpTransport(networkConfig(network))}).frontendOpenOrders({user:view.address as `0x${string}`});check(version);
 if(view.position||orders.some(order=>order.coin==='ETH'))throw Error('Gère la position et les ordres ETH avant de changer de réseau.');
};
