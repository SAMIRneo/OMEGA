import {assertEnvironment,networkConfig} from './core/networks.js';
import {sessionBlock} from './core/session.js';
import {rememberedWallet,rememberWallet,forgetWallet} from './shared/wallet-memory';
import {publishWallet} from './shared/wallet-store';
import {walletProvider,walletError} from './shared/wallet-provider';
import {ExchangeClient,HttpTransport,InfoClient} from '@nktkas/hyperliquid';
import {createWalletClient,custom,type Address} from 'viem';
import {formatPrice,formatSize} from '@nktkas/hyperliquid/utils';
import {exchangePlan,exchangeStatus,exchangeDay} from './core/testnet-plan';
import type {Snapshot} from './core/types';
const $=(id:string)=>document.getElementById(id)!;
const panel=$('testnet-exchange');
const environment=window.BrowserAtelier.environment!;
const definition=assertEnvironment(environment);
const network=environment.id as 'testnet'|'mainnet',isTestnet=network==='testnet',networkLabel=isTestnet?'TESTNET':'MAINNET';
panel.hidden=false;
const transport=new HttpTransport(networkConfig(network));
const consent=$('mainnet-consent') as HTMLInputElement;
$('mainnet-consent-row').hidden=isTestnet;
($('exchange-app-link') as HTMLAnchorElement).href=definition.app;
$('exchange-faucet-link').hidden=!isTestnet;
panel.querySelector('.panel-head .pill')!.textContent=networkLabel+(isTestnet?' / FONDS DE TEST':' / FONDS RÉELS');
function authorize(){if(!isTestnet&&!consent.checked)throw Error('Confirme explicitement le plan mainnet avec des fonds réels avant la signature.');}

