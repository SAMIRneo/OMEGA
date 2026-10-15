import type {Side, Snapshot} from './types';

/** Walk visible L2 liquidity. No invisible liquidity or future fills are assumed. */
export function quoteDepth(book:Snapshot['market']['book'],side:Side,quantity:number,slippageBps:number){
 if(!book||!Number.isFinite(quantity)||quantity<=0||!Number.isFinite(slippageBps)||slippageBps<0)return null;
 const levels=book.levels[side==='long'?1:0],best=Number(levels[0]?.px);
 let left=quantity,notional=0,previous=best;
 if(!(best>0))return null;
 for(const level of levels){
  const price=Number(level.px),size=Number(level.sz);
  if(!Number.isFinite(price)||price<=0||!Number.isFinite(size)||size<0||(side==='long'?price<previous:price>previous))return null;
  previous=price;
  const filled=Math.min(left,size);notional+=filled*price;left-=filled;
  if(left<=1e-10)break;
 }
 if(left>1e-10)return null;
 const vwap=notional/quantity,direction=side==='long'?1:-1;
 return {entry:vwap*(1+direction*slippageBps/10000),vwap,impactBps:direction*(vwap/best-1)*10000};
}

export function spreadBps(book:Snapshot['market']['book']):number{
 if(!book)return Infinity;
 const bid=Number(book.levels[0][0]?.px),ask=Number(book.levels[1][0]?.px),mid=(bid+ask)/2;
 return bid>0&&ask>=bid&&Number.isFinite(mid)?(ask-bid)/mid*10000:Infinity;
}
