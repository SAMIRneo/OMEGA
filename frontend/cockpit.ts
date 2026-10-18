import {subscribeMarket} from './shared/market-store';
import {subscribeRunner,type RunnerView} from './shared/runner-store';
import {formatNumber} from './shared/format';
import {cockpitModel,type CapitalSource} from './core/cockpit';
import {executionLabel} from './core/bot-view';
import type {Snapshot} from './core/types';
const $=(id:string)=>document.getElementById(id)!;
let snapshot:Snapshot|null=null,runner:RunnerView={connected:false},range:number|null=7,source:CapitalSource='paper';
const put=(id:string,text:string)=>{if($(id).textContent!==text)$(id).textContent=text;};
const signed=(n:number|null)=>n===null?'—':(n>=0?'+':'−')+formatNumber(Math.abs(n));
let positionsKey='',curveKey='',eventsKey='';
function render(){
 if(!snapshot||$('view-cockpit').hidden)return;
 const s=snapshot,m=cockpitModel(s,source,range),paper=source==='paper';
 const network=window.BrowserAtelier.environment?.id;
 const confirmed=runner.connected&&runner.network===network;
 const state=executionLabel(confirmed?runner:{connected:false});
 const capitalText=m.equity===null?'—':formatNumber(m.equity,2);put('cockpit-equity',capitalText);$('cockpit-equity').style.setProperty('--capital-chars',String(Math.max(6,capitalText.length)));
 put('cockpit-capital-label',paper?'Capital simulé':'Capital du compte perpétuel');
 put('cockpit-source-note',paper?'Simulation locale · fonds fictifs':m.equity===null?'Compte non consulté ou lecture ancienne':'Compte '+(network==='testnet'?'testnet · fonds de test':'mainnet · fonds réels')+' · lecture seule');
 put('cockpit-performance',paper?signed(m.pnl)+' USDC'+(m.percent===null?'':' · '+signed(m.percent)+' %'):'Aucune performance déduite du solde');
 $('cockpit-performance').dataset.tone=m.pnl!==null&&m.pnl<0?'down':'up';
 put('cockpit-curve-note',paper?(m.closed?m.closed+' clôture'+(m.closed>1?'s':'')+' sur la période · capital valorisé actuellement':'Aucune clôture sur la période · capital actuel'):'Consulte le compte pour ses positions. Aucun historique de capital exchange n’est reconstruit.');
 const key=JSON.stringify(m.points);
 if(key!==curveKey){curveKey=key;const svg=$('cockpit-curve'),ns='http://www.w3.org/2000/svg';svg.replaceChildren();if(m.points.length){const values=m.points.map(p=>p.value),low=Math.min(...values),high=Math.max(...values),span=high-low;const points=m.points.map((p,i)=>[i/Math.max(1,m.points.length-1)*800,span?168-(p.value-low)/span*140:95]);const path=points.map(([x,y],i)=>(i?'L':'M')+x.toFixed(2)+','+y.toFixed(2)).join(' '),area=document.createElementNS(ns,'path'),line=document.createElementNS(ns,'path');area.setAttribute('d',path+' L800,190 L0,190 Z');area.setAttribute('class','capital-area');line.setAttribute('d',path);line.setAttribute('class','capital-line');svg.append(area,line);svg.setAttribute('aria-label','Capital simulé : de '+formatNumber(values[0])+' à '+formatNumber(values.at(-1)!)+' USDC sur la période sélectionnée.');}else svg.setAttribute('aria-label','Historique du capital du compte indisponible.');}
 put('cockpit-bot-state',({offline:'À connecter',blocked:'À vérifier',live:'En marche',watch:'Surveillance',idle:'À l’arrêt'})[state.tone as 'offline'|'blocked'|'live'|'watch'|'idle']);
 $('cockpit-bot').dataset.tone=state.tone;put('cockpit-bot-detail',state.detail);
 put('cockpit-strategy',({balanced:'Daily · équilibré',selective:'Daily · sélectif',aggressive:'Daily · offensif'})[s.limits.strategy_profile??'balanced']);
 put('cockpit-network',network==='testnet'?'Testnet':'Mainnet');put('cockpit-leverage','×'+s.limits.leverage+' maximum');
 put('cockpit-attempts-label',paper?'Tentatives simulées':'Tentatives exchange');put('cockpit-attempts',paper?s.paper.entriesToday+' / '+s.limits.max_entries_per_day:'Dans les commandes du bot');
 ($('cockpit-stop') as HTMLButtonElement).disabled=!confirmed||(!runner.active&&!runner.owned);
 const posKey=JSON.stringify([source,m.accountFresh,m.positions]);if(posKey!==positionsKey){positionsKey=posKey;const root=$('cockpit-positions');root.replaceChildren();if(!m.positions.length){const row=document.createElement('tr'),cell=document.createElement('td');cell.colSpan=5;cell.className='cockpit-empty';cell.textContent=paper?'Aucune position simulée ouverte.':m.equity===null?'Consulte ton compte pour voir ses positions ETH.':'Aucune position ETH sur le compte consulté.';row.append(cell);root.append(row);}else for(const p of m.positions){const row=document.createElement('tr');[p.asset,p.side,formatNumber(p.quantity,4),formatNumber(p.entry),signed(p.pnl)].forEach((text,index)=>{const cell=document.createElement('td');cell.textContent=text;if(index===4)cell.className=p.pnl>=0?'positive':'negative';row.append(cell);});root.append(row);}}
 const evaluation=window.PaperPilot.evaluate(s);put('cockpit-signal-title',evaluation.status==='eligible'?'Configuration Daily observée':evaluation.status==='blocked'?'Le moteur attend ses conditions':'Observer avant d’agir.');
 put('cockpit-signal-detail',evaluation.reasons.join(' · '));put('cockpit-signal-note','Diagnostic sur bougies clôturées · '+(s.market.fresh?'marché récent':'flux à vérifier'));
 put('cockpit-exposure',m.exposure===null?'—':formatNumber(m.exposure,1)+' %');($('cockpit-exposure-meter') as HTMLProgressElement).value=m.exposure??0;$('cockpit-exposure-meter').hidden=m.exposure===null;
 const lossLimit=s.limits.daily_loss_limit;put('cockpit-loss',paper?(m.dailyLoss===null?'—':formatNumber(m.dailyLoss)+' USDC'):'Voir le suivi exchange');put('cockpit-loss-limit','Limite '+formatNumber(lossLimit,0)+' USDC / jour');const loss=$('cockpit-loss-meter') as HTMLProgressElement;loss.max=lossLimit;loss.value=m.dailyLoss??0;loss.hidden=m.dailyLoss===null;
 put('cockpit-risk-source',paper?'Mesures de la simulation locale. Marge autorisée ≤ 50 % ; risque calibré au stop.':'Marge du compte consulté. Les pertes réalisées exchange ne sont pas déduites du solde.');
 const events=paper?(window.PaperPilot.state?.events??[]):confirmed?(runner.events??[]):[];const latest=events.filter(e=>Number.isFinite(e.at)).slice(-4).reverse(),eventKey=JSON.stringify([source,latest]);if(eventKey!==eventsKey){eventsKey=eventKey;const root=$('cockpit-decisions');root.replaceChildren();if(!latest.length){const li=document.createElement('li');li.className='cockpit-empty';li.textContent=paper?'Aucune décision de simulation enregistrée sur cet appareil.':'Relie le moteur pour consulter ses décisions confirmées.';root.append(li);}else for(const event of latest){const row=document.createElement('li'),time=document.createElement('time'),message=document.createElement('span');time.dateTime=new Date(event.at).toISOString();time.textContent=new Date(event.at).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'});message.textContent=event.message;row.append(time,message);root.append(row);}}
}
const offMarket=subscribeMarket(s=>{snapshot=s;render();}),offRunner=subscribeRunner(s=>{runner=s;render();});
$('cockpit-source').addEventListener('change',event=>{source=(event.target as HTMLSelectElement).value==='account'?'account':'paper';render();});
$('cockpit-ranges').addEventListener('click',event=>{const button=(event.target as Element).closest<HTMLButtonElement>('[data-capital-range]');if(!button)return;range=button.dataset.capitalRange==='all'?null:Number(button.dataset.capitalRange);document.querySelectorAll('[data-capital-range]').forEach(el=>el.setAttribute('aria-pressed',String(el===button)));render();});
$('cockpit-stop').addEventListener('click',()=>{const stop=$('runner-stop') as HTMLButtonElement;if(!stop.disabled)stop.click();});
window.addEventListener('hashchange',render);
if(import.meta.hot)import.meta.hot.dispose(()=>{offMarket();offRunner();window.removeEventListener('hashchange',render);});
