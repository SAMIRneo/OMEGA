import type {Evaluation,Snapshot,RustRisk,Candidate,Side,TradeIntent} from './types';
import {quoteDepth,spreadBps} from './execution';
export const OMEGA_PROFILE={capital:10000,allocation:0.5,maxLeverage:15,maxPlannedLoss:500,maxEntries:1,accountingTimezone:'UTC'} as const;
export const STRATEGY_PROFILES={
 balanced:{label:'Équilibré',volume:1.2,rsiLow:45,rsiHigh:72,minConfirmations:2},
 selective:{label:'Sélectif',volume:1.4,rsiLow:48,rsiHigh:68,minConfirmations:3},
 aggressive:{label:'Offensif',volume:1,rsiLow:42,rsiHigh:76,minConfirmations:2}
} as const;
export function utcDay(seconds:number):string{return new Date(seconds*1000).toISOString().slice(0,10)}
export function entriesOnDay(s:Snapshot):number{return s.paper.lastEntryDay===utcDay(s.time)?s.paper.entriesToday:0}
export function evaluateDaily(s:Snapshot,risk:RustRisk|null):Evaluation {
 const day=utcDay(s.time),base:Evaluation={status:'wait',reasons:[],candidate:null,day,dailyBias:'indisponible'};
 const fail=(message:string,status:'wait'|'blocked'='blocked'):Evaluation=>({...base,status,reasons:[message]});
 if(new Date(s.time*1000).getUTCHours()===23&&new Date(s.time*1000).getUTCMinutes()>=30)return fail('Fenêtre Daily fermée à 23:30 UTC.');
 if(!risk)return fail('Noyau de risque indisponible.');
 if(!s.market.fresh||!s.market.book)return fail('Carnet absent ou ancien.');
 const metadataAt=s.context.updatedAt;
 if(metadataAt===undefined||!Number.isFinite(metadataAt)||s.time-metadataAt>120||metadataAt>s.time+5)return fail('Métadonnées exchange absentes ou anciennes.');
 if(spreadBps(s.market.book)>8)return fail('Spread supérieur au plafond de recherche de 8 bps.');
 if(s.paper.position)return fail('Une position est déjà ouverte.');
 if(entriesOnDay(s)>=1)return fail('Entrée quotidienne déjà consommée (UTC).');
 if(s.paper.dailyPnl<=-s.limits.daily_loss_limit)return fail('Limite de perte quotidienne atteinte.');
 const f=s.indicators['15m'],h=s.indicators['1h'],d=s.indicators['1d'];
 for(const [tf,age] of [['15m',180],['1h',300],['1d',1800]] as const){const indicator=s.indicators[tf],status=s.candleStatus[tf];if(!indicator?.ready||!status||status.error||s.time-status.fetchedAt>age||status.fetchedAt>s.time+5)return fail('Historique '+tf+' absent ou ancien.');const duration=tf==='15m'?900:tf==='1h'?3600:86400;if(!indicator.lastClosedTime||indicator.lastClosedTime>=s.time*1000||s.time-indicator.lastClosedTime/1000>duration+300)return fail('Bougie '+tf+' trop ancienne.');}
 if(!f||!h||!d||!f.atr||!f.close||!f.ema20||!f.ema50||!h.ema50||!d.ema20||!d.close)return fail('Indicateurs incomplets.');
 if(![f.close,f.previousClose,f.ema20,f.previousEma20,f.ema50,f.atr,f.rsi,h.ema50,d.close,d.ema20].every(Number.isFinite))return fail('Indicateurs non numériques ou incomplets.');
 const profileKey=s.limits.strategy_profile??'balanced';
 if(!Object.hasOwn(STRATEGY_PROFILES,profileKey))return fail('Profil de stratégie inconnu.');
 const profile=STRATEGY_PROFILES[profileKey];
 const dailyBias=d.close>d.ema20?'bullish':'bearish';base.dailyBias=dailyBias;
 const side:Side=dailyBias==='bullish'?'long':'short',direction=side==='long'?1:-1;
 if(h.trend!==dailyBias)return fail('Contexte daily et tendance 1 h désaccordés.','wait');
 if(direction*(f.ema20-f.ema50)<=0)return fail('Structure 15 min opposée au contexte.','wait');
 const rsi=f.rsi??50;if(side==='long'?(rsi<profile.rsiLow||rsi>profile.rsiHigh):(rsi<100-profile.rsiHigh||rsi>100-profile.rsiLow))return fail('Momentum 15 min hors de la zone du profil '+profile.label+'.','wait');
 const confirmations=[
  {label:'MACD dans le sens du signal',ok:direction*(f.histogram??0)>0},
  {label:'Flux CMF et OBV concordants',ok:Number.isFinite(f.cmf)&&Number.isFinite(f.obvChange20)&&direction*f.cmf!>0&&direction*f.obvChange20!>0},
  {label:'Force directionnelle ADX / DI',ok:(f.adx??0)>=20&&direction*((f.plusDI??0)-(f.minusDI??0))>0},
  {label:'Prix confirmé par VWAP et volume',ok:!!f.rollingVwap&&direction*(f.close-f.rollingVwap)>0&&(f.relativeVolume??0)>=profile.volume}
 ];
 const confirmed=confirmations.filter(x=>x.ok);
 const key=side==='long'?'resistance':'support',level=f[key];
 const breakout=Number.isFinite(level)&&direction*(f.close-(level as number))>0&&direction*((f.previousClose??f.close)-(level as number))<=0&&(f.relativeVolume??0)>=profile.volume;
 const pullback=direction*(f.close-f.ema20)>0&&direction*((f.previousClose??f.close)-(f.previousEma20??f.ema20))<=0;
 const momentum=profileKey==='aggressive'&&Number.isFinite(f.previousHistogram)&&direction*(f.previousHistogram??0)<=0&&direction*(f.histogram??0)>0&&direction*(f.close-f.ema20)>0&&(f.relativeVolume??0)>=profile.volume;
 if(!breakout&&!pullback&&!momentum)return fail('Aucune cassure, reprise EMA20 ni croisement MACD autorisé sur la dernière clôture.','wait');
 if(confirmed.length<profile.minConfirmations)return fail(profile.label+' : '+confirmed.length+'/4 confirmations ; '+profile.minConfirmations+' requises.','wait');
 if(profileKey==='selective'&&(f.adx??0)<20)return fail('Sélectif : force directionnelle ADX insuffisante.','wait');
 const family=breakout?'breakout':pullback?'pullback':'momentum';
 // Rule score: a transparent ranking, not an estimated probability.
 const reasons=['Profil '+profile.label,'Contexte daily concordant','Tendance 1 h concordante','Structure 15 min concordante',breakout?'Cassure confirmée par volume':pullback?'Reprise de l’EMA20':'Croisement MACD sur clôture',...confirmed.map(x=>x.label),confirmed.length+'/4 confirmations (score de règles, pas une probabilité)'];
 const score=70+(breakout?15:10)+((f.relativeVolume??0)>=1.2?5:0)+(direction*(f.histogram??0)>0?5:0)+(f.rollingVwap&&direction*(f.close-f.rollingVwap)>0?5:0);
 if(score<80)return fail('Score de règles insuffisant.','wait');
 const L=s.limits;if(!Number.isFinite(L.leverage)||L.leverage<1||L.leverage>15||L.leverage>(s.context.maxLeverage??0))return fail('Levier hors plafond 1–15 ou métadonnées indisponibles.');
 const best=Number(s.market.book.levels[side==='long'?1:0][0]?.px);if(!(best>0))return fail('Meilleur prix invalide.');
 if(![s.paper.equity,s.paper.cash,L.fee_bps,L.slippage_bps,L.max_risk,L.daily_loss_limit].every(Number.isFinite)||s.paper.equity<=0||L.fee_bps<0||L.slippage_bps<0||L.max_risk<=0)return fail('Capital ou paramètres de risque invalides.');
 if(Math.abs(best-f.close)>f.atr*1.25)return fail('Prix éloigné de plus de 1,25 ATR de la clôture du signal.');
 const margin=Math.floor(s.paper.equity*0.5*100)/100;
 let entry=best*(1+direction*L.slippage_bps/10000),stop=0,target=0;
 // Select the highest integer leverage inside the user's cap with a 10% risk reserve.
 let leverage=Math.floor(Math.min(15,L.leverage,s.context.maxLeverage??0)),quantity=0,plannedLoss=Infinity;
 let depthOK=false,impactBps=0;
 while(leverage>=1){quantity=margin*leverage/best;const quote=quoteDepth(s.market.book,side,quantity,L.slippage_bps);if(quote&&quote.impactBps<=8){depthOK=true;entry=quote.entry;impactBps=quote.impactBps;stop=entry-direction*f.atr*1.5;target=entry+direction*f.atr*3;plannedLoss=risk.planned_loss(direction,entry,stop,quantity,L.fee_bps,L.slippage_bps);if(Number.isFinite(plannedLoss)&&plannedLoss>0&&plannedLoss<=L.max_risk*.9&&stop>0&&target>0)break;}leverage--;}
 if(leverage<1)return fail(depthOK?'Même à ×1, le stop dépasse le budget de risque.':'Profondeur visible insuffisante ou impact supérieur à 8 bps.');
 const netReward=direction*(target-entry)*quantity-entry*quantity*L.fee_bps/10000-target*quantity*(L.fee_bps+L.slippage_bps)/10000;
 const rewardRisk=netReward/plannedLoss;
 if(!Number.isFinite(plannedLoss)||plannedLoss<=0||plannedLoss>L.max_risk)return fail('Risque prévu supérieur au plafond : aucune réduction cachée de la marge de 50 %.');
 if(margin+entry*quantity*L.fee_bps/10000>s.paper.cash)return fail('Marge et frais incompatibles avec le capital disponible.');
 if(rewardRisk<1.5)return fail('Ratio gain/risque net inférieur à 1,5 dans ce modèle.');
 reasons.push('Profondeur visible vérifiée','Spread et distance au signal contrôlés');
 const candidate:Candidate={side,leverage,family,score:Math.min(100,score),reasons,entry,stop,target,margin,quantity,plannedLoss,rewardRisk,impactBps};
 return {status:'eligible',reasons,candidate,day,dailyBias};
}
export function intent(e:Evaluation,signalTime:number):TradeIntent|null{const c=e.candidate;return c?{side:c.side,leverage:c.leverage,margin:c.margin,stop:c.stop,target:c.target,strategy:'omega-daily/'+c.family,signalTime}:null}
