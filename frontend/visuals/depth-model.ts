import type {Snapshot} from '../core/types';
export interface DepthLevel {side:'bid'|'ask';rank:number;price:number;size:number;cumulative:number}
export function depthModel(book:Snapshot['market']['book']):DepthLevel[]{
 if(!book||!Array.isArray(book.levels)||book.levels.length!==2)return [];
 const rows=book.levels.flatMap((levels,side)=>{let cumulative=0;return levels.slice(0,12).flatMap((level,rank)=>{const price=+level.px,size=+level.sz;if(!Number.isFinite(price)||!Number.isFinite(size)||price<=0||size<=0)return [];cumulative+=size;return [{side:side===0?'bid' as const:'ask' as const,rank,price,size,cumulative}];});});
 return rows;
}
