/* Shared closed-candle calculations used by the live engine and historical replay. */
function ema(values,n,start=n-1){const out=Array(values.length).fill(null);if(values.length<=start)return out;let e=values.slice(start-n+1,start+1).reduce((sum,x)=>sum+x,0)/n;out[start]=e;for(let i=start+1;i<values.length;i++)out[i]=e+=2/(n+1)*(values[i]-e);return out;}
export function features(raw,now=Date.now()){
 const b=raw.filter(x=>+x.T<now).sort((a,b)=>a.t-b.t);if(b.length<51)return {ready:false};
 const c=b.map(x=>+x.c),v=b.map(x=>+x.v),e20=ema(c,20),e50=ema(c,50),e200=ema(c,200),fast=ema(c,12,25),slow=ema(c,26,25),macd=fast.map((x,i)=>i<25?null:x-slow[i]),signal=ema(macd,9,33);
 let gain=0,loss=0,atr=0;for(let i=1;i<=14;i++){gain+=Math.max(0,c[i]-c[i-1])/14;loss+=Math.max(0,c[i-1]-c[i])/14;atr+=Math.max(+b[i].h-b[i].l,Math.abs(b[i].h-c[i-1]),Math.abs(b[i].l-c[i-1]))/14}
 for(let i=15;i<c.length;i++){gain=(gain*13+Math.max(0,c[i]-c[i-1]))/14;loss=(loss*13+Math.max(0,c[i-1]-c[i]))/14;atr=(atr*13+Math.max(+b[i].h-b[i].l,Math.abs(b[i].h-c[i-1]),Math.abs(b[i].l-c[i-1])))/14}
 const recent=b.slice(-40),sumV=recent.reduce((s,b)=>s+(+b.v),0),mean=c.slice(-20).reduce((s,x)=>s+x,0)/20,sd=Math.sqrt(c.slice(-20).reduce((s,x)=>s+(x-mean)**2,0)/20),last=c.at(-1),longTrendReady=b.length>=250;
 // Independent confirmation families: directional strength, money flow, volatility.
 let tr=0,plus=0,minus=0,adx=0,dxCount=0;
 for(let i=1;i<b.length;i++){
  const up=+b[i].h-+b[i-1].h,down=+b[i-1].l-+b[i].l;
  const range=Math.max(+b[i].h-+b[i].l,Math.abs(+b[i].h-c[i-1]),Math.abs(+b[i].l-c[i-1]));
  const p=up>down&&up>0?up:0,m=down>up&&down>0?down:0;
  if(i<14){tr+=range;plus+=p;minus+=m;continue;}
  tr=tr-tr/14+range;plus=plus-plus/14+p;minus=minus-minus/14+m;
  const dx=plus+minus?100*Math.abs(plus-minus)/(plus+minus):0;
  if(dxCount<14){adx+=dx/14;dxCount++;}else adx=(adx*13+dx)/14;
 }
 const flowBars=b.slice(-20),flowVolume=flowBars.reduce((s,x)=>s+(+x.v),0);
 const cmf=flowVolume?flowBars.reduce((s,x)=>s+(+x.h===+x.l?0:(2*(+x.c)-(+x.h)-(+x.l))/(+x.h-+x.l))*(+x.v),0)/flowVolume:0;
 const obvChange20=b.slice(-20).reduce((s,x,j)=>s+Math.sign(+x.c-c[c.length-21+j])*(+x.v),0);
 const confirmation={adx,plusDI:tr?100*plus/tr:0,minusDI:tr?100*minus/tr:0,cmf,obvChange20,previousHistogram:macd.at(-2)-signal.at(-2),bbMiddle:mean,bbWidth:mean?4*sd/mean:0,regime:adx>=25?'trend':adx<20?'range':'transition'};
 return {lastClosedTime:b.at(-1).T,previousEma20:e20.at(-2),previousEma50:e50.at(-2),ready:true,backend:'JavaScript',close:last,previousClose:c.at(-2),support:Math.min(...b.slice(-21,-1).map(x=>+x.l)),resistance:Math.max(...b.slice(-21,-1).map(x=>+x.h)),ema20:e20.at(-1),ema50:e50.at(-1),ema200:longTrendReady?e200.at(-1):null,longTrendReady,rsi:!gain&&!loss?50:!loss?100:100-100/(1+gain/loss),atr,macd:macd.at(-1),histogram:macd.at(-1)-signal.at(-1),rollingVwap:sumV?recent.reduce((s,b)=>s+(+b.h + +b.l + +b.c)/3*(+b.v),0)/sumV:null,bbLower:mean-2*sd,bbUpper:mean+2*sd,relativeVolume:v.at(-1)/(v.slice(-21,-1).reduce((s,x)=>s+x,0)/20||1),...confirmation,trend:last>e20.at(-1)&&e20.at(-1)>e50.at(-1)&&(!longTrendReady||last>e200.at(-1))?'bullish':last<e20.at(-1)&&e20.at(-1)<e50.at(-1)&&(!longTrendReady||last<e200.at(-1))?'bearish':'neutral',candidates:[]};
}
