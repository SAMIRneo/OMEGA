import {quoteDepth,spreadBps} from './execution';
import type {RustRisk,Side,Snapshot} from './types';
export function planAtr(s:Snapshot,side:Side,risk:RustRisk|null){
 const atr=s.indicators['15m']?.atr,L=s.limits;
 if(!s.market.fresh||!s.market.book)throw Error('Un carnet récent est requis.');
 if(!risk||!atr||!Number.isFinite(atr)||atr<=0)throw Error('ATR 15 min ou moteur de risque indisponible.');
 const indicator=s.indicators['15m'],status=s.candleStatus['15m'];
 if(!indicator?.ready||!indicator.lastClosedTime||indicator.lastClosedTime>=s.time*1000||s.time-indicator.lastClosedTime/1000>1200||!status||status.error||s.time-status.fetchedAt>180||status.fetchedAt>s.time+5)throw Error('Historique ATR 15 min ancien ou incomplet.');
 if(s.paper.position)throw Error('Une position est déjà ouverte.');
 if(!s.context.updatedAt||s.time-s.context.updatedAt>120||s.context.updatedAt>s.time+5)throw Error('Métadonnées exchange anciennes ou incohérentes.');
 if(spreadBps(s.market.book)>8)throw Error('Spread trop élevé pour préparer ce plan.');
 const d=side==='long'?1:-1,best=Number(s.market.book.levels[d===1?1:0][0]?.px),margin=Math.floor(s.paper.equity*.5*100)/100;
 if(!Number.isFinite(margin)||margin<=0||!(best>0))throw Error('Capital ou prix invalide.');
 for(let leverage=Math.floor(Math.min(15,L.leverage,s.context.maxLeverage??0));leverage>=1;leverage--){
  const quantity=margin*leverage/best,quote=quoteDepth(s.market.book,side,quantity,L.slippage_bps);if(!quote||quote.impactBps>8)continue;
  const stop=quote.entry-d*atr*1.5,target=quote.entry+d*atr*3,plannedLoss=risk.planned_loss(d,quote.entry,stop,quantity,L.fee_bps,L.slippage_bps),fee=quote.entry*quantity*L.fee_bps/10000,reward=d*(target-quote.entry)*quantity-fee-target*quantity*(L.fee_bps+L.slippage_bps)/10000;
  if(stop>0&&target>0&&Number.isFinite(plannedLoss)&&plannedLoss>0&&plannedLoss<=L.max_risk*.9&&margin+fee<=s.paper.cash&&reward/plannedLoss>=1.5)return {side,leverage,margin,quantity,entry:quote.entry,stop,target,plannedLoss,reward,rewardRisk:reward/plannedLoss};
 }
 throw Error('Aucun levier ne respecte le budget, la profondeur et le ratio net.');
}
