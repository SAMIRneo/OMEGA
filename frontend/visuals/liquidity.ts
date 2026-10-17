import {subscribeMarket} from '../shared/market-store';
import {formatNumber} from '../shared/format';
import {depthModel} from './depth-model';
const $=(id:string)=>document.getElementById(id)!;
let previous='';
const off=subscribeMarket(snapshot=>{
 const rows=depthModel(snapshot.market.book),bid=rows.filter(x=>x.side==='bid'),ask=rows.filter(x=>x.side==='ask');
 const key=JSON.stringify([snapshot.market.fresh,rows]);if(key===previous)return;previous=key;
 const valid=snapshot.market.fresh&&bid.length>0&&ask.length>0;
 $('liquidity-status').textContent=valid?'12 NIVEAUX / CÔTÉ':'DONNÉES À VÉRIFIER';
 const buy=bid.at(-1)?.cumulative??0,sell=ask.at(-1)?.cumulative??0,max=Math.max(buy,sell,1e-12);
 $('liquidity-buy').textContent=valid?formatNumber(buy,2)+' ETH':'—';$('liquidity-sell').textContent=valid?formatNumber(sell,2)+' ETH':'—';
 $('liquidity-mid').textContent=valid&&snapshot.market.mid?formatNumber(snapshot.market.mid)+' USDC':'—';
 $('liquidity-spread').textContent=valid?formatNumber((ask[0].price-bid[0].price)/((ask[0].price+bid[0].price)/2)*10000,2)+' bps':'—';
 const near=bid[0]?.price??0,far=ask[0]?.price??0,mid=(near+far)/2;
 const range=Math.max(mid-(bid.at(-1)?.price??mid),(ask.at(-1)?.price??mid)-mid,1e-9);
 const path=(levels:typeof rows)=>{
  if(!valid)return '';
  let d='M400,200';
  for(const row of levels){const x=400+(row.price-mid)/range*380,y=200-row.cumulative/max*170;d+=' H'+x.toFixed(2)+' V'+y.toFixed(2);}
  const x=400+((levels.at(-1)?.price??mid)-mid)/range*380;
  return d+' L'+x.toFixed(2)+',200 Z';
 };
 $('liquidity-bid-area').setAttribute('d',path(bid));$('liquidity-ask-area').setAttribute('d',path(ask));
});
if(import.meta.hot)import.meta.hot.dispose(off);
