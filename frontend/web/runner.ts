import {ExchangeClient,HttpTransport,InfoClient} from '@nktkas/hyperliquid';
import {generatePrivateKey,privateKeyToAccount} from 'viem/accounts';
import {LiveEngine,type Ledger} from '../../runner/engine';
import {networkConfig,type Network} from '../../runner/policy';
import {walletProvider} from '../shared/wallet-provider';
import {subscribeWallet} from '../shared/wallet-store';
import {BrowserVault} from './vault';
let epoch=0,walletRevision=0,walletAddress:string|null=null;
const vault=new BrowserVault(),engines=new Map<Network,LiveEngine>(),opening=new Map<Network,Promise<LiveEngine|null>>(),held=new Set<Network>(),releases=new Map<Network,()=>void>();
async function claim(network:Network,generation=epoch){
 if(held.has(network))return true;if(!navigator.locks)throw Error('Web Locks requis pour trader dans le navigateur.');
 return new Promise<boolean>((resolve,reject)=>{void navigator.locks.request('omega-web-execution-'+network,{ifAvailable:true},async lock=>{if(generation!==epoch){resolve(false);return;}if(!lock){resolve(false);return;}held.add(network);let release!:()=>void;const waiting=new Promise<void>(done=>{release=done;});releases.set(network,release);resolve(true);await waiting;if(releases.get(network)===release){releases.delete(network);held.delete(network);}}).catch(reject);});
}
function checkSupport(){if(!window.isSecureContext||!window.indexedDB||!window.crypto?.subtle||!navigator.locks)throw Error('Mode web indisponible : HTTPS, IndexedDB, Web Crypto et Web Locks requis.');}
async function create(network:Network,ledger:Ledger,agent:`0x${string}`,generation=epoch){
 const risk=await window.RiskCore.ready;if(!risk)throw Error('Calcul du risque indisponible : trading web bloqué.');
 if(generation!==epoch||!held.has(network))throw Error('Session de cet onglet interrompue.');
 const account=privateKeyToAccount(ledger.key);if(account.address.toLowerCase()!==agent.toLowerCase())throw Error('Identité du coffre incohérente.');
 let engine:LiveEngine;const transport=new HttpTransport(networkConfig(network)),request=transport.request.bind(transport);
 transport.request=async<T>(endpoint:'info'|'exchange'|'explorer',payload:unknown,signal?:AbortSignal):Promise<T>=>{
  if(endpoint==='exchange'){
   if(!held.has(network)||engines.get(network)!==engine)throw Error('Contrôle de cet onglet perdu : signature bloquée.');
   const action=(payload as {action?:{type:string;orders?:Array<{r:boolean}>}}).action;
   if(action?.type==='order'&&action.orders?.some(o=>!o.r)&&(!engine.active||document.hidden))throw Error('Entrée interrompue : onglet masqué ou bot arrêté.');
  }
  return request<T>(endpoint,payload,signal);
 };
 let tail=Promise.resolve(),revision=ledger.revision??null;
 const save=()=>{
  const snapshot=JSON.parse(JSON.stringify(ledger)) as Ledger;
  const task=tail.then(async()=>{const result=await vault.save(snapshot,agent,network,revision,()=>held.has(network)&&engines.get(network)===engine);revision=result.revision;Object.assign(ledger,result);});
  // Keep a failed checkpoint sticky: do not continue writing from an uncertain revision.
  tail=task;return task;
 };
 const exchange=new ExchangeClient({transport,wallet:account,defaultExpiresAfter:()=>Date.now()+60000,nonceManager:async()=>{ledger.nonce=Math.max(Date.now(),ledger.nonce+1);await save();return ledger.nonce;}});
 engine=new LiveEngine(network,ledger,agent,new InfoClient({transport}),exchange,risk,save);engines.set(network,engine);return engine;
}
async function get(network:Network){
 checkSupport();if(engines.has(network))return engines.get(network)!;if(opening.has(network))return opening.get(network)!;
 const generation=epoch,task=(async()=>{if(!await claim(network,generation))throw Error('Un autre onglet contrôle ce réseau. Utilise cet onglet ou ferme-le avant de continuer.');const saved=await vault.load(network);if(generation!==epoch||!held.has(network))throw Error('Session de cet onglet interrompue.');return saved?create(network,saved.ledger,saved.agent,generation):null;})();opening.set(network,task);try{return await task;}finally{opening.delete(network);}
}
const blank=(network:Network)=>({network,owner:null,agent:null,active:false,busy:false,approved:false,pending:false,owned:false,events:[],heartbeat:0,reason:'Mode web prêt. Connecte MetaMask puis autorise les réseaux.',mode:'web'});
export async function browserRequest(path:string,body:any,network:Network){
 const generation=epoch;let engine=await get(network);if(generation!==epoch)throw Error('Session de cet onglet interrompue.');
 if(path==='status')return engine?{...engine.status(),mode:'web'}:blank(network);
 if(path==='configure'){
  if(!/^0x[0-9a-fA-F]{40}$/.test(body?.owner)||/^0x0{40}$/.test(body.owner))throw Error('Compte MetaMask invalide.');
  if(engine)await engine.configure(body.owner);
  const old=await vault.load(network),ledger:Ledger={network,owner:body.owner.toLowerCase(),key:generatePrivateKey(),nonce:0,attemptDay:engine?.ledger.attemptDay??'',attemptCount:engine?.ledger.attemptCount,lastAttemptAt:engine?.ledger.lastAttemptAt,lastExitAt:engine?.ledger.lastExitAt,pending:null,owned:false,events:engine?.ledger.events??[],settings:engine?.ledger.settings};
  const agent=privateKeyToAccount(ledger.key).address,result=await vault.save(ledger,agent,network,old?.ledger.revision??null,()=>held.has(network)&&generation===epoch);Object.assign(ledger,result);engine=await create(network,ledger,agent,generation);
 }else{
  if(!engine)throw Error('Configure d’abord l’agent avec MetaMask.');
  if(path==='verify')await engine.verifyApproval();else if(path==='arm'){const revision=walletRevision,provider=walletProvider(),accounts=await provider?.request({method:'eth_accounts'});if(revision!==walletRevision||generation!==epoch||engines.get(network)!==engine)throw Error('Session wallet modifiée : démarrage interrompu.');if(accounts?.[0]?.toLowerCase()!==engine.ledger.owner?.toLowerCase())throw Error('Reconnecte le compte MetaMask propriétaire avant le démarrage.');if(document.hidden)throw Error('Garde cet onglet visible pour démarrer.');await engine.arm(body?.settings,body?.consent);}else if(path==='stop')await engine.stop();else if(path==='reconcile')await engine.reconcile();else throw Error('Commande web inconnue.');
 }
 return {...engine.status(),mode:'web'};
}
async function poll(){for(const engine of engines.values()){if(document.hidden&&engine.active)await engine.stop();await engine.tick();}}
setInterval(()=>{void poll().catch(()=>{/* Engine preserves pending and exposes its durable-write failure reason. */});},10000);
subscribeWallet(state=>{const address=state.address?.toLowerCase()??null;if(address!==walletAddress){walletAddress=address;walletRevision++;for(const engine of engines.values())if((engine.active||engine.busy)&&address!==engine.ledger.owner?.toLowerCase())void engine.stop();}});
document.addEventListener('visibilitychange',()=>{if(document.hidden)for(const engine of engines.values())if(engine.active||engine.busy)void engine.stop();});
window.addEventListener('pagehide',()=>{epoch++;for(const engine of engines.values())if(engine.active||engine.busy)void engine.stop();engines.clear();for(const release of releases.values())release();releases.clear();held.clear();});
