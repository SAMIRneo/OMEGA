import {assertEnvironment,networkConfig} from './core/networks.js';
import {publishRunner} from './shared/runner-store';
import {walletProvider,walletError} from './shared/wallet-provider';
const $=(id:string)=>document.getElementById(id)!;
const local=location.origin==='http://127.0.0.1:8766';
const network=assertEnvironment(window.BrowserAtelier.environment).id;
type Network='testnet'|'mainnet';
const states:Partial<Record<Network,any>>={},verifiedAt:Partial<Record<Network,number>>={};
let token='',current:any=null,busy=false,reachable=false;
const message=(text:string)=>{$('runner-status').textContent=text;};
$('runner-mainnet-row').hidden=!local||network!=='mainnet';
(document.querySelector('.runner-actions') as HTMLElement).hidden=!local;
async function request(path:string,body?:unknown,target:Network=network,retry=true):Promise<any>{
 if(!local)throw Error('Service permanent non connecté. Ouvre OMEGA sur http://127.0.0.1:8766 après npm run bot.');
 if(!token){const response=await fetch('/api/live/session',{cache:'no-store',signal:AbortSignal.timeout(12000)});if(!response.ok)throw Error('Session du service indisponible.');token=(await response.json()).token;}
 let response:Response;try{response=await fetch('/api/live/'+path+'?network='+target,{signal:AbortSignal.timeout(12000),method:body===undefined?'GET':'POST',headers:{'X-Omega-Session':token,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),cache:'no-store'});reachable=true;}catch(error){reachable=false;throw error;}
 // A rejected local token has not executed the command. Reopen once after a runner restart.
 if(response.status===401&&retry){token='';delete verifiedAt.mainnet;delete verifiedAt.testnet;return request(path,body,target,false);}
 const result=await response.json();if(!response.ok)throw Error(result.error??'Service indisponible.');if(result.network!==target){reachable=false;throw Error('Réponse du service reçue pour un autre réseau.');}return result;
}
function record(target:Network,state:any){states[target]=state;if(target===network)current=state;render();}
function render(){
 const state=current;
 $('runner-service').textContent=state&&reachable?'Connecté · '+network.toUpperCase():local?'Connexion en attente':'Non connecté';
 $('runner-service-detail').textContent=state&&reachable?'Processus indépendant de cet onglet':'Service permanent requis';
 $('runner-account').textContent=state?.owner?(Number.isFinite(state.equity)?Number(state.equity).toLocaleString('fr-FR',{maximumFractionDigits:2})+' USDC':state.approved?'Agent autorisé':'Autorisation à vérifier'):'Wallet à connecter';
 $('runner-agent').textContent=state?.agent?(state.approved?'Autorisé · ':'À autoriser · ')+state.agent.slice(0,8)+'…'+state.agent.slice(-6):'Agent distinct pour chaque réseau';
 $('runner-state').textContent=state&&!reachable?'État à vérifier':state?.active?'Automatique actif':state?.pending?'Envoi à vérifier':state?.owned?'Position sous surveillance':'À l’arrêt';
 $('runner-pulse').textContent=state?.heartbeat?'Dernier contrôle '+new Date(state.heartbeat).toLocaleTimeString('fr-FR'):'4 tentatives max. / jour UTC · levier ≤ ×15';
 for(const id of ['runner-authorize','runner-start','runner-stop','runner-reconcile']){
  const button=$(id) as HTMLButtonElement;button.disabled=busy||id!=='runner-stop'&&!!state?.busy||!local||!state||!reachable;
  if(id==='runner-authorize')button.disabled||=state?.active||state?.owned||state?.pending;
  if(id==='runner-start')button.disabled||=!state?.approved||state?.active||state?.pending||state?.owned||network==='mainnet'&&!($('runner-mainnet') as HTMLInputElement).checked;
  if(id==='runner-stop')button.disabled||=!state?.active;
  if(id==='runner-reconcile')button.disabled||=!state?.pending||state?.active;
 }
 for(const id of ['runner-authorize','runner-start','runner-stop','runner-reconcile']){const button=$(id) as HTMLButtonElement;button.hidden=id==='runner-authorize'||id==='runner-start'?true:id==='runner-stop'?!state?.active:!state?.pending;}
 publishRunner({...state,busy:busy||!!state?.busy,connected:!!state&&reachable});
 const complete=!!state?.owner&&(['testnet','mainnet'] as const).every(n=>states[n]?.approved&&states[n]?.owner?.toLowerCase()===state.owner.toLowerCase());
 $('runner-setup').hidden=!local;
 for(const n of ['testnet','mainnet'] as const){const item=states[n],same=!!item?.owner&&(!state?.owner||item.owner.toLowerCase()===state.owner.toLowerCase());const el=$('runner-network-'+n);el.textContent=(n==='testnet'?'Testnet':'Mainnet')+' · '+(!reachable||!item?'à vérifier':!same?'compte à relier':item.approved?'autorisé'+(item.approvedUntil?' jusqu’au '+new Date(item.approvedUntil).toLocaleDateString('fr-FR'):''):'à autoriser');el.dataset.ready=String(reachable&&same&&!!item?.approved);}
 const both=$('runner-both-networks') as HTMLInputElement;both.disabled=busy||!!state?.busy;both.closest('label')!.hidden=complete;
 const setup=$('runner-setup-networks') as HTMLButtonElement;setup.hidden=complete||!state?.approved;setup.disabled=($('runner-authorize') as HTMLButtonElement).disabled;
 const log=$('runner-log');log.replaceChildren(...(state?.events??[]).slice(-15).reverse().map((event:any)=>{const row=document.createElement('p');row.textContent=new Date(event.at).toLocaleString('fr-FR')+' · '+event.message;return row;}));
 if(state?.settings)$('runner-config').textContent='Service : '+state.settings.profile+' · levier maximal ×'+state.settings.leverage+' · objectif journalier +'+(state.settings.dailyTarget??200)+' USDC. Les réglages du formulaire sont appliqués au prochain démarrage.';
}
async function refresh(){
 for(const target of [network,network==='testnet'?'mainnet':'testnet'] as Network[]){
  let state=await request('status',undefined,target);
  if(state.owner&&Date.now()-(verifiedAt[target]??0)>=60000){try{state=await request('verify',{},target);verifiedAt[target]=Date.now();}catch(error){record(target,{...state,approved:false,approvedUntil:null});throw error;}}
  record(target,state);
 }
 if(current?.reason)message(current.reason);
}
async function run(fn:()=>Promise<void>){if(busy)return;busy=true;render();try{await fn();}catch(error){message(walletError(error));}finally{busy=false;render();}}
$('runner-refresh').addEventListener('click',()=>run(refresh));
$('runner-mainnet').addEventListener('change',render);
$('runner-setup-networks').addEventListener('click',()=>{const button=$('runner-authorize') as HTMLButtonElement;if(!button.disabled)button.click();});
$('runner-authorize').addEventListener('click',()=>run(async()=>{
 const provider=walletProvider();if(!provider)throw Error('Ouvre OMEGA permanent dans un navigateur avec MetaMask ou Rabby.');
 const existing=await provider.request({method:'eth_accounts'}),[rawAddress]=existing.length?existing:await provider.request({method:'eth_requestAccounts'});
 const address=rawAddress?.toLowerCase();if(!/^0x[0-9a-fA-F]{40}$/.test(address??'')||/^0x0{40}$/.test(address))throw Error('Aucun compte wallet autorisé.');
 if(!navigator.locks)throw Error('Verrouillage entre onglets requis pour autoriser un agent.');
 const targets:Network[]=($('runner-both-networks') as HTMLInputElement).checked?['testnet','mainnet']:[network];
 for(const target of targets)await navigator.locks.request('omega-'+target+'-agent-setup',()=>navigator.locks.request('omega-'+target+'-sign-'+address,async()=>{
  let state=await request('status',undefined,target);
  if(state.owner?.toLowerCase()===address){state=await request('verify',{},target);record(target,state);if(state.approved)return;}
  state=await request('configure',{owner:address},target);record(target,state);
  if(!/^0x[0-9a-fA-F]{40}$/.test(state.agent)||state.agent.toLowerCase()===address)throw Error('Agent du service incohérent.');
  const expectedAgent=state.agent;
  const {createWalletClient,custom}=await import('viem');
  const {ExchangeClient,HttpTransport}=await import('@nktkas/hyperliquid');
  const signer=new ExchangeClient({wallet:createWalletClient({account:address as `0x${string}`,transport:custom(provider)}),transport:new HttpTransport(networkConfig(target))});
  const selected=await provider.request({method:'eth_accounts'});if(selected[0]?.toLowerCase()!==address)throw Error('Compte actif modifié avant autorisation.');
  message('Signature '+target.toUpperCase()+' : autoriser OMEGA pour 30 jours. Aucun démarrage du bot.');
  await signer.approveAgent({agentAddress:expectedAgent,agentName:'OMEGA-'+target+' valid_until '+(Date.now()+30*86400000)});
  state=await request('verify',{},target);record(target,state);verifiedAt[target]=Date.now();
  const confirmed=await provider.request({method:'eth_accounts'});if(state.agent!==expectedAgent||state.owner?.toLowerCase()!==address||confirmed[0]?.toLowerCase()!==address)throw Error('Compte ou agent modifié pendant autorisation.');if(!state.approved)throw Error('Autorisation non retrouvée sur '+target.toUpperCase()+'. Les réseaux déjà autorisés sont conservés.');
 }));
 await window.BrowserAtelier.setAddress(address,false);
 message(targets.length===2?'Testnet et Mainnet configurés. Les autorisations valides seront reprises sans signature. Choisis ton réseau, puis démarre explicitement le bot.':'Agent autorisé sur '+network.toUpperCase()+'. Le bot reste à l’arrêt.');
}));
$('runner-start').addEventListener('click',()=>run(async()=>{
 const settings={dailyTarget:Number(($('daily-target') as HTMLSelectElement).value),profile:($('strategy-profile') as HTMLSelectElement).value,leverage:Number(($('leverage-cap') as HTMLSelectElement).value)};
 const consent=network==='mainnet'&&($('runner-mainnet') as HTMLInputElement).checked?'MAINNET':undefined;
 current=await request('arm',{settings,consent});($('runner-mainnet') as HTMLInputElement).checked=false;message(current.reason);
}));
$('runner-stop').addEventListener('click',()=>run(async()=>{current=await request('stop',{});message(current.reason);}));
$('runner-reconcile').addEventListener('click',()=>run(async()=>{current=await request('reconcile',{});message(current.reason);}));
window.OmegaRunnerGate=async()=>{if(!local)return;const state=await request('status');if(state.active)throw Error('Arrête le pilote automatique du réseau actuel avant de changer de réseau.');if(state.busy||state.pending||state.owned)throw Error('Une opération, un envoi ou une position du service reste à vérifier avant de changer de réseau.');if(busy)throw Error('Une opération du service est en cours.');};
if(local){void run(refresh);setInterval(()=>{if(!busy&&!document.hidden)void run(refresh);},10000);}else render();
