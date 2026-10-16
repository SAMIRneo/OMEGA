import {formatPrice,formatSize} from '@nktkas/hyperliquid/utils';
import {quoteDepth} from '../frontend/core/execution';
import type {Candidate} from '../frontend/core/types';
import {exchangeDay,exchangePlan,exchangeStatus} from '../frontend/core/testnet-plan';
export {exchangeDay,exchangePlan,exchangeStatus};
export type Network='testnet'|'mainnet';
export function networkConfig(network:Network){
 if(network!=='testnet'&&network!=='mainnet')throw Error('Réseau inconnu.');
 return {isTestnet:network==='testnet',apiUrl:network==='testnet'?'https://api.hyperliquid-testnet.xyz':'https://api.hyperliquid.xyz',timeout:12000};
}
export function validBook(book:any,now:number){
 if(!book||book.coin!=='ETH'||!Number.isFinite(book.time)||now-book.time>5000||book.time>now+1500||!Array.isArray(book.levels)||book.levels.length!==2)throw Error('Carnet ETH absent ou ancien.');
 for(let side=0;side<2;side++){
  if(!book.levels[side].length)throw Error('Carnet vide.');
  for(let i=0;i<book.levels[side].length;i++){const l=book.levels[side][i];if(!Number.isFinite(+l.px)||!Number.isFinite(+l.sz)||+l.px<=0||+l.sz<=0||i>0&&(side===0?+l.px>+book.levels[side][i-1].px:+l.px<+book.levels[side][i-1].px))throw Error('Carnet malformé ou non trié.');}
 }
 if(+book.levels[0][0].px>=+book.levels[1][0].px)throw Error('Carnet croisé.');return book;
}
export function validCandles(raw:any[],duration:number,now:number){
 if(!Array.isArray(raw)||raw.length<60)throw Error('Historique incomplet.');
 const bars=raw.filter(b=>b.T<now).sort((a,b)=>a.t-b.t);
 for(let i=0;i<bars.length;i++){const b=bars[i];if(!['t','T','o','h','l','c','v'].every(k=>Number.isFinite(+b[k]))||b.T-b.t!==duration-1||+b.l<=0||+b.h<Math.max(+b.o,+b.c)||+b.l>Math.min(+b.o,+b.c)||+b.v<0||i>0&&b.t-bars[i-1].t!==duration)throw Error('Bougies malformées ou trouées.');}
 if(bars.length<60||now-bars.at(-1).T>duration+5000)throw Error('Historique ancien.');return bars;
}
export function validateSettings(value:any){
 if(!['balanced','selective','aggressive'].includes(value.profile)||!Number.isInteger(value.leverage)||value.leverage<1||value.leverage>15)throw Error('Profil ou plafond de levier invalide.');
 return {profile:value.profile as 'balanced'|'selective'|'aggressive',leverage:value.leverage as number};
}
export function canEvaluate(stamp:number,last:number,armedAt:number,now:number){return stamp>last&&stamp>armedAt&&now-stamp>=0&&now-stamp<60000;}
export function assertNoExposure(account:any,orders:any[]){if(account.assetPositions.some((x:any)=>x.position.coin==='ETH'&&+x.position.szi!==0)||orders.some(x=>x.coin==='ETH'))throw Error('Position ou ordre ETH existant.');}
export function bracketConfirmed(response:unknown){
 const result=exchangeStatus(response),entry=result.entry;
 // "waitingForFill" is valid for the two contingent protections, never for the entry.
 return result.protected&&typeof entry==='object'&&!!entry.filled&&Number(entry.filled.totalSz)>0;
}

/** Keep a half-equity margin ceiling including the bounded IOC entry price. */
export function autoPlan(network:Network,s:any,c:Candidate,cap=c.leverage){
 const buy=c.side==='long',best=Number(s.book.levels[buy?1:0][0].px),entry=Number(formatPrice(best*(buy?1.001:.999),s.meta.szDecimals));
 const cloid=('0x'+crypto.randomUUID().replaceAll('-','')) as `0x${string}`;
 for(let leverage=Math.min(cap,c.leverage);leverage>=1;leverage--){
  const raw=s.equity*.5*leverage/entry,scale=10**s.meta.szDecimals;
  const quantity=Number(formatSize(Math.floor(raw*scale)/scale,s.meta.szDecimals));
  try{
   const plan=exchangePlan({network,expectedNetwork:network,...s.meta,side:c.side,quantity,leverage,stop:c.stop,target:c.target,bid:+s.book.levels[0][0].px,ask:+s.book.levels[1][0].px,bookTime:s.book.time,now:Date.now(),equity:s.equity,available:s.available,cloid});
   const quote=quoteDepth(s.book,c.side,quantity,2);
   if(!quote||quote.impactBps>8)continue;
   const reward=(buy?1:-1)*(plan.target-plan.entry)*quantity-(plan.entry+plan.target)*quantity*.00045-plan.target*quantity*.001;
   if(plan.loss<=450&&reward/plan.loss>=1.5)return {...plan,orders:plan.orders.map((o,i)=>({...o,c:i?('0x'+crypto.randomUUID().replaceAll('-','')) as `0x${string}`:cloid})),leverage};
  }catch{} // Try a lower integer leverage with the same allocation ceiling.
 }
 throw Error('Aucun levier ne respecte le budget, la liquidité et le ratio net exchange.');
}
