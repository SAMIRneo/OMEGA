import type {Snapshot} from './types';
export type CapitalSource='paper'|'account';
export interface CockpitPosition {asset:string;side:string;quantity:number;entry:number;pnl:number}
const finite=(v:unknown):number|null=>{if(v===null||v===undefined||v==='')return null;const n=Number(v);return Number.isFinite(n)?n:null;};
export function cockpitModel(s:Snapshot,source:CapitalSource,range:number|null){
 const paper=source==='paper',account=(s.account as {perpetuals?:{marginSummary?:{accountValue?:unknown;totalMarginUsed?:unknown};assetPositions?:Array<{position:{coin:string;szi:unknown;entryPx:unknown;unrealizedPnl:unknown}}>}}|null)?.perpetuals;
 const accountFresh=!!s.accountTime&&s.time-s.accountTime>=-5&&s.time-s.accountTime<=75;
 const equity=paper?finite(s.paper.equity):accountFresh?finite(account?.marginSummary?.accountValue):null;
 const margin=paper?finite(s.paper.position?.margin??0):accountFresh?finite(account?.marginSummary?.totalMarginUsed):null;
 const positions:CockpitPosition[]=paper?(s.paper.position?[{asset:'ETH',side:s.paper.position.side==='long'?'Achat':'Vente',quantity:s.paper.position.quantity,entry:s.paper.position.entry,pnl:s.paper.unrealized}]:[]):accountFresh?(account?.assetPositions??[]).filter(x=>x.position.coin==='ETH'&&finite(x.position.szi)!==null&&Number(x.position.szi)!==0).map(({position:p})=>({asset:'ETH',side:Number(p.szi)>0?'Achat':'Vente',quantity:Math.abs(Number(p.szi)),entry:finite(p.entryPx)??0,pnl:finite(p.unrealizedPnl)??0})):[];
 const cutoff=range===null?-Infinity:s.time*1000-range*86400000;
 let capital=s.paper.initial;const points:Array<{time:number;value:number}>=[],history=[...s.paper.history].sort((a,b)=>time(a)-time(b));
 let before=capital,closed=0;
 for(const trade of history){const at=time(trade);if(!Number.isFinite(at)||!Number.isFinite(trade.netPnl))continue;capital+=trade.netPnl;if(at<cutoff)before=capital;else{points.push({time:at,value:capital});closed++;}}
 if(paper){points.unshift({time:Number.isFinite(cutoff)?cutoff:(points[0]?.time??s.time*1000),value:before});if(equity!==null)points.push({time:s.time*1000,value:equity});}
 else points.length=0;
 const pnl=paper&&equity!==null?equity-before:null,percent=pnl!==null&&before>0?pnl/before*100:null;
 const dailyPnl=paper&&s.paper.day===new Date(s.time*1000).toISOString().slice(0,10)?s.paper.dailyPnl:null;
 return {equity,margin,positions,points,pnl,percent,closed,exposure:equity!==null&&equity>0&&margin!==null?margin/equity*100:null,dailyLoss:dailyPnl===null?null:Math.max(0,-dailyPnl),dailyPnl,accountFresh};
}
function time(trade:Snapshot['paper']['history'][number]){return trade.closedAt??(trade.at?Date.parse(trade.at):NaN);}
