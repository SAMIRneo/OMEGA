import {evaluateDaily,utcDay} from './daily';
import {features} from './indicators';
import type {Candidate,Candle,Evaluation,Indicator,RustRisk,Snapshot} from './types';

export type ReplayFrame='5m'|'15m'|'1h'|'1d';
export type ReplayData=Record<ReplayFrame,Candle[]>;
export interface ReplayOptions {start:number;end:number;feeBps:number;slippageBps:number;spreadBps:number;leverageCap:number;strategyProfile?:import('./types').StrategyProfile}
export interface ReplayTrade extends Candidate {openedAt:number;closedAt:number;signalTime:number;exit:number;entryFee:number;exitFee:number;grossPnl:number;netPnl:number;reason:string;ambiguous:boolean}
export interface ReplayStats {trades:number;net:number;fees:number;winRate:number|null;profitFactor:number|null;average:number|null}
export interface ReplayResult {options:ReplayOptions;trades:ReplayTrade[];equity:Array<{time:number;value:number}>;stats:ReplayStats;firstSegment:ReplayStats;lastSegment:ReplayStats;splitTime:number;maxDrawdown:number;maxDrawdownPercent:number;ambiguousBars:number;evaluations:number;refusals:Array<{reason:string;count:number}>;coverage:Record<ReplayFrame,number>;comparison?:{options:ReplayOptions;stats:ReplayStats;maxDrawdownPercent:number}}
export type Evaluator=(snapshot:Snapshot,risk:RustRisk|null)=>Evaluation;
const duration:Record<ReplayFrame,number>={'5m':300000,'15m':900000,'1h':3600000,'1d':86400000};
const frames=['5m','15m','1h','1d'] as const;

// Equivalent closed-form calculation for offline research; verified against the live WASM formula.
export const replayRisk:RustRisk={risk_version:()=>1,size_margin:()=>0,planned_loss:(d,e,s,q,f,l)=>{
 if(![d,e,s,q,f,l].every(Number.isFinite)||Math.abs(d)!==1||e<=0||s<=0||q<=0||f<0||l<0||d*(e-s)<=0)return NaN;
 return d*(e-s)*q+e*q*f/10000+s*q*(f+l)/10000;
}};

export function validateSeries(raw:Candle[],tf:ReplayFrame):Candle[]{
 if(!Array.isArray(raw)||!raw.length)throw Error('Historique '+tf+' vide.');
 const out=[...raw].sort((a,b)=>a.t-b.t);
 for(let i=0;i<out.length;i++){
  const b=out[i],o=Number(b.o),c=Number(b.c),h=Number(b.h),l=Number(b.l),v=Number(b.v);
  if(![b.t,b.T,o,c,h,l,v].every(Number.isFinite)||!Number.isInteger(b.t)||b.t%duration[tf]!==0||b.T!==b.t+duration[tf]-1||l<=0||v<0||l>Math.min(o,c)||h<Math.max(o,c))throw Error('Bougie '+tf+' invalide.');
  if(i&&b.t-out[i-1].t!==duration[tf])throw Error('Trou ou doublon dans l’historique '+tf+'. Le replay est refusé.');
 }
 return out;
}
export function summarize(trades:ReplayTrade[]):ReplayStats{
 const net=trades.reduce((sum,t)=>sum+t.netPnl,0),gains=trades.reduce((sum,t)=>sum+Math.max(0,t.netPnl),0),losses=-trades.reduce((sum,t)=>sum+Math.min(0,t.netPnl),0);
 return {trades:trades.length,net,fees:trades.reduce((sum,t)=>sum+t.entryFee+t.exitFee,0),winRate:trades.length?100*trades.filter(t=>t.netPnl>0).length/trades.length:null,profitFactor:losses?gains/losses:null,average:trades.length?net/trades.length:null};
}

