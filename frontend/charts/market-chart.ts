import {createChart,CandlestickSeries,LineSeries,HistogramSeries,ColorType,CrosshairMode,type UTCTimestamp,type IChartApi} from 'lightweight-charts';
import type {Candle,Timeframe} from '../core/types';
const container=document.getElementById('chart')!;
let chart:IChartApi|null=null,timeframe:Timeframe|null=null,lastCount=0,lastFingerprint='',lastLength=0,lastTime=0,incrementalUpdates=0;
let candles:ReturnType<IChartApi['addSeries']>,line:ReturnType<IChartApi['addSeries']>,ema20:ReturnType<IChartApi['addSeries']>,ema50:ReturnType<IChartApi['addSeries']>,volume:ReturnType<IChartApi['addSeries']>;
const time=(t:number)=>Math.floor(t/1000) as UTCTimestamp;
function setup(){if(chart)return;chart=createChart(container,{autoSize:true,layout:{background:{type:ColorType.Solid,color:'#1b1918'},textColor:'#c8bdb1',fontSize:12,attributionLogo:true},grid:{vertLines:{color:'#35302b'},horzLines:{color:'#35302b'}},crosshair:{mode:CrosshairMode.Normal},timeScale:{timeVisible:true,secondsVisible:false,borderColor:'#55483e'},rightPriceScale:{borderColor:'#55483e'},handleScale:{mouseWheel:true,pinch:true},handleScroll:{mouseWheel:true,pressedMouseMove:true,horzTouchDrag:true,vertTouchDrag:false}});
 candles=chart.addSeries(CandlestickSeries,{upColor:'#59daa3',downColor:'#f26692',borderVisible:false,wickUpColor:'#59daa3',wickDownColor:'#f26692'});
 line=chart.addSeries(LineSeries,{color:'#edb56b',lineWidth:2,visible:false});
 ema20=chart.addSeries(LineSeries,{color:'#edb56b',lineWidth:1,lastValueVisible:false,priceLineVisible:false});
 ema50=chart.addSeries(LineSeries,{color:'#c3a5df',lineWidth:1,lastValueVisible:false,priceLineVisible:false});
 volume=chart.addSeries(HistogramSeries,{priceFormat:{type:'volume'},priceScaleId:'volume',lastValueVisible:false,priceLineVisible:false});
 chart.priceScale('volume').applyOptions({scaleMargins:{top:.82,bottom:0},visible:false});
}
function series(raw:Candle[],period:number){let e=Number(raw[0]?.c??0);return raw.map((b,i)=>({time:time(b.t),value:i?(e+=2/(period+1)*(Number(b.c)-e)):e}));}
window.TradingChart={render(raw,tf,mode,count){if(!raw.length||container.getBoundingClientRect().width===0)return;setup();
 const clean=Array.from(new Map(raw.filter(b=>[b.t,b.o,b.h,b.l,b.c,b.v].every(v=>Number.isFinite(Number(v)))).map(b=>[b.t,b])).values()).sort((a,b)=>a.t-b.t);
 const last=clean.at(-1);if(!last)return;const fingerprint=[tf,mode,count,last.t,last.o,last.h,last.l,last.c,last.v].join(':');if(fingerprint===lastFingerprint)return;
 candles.applyOptions({visible:mode==='candles'});line.applyOptions({visible:mode==='line'});
 const cs=clean.map(b=>({time:time(b.t),open:Number(b.o),high:Number(b.h),low:Number(b.l),close:Number(b.c)})),ls=clean.map(b=>({time:time(b.t),value:Number(b.c)})),vs=clean.map(b=>({time:time(b.t),value:Number(b.v),color:Number(b.c)>=Number(b.o)?'#59daa330':'#f2669230'}));
 if(timeframe===tf&&clean.length>=2&&(Number(last.t)===lastTime||Number(clean.at(-2)!.t)===lastTime)&&incrementalUpdates<200){incrementalUpdates++;candles.update(cs.at(-1)!);line.update(ls.at(-1)!);volume.update(vs.at(-1)!);ema20.update(series(clean,20).at(-1)!);ema50.update(series(clean,50).at(-1)!);}else{incrementalUpdates=0;candles.setData(cs);line.setData(ls);volume.setData(vs);ema20.setData(series(clean,20));ema50.setData(series(clean,50));}
 if(timeframe!==tf||lastCount!==count)chart!.timeScale().setVisibleLogicalRange({from:Math.max(0,clean.length-count),to:clean.length+3});
 timeframe=tf;lastTime=Number(last.t);lastLength=clean.length;lastCount=count;lastFingerprint=fingerprint;
},resize(){if(chart){chart.applyOptions({width:container.clientWidth,height:container.clientHeight});}}};
