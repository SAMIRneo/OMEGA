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
 const d=side==='long'?1:-1,best=Number(s.market.book.levels[d===1?1:0][0]?.px);
 const leverage=Math.floor(Math.min(15,L.leverage,s.context.maxLeverage??0));
 const budget=Math.min(100,L.max_risk,s.paper.equity*.01,(L.daily_loss_limit+Math.min(0,s.paper.dailyPnl))*.9);
 const lossUnit=risk.planned_loss(d,best,best-d*atr*1.5,1,L.fee_bps,L.slippage_bps);
 if(!Number.isFinite(lossUnit)||lossUnit<=0||budget<=0)throw Error('Budget de risque invalide.');
 let quantity=Math.min(budget/lossUnit,s.paper.equity*.5*leverage/best);
 for(let i=0;i<4;i++){
  const quote=quoteDepth(s.market.book,side,quantity,L.slippage_bps);if(!quote||quote.impactBps>8)break;
  const stop=quote.entry-d*atr*1.5,target=quote.entry+d*atr*3,plannedLoss=risk.planned_loss(d,quote.entry,stop,quantity,L.fee_bps,L.slippage_bps),fee=quote.entry*quantity*L.fee_bps/10000,reward=d*(target-quote.entry)*quantity-fee-target*quantity*(L.fee_bps+L.slippage_bps)/10000,margin=quote.entry*quantity/leverage;
  if(stop>0&&target>0&&quote.entry*quantity>=10&&Number.isFinite(plannedLoss)&&plannedLoss>0&&plannedLoss<=budget&&margin<=s.paper.equity*.5&&margin+fee<=s.paper.cash&&reward/plannedLoss>=1.5)return {side,leverage,margin,quantity,entry:quote.entry,stop,target,plannedLoss,reward,rewardRisk:reward/plannedLoss};
  quantity*=Math.min(.999,budget/plannedLoss*.999,s.paper.equity*.5/margin*.999);
 }
 throw Error('Aucun plan ne respecte le budget, la profondeur et le ratio net.');
}
