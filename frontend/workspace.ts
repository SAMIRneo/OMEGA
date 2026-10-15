import {diagnose} from './core/diagnostics';
import type {Snapshot} from './core/types';
const $=(id:string)=>document.getElementById(id)!;
const number=(n:number,digits=2)=>Number.isFinite(n)?n.toLocaleString('fr-FR',{maximumFractionDigits:digits,minimumFractionDigits:digits}):'—';
const set=(id:string,value:string)=>{const el=$(id);if(el.textContent!==value)el.textContent=value;};
let diagnosticsKey='',curveKey='';
document.querySelector('a[href="#bot-controls"]')?.addEventListener('click',event=>{
 event.preventDefault();
 $('bot-controls').scrollIntoView({block:'center',behavior:'instant'});
 $('bot-start').focus({preventScroll:true});
});

window.addEventListener('axiom-state',((event:CustomEvent<Snapshot>)=>{
 const s=event.detail,e=window.PaperPilot.state.evaluation??window.PaperPilot.evaluate(s),checks=diagnose(s,e,!!window.RiskCore?.exports);
 const passed=checks.filter(c=>c.state==='pass').length;
 set('system-health',s.market.fresh?'Données en direct':'Données à vérifier');
 set('system-health-detail',passed+' / '+checks.length+' contrôles satisfaits');
 set('decision-title',e.status==='eligible'?'Une configuration remplit les règles':e.status==='blocked'?'Exécution indisponible':'Le moteur attend une configuration');
 set('decision-summary',e.reasons.join(' · '));
 set('decision-count',passed+' / '+checks.length);
 $('decision-count').setAttribute('aria-label',passed+' contrôles satisfaits sur '+checks.length+' ; ce nombre n’est pas une probabilité');
 const next=(Math.floor(s.time/900)+1)*900,remaining=Math.max(0,Math.ceil(next-s.time));
 set('next-close',Math.floor(remaining/60).toString().padStart(2,'0')+':'+(remaining%60).toString().padStart(2,'0'));
 set('next-close-time',new Date(next*1000).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit',timeZone:'UTC'})+' UTC');
 const state=window.PaperPilot.state;
 set('pilot-mode',state.active?(state.paused?'Surveillance suspendue':'Surveillance active'):'Observation');
 set('pilot-mode-detail',state.active?state.reason:'L’armement reste manuel. Le diagnostic se met à jour en continu.');
 const key=JSON.stringify(checks);
 if(key!==diagnosticsKey){diagnosticsKey=key;const rows=checks.map((c,i)=>{const row=document.createElement('li');row.className='decision-step '+c.state;const index=document.createElement('span');index.className='step-index';index.textContent=String(i+1).padStart(2,'0');const content=document.createElement('div'),label=document.createElement('strong'),detail=document.createElement('p'),status=document.createElement('span');label.textContent=c.label;detail.textContent=c.detail;status.className='step-status';status.textContent=c.state==='pass'?'Validé':c.state==='blocked'?'Bloqué':'En attente';content.append(label,detail);row.append(index,content,status);return row;});$('decision-checklist').replaceChildren(...rows);}
 const h=s.paper.history,net=h.reduce((sum,x)=>sum+Number(x.netPnl),0),grossGains=h.reduce((sum,x)=>sum+Math.max(0,Number(x.netPnl)),0),grossLosses=h.reduce((sum,x)=>sum+Math.min(0,Number(x.netPnl)),0);
 set('journal-net',number(net)+' USDC');set('journal-average',h.length?number(net/h.length)+' USDC':'—');
 set('journal-gains',number(grossGains)+' USDC');set('journal-losses',number(grossLosses)+' USDC');
 set('journal-observation',h.length?h.length+' position'+(h.length>1?'s':'')+' clôturée'+(h.length>1?'s':'')+' sur cet appareil. Données descriptives.':'Aucune position clôturée. La courbe apparaîtra au fil des simulations.');
 set('wallet-connection',s.account?'Compte consulté':'Aucun compte relié');
 set('wallet-read-time',s.accountTime?new Date(s.accountTime*1000).toLocaleTimeString('fr-FR'):'En attente de ton adresse publique');
 const keyCurve=JSON.stringify(h.map(x=>x.netPnl))+':'+s.paper.initial;
 if(keyCurve!==curveKey){curveKey=keyCurve;const ns='http://www.w3.org/2000/svg';let equity=s.paper.initial;const points=[equity,...h.map(x=>(equity+=Number(x.netPnl)))],low=Math.min(...points),high=Math.max(...points),range=high-low||1;
  const svg=$('equity-curve'),line=document.createElementNS(ns,'polyline');line.setAttribute('points',points.map((p,i)=>`${24+i/Math.max(1,points.length-1)*752},${170-(p-low)/range*130}`).join(' '));line.setAttribute('fill','none');line.setAttribute('stroke','currentColor');line.setAttribute('stroke-width','3');line.setAttribute('vector-effect','non-scaling-stroke');
  svg.replaceChildren();if(h.length){svg.append(line);svg.setAttribute('aria-label','Équité après chaque clôture : '+number(s.paper.initial)+' à '+number(equity)+' USDC. Les creux pendant les positions ne sont pas représentés.');}
  svg.classList.toggle('curve-empty',!h.length);
 }
}) as EventListener);

