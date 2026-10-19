import {AUTHORIZATION_DAYS,agentAuthorizationName} from '../shared/authorization';
import {rememberWallet} from './shared/wallet-memory';
import {assertEnvironment,networkConfig} from './core/networks.js';
import {publishRunner} from './shared/runner-store';
import {walletError,signingChainId} from './shared/wallet-provider';
const $=(id:string)=>document.getElementById(id)!;
const local=location.origin==='http://127.0.0.1:8766';
const network:Network=assertEnvironment(window.BrowserAtelier.environment).id;
type Network='testnet'|'mainnet';
const states:Partial<Record<Network,any>>={},verifiedAt:Partial<Record<Network,number>>={};
const connected:Partial<Record<Network,boolean>>={};
let token='',current:any=null,busy=false,actionError='';
const message=(text:string)=>{$('runner-status').textContent=text;};
$('runner-mainnet-row').hidden=network!=='mainnet';
(document.querySelector('.runner-actions') as HTMLElement).hidden=false;
$('web-mode-note').hidden=local;(document.querySelector('.runner-guide') as HTMLElement).hidden=!local;
async function request(path:string,body?:unknown,target:Network=network,retry=true):Promise<any>{
 if(!local){try{const result=await (await import('./web/runner')).browserRequest(path,body,target);if(result.network!==target)throw Error('Réponse web reçue pour un autre réseau.');connected[target]=true;return result;}catch(error){connected[target]=false;throw error;}}
 if(!token){const response=await fetch('/api/live/session',{cache:'no-store',signal:AbortSignal.timeout(12000)});if(!response.ok)throw Error('Session du service indisponible.');token=(await response.json()).token;}
 let response:Response;try{response=await fetch('/api/live/'+path+'?network='+target,{signal:AbortSignal.timeout(12000),method:body===undefined?'GET':'POST',headers:{'X-Omega-Session':token,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),cache:'no-store'});connected[target]=true;}catch(error){connected[target]=false;throw error;}
 // A rejected local token has not executed the command. Reopen once after a runner restart.
 if(response.status===401&&retry){token='';delete verifiedAt.mainnet;delete verifiedAt.testnet;return request(path,body,target,false);}
 const result=await response.json();if(!response.ok)throw Error(result.error??'Service indisponible.');if(result.network!==target){connected[target]=false;throw Error('Réponse du service reçue pour un autre réseau.');}return result;
}
function record(target:Network,state:any){states[target]=state;if(target===network)current=state;render();}
function render(){
 const state=current,reachable=connected[network]===true;
 $('runner-service').textContent=state&&reachable?(local?'Connecté · ':'Mode web · ')+network.toUpperCase():'Connexion à vérifier';
 $('runner-service-detail').textContent=local?'Processus indépendant de cet onglet':'Cet onglet doit rester ouvert et visible';
 $('runner-account').textContent=state?.owner?(Number.isFinite(state.equity)?Number(state.equity).toLocaleString('fr-FR',{maximumFractionDigits:2})+' USDC':state.approved?'Agent autorisé':'Autorisation à vérifier'):'Wallet à connecter';
 $('runner-agent').textContent=state?.agent?(state.approved?'Autorisé · ':'À autoriser · ')+state.agent.slice(0,8)+'…'+state.agent.slice(-6):'Agent distinct pour chaque réseau';
 $('runner-state').textContent=state&&!reachable?'État à vérifier':state?.active?'Automatique actif':state?.pending?'Envoi à vérifier':state?.owned?'Position sous surveillance':'À l’arrêt';
 $('runner-pulse').textContent=state?.heartbeat?'Dernier contrôle '+new Date(state.heartbeat).toLocaleTimeString('fr-FR'):'4 tentatives max. / jour UTC · levier ≤ ×15';
 for(const id of ['runner-authorize','runner-start','runner-stop','runner-reconcile']){
  const button=$(id) as HTMLButtonElement;button.disabled=busy||id!=='runner-stop'&&!!state?.busy||!state||!reachable;
  if(id==='runner-authorize')button.disabled||=state?.active||state?.owned||state?.pending;
  if(id==='runner-start')button.disabled||=!state?.approved||state?.active||state?.pending||state?.owned||network==='mainnet'&&!($('runner-mainnet') as HTMLInputElement).checked;
  if(id==='runner-stop')button.disabled||=!state?.active;
  if(id==='runner-reconcile')button.disabled||=!state?.pending||state?.active;
 }
 for(const id of ['runner-authorize','runner-start','runner-stop','runner-reconcile']){const button=$(id) as HTMLButtonElement;button.hidden=id==='runner-authorize'||id==='runner-start'?true:id==='runner-stop'?!state?.active:!state?.pending;}
 publishRunner({...state,actionError,busy:busy||!!state?.busy,connected:!!state&&reachable});
 const complete=!!state?.owner&&(['testnet','mainnet'] as const).every(n=>connected[n]&&states[n]?.approved&&states[n]?.owner?.toLowerCase()===state.owner.toLowerCase());
 $('runner-setup').hidden=false;
 for(const n of ['testnet','mainnet'] as const){const item=states[n],same=!!item?.owner&&(!state?.owner||item.owner.toLowerCase()===state.owner.toLowerCase());const button=$('runner-authorize-'+n) as HTMLButtonElement;button.disabled=busy||!!item?.busy||!!item?.active||!!item?.owned||!!item?.pending;button.textContent=item?.approved?'Vérifier '+(n==='testnet'?'Testnet':'Mainnet'):'Autoriser '+(n==='testnet'?'Testnet':'Mainnet');const el=$('runner-network-'+n);el.textContent=(n==='testnet'?'Testnet':'Mainnet')+' · '+(!connected[n]||!item?'à vérifier':!item.owner?'à configurer':!same?'compte à relier':item.approved?'autorisé'+(item.approvedUntil?' jusqu’au '+new Date(item.approvedUntil).toLocaleDateString('fr-FR'):''):'à autoriser');el.dataset.ready=String(connected[n]&&same&&!!item?.approved);}
 const both=$('runner-both-networks') as HTMLInputElement;both.disabled=busy||!!state?.busy;both.closest('label')!.hidden=complete;
 const setup=$('runner-setup-networks') as HTMLButtonElement;setup.hidden=complete||!state?.approved;setup.disabled=($('runner-authorize') as HTMLButtonElement).disabled;
 const log=$('runner-log');log.replaceChildren(...(state?.events??[]).slice(-15).reverse().map((event:any)=>{const row=document.createElement('p');row.textContent=new Date(event.at).toLocaleString('fr-FR')+' · '+event.message;return row;}));
 if(state?.settings)$('runner-config').textContent='Service : '+state.settings.profile+' · levier maximal ×'+state.settings.leverage+' · objectif journalier +'+(state.settings.dailyTarget??200)+' USDC. Les réglages du formulaire sont appliqués au prochain démarrage.';
}
async function refresh(){
 const failures:string[]=[];
 for(const target of [network,network==='testnet'?'mainnet':'testnet'] as Network[]){
  try{
   let state=await request('status',undefined,target);
   if(state.owner&&Date.now()-(verifiedAt[target]??0)>=60000){state=await request('verify',{},target);verifiedAt[target]=Date.now();}
   record(target,state);
  }catch(error){connected[target]=false;failures.push(target.toUpperCase()+' : '+walletError(error));render();}
 }
 if(actionError)message(actionError);else if(failures.length)message(failures.join(' · '));else if(current?.reason)message(current.reason);
}
async function run(fn:()=>Promise<void>){if(busy)return;busy=true;render();try{await fn();}catch(error){actionError=walletError(error);message(actionError);}finally{busy=false;render();}}
$('runner-refresh').addEventListener('click',()=>run(refresh));
$('runner-mainnet').addEventListener('change',render);
$('runner-setup-networks').addEventListener('click',()=>{const button=$('runner-authorize') as HTMLButtonElement;if(!button.disabled)button.click();});
async function authorizeNetworks(targets:Network[]){return run(async()=>{
 actionError='';
 const {provider,owner:rawAddress}=await (await import('./shared/wallet-session')).requireWallet();
 const address=rawAddress?.toLowerCase();if(!/^0x[0-9a-fA-F]{40}$/.test(address??'')||/^0x0{40}$/.test(address))throw Error('Aucun compte wallet autorisé.');
 if(!navigator.locks)throw Error('Verrouillage entre onglets requis pour autoriser un agent.');
 for(const target of targets)await navigator.locks.request('omega-'+target+'-agent-setup',()=>navigator.locks.request('omega-'+target+'-sign-'+address,async()=>{
  let state=await request('status',undefined,target);
  if(state.owner?.toLowerCase()===address){state=await request('verify',{},target);record(target,state);if(state.approved)return;}
  state=await request('configure',{owner:address},target);record(target,state);
  if(state.owner?.toLowerCase()!==address)throw Error('Compte de l’agent incohérent.');
  if(state.approved)return;
  if(!/^0x[0-9a-fA-F]{40}$/.test(state.agent)||state.agent.toLowerCase()===address)throw Error('Agent du service incohérent.');
  const expectedAgent=state.agent;
  const {sessionWallet}=await import('./shared/wallet-client');
  const {ExchangeClient,HttpTransport}=await import('@nktkas/hyperliquid');
  const signer=new ExchangeClient({wallet:sessionWallet(provider,address as `0x${string}`,target),transport:new HttpTransport(networkConfig(target)),signatureChainId:()=>signingChainId(provider)});
  const selected=await provider.request({method:'eth_accounts'});if(selected[0]?.toLowerCase()!==address)throw Error('Compte actif modifié avant autorisation.');
  message('Signature '+target.toUpperCase()+' : autoriser OMEGA pour '+AUTHORIZATION_DAYS+' jours. Aucun démarrage du bot.');
  await signer.approveAgent({agentAddress:expectedAgent,agentName:agentAuthorizationName(local?'local':'web',target)});
  state=await request('verify',{},target);record(target,state);verifiedAt[target]=Date.now();
  const confirmed=await provider.request({method:'eth_accounts'});if(state.agent!==expectedAgent||state.owner?.toLowerCase()!==address||confirmed[0]?.toLowerCase()!==address)throw Error('Compte ou agent modifié pendant autorisation.');if(!state.approved)throw Error('Autorisation non retrouvée sur '+target.toUpperCase()+'. Les réseaux déjà autorisés sont conservés.');
 }));
 const remembered=rememberWallet(address);
 await window.BrowserAtelier.setAddress(address,false);
 message(!remembered?'Agents configurés, mais mémorisation du compte indisponible sur ce navigateur. Le bot reste à l’arrêt.':targets.length===2?'Testnet et Mainnet configurés. Les autorisations valides seront reprises sans signature. Choisis ton réseau, puis démarre explicitement le bot.':'Agent autorisé sur '+targets[0].toUpperCase()+'. Le bot reste à l’arrêt.');
});}
$('runner-authorize').addEventListener('click',()=>void authorizeNetworks(($('runner-both-networks') as HTMLInputElement).checked?['testnet','mainnet']:[network]));
for(const n of ['testnet','mainnet'] as const)$('runner-authorize-'+n).addEventListener('click',()=>void authorizeNetworks([n]));
$('runner-start').addEventListener('click',()=>run(async()=>{
 actionError='';
 const settings={dailyTarget:Number(($('daily-target') as HTMLSelectElement).value),profile:($('strategy-profile') as HTMLSelectElement).value,leverage:Number(($('leverage-cap') as HTMLSelectElement).value)};
 const consent=network==='mainnet'&&($('runner-mainnet') as HTMLInputElement).checked?'MAINNET':undefined;
 current=await request('arm',{settings,consent});($('runner-mainnet') as HTMLInputElement).checked=false;message(current.reason);
}));
$('runner-stop').addEventListener('click',()=>run(async()=>{current=await request('stop',{});message(current.reason);}));
$('runner-reconcile').addEventListener('click',()=>run(async()=>{current=await request('reconcile',{});message(current.reason);}));
window.OmegaRunnerGate=async()=>{const state=await request('status');if(state.active)throw Error('Arrête le pilote automatique du réseau actuel avant de changer de réseau.');if(state.busy||state.pending||state.owned)throw Error('Une opération, un envoi ou une position du service reste à vérifier avant de changer de réseau.');if(busy)throw Error('Une opération du service est en cours.');};
void run(refresh);setInterval(()=>{if(!busy&&!document.hidden)void run(refresh);},10000);
