import {formatPrice,formatSize} from '@nktkas/hyperliquid/utils';
export interface TestnetPlanInput {network:string;asset:number;szDecimals:number;maxLeverage:number;side:'long'|'short';quantity:number;leverage:number;stop:number;target:number;bid:number;ask:number;bookTime:number;now:number;equity:number;available:number;cloid:`0x${string}`}
export function testnetPlan(p:TestnetPlanInput){
 if(p.network!=='testnet')throw Error('Exécution autorisée uniquement sur le testnet.');
 if(![p.quantity,p.leverage,p.stop,p.target,p.bid,p.ask,p.bookTime,p.now,p.equity,p.available].every(Number.isFinite))throw Error('Données de plan incomplètes.');
 if(p.now-p.bookTime>5000||p.now<p.bookTime-1500||p.bid<=0||p.ask<=p.bid)throw Error('Carnet trop ancien ou incohérent.');
 if(!Number.isInteger(p.leverage)||p.leverage<1||p.leverage>Math.min(15,p.maxLeverage))throw Error('Levier hors plafond.');
 const buy=p.side==='long',dir=buy?1:-1,size=formatSize(p.quantity,p.szDecimals),quantity=Number(size);
 if(quantity<=0||p.stop<=0||p.target<=0)throw Error('Quantité et niveaux positifs requis.');
 // IOC with a bounded price; no unbounded market entry.
 const entry=Number(formatPrice((buy?p.ask:p.bid)*(buy?1.001:.999),p.szDecimals));
 const stop=Number(formatPrice(p.stop,p.szDecimals)),target=Number(formatPrice(p.target,p.szDecimals));
 if(dir*(entry-stop)<=0||dir*(target-entry)<=0)throw Error('Stop et objectif incompatibles avec le sens choisi.');
 const notional=entry*quantity,margin=notional/p.leverage,fees=notional*.00045;
 const loss=(dir*(entry-stop)+stop*.001+entry*.00045+stop*.00045)*quantity;
 if(notional<10)throw Error('Notionnel minimal : 10 USDC testnet.');
 if(margin>p.equity*.5||margin+fees>p.available||p.equity<=0)throw Error('Marge limitée à 50 % du solde testnet et au disponible.');
 if(loss>500)throw Error('Risque prévu supérieur à 500 USDC testnet.');
 const orders=[{a:p.asset,b:buy,p:String(entry),s:size,r:false,t:{limit:{tif:'Ioc' as const}},c:p.cloid},
  ...(['sl','tp'] as const).map(kind=>{const trigger=kind==='sl'?stop:target;return {a:p.asset,b:!buy,p:formatPrice(trigger*(buy?.99:1.01),p.szDecimals),s:size,r:true,t:{trigger:{isMarket:true,triggerPx:String(trigger),tpsl:kind}}};})];
 return {orders,grouping:'normalTpsl' as const,cloid:p.cloid,quantity,entry,stop,target,margin,loss};
}
export function exchangeStatus(response:unknown){
 const r=response as {status?:string;response?:{data?:{statuses?:Array<string|{error?:string;filled?:{oid:number;totalSz:string;avgPx:string};resting?:{oid:number}}>}}};
 if(r.status!=='ok'||!Array.isArray(r.response?.data?.statuses))throw Error('Réponse exchange non confirmée.');
 const statuses=r.response.data.statuses,errors=statuses.flatMap(s=>typeof s==='object'&&s.error?[s.error]:[]);
 return {statuses,errors,entry:statuses[0],protected:statuses.length===3&&errors.length===0};
}
