import type {Candle} from '../core/types';
export interface Bar {time:number;open:number;high:number;low:number;close:number;volume:number}
const equal=(a:Bar|undefined,b:Bar)=>!!a&&a.time===b.time&&a.open===b.open&&a.high===b.high&&a.low===b.low&&a.close===b.close&&a.volume===b.volume;
export class ChartBuffer {
 bars:Bar[]=[];ema20:(number|null)[]=[];ema50:(number|null)[]=[];
 update(raw:Candle[]){
  let bars:Bar[]=[],ordered=true;
  for(const b of raw){const values=[+b.t,+b.o,+b.h,+b.l,+b.c,+b.v];if(!values.every(Number.isFinite)||values[0]<0||values[1]<=0||values[3]<=0||values[2]<Math.max(values[1],values[4])||values[3]>Math.min(values[1],values[4])||values[5]<0)continue;
   const point={time:Math.floor(values[0]/1000),open:values[1],high:values[2],low:values[3],close:values[4],volume:values[5]};if(bars.length&&point.time<=bars.at(-1)!.time)ordered=false;bars.push(point);
  }
  if(!ordered)bars=Array.from(new Map(bars.map(b=>[b.time,b])).values()).sort((a,b)=>a.time-b.time);
  const oldLength=this.bars.length;let changed=0;while(changed<bars.length&&equal(this.bars[changed],bars[changed]))changed++;
  if(changed===bars.length&&oldLength===bars.length)return {changed:false,incremental:false,start:changed};
  const incremental=oldLength>0&&bars.length>=oldLength&&bars.length<=oldLength+1&&changed>=oldLength-1;
  this.bars=bars;
  for(const [period,values] of [[20,this.ema20],[50,this.ema50]] as const){values.length=bars.length;for(let i=changed;i<bars.length;i++)values[i]=i<period-1?null:i===period-1?bars.slice(0,period).reduce((sum,b)=>sum+b.close,0)/period:values[i-1]!+2/(period+1)*(bars[i].close-values[i-1]!);}
  return {changed:true,incremental,start:changed};
 }
}