const info=new InfoClient({transport});
let revision=0;
let exchange:ExchangeClient|null=null,address:Address|null=null,busy=false,last:Snapshot|null=null,readAt=0,reading:Promise<void>|null=null;
let account:Awaited<ReturnType<typeof info.clearinghouseState>>|null=null;
let orders:Awaited<ReturnType<typeof info.frontendOpenOrders>>=[];
let fills:Awaited<ReturnType<typeof info.userFills>>=[];
let dayFills:typeof fills=[];
let meta:{asset:number;szDecimals:number;maxLeverage:number}|null=null;
const form=$('testnet-order-form') as HTMLFormElement;
form.addEventListener('change',event=>{if(event.target!==consent)consent.checked=false;});
let sessionMessage='',sessionError=false,activeProvider:ReturnType<typeof walletProvider>;
const status=(message:string,error=false)=>{sessionMessage=message;sessionError=error;$('testnet-action-status').textContent=message;publishSession();};
const number=(n:unknown)=>Number(n).toLocaleString('fr-FR',{maximumFractionDigits:4});
const provider=()=>activeProvider??walletProvider();
function publishSession(){const position=account?.assetPositions.find(x=>x.position.coin==='ETH'&&Number(x.position.szi)!==0)?.position;publishWallet({network,address,busy,readAt,equity:account?Number(account.marginSummary.accountValue):null,withdrawable:account?Number(account.withdrawable):null,position:position?{size:Number(position.szi),entry:Number(position.entryPx)}:null,openOrders:orders.filter(x=>x.coin==='ETH').length,message:sessionMessage,error:sessionError});}
function guard(){assertEnvironment(window.BrowserAtelier.environment);if(window.BrowserAtelier.environment?.id!==network||transport.isTestnet!==isTestnet)throw Error('Réseau de signature incohérent.');if(!address||!exchange)throw Error('Connecte le wallet Hyperliquid.');}
const pendingKey=()=> 'omega-'+network+'-exchange-pending-'+address?.toLowerCase();
function pending():{cloid:`0x${string}`;at:number}|null{const raw=localStorage.getItem(pendingKey());if(!raw)return null;try{const value=JSON.parse(raw);if(!/^0x[0-9a-fA-F]{32}$/.test(value.cloid)||!Number.isFinite(value.at)||value.at<=0||value.at>Date.now()+5000)throw Error('Invalid pending');return value;}catch{throw Error('Journal d’envoi illisible : vérifie le compte Hyperliquid avant de poursuivre.');}}
function setBusy(value:boolean){busy=value;publishSession();(document.getElementById('network-select') as HTMLSelectElement).disabled=value;for(const b of panel.querySelectorAll<HTMLButtonElement>('button'))b.disabled=value;for(const el of form.querySelectorAll<HTMLInputElement|HTMLSelectElement>('input,select'))el.disabled=value;}
function render(){
 publishSession();
 $('testnet-wallet').textContent=address??'Aucun wallet connecté';
 $('testnet-balance').textContent=account?number(account.marginSummary.accountValue)+' USDC / '+networkLabel:'—';
 $('testnet-available').textContent=account?number(account.withdrawable)+' USDC retirables':'Solde lu directement sur Hyperliquid';
 const position=account?.assetPositions.find(x=>x.position.coin==='ETH')?.position;
 $('testnet-position').textContent=position?number(position.szi)+' ETH · entrée '+number(position.entryPx)+' · P&L '+number(position.unrealizedPnl)+' USDC':account?'Aucune position ETH':'Compte non consulté';
 const root=$('testnet-orders');root.replaceChildren();
 for(const order of orders.filter(x=>x.coin==='ETH')){const row=document.createElement('div');row.className='exchange-order-row';const text=document.createElement('span');text.textContent='#'+order.oid+' · '+(order.isTrigger?'Déclencheur':'Limite')+' · '+order.side+' '+order.sz+' ETH · '+(order.triggerPx||order.limitPx);row.append(text);const button=document.createElement('button');button.className='button small';button.type='button';button.textContent='Annuler';button.disabled=busy;button.addEventListener('click',()=>run(async()=>{guard();await verifySigner();const cancelled=exchangeStatus(await exchange!.cancel({cancels:[{a:meta!.asset,o:order.oid}]}));if(cancelled.errors.length)throw Error(cancelled.errors.join(' · '));status('Annulation confirmée par Hyperliquid pour #'+order.oid);await read();}));row.append(button);root.append(row);}
 if(!root.children.length)root.textContent=account?'Aucun ordre ETH ouvert sur le compte Hyperliquid.':'Connecte le wallet pour lire les ordres Hyperliquid.';
 const history=$('testnet-fills');history.replaceChildren();for(const fill of fills.filter(x=>x.coin==='ETH').slice(0,8)){const row=document.createElement('p');row.textContent=new Date(fill.time).toLocaleString('fr-FR')+' · #'+fill.oid+' · '+fill.dir+' · '+fill.sz+' ETH à '+fill.px+' · frais '+fill.fee+' '+fill.feeToken;history.append(row);}
 if(!history.children.length)history.textContent=account?'Aucune exécution ETH reçue.':'Compte non consulté.';
 $('testnet-last-read').textContent=readAt?'Compte lu à '+new Date(readAt).toLocaleTimeString('fr-FR'):'Compte non consulté';
 for(const id of ['testnet-preview','testnet-daily','testnet-refresh','testnet-reconcile','testnet-disconnect'])($ (id) as HTMLButtonElement).disabled=busy||!exchange||!account;
 ($('testnet-close') as HTMLButtonElement).disabled=busy||!exchange||!position;
 (form.querySelector('button[type=submit]') as HTMLButtonElement).disabled=busy||!exchange||!account;
}
async function read(){
 guard();if(reading)return reading;
 const expected=address,version=revision,now=Date.now(),startTime=Math.floor(now/86400000)*86400000;
 reading=(async()=>{
  const [state,open,executions,metadata,today]=await Promise.all([info.clearinghouseState({user:expected!}),info.frontendOpenOrders({user:expected!}),info.userFills({user:expected!}),info.meta(),info.userFillsByTime({user:expected!,startTime,aggregateByTime:true})]);
  if(address!==expected||version!==revision)throw Error('Compte changé pendant la lecture. Reconnecte le wallet.');
  const asset=metadata.universe.findIndex(x=>x.name==='ETH');if(asset<0)throw Error('ETH absent du réseau.');
  meta={asset,...metadata.universe[asset]};account=state;orders=open;fills=executions;dayFills=today;readAt=Date.now();render();
 })();try{await reading;}finally{reading=null;}
}
async function verifySigner(){guard();const accounts=await provider()!.request({method:'eth_accounts'});if(accounts[0]?.toLowerCase()!==address!.toLowerCase())throw Error('Le compte actif du wallet a changé. Reconnecte-le.');}
async function run(action:()=>Promise<void>){if(busy)return;setBusy(true);try{if(!navigator.locks)throw Error('Verrouillage entre onglets indisponible : utilise un navigateur compatible.');await navigator.locks.request('omega-'+network+'-sign-'+(address?.toLowerCase()??'connect'),action);}catch(error){status(walletError(error),true);}finally{setBusy(false);render();}}
function clearSession(forget:boolean){
 if(forget)forgetWallet();revision++;consent.checked=false;exchange=null;address=null;account=null;orders=[];fills=[];dayFills=[];readAt=0;meta=null;
}
function disconnect(){clearSession(true);activeProvider?.removeListener?.('accountsChanged',accountsChanged);activeProvider=undefined;status('Compte oublié sur ce navigateur. Les autorisations des agents et les ordres Hyperliquid ne sont pas révoqués.');render();}
function accountsChanged(accounts:unknown){
 const selected=Array.isArray(accounts)&&typeof accounts[0]==='string'?accounts[0].toLowerCase():undefined;
 if(selected&&selected===address)return;
 const expected=rememberedWallet();
 if(selected&&expected&&selected===expected){if(!busy)void restoreWallet();return;}
 if(!selected){clearSession(false);status('MetaMask verrouillé ou accès suspendu. Le compte et les agents restent mémorisés. Déverrouille MetaMask pour reprendre.');render();return;}
 clearSession(true);status('Le compte actif de MetaMask a changé. Connecte le compte souhaité.',true);render();
}
async function attachWallet(p:NonNullable<ReturnType<typeof walletProvider>>,rawAddress:string,version:number){
 if(version!==revision)throw Error('Session wallet modifiée pendant la connexion.');
 if(!/^0x[0-9a-fA-F]{40}$/.test(rawAddress??'')||/^0x0{40}$/.test(rawAddress))throw Error('Aucun compte autorisé.');
 activeProvider?.removeListener?.('accountsChanged',accountsChanged);activeProvider=p;address=rawAddress.toLowerCase() as Address;account=null;readAt=0;orders=[];fills=[];
 const wallet=createWalletClient({account:address,transport:custom(p)});
 exchange=new ExchangeClient({wallet,transport,defaultExpiresAfter:()=>Date.now()+60000});
 p.on?.('accountsChanged',accountsChanged);
 // Hyperliquid's network is selected by its signed transport, not the wallet EVM chain.
 rememberWallet(address);
 await read();if(version!==revision)throw Error('Session wallet modifiée.');await window.BrowserAtelier.setAddress(address,false);
 if(version!==revision||!address)throw Error('Session wallet modifiée.');rememberWallet(address);
 status(pending()?'Un envoi précédent doit être vérifié avant une nouvelle entrée.':'Compte mémorisé sur ce navigateur. Les autorisations du bot restent distinctes pour Testnet et Mainnet.');
}
export async function connectWallet(){return run(async()=>{
 const version=++revision;
 status('Ouvre MetaMask et autorise l’accès à ton adresse. Aucune signature de trading.');
 if(window.BrowserAtelier.environment?.id!==network)throw Error('Réseau changé. Recharge la page.');
 const p=provider();if(!p)throw Error('Aucun wallet Ethereum détecté. Ouvre OMEGA dans un navigateur avec MetaMask ou Rabby pour signer sur '+networkLabel+'.');
 const existing=await p.request({method:'eth_accounts'});
 const accounts=existing.length?existing:await p.request({method:'eth_requestAccounts'});
 await attachWallet(p,accounts[0],version);
});}
export async function restoreWallet(){
 const expected=rememberedWallet();if(!expected||address)return;
 return run(async()=>{
  const version=++revision,p=provider();if(!p){status('Installe ou ouvre MetaMask, puis reconnecte ton compte mémorisé.');return;}
  const accounts=await p.request({method:'eth_accounts'});
  if(!accounts.length){activeProvider?.removeListener?.('accountsChanged',accountsChanged);activeProvider=p;p.on?.('accountsChanged',accountsChanged);status('Déverrouille MetaMask pour reprendre ton compte mémorisé. Aucune nouvelle autorisation du bot.');return;}
  if(accounts[0].toLowerCase()!==expected){forgetWallet();throw Error('Le compte actif de MetaMask a changé. Connecte le compte souhaité.');}
  await attachWallet(p,accounts[0],version);
 });
}
window.addEventListener('focus',()=>{if(!busy&&!address&&rememberedWallet())void restoreWallet();});
export const disconnectWallet=disconnect;
export const refreshWallet=()=>run(async()=>{await read();status('Compte '+networkLabel+' actualisé.');});
$('testnet-connect').addEventListener('click',()=>void connectWallet());
$('testnet-disconnect').addEventListener('click',disconnect);
$('testnet-refresh').addEventListener('click',()=>run(async()=>{await read();status('Compte '+networkLabel+' actualisé.');}));
// Disabled fields are intentionally locked during signing; FormData omits them.
function values(){return Object.fromEntries(Array.from(form.querySelectorAll<HTMLInputElement|HTMLSelectElement>('[name]'),el=>[el.name,el.value])) as Record<string,string>;}
function cloid(){return ('0x'+Array.from(crypto.getRandomValues(new Uint8Array(16)),x=>x.toString(16).padStart(2,'0')).join('')) as `0x${string}`;}
async function build(){guard();if(pending())throw Error('Un envoi reste à vérifier. Utilise « Vérifier le dernier envoi ».');await read();if(!account||!meta||Date.now()-readAt>10000)throw Error('Compte non actualisé.');if(account.assetPositions.some(x=>x.position.coin==='ETH'&&Number(x.position.szi)!==0)||orders.some(x=>x.coin==='ETH'))throw Error('Une position ou un ordre ETH existe déjà. Gère-le avant une nouvelle entrée.');const daily=exchangeDay(dayFills,Date.now());const blocked=sessionBlock({day:new Date().toISOString().slice(0,10),dailyPnl:daily.pnl,entriesToday:daily.entries,lastEntryDay:new Date().toISOString().slice(0,10),...daily}, {...last?.limits,max_entries_per_day:4},Date.now()/1000);if(blocked)throw Error(blocked);const book=await info.l2Book({coin:'ETH'});if(!book)throw Error('Carnet ETH indisponible.');const v=values();return exchangePlan({network,expectedNetwork:network,...meta,side:v.side==='short'?'short':'long',quantity:Number(v.quantity),leverage:Number(v.leverage),stop:Number(v.stop),target:Number(v.target),bid:Number(book.levels[0][0]?.px),ask:Number(book.levels[1][0]?.px),bookTime:book.time,now:Date.now(),equity:Number(account.marginSummary.accountValue),available:Number(account.withdrawable),cloid:cloid()});}
$('testnet-preview').addEventListener('click',()=>run(async()=>{const p=await build();$('testnet-plan').textContent='Plan indicatif : '+p.quantity+' ETH · prix IOC maximal/minimal '+p.entry+' · marge '+number(p.margin)+' USDC · perte prévue '+number(p.loss)+' USDC · stop '+p.stop+' · cible '+p.target+'. Recalculé à la signature.';status('Plan prêt à examiner. Aucun ordre envoyé.');}));
form.addEventListener('submit',event=>{event.preventDefault();run(async()=>{
 authorize();const expected=address,version=revision;await build();await verifySigner();
 status('Signature 1/2 : levier isolé sur Hyperliquid '+networkLabel+'.');
 await exchange!.updateLeverage({asset:meta!.asset,isCross:false,leverage:Number(values().leverage)});
 if(address!==expected||revision!==version)throw Error('Compte changé : entrée interrompue.');
 // Re-read price, margin and account after the first signature; never reuse a stale plan.
 const fresh=await build();await verifySigner();if(address!==expected||revision!==version)throw Error('Session modifiée : entrée interrompue.');authorize();
 consent.checked=false;const id=fresh.cloid,storageKey=pendingKey();localStorage.setItem(storageKey,JSON.stringify({cloid:id,at:Date.now()}));
 status('Signature 2/2 : entrée IOC et stop / objectif sur Hyperliquid '+networkLabel+'.');
 try{const response=await exchange!.order({orders:fresh.orders,grouping:fresh.grouping});const result=exchangeStatus(response);
  if(result.protected)localStorage.removeItem(storageKey);
  localStorage.setItem('omega-'+network+'-last-receipt-'+expected,JSON.stringify({at:Date.now(),cloid:id,response}));
  status(result.protected?'Réponse '+networkLabel+' reçue pour l’entrée et les deux protections. Vérifie les exécutions et les ordres ci-dessous.':'Attention : réponse partielle, vérifie immédiatement la position et les protections. '+result.errors.join(' · '));
 }catch(error){status('Envoi non confirmé ou partiellement refusé. Ne renvoie pas l’ordre : vérifie le dernier envoi et les protections. '+(error instanceof Error?error.message:String(error)));}
 await read();
});});
$('testnet-reconcile').addEventListener('click',()=>run(async()=>{guard();await read();const p=pending();if(!p){status('Aucun envoi en attente de vérification.');return;}const result=await info.orderStatus({user:address!,oid:p.cloid});if(result.status==='order'){localStorage.removeItem(pendingKey());status('Ordre retrouvé sur '+networkLabel+' : '+result.order.status+'. Vérifie les protections ci-dessous.');}else if(Date.now()-p.at>90000&&!orders.some(x=>x.coin==='ETH')&&!account!.assetPositions.some(x=>x.position.coin==='ETH')){localStorage.removeItem(pendingKey());status('Ordre introuvable après expiration, aucune position ni ordre ETH : envoi débloqué.');}else status('Statut non résolu : patiente jusqu’à expiration et vérifie à nouveau. Aucune relance automatique.');}));
$('testnet-close').addEventListener('click',()=>run(async()=>{await read();await verifySigner();const p=account!.assetPositions.find(x=>x.position.coin==='ETH')?.position;if(!p||!Number(p.szi))throw Error('Aucune position ETH à clôturer.');const book=await info.l2Book({coin:'ETH'});if(!book||Date.now()-book.time>5000)throw Error('Carnet trop ancien.');const buy=Number(p.szi)<0;const result=await exchange!.order({orders:[{a:meta!.asset,b:buy,p:formatPrice(Number(book.levels[buy?1:0][0].px)*(buy?1.003:.997),meta!.szDecimals),s:formatSize(Math.abs(Number(p.szi)),meta!.szDecimals),r:true,t:{limit:{tif:'Ioc'}}}],grouping:'na'});const checked=exchangeStatus(result);status(checked.errors.length?checked.errors.join(' · '):'Clôture reduce-only soumise. Vérifie la quantité restante et les ordres de protection.');await read();}));
$('testnet-daily').addEventListener('click',()=>run(async()=>{consent.checked=false;await read();if(!last||!account)throw Error('Attends les horizons de marché.');if(account.assetPositions.some(x=>x.position.coin==='ETH'&&Number(x.position.szi)!==0)||orders.some(x=>x.coin==='ETH'))throw Error('Gère la position et les ordres ETH existants.');const daily=exchangeDay(dayFills,Date.now()),eq=Number(account.marginSummary.accountValue);const s={...last,paper:{...last.paper,cash:eq,equity:eq,position:null,entriesToday:daily.entries,lastEntryDay:new Date().toISOString().slice(0,10),dailyPnl:daily.pnl,lastEntryAt:daily.lastEntryAt,lastExitAt:daily.lastExitAt,lossStreak:daily.lossStreak},limits:{...last.limits,max_margin:eq*.5}};const e=window.PaperPilot.evaluate(s);if(!e.candidate||e.status!=='eligible')throw Error('Aucun candidat Daily éligible : '+e.reasons.join(' '));const c=e.candidate;for(const [name,value] of Object.entries({side:c.side,quantity:c.quantity,leverage:c.leverage,stop:c.stop,target:c.target}))(form.elements.namedItem(name) as HTMLInputElement).value=String(value);status('Candidat Daily copié dans le formulaire. Examine le plan, puis signe pour envoyer à Hyperliquid.');}));
window.addEventListener('axiom-state',((event:CustomEvent<Snapshot>)=>{last=event.detail;if(address&&!document.hidden&&!busy&&Date.now()-readAt>15000)read().catch(e=>status('Actualisation compte Hyperliquid : '+e.message,true));}) as EventListener);
render();
window.ExchangeSnapshot=(s:Snapshot)=>{
 if(!account)return null;
 let daily:ReturnType<typeof exchangeDay>;
 try{daily=exchangeDay(dayFills,Date.now());}catch(error){status(error instanceof Error?error.message:String(error));return {...s,market:{...s.market,fresh:false}};}
 const eq=Number(account.marginSummary.accountValue);
 const p=account.assetPositions.find(x=>x.position.coin==='ETH'&&Number(x.position.szi)!==0)?.position;
 return {...s,market:{...s.market,fresh:s.market.fresh&&Date.now()-readAt<=30000},paper:{...s.paper,initial:eq,cash:eq,equity:eq,unrealized:0,history:[],position:p?{side:Number(p.szi)>0?'long':'short',entry:Number(p.entryPx),quantity:Math.abs(Number(p.szi)),stop:0,target:0,margin:Number(p.marginUsed),leverage:Number(p.leverage.value),openedAt:0,entryFee:0}:null,entriesToday:Math.max(daily.entries,orders.some(x=>x.coin==='ETH')||pending()?1:0),lastEntryDay:new Date().toISOString().slice(0,10),dailyPnl:daily.pnl,lastEntryAt:daily.lastEntryAt,lastExitAt:daily.lastExitAt,lossStreak:daily.lossStreak},limits:{...s.limits,max_margin:eq*.5}};
};
window.TestnetGate=async()=>{if(busy||reading)throw Error('Une lecture ou signature wallet est en cours.');if(!address)return;await read();if(pending()||orders.some(x=>x.coin==='ETH')||account?.assetPositions.some(x=>x.position.coin==='ETH'))throw Error('Gère la position, les ordres ETH et les envois en attente du wallet Hyperliquid avant de changer de réseau.');};
