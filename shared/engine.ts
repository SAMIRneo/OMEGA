import {reusablePreparation} from './authorization';
import {sessionBlock} from '../frontend/core/session.js';
import {evaluateDaily} from '../frontend/core/daily';
import {features} from '../frontend/core/indicators.js';
import {formatPrice,formatSize} from '@nktkas/hyperliquid/utils';
import {reservedAttempts,canEvaluate,validBook,validCandles,exchangeDay,exchangePlan,exchangeStatus,bracketConfirmed,assertNoExposure,autoPlan,validateSettings,type Network} from './policy';
import type {Snapshot,RustRisk,Indicator} from '../frontend/core/types';
export interface Ledger {agentApproval?:{preparedAt:number;confirmed:boolean};storageVersion?:1;revision?:number;savedAt?:number;settings?:{profile:string;leverage:number;dailyTarget:number};network?:Network;owner:`0x${string}`|null;key:`0x${string}`;nonce:number;attemptDay:string;attemptCount?:number;lastAttemptAt?:number;lastExitAt?:number;pending:{cloid:`0x${string}`;at:number}|null;owned:boolean;protectionIds?:number[];protectionCloids?:string[];ownedSide?:'long'|'short';ownedQuantity?:number;events:{at:number;message:string}[]}
export class LiveEngine {
 private candleCache=new Map<string,{at:number;bars:any[]}>();
 active=false;busy=false;generation=0;armedAt=0;lastBar=0;heartbeat=0;approved=false;approvedUntil:number|null=null;reason='À l’arrêt.';failures=0;retryAt=0;equity:number|null=null;
 settings=validateSettings({profile:'balanced',leverage:15});
 constructor(public network:Network,public ledger:Ledger,public agent:`0x${string}`,private info:any,private exchange:any,private risk:RustRisk,private save:()=>void|Promise<void>){if(ledger.settings)this.settings=validateSettings(ledger.settings);}
 private async persist(){try{await this.save();}catch(error){this.active=false;this.reason='Sauvegarde du service impossible : entrées arrêtées. Vérifie le disque et conserve le dossier d’état.';throw error;}}
 async log(message:string){this.reason=message;this.ledger.events.push({at:Date.now(),message});this.ledger.events=this.ledger.events.slice(-100);try{await this.persist();}catch{/* The in-memory failure reason remains visible; never turn logging into an unhandled tick failure. */}}
 async stop(){this.generation++;this.active=false;await this.log('Entrées arrêtées. Les protections exchange et la surveillance de la position du bot restent actives.');}
 async verifyApproval(){this.approved=false;this.approvedUntil=null;if(!this.ledger.owner)return false;const agents=await this.info.extraAgents({user:this.ledger.owner});const agent=agents.find((a:any)=>a.address.toLowerCase()===this.agent.toLowerCase()&&(a.validUntil===null||Number.isFinite(a.validUntil)&&a.validUntil>Date.now()+60000));this.approved=!!agent;this.approvedUntil=agent?.validUntil??null;if(this.approved&&this.ledger.agentApproval&&!this.ledger.agentApproval.confirmed){this.ledger.agentApproval.confirmed=true;await this.persist();}return this.approved;}
 // Preparation is idempotent after a refusal/reload; used/revoked identities rotate.
 async prepareAgent(owner:string){
  if(this.busy||this.active||this.ledger.owned||this.ledger.pending)throw Error('Arrête le bot et résous sa position ou son envoi avant de configurer le compte.');
  if(!/^0x[0-9a-fA-F]{40}$/.test(owner)||/^0x0{40}$/.test(owner))throw Error('Adresse de compte invalide.');
  const generation=this.generation;this.busy=true;
  try{
   if(reusablePreparation(this.ledger,owner))return false;
   if(this.ledger.owner?.toLowerCase()===owner.toLowerCase()){
    const approved=await this.verifyApproval();
    if(generation!==this.generation)throw Error('Préparation interrompue.');
    if(approved)return false;
   }
   this.ledger.owner=owner.toLowerCase() as `0x${string}`;this.approved=false;this.approvedUntil=null;await this.persist();return true;
  }finally{this.busy=false;}
 }
 async configure(owner:`0x${string}`){if(this.busy||this.active||this.ledger.owned||this.ledger.pending)throw Error('Arrête le bot et résous sa position ou son envoi avant de changer de compte.');if(!/^0x[0-9a-fA-F]{40}$/.test(owner)||/^0x0{40}$/.test(owner))throw Error('Adresse de compte invalide.');this.ledger.owner=owner.toLowerCase() as `0x${string}`;this.approved=false;this.approvedUntil=null;await this.persist();}
 async arm(settings:unknown,consent:unknown){
  if(this.busy||this.active)throw Error('Moteur occupé.');if(this.ledger.pending||this.ledger.owned)throw Error('Position ou envoi du bot à vérifier.');
  if(this.network==='mainnet'&&consent!=='MAINNET')throw Error('Autorisation MAINNET requise.');
  this.settings=validateSettings(settings);this.busy=true;const generation=this.generation;
  try{if(!await this.verifyApproval())throw Error('Agent API non autorisé ou expiré sur ce réseau.');const s=await this.snapshot();assertNoExposure(s.account,s.orders);if(s.equity<=0||s.available<=0)throw Error('Compte Hyperliquid non financé.');const session=this.sessionState(s);const blocked=sessionBlock(session.paper,session.limits,Date.now()/1000);if(blocked)throw Error(blocked);if(generation!==this.generation)throw Error('Armement interrompu.');this.armedAt=Date.now();this.lastBar=s.snapshot.indicators['15m']!.lastClosedTime!;this.active=true;this.ledger.settings={...this.settings};await this.log('Pilote automatique '+this.network.toUpperCase()+' armé. Attente d’une nouvelle clôture 15 min.');}
  finally{this.busy=false;}
 }
 sessionState(s:{snapshot:Snapshot;today:any[]}){
  const daily=exchangeDay(s.today,Date.now()),day=new Date().toISOString().slice(0,10);
  return {...s.snapshot,limits:{...s.snapshot.limits,max_entries_per_day:4,daily_profit_target:this.settings.dailyTarget,trade_risk:100},paper:{...s.snapshot.paper,day,dailyPnl:daily.pnl,entriesToday:Math.max(daily.entries,reservedAttempts(this.ledger,day)),lastEntryDay:day,lastEntryAt:Math.max(daily.lastEntryAt,this.ledger.lastAttemptAt??0),lastExitAt:Math.max(daily.lastExitAt,this.ledger.lastExitAt??0),lossStreak:daily.lossStreak}};
 }
 async candles(interval:string,duration:number,now:number){const cached=this.candleCache.get(interval);if(cached&&now-cached.at<60000&&Math.floor(cached.at/duration)===Math.floor(now/duration))return cached.bars;const bars=await this.info.candleSnapshot({coin:'ETH',interval,startTime:now-duration*350,endTime:now});validCandles(bars,duration,Date.now());this.candleCache.set(interval,{at:Date.now(),bars});return bars;}
 // Position supervision must not wait for candle history or daily fills.
 async snapshot(includeStrategy=true){
  const user=this.ledger.owner;if(!user)throw Error('Wallet non configuré.');
  const now=Date.now(),dayStart=Math.floor(now/86400000)*86400000;
  const [account,orders,today,metadata,book,...series]=await Promise.all([
   this.info.clearinghouseState({user}),this.info.frontendOpenOrders({user}),includeStrategy?this.info.userFillsByTime({user,startTime:dayStart,aggregateByTime:true}):Promise.resolve([]),this.info.meta(),this.info.l2Book({coin:'ETH'}),
   ...(includeStrategy?(['15m','1h','1d'] as const).map((interval,i)=>this.candles(interval,[900000,3600000,86400000][i],now)):[])
  ]);
  const time=Date.now(),valid=validBook(book,time),asset=metadata.universe.findIndex((x:any)=>x.name==='ETH');if(asset<0)throw Error('ETH absent des métadonnées.');
  const meta={asset,...metadata.universe[asset]},equity=Number(account.marginSummary.accountValue),available=Number(account.withdrawable);
  if(![equity,available].every(Number.isFinite)||includeStrategy&&(equity<0||available<0))throw Error('Solde Hyperliquid invalide.');
  const daily=exchangeDay(today,time),day=new Date(time).toISOString().slice(0,10),indicators:Snapshot['indicators']={},candleStatus:Snapshot['candleStatus']={},candlesByTimeframe:Snapshot['candlesByTimeframe']={};
  if(includeStrategy)(['15m','1h','1d'] as const).forEach((tf,i)=>{const candles=validCandles(series[i],[900000,3600000,86400000][i],time);candlesByTimeframe[tf]=candles;indicators[tf]=features(candles,time) as Indicator;candleStatus[tf]={fetchedAt:(this.candleCache.get(tf)?.at??time)/1000};});
  const p=account.assetPositions.find((x:any)=>x.position.coin==='ETH'&&+x.position.szi!==0)?.position;
  const snapshot:Snapshot={time:time/1000,runtime:'local',market:{fresh:true,mid:(+valid.levels[0][0].px + +valid.levels[1][0].px)/2,sourceAgeSeconds:(time-valid.time)/1000,book:valid},context:{maxLeverage:meta.maxLeverage,updatedAt:time/1000},limits:{strategy_profile:this.settings.profile,leverage:this.settings.leverage,max_leverage:15,max_margin:equity*.5,max_risk:500,daily_loss_limit:500,fee_bps:4.5,slippage_bps:2,allocation_fraction:.5,daily_mode:true,max_entries_per_day:4,daily_profit_target:this.settings.dailyTarget,trade_risk:100},paper:{initial:equity,cash:equity,equity,unrealized:0,position:p?{side:+p.szi>0?'long':'short',entry:+p.entryPx,quantity:Math.abs(+p.szi),stop:0,target:0,margin:+p.marginUsed,leverage:+p.leverage.value,openedAt:0,entryFee:0}:null,history:[],day,dailyPnl:daily.pnl,entriesToday:includeStrategy?Math.max(daily.entries,reservedAttempts(this.ledger,day)):0,lastEntryDay:day,lastEntryAt:Math.max(daily.lastEntryAt,this.ledger.lastAttemptAt??0),lastExitAt:Math.max(daily.lastExitAt,this.ledger.lastExitAt??0),lossStreak:daily.lossStreak},indicators,candleStatus,candlesByTimeframe};
  this.equity=equity;return {snapshot,account,orders,today,meta,book:valid,equity,available,position:p};
 }
 async tick(){
  if(this.busy||Date.now()<this.retryAt||(!this.active&&!this.ledger.owned))return;this.busy=true;const generation=this.generation;
  try{
   const s=await this.snapshot(!this.ledger.owned);this.heartbeat=Date.now();this.failures=0;
   if(this.ledger.owned){
    if(!s.position){await this.log('Position du bot clôturée sur Hyperliquid. Vérification des protections restantes.');
     const ownOrders=s.orders.filter((o:any)=>o.coin==='ETH'&&o.reduceOnly&&(this.ledger.protectionIds?.includes(o.oid)||this.ledger.protectionCloids?.includes(o.cloid)));if(ownOrders.length){const receipt=exchangeStatus(await this.exchange.cancel({cancels:ownOrders.map((o:any)=>({a:s.meta.asset,o:o.oid}))}));if(receipt.errors.length)throw Error(receipt.errors.join(' · '));await this.log('Annulation des protections restantes du bot confirmée.');}this.ledger.lastExitAt=Date.now()/1000;this.ledger.owned=false;await this.persist();return;}
    const date=new Date(),eod=date.getUTCHours()===23&&date.getUTCMinutes()>=55||this.ledger.attemptDay<date.toISOString().slice(0,10);
    if(this.ledger.ownedSide!==( +s.position.szi>0?'long':'short')||Math.abs(+s.position.szi)>(this.ledger.ownedQuantity??0)+1e-8){this.active=false;this.ledger.owned=false;await this.persist();await this.log('Position ETH modifiée hors du bot : gestion automatique suspendue. Vérifie le compte.');return;}
    const protections=s.orders.filter((o:any)=>o.coin==='ETH'&&o.reduceOnly&&o.isTrigger&&(this.ledger.protectionIds?.includes(o.oid)||this.ledger.protectionCloids?.includes(o.cloid))&&+o.sz>=Math.abs(+s.position.szi)-1e-8&&o.side===(+s.position.szi>0?'A':'B'));
    const price=+s.book.levels[+s.position.szi>0?0:1][0].px;
    const protectedPosition=protections.some((o:any)=>+s.position.szi>0?+o.triggerPx<price:+o.triggerPx>price)&&protections.some((o:any)=>+s.position.szi>0?+o.triggerPx>price:+o.triggerPx<price);
    if(eod||!protectedPosition){this.active=false;await this.closeOwned(s,eod?'Fin de journée UTC':'Protections absentes ou incomplètes');}return;
   }
   if(!this.active||this.ledger.pending)return;
   if(!await this.verifyApproval()){this.active=false;await this.log('Agent révoqué ou expiré : entrées arrêtées.');return;}
   const stamp=s.snapshot.indicators['15m']!.lastClosedTime!,now=Date.now();
   if(stamp<=this.lastBar)return;
   const previous=this.lastBar;this.lastBar=stamp;
   if(!canEvaluate(stamp,previous,this.armedAt,now)){await this.log('Clôture manquée ou antérieure à l’armement : aucun rattrapage.');return;}
   const session=this.sessionState(s),blocked=sessionBlock(session.paper,session.limits,now/1000);if(blocked){await this.log(blocked);return;}
   const decision=evaluateDaily(session,this.risk);if(decision.status!=='eligible'||!decision.candidate){await this.log(decision.reasons.join(' '));return;}
   assertNoExposure(s.account,s.orders);
   // Update leverage, then re-read all inputs and strategy before sending an entry.
   const selected=decision.candidate,initialPlan=autoPlan(this.network,s,selected);await this.exchange.updateLeverage({asset:s.meta.asset,isCross:false,leverage:initialPlan.leverage});
   const fresh=await this.snapshot();if(!this.active)return;
   if(fresh.snapshot.indicators['15m']!.lastClosedTime!==stamp||Date.now()-stamp>=60000)throw Error('Signal modifié ou ancien avant l’entrée.');
   assertNoExposure(fresh.account,fresh.orders);
   const final=evaluateDaily(this.sessionState(fresh),this.risk);if(final.status!=='eligible'||!final.candidate||final.candidate.side!==selected.side)throw Error('Candidat modifié après réglage du levier.');
   const c=final.candidate,plan=autoPlan(this.network,fresh,c,initialPlan.leverage),cloid=plan.cloid;
   if(plan.leverage!==initialPlan.leverage)throw Error('Levier modifié après validation finale.');
   // Write-ahead reservation persists across process crashes and uncertain responses.
   this.ledger.protectionCloids=plan.orders.slice(1).map(o=>o.c!);const day=new Date().toISOString().slice(0,10);this.ledger.attemptCount=reservedAttempts(this.ledger,day)+1;this.ledger.attemptDay=day;this.ledger.lastAttemptAt=Date.now()/1000;this.ledger.pending={cloid,at:Date.now()};await this.persist();
   if(!this.active||generation!==this.generation)return;
   try{
    const receipt=await this.exchange.order({orders:plan.orders,grouping:plan.grouping});
    const confirmed=exchangeStatus(receipt);if(typeof confirmed.entry==='object'&&confirmed.entry.filled&&+confirmed.entry.filled.totalSz>0){
    this.ledger.owned=true;this.ledger.ownedSide=c.side;this.ledger.ownedQuantity=Number(receipt.response.data.statuses[0].filled.totalSz);this.ledger.protectionIds=receipt.response.data.statuses.slice(1).flatMap((x:any)=>x.resting?[x.resting.oid]:[]);await this.persist();}
    if(!bracketConfirmed(receipt))throw Error('Entrée ou protections non confirmées. La position attribuée au bot reste surveillée.');
    this.ledger.pending=null;await this.persist();await this.log('Entrée '+c.side.toUpperCase()+' confirmée sur '+this.network.toUpperCase()+'. Surveillance des protections exchange.');
   }catch(error){this.active=false;await this.log('Envoi à réconcilier. Aucune répétition automatique : '+errorMessage(error));}
  }catch(error){this.failures++;this.retryAt=Date.now()+Math.min(120000,10000*2**Math.min(4,this.failures-1));await this.log('Entrées bloquées · '+errorMessage(error));}
  finally{this.busy=false;}
 }
 private async closeOwned(s:Awaited<ReturnType<LiveEngine['snapshot']>>,reason:string){
  if(!s.position||!this.ledger.owned)return;const buy=+s.position.szi<0;
  const result=await this.exchange.order({orders:[{a:s.meta.asset,b:buy,p:formatPrice(+s.book.levels[buy?1:0][0].px*(buy?1.003:.997),s.meta.szDecimals),s:formatSize(Math.abs(+s.position.szi),s.meta.szDecimals),r:true,t:{limit:{tif:'Ioc'}}}],grouping:'na'});
  await this.log(reason+' : demande de clôture reduce-only envoyée. Confirmation au prochain contrôle.');
  if(result.status!=='ok')throw Error('Clôture non confirmée.');
 }
 async reconcile(){
  if(this.busy||this.active)throw Error('Arrête les entrées avant la réconciliation.');this.busy=true;
  try{const s=await this.snapshot(false),pending=this.ledger.pending;if(!pending){await this.log('Aucun envoi en attente.');return;}
   const receipt=await this.info.orderStatus({user:this.ledger.owner,oid:pending.cloid});
   if(receipt.status==='order'){
    // Only adopt a position if a fill is attributable to our recorded order.
    const fills=await this.info.userFillsByTime({user:this.ledger.owner,startTime:pending.at-1000,aggregateByTime:true});
    const order=receipt.order.order,side=order.side==='B'?'long':order.side==='A'?'short':null;
    if(fills.length>=2000)throw Error('Historique incomplet : attribution de position impossible.');
    const ownFills=fills.filter((f:any)=>f.coin==='ETH'&&f.oid===order.oid&&f.dir===(side==='long'?'Open Long':'Open Short'));
    if(side&&ownFills.length){
     const filled=ownFills.reduce((total:number,f:any)=>{const quantity=Number(f.sz);if(!Number.isFinite(quantity)||quantity<=0)throw Error('Quantité exécutée invalide.');return total+quantity;},0);
     const size=s.position?Number(s.position.szi):0,ceiling=this.ledger.owned?Math.min(filled,this.ledger.ownedQuantity??0):filled;
     if(!Number.isFinite(size)||s.position&&((size>0?'long':'short')!==side||Math.abs(size)>ceiling+1e-8))throw Error('Position ETH modifiée hors du bot : attribution ambiguë. Vérifie le compte.');
     this.ledger.owned=!!s.position;this.ledger.ownedSide=side;this.ledger.ownedQuantity=Math.abs(size);this.ledger.protectionIds=[];this.ledger.pending=null;await this.persist();await this.log('Envoi retrouvé dans les fills exchange. Entrées arrêtées ; surveillance de la position attribuée au bot.');return;
    }
   }
   if(Date.now()-pending.at>90000&&!s.position&&!s.orders.some((o:any)=>o.coin==='ETH')){this.ledger.pending=null;await this.persist();await this.log('Envoi expiré sans exposition. Tentative conservée dans le quota UTC.');}else throw Error('Envoi ou exposition non résolu : vérifie Hyperliquid.');
  }finally{this.busy=false;}
 }
 status(){return {network:this.network,agent:this.agent,owner:this.ledger.owner,active:this.active,busy:this.busy,approved:this.approved,approvedUntil:this.approvedUntil,heartbeat:this.heartbeat,reason:this.reason,equity:this.equity,pending:!!this.ledger.pending,owned:this.ledger.owned,settings:this.settings,events:this.ledger.events,attemptDay:this.ledger.attemptDay,attemptCount:reservedAttempts(this.ledger,new Date().toISOString().slice(0,10))};}
}
function errorMessage(error:unknown){return error instanceof Error?error.message:String(error);}
