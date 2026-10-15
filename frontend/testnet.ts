import {ExchangeClient,HttpTransport,InfoClient} from '@nktkas/hyperliquid';
import {createWalletClient,custom,type EIP1193Provider,type Address} from 'viem';
import {formatPrice,formatSize} from '@nktkas/hyperliquid/utils';
import {testnetPlan,exchangeStatus} from './core/testnet-plan';
import type {Snapshot} from './core/types';
const $=(id:string)=>document.getElementById(id)!;
const panel=$('testnet-exchange');
if(window.BrowserAtelier.environment?.id==='testnet')panel.hidden=false;
const transport=new HttpTransport({isTestnet:true,apiUrl:'https://api.hyperliquid-testnet.xyz',timeout:12000});
const info=new InfoClient({transport});
let exchange:ExchangeClient|null=null,address:Address|null=null,busy=false,last:Snapshot|null=null,readAt=0,reading=false;
let account:Awaited<ReturnType<typeof info.clearinghouseState>>|null=null;
let orders:Awaited<ReturnType<typeof info.frontendOpenOrders>>=[];
let fills:Awaited<ReturnType<typeof info.userFills>>=[];
let meta:{asset:number;szDecimals:number;maxLeverage:number}|null=null;
const form=$('testnet-order-form') as HTMLFormElement;
const status=(message:string)=>{$('testnet-action-status').textContent=message;};
const number=(n:unknown)=>Number(n).toLocaleString('fr-FR',{maximumFractionDigits:4});
const provider=()=> (window as Window & {ethereum?:EIP1193Provider & {on?:(event:string,fn:()=>void)=>void}}).ethereum;
function guard(){if(window.BrowserAtelier.environment?.id!=='testnet'||!transport.isTestnet)throw Error('Ordres bloqués hors testnet.');if(!address||!exchange)throw Error('Connecte le wallet testnet.');}
const pendingKey=()=> 'omega-testnet-exchange-pending-'+address?.toLowerCase();
function pending():{cloid:`0x${string}`;at:number}|null{const raw=localStorage.getItem(pendingKey());if(!raw)return null;try{return JSON.parse(raw)}catch{throw Error('Journal d’envoi illisible : vérifie le compte testnet avant de poursuivre.');}}
function setBusy(value:boolean){busy=value;(document.getElementById('network-select') as HTMLSelectElement).disabled=value;for(const b of panel.querySelectorAll<HTMLButtonElement>('button'))b.disabled=value;for(const el of form.querySelectorAll<HTMLInputElement|HTMLSelectElement>('input,select'))el.disabled=value;}
function render(){
 $('testnet-wallet').textContent=address??'Aucun wallet connecté';
 $('testnet-balance').textContent=account?number(account.marginSummary.accountValue)+' USDC testnet':'—';
 $('testnet-available').textContent=account?number(account.withdrawable)+' USDC disponibles':'Solde lu directement sur Hyperliquid';
 const position=account?.assetPositions.find(x=>x.position.coin==='ETH')?.position;
 $('testnet-position').textContent=position?number(position.szi)+' ETH · entrée '+number(position.entryPx)+' · P&L '+number(position.unrealizedPnl)+' USDC':account?'Aucune position ETH':'Compte non consulté';
 const root=$('testnet-orders');root.replaceChildren();
 for(const order of orders.filter(x=>x.coin==='ETH')){const row=document.createElement('div');row.className='exchange-order-row';const text=document.createElement('span');text.textContent='#'+order.oid+' · '+(order.isTrigger?'Déclencheur':'Limite')+' · '+order.side+' '+order.sz+' ETH · '+(order.triggerPx||order.limitPx);row.append(text);const button=document.createElement('button');button.className='button small';button.type='button';button.textContent='Annuler';button.disabled=busy;button.addEventListener('click',()=>run(async()=>{guard();await verifySigner();await exchange!.cancel({cancels:[{a:meta!.asset,o:order.oid}]});status('Annulation confirmée par Hyperliquid pour #'+order.oid);await read();}));row.append(button);root.append(row);}
 if(!root.children.length)root.textContent=account?'Aucun ordre ETH ouvert sur le compte testnet.':'Connecte le wallet pour lire les ordres testnet.';
 const history=$('testnet-fills');history.replaceChildren();for(const fill of fills.filter(x=>x.coin==='ETH').slice(0,8)){const row=document.createElement('p');row.textContent=new Date(fill.time).toLocaleString('fr-FR')+' · #'+fill.oid+' · '+fill.dir+' · '+fill.sz+' ETH à '+fill.px+' · frais '+fill.fee+' '+fill.feeToken;history.append(row);}
 if(!history.children.length)history.textContent=account?'Aucune exécution ETH reçue.':'Compte non consulté.';
 $('testnet-last-read').textContent=readAt?'Compte lu à '+new Date(readAt).toLocaleTimeString('fr-FR'):'Compte non consulté';
 for(const id of ['testnet-preview','testnet-daily','testnet-refresh','testnet-reconcile','testnet-disconnect'])($ (id) as HTMLButtonElement).disabled=busy||!exchange||!account;
 ($('testnet-close') as HTMLButtonElement).disabled=busy||!exchange||!position;
 (form.querySelector('button[type=submit]') as HTMLButtonElement).disabled=busy||!exchange||!account;
}
async function read(){guard();if(reading)return;reading=true;const expected=address;try{const [state,open,executions,metadata]=await Promise.all([info.clearinghouseState({user:address!}),info.frontendOpenOrders({user:address!}),info.userFills({user:address!}),info.meta()]);if(address!==expected)return;const asset=metadata.universe.findIndex(x=>x.name==='ETH');if(asset<0)throw Error('ETH absent du testnet.');meta={asset,...metadata.universe[asset]};account=state;orders=open;fills=executions;readAt=Date.now();render();}finally{reading=false;}}
async function verifySigner(){guard();const accounts=await provider()!.request({method:'eth_accounts'});if(!accounts.some(a=>a.toLowerCase()===address!.toLowerCase()))throw Error('Le compte actif du wallet a changé. Reconnecte-le.');}
async function run(action:()=>Promise<void>){if(busy)return;setBusy(true);try{if(!navigator.locks)throw Error('Verrouillage entre onglets indisponible : utilise un navigateur compatible.');await navigator.locks.request('omega-testnet-sign-'+(address?.toLowerCase()??'connect'),action);}catch(error){status(error instanceof Error?error.message:String(error));}finally{setBusy(false);render();}}
function disconnect(){exchange=null;address=null;account=null;orders=[];fills=[];readAt=0;meta=null;status('Session de signature fermée. Les ordres déjà placés restent sur Hyperliquid.');render();}
$('testnet-connect').addEventListener('click',()=>run(async()=>{
 if(window.BrowserAtelier.environment?.id!=='testnet')throw Error('Sélectionne le testnet.');
 const p=provider();if(!p)throw Error('Aucun wallet Ethereum détecté. Ouvre OMEGA dans un navigateur avec MetaMask ou Rabby pour signer sur le testnet.');
 const accounts=await p.request({method:'eth_requestAccounts'});if(!accounts[0])throw Error('Aucun compte autorisé.');address=accounts[0];
 const wallet=createWalletClient({account:address,transport:custom(p)});
 exchange=new ExchangeClient({wallet,transport,defaultExpiresAfter:()=>Date.now()+60000});
 p.on?.('accountsChanged',disconnect);p.on?.('chainChanged',disconnect);
 await read();await window.BrowserAtelier.setAddress(address,false);
 status(pending()?'Un envoi précédent doit être vérifié avant une nouvelle entrée.':'Wallet connecté. Les ordres testnet nécessitent ta signature ; aucune clé privée n’est demandée.');
}));
$('testnet-disconnect').addEventListener('click',disconnect);
$('testnet-refresh').addEventListener('click',()=>run(async()=>{await read();status('Compte testnet actualisé.');}));
function values(){return Object.fromEntries(new FormData(form)) as Record<string,string>;}
function cloid(){return ('0x'+Array.from(crypto.getRandomValues(new Uint8Array(16)),x=>x.toString(16).padStart(2,'0')).join('')) as `0x${string}`;}
async function build(){guard();if(pending())throw Error('Un envoi reste à vérifier. Utilise « Vérifier le dernier envoi ».');await read();if(!account||!meta||Date.now()-readAt>10000)throw Error('Compte non actualisé.');if(account.assetPositions.some(x=>x.position.coin==='ETH'&&Number(x.position.szi)!==0)||orders.some(x=>x.coin==='ETH'))throw Error('Une position ou un ordre ETH existe déjà. Gère-le avant une nouvelle entrée.');const book=await info.l2Book({coin:'ETH'});if(!book)throw Error('Carnet ETH indisponible.');const v=values();return testnetPlan({network:'testnet',...meta,side:v.side==='short'?'short':'long',quantity:Number(v.quantity),leverage:Number(v.leverage),stop:Number(v.stop),target:Number(v.target),bid:Number(book.levels[0][0]?.px),ask:Number(book.levels[1][0]?.px),bookTime:book.time,now:Date.now(),equity:Number(account.marginSummary.accountValue),available:Number(account.withdrawable),cloid:cloid()});}
$('testnet-preview').addEventListener('click',()=>run(async()=>{const p=await build();$('testnet-plan').textContent='Plan indicatif : '+p.quantity+' ETH · prix IOC maximal/minimal '+p.entry+' · marge '+number(p.margin)+' USDC · perte prévue '+number(p.loss)+' USDC · stop '+p.stop+' · cible '+p.target+'. Recalculé à la signature.';status('Plan prêt à examiner. Aucun ordre envoyé.');}));
form.addEventListener('submit',event=>{event.preventDefault();run(async()=>{
 const expected=address;await build();await verifySigner();
 status('Signature 1/2 : régler le levier isolé sur Hyperliquid testnet.');
 await exchange!.updateLeverage({asset:meta!.asset,isCross:false,leverage:Number(values().leverage)});
 if(address!==expected)throw Error('Compte changé : entrée interrompue.');
 // Re-read price, margin and account after the first signature; never reuse a stale plan.
 const fresh=await build();await verifySigner();
 const id=fresh.cloid;localStorage.setItem(pendingKey(),JSON.stringify({cloid:id,at:Date.now()}));
 status('Signature 2/2 : entrée IOC et ordres stop / objectif sur Hyperliquid TESTNET.');
 try{const response=await exchange!.order({orders:fresh.orders,grouping:fresh.grouping});const result=exchangeStatus(response);
  localStorage.removeItem(pendingKey());
  localStorage.setItem('omega-testnet-last-receipt-'+address,JSON.stringify({at:Date.now(),cloid:id,response}));
  status(result.protected?'Réponse testnet reçue pour l’entrée et les deux protections. Vérifie les exécutions et les ordres ci-dessous.':'Attention : réponse partielle, vérifie immédiatement la position et les protections. '+result.errors.join(' · '));
 }catch(error){status('Envoi non confirmé ou partiellement refusé. Ne renvoie pas l’ordre : vérifie le dernier envoi et les protections. '+(error instanceof Error?error.message:String(error)));}
 await read();
});});
$('testnet-reconcile').addEventListener('click',()=>run(async()=>{guard();await read();const p=pending();if(!p){status('Aucun envoi en attente de vérification.');return;}const result=await info.orderStatus({user:address!,oid:p.cloid});if(result.status==='order'){localStorage.removeItem(pendingKey());status('Ordre retrouvé sur le testnet : '+result.order.status+'. Vérifie les protections ci-dessous.');}else if(Date.now()-p.at>90000&&!orders.some(x=>x.coin==='ETH')&&!account!.assetPositions.some(x=>x.position.coin==='ETH')){localStorage.removeItem(pendingKey());status('Ordre introuvable après expiration, aucune position ni ordre ETH : envoi débloqué.');}else status('Statut non résolu : patiente jusqu’à expiration et vérifie à nouveau. Aucune relance automatique.');}));
$('testnet-close').addEventListener('click',()=>run(async()=>{await read();await verifySigner();const p=account!.assetPositions.find(x=>x.position.coin==='ETH')?.position;if(!p||!Number(p.szi))throw Error('Aucune position ETH testnet à clôturer.');const book=await info.l2Book({coin:'ETH'});if(!book||Date.now()-book.time>5000)throw Error('Carnet trop ancien.');const buy=Number(p.szi)<0;const result=await exchange!.order({orders:[{a:meta!.asset,b:buy,p:formatPrice(Number(book.levels[buy?1:0][0].px)*(buy?1.003:.997),meta!.szDecimals),s:formatSize(Math.abs(Number(p.szi)),meta!.szDecimals),r:true,t:{limit:{tif:'Ioc'}}}],grouping:'na'});const checked=exchangeStatus(result);status(checked.errors.length?checked.errors.join(' · '):'Clôture reduce-only soumise. Vérifie la quantité restante et les ordres de protection.');await read();}));
$('testnet-daily').addEventListener('click',()=>run(async()=>{await read();if(!last||!account)throw Error('Attends les horizons de marché.');const eq=Number(account.marginSummary.accountValue);const s={...last,paper:{...last.paper,cash:eq,equity:eq,position:null,entriesToday:0,lastEntryDay:'',dailyPnl:0},limits:{...last.limits,max_margin:eq*.5}};const e=window.PaperPilot.evaluate(s);if(!e.candidate||e.status!=='eligible')throw Error('Aucun candidat Daily éligible : '+e.reasons.join(' '));const c=e.candidate;for(const [name,value] of Object.entries({side:c.side,quantity:c.quantity,leverage:c.leverage,stop:c.stop,target:c.target}))(form.elements.namedItem(name) as HTMLInputElement).value=String(value);status('Candidat Daily copié dans le formulaire. Examine le plan, puis signe pour envoyer au testnet.');}));
window.addEventListener('axiom-state',((event:CustomEvent<Snapshot>)=>{last=event.detail;if(address&&!document.hidden&&!busy&&Date.now()-readAt>15000)read().catch(e=>status('Actualisation compte testnet : '+e.message));}) as EventListener);
render();
window.TestnetGate=async()=>{if(!address)return;await read();if(pending()||orders.some(x=>x.coin==='ETH')||account?.assetPositions.some(x=>x.position.coin==='ETH'))throw Error('Gère la position, les ordres ETH et les envois en attente du wallet testnet avant de changer de réseau.');};
