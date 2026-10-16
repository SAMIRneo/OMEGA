import {subscribeMarket} from '../shared/market-store';
import {formatNumber} from '../shared/format';
import {depthModel,projectPoint,type DepthLevel} from './depth-model';
import type {Snapshot} from '../core/types';
const canvas=document.getElementById('depth-scene') as HTMLCanvasElement,panel=document.getElementById('liquidity-panel')!;
const ctx=canvas.getContext('2d',{alpha:false});
let rows:DepthLevel[]=[],fresh=false,frame=0,dirty=true,visible=false,last=0,yaw=-.45,tilt=.45,selected=0,pointer:{x:number;y:number}|null=null,hit:{x:number;y:number;index:number}[]=[],signature='';
const reduced=matchMedia('(prefers-reduced-motion: reduce)'),memory=(navigator as Navigator & {deviceMemory?:number}).deviceMemory;
let paused=reduced.matches||(memory!==undefined&&memory<=4),dragged=false;
const $=(id:string)=>document.getElementById(id)!;
const pause=$('depth-pause') as HTMLButtonElement;
function setText(id:string,value:string){const el=$(id);if(el.textContent!==value)el.textContent=value;}
function describe(){const level=rows[selected];setText('depth-health',fresh?'Carnet récent':'Données indisponibles ou anciennes');panel.dataset.fresh=String(fresh);
 if(!level){setText('depth-selected-price','—');setText('depth-selected-size','En attente du carnet');setText('depth-selected-cumulative','—');return;}
 setText('depth-selected-side',(level.side==='bid'?'ACHAT':'VENTE')+' / NIVEAU '+String(level.rank+1).padStart(2,'0'));
 setText('depth-selected-price',formatNumber(level.price)+' USDC');setText('depth-selected-size',formatNumber(level.size,4)+' ETH à ce prix');setText('depth-selected-cumulative',formatNumber(level.cumulative,4)+' ETH');
}
function controls(){pause.textContent=paused?'Animer la vue':'Pause';pause.setAttribute('aria-pressed',String(!paused));}
function draw(now=0){
 if(!ctx)return;const box=canvas.getBoundingClientRect();if(!box.width||!box.height)return;
 const dpr=Math.min(devicePixelRatio||1,1.5),w=box.width,h=box.height;
 if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);}
 ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle='#040809';ctx.fillRect(0,0,w,h);
 const project=(x:number,y:number,z:number)=>projectPoint(x,y,z,yaw,tilt,w,h);
 ctx.lineWidth=1;ctx.strokeStyle='#1c302d';
 for(let i=-6;i<=6;i++){const p=project(-1.5,0,i*.3),q=project(1.5,0,i*.3);ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);ctx.stroke();}
 for(const x of [-1.5,-.8,0,.8,1.5]){const p=project(x,0,-1.8),q=project(x,0,1.8);ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);ctx.stroke();}
 const faces:{points:ReturnType<typeof project>[];depth:number;colour:string;stroke:string}[]=[];hit=[];
 rows.forEach((row,index)=>{
  const x=row.x,z=row.z,y=row.height,dx=.27,dz=.105,p=[project(x-dx,0,z-dz),project(x+dx,0,z-dz),project(x+dx,0,z+dz),project(x-dx,0,z+dz),project(x-dx,y,z-dz),project(x+dx,y,z-dz),project(x+dx,y,z+dz),project(x-dx,y,z+dz)];
  const isBid=row.side==='bid',colours=fresh?(isBid?['#184a39','#247453','#60e6ae']:['#562332','#8a3f55','#ff95ac']):['#1b2227','#273039','#758797'];
  for(const [indices,shade] of [[[0,1,5,4],0],[[1,2,6,5],1],[[2,3,7,6],0],[[3,0,4,7],1],[[4,5,6,7],2]] as [number[],number][]){const points=indices.map(i=>p[i]);faces.push({points,depth:points.reduce((sum,q)=>sum+q.depth,0)/4,colour:colours[shade],stroke:index===selected?'#e0fff5':isBid?'#69d6ac30':'#ffb3c630'});}
  const top=project(x,y,z);hit.push({...top,index});
 });
 faces.sort((a,b)=>b.depth-a.depth);for(const face of faces){ctx.beginPath();face.points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();ctx.fillStyle=face.colour;ctx.fill();ctx.strokeStyle=face.stroke;ctx.lineWidth=.8;ctx.stroke();}
 const level=rows[selected];if(level){const point=project(level.x,level.height,level.z);ctx.strokeStyle='#d8fff1';ctx.lineWidth=1;ctx.beginPath();ctx.arc(point.x,point.y-8,4,0,Math.PI*2);ctx.stroke();}
 if(!rows.length){ctx.fillStyle='#b6c6ce';ctx.font='13px sans-serif';ctx.textAlign='center';ctx.fillText('En attente du carnet ETH',w/2,h/2);}
 ctx.font='10px ui-monospace,monospace';ctx.textAlign='left';ctx.fillStyle='#8caea2';ctx.fillText('ACHATS',18,h-16);ctx.textAlign='right';ctx.fillStyle='#d49dab';ctx.fillText('VENTES',w-18,h-16);
 dirty=false;last=now;
}
function loop(now:number){frame=0;if(document.hidden||!visible)return;
 const animated=!paused&&fresh&&!pointer;
 if(now-last>=50&&(dirty||animated)){if(animated)yaw+=.0015;draw(now);}
 if(animated||dirty)frame=requestAnimationFrame(loop);
}
function schedule(){dirty=true;if(!frame&&visible&&!document.hidden)frame=requestAnimationFrame(loop);}
function update(snapshot:Snapshot){
 const key=JSON.stringify([snapshot.market.fresh,snapshot.market.book?.levels]);if(key===signature)return;signature=key;fresh=snapshot.market.fresh;rows=depthModel(snapshot.market.book);selected=Math.min(selected,Math.max(0,rows.length-1));describe();schedule();
 const bid=rows.filter(x=>x.side==='bid').reduce((sum,x)=>sum+x.size,0),ask=rows.filter(x=>x.side==='ask').reduce((sum,x)=>sum+x.size,0);setText('depth-visible-buy',formatNumber(bid,2)+' ETH');setText('depth-visible-sell',formatNumber(ask,2)+' ETH');
}
const unsubscribe=subscribeMarket(update);
const observer=typeof IntersectionObserver==='function'?new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible)schedule();else{cancelAnimationFrame(frame);frame=0;}},{rootMargin:'80px'}):null;
observer?.observe(panel);if(!observer){visible=true;schedule();}
const resize=new ResizeObserver(schedule);resize.observe(canvas);
const visibility=()=>{if(document.hidden){cancelAnimationFrame(frame);frame=0;}else schedule();};document.addEventListener('visibilitychange',visibility);
const reducedChange=()=>{if(reduced.matches)paused=true;controls();schedule();};reduced.addEventListener('change',reducedChange);
pause.addEventListener('click',()=>{paused=!paused;controls();schedule();});
$('depth-reset').addEventListener('click',()=>{yaw=-.45;tilt=.45;selected=0;describe();schedule();});
canvas.addEventListener('pointerdown',event=>{pointer={x:event.clientX,y:event.clientY};dragged=false;canvas.setPointerCapture(event.pointerId);});
canvas.addEventListener('pointermove',event=>{if(!pointer)return;const dx=event.clientX-pointer.x,dy=event.clientY-pointer.y;if(Math.abs(dx)+Math.abs(dy)>2)dragged=true;yaw+=dx*.009;tilt=Math.max(.15,Math.min(1.05,tilt+dy*.006));pointer={x:event.clientX,y:event.clientY};schedule();});
canvas.addEventListener('pointerup',event=>{pointer=null;if(!dragged){const box=canvas.getBoundingClientRect(),x=event.clientX-box.left,y=event.clientY-box.top;let distance=Infinity;for(const p of hit){const d=Math.hypot(x-p.x,y-p.y);if(d<distance){distance=d;selected=p.index;}}describe();}schedule();});
canvas.addEventListener('pointercancel',()=>{pointer=null;schedule();});
canvas.addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','Home'].includes(event.key))return;event.preventDefault();if(!rows.length)return;selected=event.key==='Home'?0:(selected+(event.key==='ArrowRight'?1:rows.length-1))%rows.length;describe();schedule();});
controls();describe();
if(import.meta.hot)import.meta.hot.dispose(()=>{unsubscribe();observer?.disconnect();resize.disconnect();cancelAnimationFrame(frame);document.removeEventListener('visibilitychange',visibility);reduced.removeEventListener('change',reducedChange);});
