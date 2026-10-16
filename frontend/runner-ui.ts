import {publishRunner} from './shared/runner-store';
import type {EIP1193Provider} from 'viem';
const $=(id:string)=>document.getElementById(id)!;
const local=location.origin==='http://127.0.0.1:8766';
const network=window.BrowserAtelier.environment?.id??'mainnet';
let token='',current:any=null,busy=false,verified=false,reachable=false;
const message=(text:string)=>{$('runner-status').textContent=text;};
$('runner-mainnet-row').hidden=network!=='mainnet';
async function request(path:string,body?:unknown){
 if(!local)throw Error('Service permanent non connecté. Ouvre OMEGA sur http://127.0.0.1:8766 après npm run bot.');
 if(!token){const response=await fetch('/api/live/session',{cache:'no-store'});if(!response.ok)throw Error('Session du service indisponible.');token=(await response.json()).token;}
 let response:Response;try{response=await fetch('/api/live/'+path+'?network='+network,{signal:AbortSignal.timeout(12000),method:body===undefined?'GET':'POST',headers:{'X-Omega-Session':token,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),cache:'no-store'});reachable=true;}catch(error){reachable=false;throw error;}
 const result=await response.json();if(!response.ok)throw Error(result.error??'Service indisponible.');return result;
}
function render(){
 const state=current;
 $('runner-service').textContent=state&&reachable?'Connecté · '+network.toUpperCase():local?'Connexion en attente':'Non connecté';
 $('runner-service-detail').textContent=state&&reachable?'Processus indépendant de cet onglet':'Service permanent requis';
 $('runner-account').textContent=state?.owner?(Number.isFinite(state.equity)?Number(state.equity).toLocaleString('fr-FR',{maximumFractionDigits:2})+' USDC':state.approved?'Agent autorisé':'Autorisation à vérifier'):'Wallet à connecter';
 $('runner-agent').textContent=state?.agent?(state.approved?'Autorisé · ':'À autoriser · ')+state.agent.slice(0,8)+'…'+state.agent.slice(-6):'Agent distinct pour chaque réseau';
 $('runner-state').textContent=state&&!reachable?'État à vérifier':state?.active?'Automatique actif':state?.pending?'Envoi à vérifier':state?.owned?'Position sous surveillance':'À l’arrêt';
 $('runner-pulse').textContent=state?.heartbeat?'Dernier contrôle '+new Date(state.heartbeat).toLocaleTimeString('fr-FR'):'1 entrée max. / jour UTC · levier ≤ ×15';
 for(const id of ['runner-authorize','runner-start','runner-stop','runner-reconcile']){
  const button=$(id) as HTMLButtonElement;button.disabled=busy||!local||!state||!reachable;
  if(id==='runner-authorize')button.disabled||=state?.active||state?.owned||state?.pending;
  if(id==='runner-start')button.disabled||=!state?.approved||state?.active||state?.pending||state?.owned||network==='mainnet'&&!($('runner-mainnet') as HTMLInputElement).checked;
  if(id==='runner-stop')button.disabled||=!state?.active;
  if(id==='runner-reconcile')button.disabled||=!state?.pending||state?.active;
 }
 publishRunner({...state,connected:!!state&&reachable});
 const log=$('runner-log');log.replaceChildren(...(state?.events??[]).slice(-15).reverse().map((event:any)=>{const row=document.createElement('p');row.textContent=new Date(event.at).toLocaleString('fr-FR')+' · '+event.message;return row;}));
 if(state?.settings)$('runner-config').textContent='Service : '+state.settings.profile+' · levier maximal ×'+state.settings.leverage+'. Les réglages du formulaire sont appliqués au prochain démarrage.';
}
async function refresh(){current=await request('status');if(!verified&&current.owner){current=await request('verify',{});verified=true;}render();if(current.reason)message(current.reason);}
async function run(fn:()=>Promise<void>){if(busy)return;busy=true;render();try{await fn();}catch(error){message(error instanceof Error?error.message:String(error));}finally{busy=false;render();}}
$('runner-refresh').addEventListener('click',()=>run(refresh));
$('runner-mainnet').addEventListener('change',render);
$('runner-authorize').addEventListener('click',()=>run(async()=>{
 const provider=(window as Window & {ethereum?:EIP1193Provider}).ethereum;if(!provider)throw Error('Ouvre OMEGA permanent dans un navigateur avec MetaMask ou Rabby.');
 const [address]=await provider.request({method:'eth_requestAccounts'});if(!address)throw Error('Aucun compte wallet autorisé.');
 current=await request('configure',{owner:address});
 if(current.network!==network||!/^0x[0-9a-fA-F]{40}$/.test(current.agent)||current.agent.toLowerCase()===address.toLowerCase())throw Error('Agent du service incohérent.');
 const {createWalletClient,custom}=await import('viem');
 const {ExchangeClient,HttpTransport}=await import('@nktkas/hyperliquid');
 const signer=new ExchangeClient({wallet:createWalletClient({account:address,transport:custom(provider)}),transport:new HttpTransport({isTestnet:network==='testnet',apiUrl:network==='testnet'?'https://api.hyperliquid-testnet.xyz':'https://api.hyperliquid.xyz',timeout:12000})});
 message('Signature wallet : autoriser l’agent OMEGA sur '+network.toUpperCase()+' pour 24 heures.');
 await signer.approveAgent({agentAddress:current.agent,agentName:'OMEGA-'+network+' valid_until '+(Date.now()+86400000)});
 current=await request('verify',{});if(!current.approved)throw Error('Autorisation non retrouvée sur Hyperliquid. Vérifie le réseau et le compte.');
 await window.BrowserAtelier.setAddress(address,false);
 message('Agent API autorisé sur '+network.toUpperCase()+'. Tu peux démarrer le pilote automatique.');
}));
$('runner-start').addEventListener('click',()=>run(async()=>{
 const settings={profile:($('strategy-profile') as HTMLSelectElement).value,leverage:Number(($('leverage-cap') as HTMLSelectElement).value)};
 const consent=network==='mainnet'&&($('runner-mainnet') as HTMLInputElement).checked?'MAINNET':undefined;
 current=await request('arm',{settings,consent});($('runner-mainnet') as HTMLInputElement).checked=false;message(current.reason);
}));
$('runner-stop').addEventListener('click',()=>run(async()=>{current=await request('stop',{});message(current.reason);}));
$('runner-reconcile').addEventListener('click',()=>run(async()=>{current=await request('reconcile',{});message(current.reason);}));
window.OmegaRunnerGate=async()=>{if(!local)return;const state=await request('status');if(state.active)throw Error('Arrête le pilote automatique du réseau actuel avant de changer de réseau.');};
if(local){void run(refresh);setInterval(()=>{if(!busy&&!document.hidden)void run(refresh);},10000);}else render();