/** As-of replay: decisions use only bars closed before each entry timestamp. */
export function runReplay(input:ReplayData,options:ReplayOptions,progress?:(percent:number)=>void,evaluate:Evaluator=evaluateDaily):ReplayResult{
 const O=options;
 if((O.strategyProfile!==undefined&&!['balanced','selective','aggressive'].includes(O.strategyProfile))||![O.start,O.end,O.feeBps,O.slippageBps,O.spreadBps,O.leverageCap].every(Number.isFinite)||O.end<=O.start||O.start%300000||O.end%300000||O.end-O.start>14*86400000||O.feeBps<0||O.feeBps>50||O.slippageBps<0||O.slippageBps>50||O.spreadBps<0||O.spreadBps>8||!Number.isInteger(O.leverageCap)||O.leverageCap<1||O.leverageCap>15)throw Error('Paramètres du replay invalides.');
 const data=Object.fromEntries(frames.map(tf=>[tf,validateSeries(input[tf].filter(b=>b.T<O.end),tf)])) as ReplayData;
 const timeline=data['5m'].filter(b=>b.t>=O.start&&b.T<O.end);
 if(timeline.length!==(O.end-O.start)/300000||timeline[0]?.t!==O.start||timeline.at(-1)!.T!==O.end-1)throw Error('La période demandée n’est pas entièrement couverte en 5 min.');
 for(const tf of ['15m','1h','1d'] as const){if(data[tf].filter(b=>b.T<O.start).length<51)throw Error('Préchargement '+tf+' insuffisant : 51 bougies clôturées requises.');if(data[tf].at(-1)!.T<Math.floor(O.end/duration[tf])*duration[tf]-1)throw Error('Fin d’historique '+tf+' incomplète.');}
 let cash=10000,dailyPnl=0,day='',lastEntryDay='',entriesToday=0,lastEntryAt=0,lastExitAt=0,lossStreak=0,peak=10000,maxDrawdown=0,maxDrawdownPercent=0,ambiguousBars=0,evaluations=0;
 let position:(Candidate&{openedAt:number;signalTime:number;entryFee:number})|null=null;
 const trades:ReplayTrade[]=[],equity=[{time:O.start,value:cash}],refusalCounts=new Map<string,number>();
 const indices={'15m':0,'1h':0,'1d':0},cached:Partial<Record<'15m'|'1h'|'1d',{index:number;value:Indicator}>>={};
 const mark=(time:number,value:number)=>{peak=Math.max(peak,value);const dd=peak-value;maxDrawdown=Math.max(maxDrawdown,dd);maxDrawdownPercent=Math.max(maxDrawdownPercent,peak?dd/peak*100:0);equity.push({time,value});};
 const close=(reference:number,time:number,reason:string,ambiguous=false)=>{
  if(!position)return;const p=position,d=p.side==='long'?1:-1,exit=reference*(1-d*O.slippageBps/10000),grossPnl=d*(exit-p.entry)*p.quantity,exitFee=exit*p.quantity*O.feeBps/10000;
  cash+=grossPnl-exitFee;dailyPnl+=grossPnl-exitFee;
  trades.push({...p,closedAt:time,exit,exitFee,grossPnl,netPnl:grossPnl-p.entryFee-exitFee,reason,ambiguous});lastExitAt=time/1000;lossStreak=grossPnl-p.entryFee-exitFee<0?lossStreak+1:0;position=null;
 };
 for(let i=0;i<timeline.length;i++){
  const bar=timeline[i],now=bar.t,currentDay=utcDay(now/1000);
  if(day!==currentDay){day=currentDay;dailyPnl=0;entriesToday=0;lossStreak=0;}
  const halfSpread=O.spreadBps/20000,mid=Number(bar.o),bid=mid*(1-halfSpread),ask=mid*(1+halfSpread);
  if(position){const p=position,d=p.side==='long'?1:-1,openQuote=d===1?bid:ask;
   if(d*(openQuote-p.stop)<=0)close(openQuote,now,'Stop à l’ouverture / gap');
   else if(d*(openQuote-p.target)>=0)close(p.target,now,'Objectif à l’ouverture');
   else if(new Date(now).getUTCHours()===23&&new Date(now).getUTCMinutes()>=55)close(openQuote,now,'Fin de journée 23:55 UTC');
  }
  if(now%900000===0){
   evaluations++;
   if(!position){
    const indicators:Snapshot['indicators']={},status:Snapshot['candleStatus']={};
    for(const tf of ['15m','1h','1d'] as const){while(indices[tf]<data[tf].length&&data[tf][indices[tf]].T<now)indices[tf]++;const index=indices[tf];if(cached[tf]?.index!==index)cached[tf]={index,value:features(data[tf].slice(Math.max(0,index-350),index),now) as Indicator};indicators[tf]=cached[tf]!.value;status[tf]={fetchedAt:now/1000};}
    const snapshot:Snapshot={time:now/1000,runtime:'browser',market:{fresh:true,mid,sourceAgeSeconds:0,book:{time:now,levels:[[{px:String(bid),sz:'1000000'}],[{px:String(ask),sz:'1000000'}]]}},context:{maxLeverage:O.leverageCap,updatedAt:now/1000},limits:{strategy_profile:O.strategyProfile??'balanced',leverage:O.leverageCap,max_leverage:15,max_margin:cash*.5,max_risk:500,daily_loss_limit:500,fee_bps:O.feeBps,slippage_bps:O.slippageBps,allocation_fraction:.5,daily_mode:true,max_entries_per_day:4,daily_profit_target:200,trade_risk:100},paper:{initial:10000,cash,equity:cash,unrealized:0,position:null,history:[],day,dailyPnl,entriesToday,lastEntryDay,lastEntryAt,lastExitAt,lossStreak},indicators,candleStatus:status,candlesByTimeframe:{}};
    const result=evaluate(snapshot,replayRisk),candidate=result.candidate;
    if(candidate){const entryFee=candidate.entry*candidate.quantity*O.feeBps/10000;cash-=entryFee;dailyPnl-=entryFee;entriesToday++;lastEntryAt=now/1000;lastEntryDay=day;position={...candidate,openedAt:now,signalTime:indicators['15m']!.lastClosedTime!,entryFee};}
    else {const reason=result.reasons[0]||'Aucune configuration';refusalCounts.set(reason,(refusalCounts.get(reason)||0)+1);}
   }else refusalCounts.set('Position en cours',(refusalCounts.get('Position en cours')||0)+1);
  }
  if(position){const p=position,d=p.side==='long'?1:-1,high=Number(bar.h)*(1+(d===1?-halfSpread:halfSpread)),low=Number(bar.l)*(1+(d===1?-halfSpread:halfSpread)),stop=d===1?low<=p.stop:high>=p.stop,target=d===1?high>=p.target:low<=p.target;
   if(stop&&target){ambiguousBars++;close(p.stop,bar.T,'Stop prioritaire : ordre intrabougie inconnu',true);}
   else if(stop)close(p.stop,bar.T,'Stop observé dans la bougie');
   else if(target)close(p.target,bar.T,'Objectif observé dans la bougie');
  }
  const active=position as (Candidate&{openedAt:number})|null;
  mark(bar.T,cash+(active?(active.side==='long'?1:-1)*(Number(bar.c)-active.entry)*active.quantity:0));
  if(i%96===0)progress?.(Math.round((i+1)/timeline.length*100));
 }
 if(position){const last=timeline.at(-1)!,p=position as Candidate;close(Number(last.c)*(1+(p.side==='long'?-1:1)*O.spreadBps/20000),last.T,'Fin de l’échantillon');mark(last.T,cash);}
 progress?.(100);const splitTime=O.start+(O.end-O.start)*.7;
 return {options:{...O},trades,equity,stats:summarize(trades),firstSegment:summarize(trades.filter(t=>t.closedAt<splitTime)),lastSegment:summarize(trades.filter(t=>t.closedAt>=splitTime)),splitTime,maxDrawdown,maxDrawdownPercent,ambiguousBars,evaluations,refusals:[...refusalCounts].map(([reason,count])=>({reason,count})).sort((a,b)=>b.count-a.count),coverage:Object.fromEntries(frames.map(tf=>[tf,data[tf].length])) as Record<ReplayFrame,number>};
}

export function compareReplayCosts(data:ReplayData,options:ReplayOptions,progress?:(percent:number)=>void,evaluate:Evaluator=evaluateDaily):ReplayResult{
 const result=runReplay(data,options,percent=>progress?.(Math.round(percent/2)),evaluate),alternate={...options,spreadBps:options.spreadBps===2?4:2,slippageBps:options.slippageBps===2?4:2};
 const comparison=runReplay(data,alternate,percent=>progress?.(50+Math.round(percent/2)),evaluate);
 result.comparison={options:alternate,stats:comparison.stats,maxDrawdownPercent:comparison.maxDrawdownPercent};return result;
}
