import {createChart,CandlestickSeries,LineSeries,HistogramSeries,ColorType,CrosshairMode,type UTCTimestamp,type IChartApi} from 'lightweight-charts';
import type {Candle,Timeframe} from '../core/types';
import {ChartBuffer} from './data-buffer';
const buffer=new ChartBuffer();
const container=document.getElementById('chart')!;
let chart:IChartApi|null=null,timeframe:Timeframe|null=null,lastCount=0,lastMode='',incrementalUpdates=0;
let candles:ReturnType<IChartApi['addSeries']>,line:ReturnType<IChartApi['addSeries']>,ema20:ReturnType<IChartApi['addSeries']>,ema50:ReturnType<IChartApi['addSeries']>,volume:ReturnType<IChartApi['addSeries']>;
const time=(t:number)=>Math.floor(t/1000) as UTCTimestamp;
function setup(){if(chart)return;chart=createChart(container,{autoSize:true,layout:{background:{type:ColorType.Solid,color:'#101315'},textColor:'#9ca7a9',fontFamily:'OMEGA Mono, monospace',fontSize:11,attributionLogo:true},grid:{vertLines:{color:'#222a2d'},horzLines:{color:'#222a2d'}},crosshair:{mode:CrosshairMode.Normal},timeScale:{timeVisible:true,secondsVisible:false,borderColor:'#354145'},rightPriceScale:{borderColor:'#354145'},handleScale:{mouseWheel:true,pinch:true},handleScroll:{mouseWheel:true,pressedMouseMove:true,horzTouchDrag:true,vertTouchDrag:false}});
 candles=chart.addSeries(CandlestickSeries,{upColor:'#85d3b0',downColor:'#f08c96',borderVisible:false,wickUpColor:'#85d3b0',wickDownColor:'#f08c96'});
 line=chart.addSeries(LineSeries,{color:'#f4ae79',lineWidth:2,visible:false});
 ema20=chart.addSeries(LineSeries,{color:'#f4ae79',lineWidth:1,lastValueVisible:false,priceLineVisible:false});
 ema50=chart.addSeries(LineSeries,{color:'#b4b7d8',lineWidth:1,lastValueVisible:false,priceLineVisible:false});
 volume=chart.addSeries(HistogramSeries,{priceFormat:{type:'volume'},priceScaleId:'volume',lastValueVisible:false,priceLineVisible:false});
 chart.priceScale('volume').applyOptions({scaleMargins:{top:.82,bottom:0},visible:false});
}
window.TradingChart={render(raw,tf,mode,count){if(!raw.length||container.getBoundingClientRect().width===0)return;setup();
 const result=buffer.update(raw),changedTimeframe=timeframe!==tf;
 if(mode!==lastMode){candles.applyOptions({visible:mode==='candles'});line.applyOptions({visible:mode==='line'});lastMode=mode;}
 const candle=(i:number)=>{const b=buffer.bars[i];return {time:b.time as UTCTimestamp,open:b.open,high:b.high,low:b.low,close:b.close};};
 const closing=(i:number)=>({time:buffer.bars[i].time as UTCTimestamp,value:buffer.bars[i].close});
 const vol=(i:number)=>({time:buffer.bars[i].time as UTCTimestamp,value:buffer.bars[i].volume,color:buffer.bars[i].close>=buffer.bars[i].open?'#85d3b025':'#f08c9625'});
 const average=(values:(number|null)[])=>values.flatMap((value,i)=>value===null?[]:[{time:buffer.bars[i].time as UTCTimestamp,value}]);
 if(result.changed||changedTimeframe){
  if(!changedTimeframe&&result.incremental&&incrementalUpdates<200){incrementalUpdates++;for(let i=result.start;i<buffer.bars.length;i++){candles.update(candle(i));line.update(closing(i));volume.update(vol(i));if(buffer.ema20[i]!==null)ema20.update({time:buffer.bars[i].time as UTCTimestamp,value:buffer.ema20[i]!});if(buffer.ema50[i]!==null)ema50.update({time:buffer.bars[i].time as UTCTimestamp,value:buffer.ema50[i]!});}}
  else{incrementalUpdates=0;candles.setData(buffer.bars.map((_,i)=>candle(i)));line.setData(buffer.bars.map((_,i)=>closing(i)));volume.setData(buffer.bars.map((_,i)=>vol(i)));ema20.setData(average(buffer.ema20));ema50.setData(average(buffer.ema50));}
 }
 if(changedTimeframe||lastCount!==count)chart!.timeScale().setVisibleLogicalRange({from:Math.max(0,buffer.bars.length-count),to:buffer.bars.length+3});
 timeframe=tf;lastCount=count;
},resize(){if(chart){chart.applyOptions({width:container.clientWidth,height:container.clientHeight});}}};

