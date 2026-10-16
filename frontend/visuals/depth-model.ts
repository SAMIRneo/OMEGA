import type {Snapshot} from '../core/types';
export interface DepthLevel {side:'bid'|'ask';rank:number;price:number;size:number;cumulative:number;x:number;z:number;height:number}
export function depthModel(book:Snapshot['market']['book']):DepthLevel[]{
 if(!book||!Array.isArray(book.levels)||book.levels.length!==2)return [];
 const rows=book.levels.flatMap((levels,side)=>{let cumulative=0;return levels.slice(0,12).flatMap((level,rank)=>{const price=+level.px,size=+level.sz;if(!Number.isFinite(price)||!Number.isFinite(size)||price<=0||size<=0)return [];cumulative+=size;return [{side:side===0?'bid' as const:'ask' as const,rank,price,size,cumulative,x:side===0?-0.8:0.8,z:(rank-5.5)*.3,height:0}];});});
 const max=Math.max(1,...rows.map(row=>row.size));return rows.map(row=>({...row,height:Math.max(.045,row.size/max*1.7)}));
}
export function projectPoint(x:number,y:number,z:number,yaw:number,tilt:number,w:number,h:number){
 const cy=Math.cos(yaw),sy=Math.sin(yaw),ct=Math.cos(tilt),st=Math.sin(tilt),rx=x*cy-z*sy,rz=x*sy+z*cy,ry=y*ct-rz*st,depth=y*st+rz*ct;
 const scale=Math.min(w/5.1,h/3.5),perspective=7/(7+depth);
 return {x:w*.5+rx*scale*perspective,y:h*.64-ry*scale*perspective,depth};
}
