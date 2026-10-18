import {createChart,CandlestickSeries,LineSeries,HistogramSeries,ColorType,CrosshairMode,type UTCTimestamp,type IChartApi} from 'lightweight-charts';
import type {Candle,Timeframe} from '../core/types';
import {ChartBuffer} from './data-buffer';
const buffer=new ChartBuffer();
const container=document.getElementById('chart')!;
let chart:IChartApi|null=null,timeframe:Timeframe|null=null,lastCount=0,lastMode='',incrementalUpdates=0;
let candles:ReturnType<IChartApi['addSeries']>,line:ReturnType<IChartApi['addSeries']>,ema20:ReturnType<IChartApi['addSeries']>,ema50:ReturnType<IChartApi['addSeries']>,volume:ReturnType<IChartApi['addSeries']>;
const time=(t:number)=>Math.floor(t/1000) as UTCTimestamp;
const palette=()=>{const css=getComputedStyle(document.documentElement),read=(key:string)=>css.getPropertyValue(key).trim();return {bg:read('--chart-bg'),text:read('--muted'),grid:read('--chart-grid'),line:read('--line'),up:read('--green'),down:read('--red'),accent:read('--accent'),second:read('--violet')};};
let colors=palette();
function setup(){if(chart)return;chart=createChart(container,{autoSize:true,layout:{background:{type:ColorType.Solid,color:colors.bg},textColor:colors.text,fontFamily:'Bricolage Grotesque, sans-serif',fontSize:11,attributionLogo:true},grid:{vertLines:{color:colors.grid},horzLines:{color:colors.grid}},crosshair:{mode:CrosshairMode.Normal},timeScale:{timeVisible:true,secondsVisible:false,borderColor:colors.line},rightPriceScale:{borderColor:colors.line},handleScale:{mouseWheel:true,pinch:true},handleScroll:{mouseWheel:true,pressedMouseMove:true,horzTouchDrag:true,vertTouchDrag:false}});
 candles=chart.addSeries(CandlestickSeries,{upColor:colors.up,downColor:colors.down,borderVisible:false,wickUpColor:colors.up,wickDownColor:colors.down});
 line=chart.addSeries(LineSeries,{color:colors.accent,lineWidth:2,visible:false});
 ema20=chart.addSeries(LineSeries,{color:colors.accent,lineWidth:1,lastValueVisible:false,priceLineVisible:false});
 ema50=chart.addSeries(LineSeries,{color:colors.second,lineWidth:1,lastValueVisible:false,priceLineVisible:false});
 volume=chart.addSeries(HistogramSeries,{priceFormat:{type:'volume'},priceScaleId:'volume',lastValueVisible:false,priceLineVisible:false});
 chart.priceScale('volume').applyOptions({scaleMargins:{top:.82,bottom:0},visible:false});
}
window.TradingChart={render(raw,tf,mode,count){if(!raw.length||container.getBoundingClientRect().width===0)return;setup();
 const result=buffer.update(raw),changedTimeframe=timeframe!==tf;
 if(mode!==lastMode){candles.applyOptions({visible:mode==='candles'});line.applyOptions({visible:mode==='line'});lastMode=mode;}
 const candle=(i:number)=>{const b=buffer.bars[i];return {time:b.time as UTCTimestamp,open:b.open,high:b.high,low:b.low,close:b.close};};
 const closing=(i:number)=>({time:buffer.bars[i].time as UTCTimestamp,value:buffer.bars[i].close});
 const vol=(i:number)=>({time:buffer.bars[i].time as UTCTimestamp,value:buffer.bars[i].volume,color:buffer.bars[i].close>=buffer.bars[i].open?colors.up+'25':colors.down+'25'});
 const average=(values:(number|null)[])=>values.flatMap((value,i)=>value===null?[]:[{time:buffer.bars[i].time as UTCTimestamp,value}]);
 if(result.changed||changedTimeframe){
  if(!changedTimeframe&&result.incremental&&incrementalUpdates<200){incrementalUpdates++;for(let i=result.start;i<buffer.bars.length;i++){candles.update(candle(i));line.update(closing(i));volume.update(vol(i));if(buffer.ema20[i]!==null)ema20.update({time:buffer.bars[i].time as UTCTimestamp,value:buffer.ema20[i]!});if(buffer.ema50[i]!==null)ema50.update({time:buffer.bars[i].time as UTCTimestamp,value:buffer.ema50[i]!});}}
  else{incrementalUpdates=0;candles.setData(buffer.bars.map((_,i)=>candle(i)));line.setData(buffer.bars.map((_,i)=>closing(i)));volume.setData(buffer.bars.map((_,i)=>vol(i)));ema20.setData(average(buffer.ema20));ema50.setData(average(buffer.ema50));}
 }
 if(changedTimeframe||lastCount!==count)chart!.timeScale().setVisibleLogicalRange({from:Math.max(0,buffer.bars.length-count),to:buffer.bars.length+3});
 timeframe=tf;lastCount=count;
},resize(){if(chart){chart.applyOptions({width:container.clientWidth,height:container.clientHeight});}}};


function recolor(){colors=palette();if(!chart)return;chart.applyOptions({layout:{background:{type:ColorType.Solid,color:colors.bg},textColor:colors.text},grid:{vertLines:{color:colors.grid},horzLines:{color:colors.grid}},timeScale:{borderColor:colors.line},rightPriceScale:{borderColor:colors.line}});candles.applyOptions({upColor:colors.up,downColor:colors.down,wickUpColor:colors.up,wickDownColor:colors.down});line.applyOptions({color:colors.accent});ema20.applyOptions({color:colors.accent});ema50.applyOptions({color:colors.second});volume.setData(buffer.bars.map(b=>({time:b.time as UTCTimestamp,value:b.volume,color:(b.close>=b.open?colors.up:colors.down)+'25'})));}
window.addEventListener('omega-theme',recolor);
if(import.meta.hot)import.meta.hot.dispose(()=>window.removeEventListener('omega-theme',recolor));
