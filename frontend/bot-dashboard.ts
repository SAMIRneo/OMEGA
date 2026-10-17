import {sessionBlock} from './core/session.js';
import {subscribeMarket} from './shared/market-store';
import {subscribeRunner,type RunnerView} from './shared/runner-store';
import {formatNumber} from './shared/format';
import {horizonReading,executionLabel} from './core/bot-view';
import type {Snapshot} from './core/types';
const $=(id:string)=>document.getElementById(id)!;
let snapshot:Snapshot|null=null,runner:RunnerView={connected:false},selected:'1d'|'1h'|'15m'='1d',eventsKey='';
const put=(id:string,text:string)=>{const el=$(id);if(el.textContent!==text)el.textContent=text;};
const names={bullish:'Haussier',bearish:'Baissier',neutral:'Neutre'};
function render(){
 const status=executionLabel(runner);put('bot-execution-badge',status.label);$('bot-execution-badge').dataset.tone=status.tone;
 put('bot-activity-source',runner.connected?'SERVICE / '+(runner.network??'').toUpperCase():'SERVICE NON RELIÉ');
 const events=runner.connected?(runner.events??[]).slice(-30).reverse():[],key=JSON.stringify([runner.connected,events]);
 if(key!==eventsKey){eventsKey=key;const list=$('bot-activity-list');list.replaceChildren();if(!events.length){const row=document.createElement('li');row.className='activity-empty';row.textContent=runner.connected?'Aucun événement reçu pour ce service.':'Relie le service permanent pour consulter ses événements. Le journal de simulation reste dans Compte.';list.append(row);}else for(const event of events){const row=document.createElement('li'),time=document.createElement('time'),content=document.createElement('div'),dot=document.createElement('i'),text=document.createElement('p');time.dateTime=new Date(event.at).toISOString();time.textContent=new Date(event.at).toLocaleTimeString('fr-FR');text.textContent=event.message;content.append(dot,text);row.append(time,content);list.append(row);}}
 if(!snapshot)return;const connected=window.ExchangeSnapshot?.(snapshot),s=connected??snapshot,e=window.PaperPilot.evaluate(s);
 const target=s.limits.daily_profit_target??200,pnl=s.paper.dailyPnl;
 put('session-pnl',(pnl>=0?'+':'')+formatNumber(pnl)+' USDC');$('session-pnl').className=pnl>=0?'positive':'negative';
 put('session-goal','+'+target+' USDC');put('session-entries',s.paper.entriesToday+' / '+s.limits.max_entries_per_day);
 put('session-source',connected?'Compte Hyperliquid consulté':'Simulation de cet appareil');
 put('session-state',sessionBlock(s.paper,s.limits,s.time)??'Session disponible');
 const progress=$('session-progress') as HTMLProgressElement;progress.max=target;progress.value=Math.max(0,pnl);
 const readings=(['1d','1h','15m'] as const).map(tf=>({tf,...horizonReading(s,tf)}));
 const first=readings[0],aligned=readings.filter(r=>r.fresh&&first.fresh&&first.trend!=='neutral'&&r.trend===first.trend).length;
 put('bot-observer-health',s.market.fresh?'Flux ETH en direct':'Flux ETH à vérifier');$('view-pilot').dataset.market=s.market.fresh?'live':'stale';
 put('bot-signal-status',e.status==='eligible'?'CONFIGURATION OBSERVÉE':e.status==='blocked'?'CONDITIONS INCOMPLÈTES':'EN OBSERVATION');
 put('bot-alignment',readings.every(r=>r.fresh)?aligned+' / 3':'— / 3');put('bot-alignment-detail',readings.every(r=>r.fresh)?aligned===3?'Contexte et structures concordants':'Les trois horizons ne concordent pas':'Historique récent requis sur chaque horizon');
 $('bot-alignment-ticks').querySelectorAll('i').forEach((el,i)=>el.classList.toggle('aligned',readings[i].fresh&&first.fresh&&first.trend!=='neutral'&&readings[i].trend===first.trend));
 const elapsed=((s.time%900)+900)%900;($('bot-close-progress') as HTMLElement).style.width=(elapsed/900*100)+'%';
 for(const [index,id] of ['bot-horizon-day','bot-horizon-hour','bot-horizon-minute'].entries()){const r=readings[index];put(id,r.fresh?names[r.trend]:'En attente');}
 const reading=readings.find(r=>r.tf===selected)!;put('bot-horizon-label',({'1d':'Contexte journalier','1h':'Tendance horaire','15m':'Structure de déclenchement'})[selected]);
 put('bot-horizon-detail',reading.fresh?names[reading.trend]+(reading.rsi!==null?' · RSI '+formatNumber(reading.rsi,1):'')+' · bougie clôturée':'Historique absent ou ancien. Aucun état de tendance déduit.');

}
const offMarket=subscribeMarket(s=>{snapshot=s;render();}),offRunner=subscribeRunner(s=>{runner=s;render();});
function show(tab:string,focus=false){if(!['overview','settings','activity'].includes(tab))return;document.querySelectorAll<HTMLButtonElement>('[data-bot-tab]').forEach(button=>{const active=button.dataset.botTab===tab;button.setAttribute('aria-selected',String(active));button.tabIndex=active?0:-1;if(active&&focus)button.focus();});document.querySelectorAll<HTMLElement>('[data-bot-panel]').forEach(panel=>panel.hidden=panel.dataset.botPanel!==tab);if(tab==='overview')render();}
for(const button of document.querySelectorAll<HTMLButtonElement>('[data-bot-tab]')){button.addEventListener('click',()=>show(button.dataset.botTab!));button.addEventListener('keydown',event=>{const tabs=['overview','settings','activity'],index=tabs.indexOf(button.dataset.botTab!);if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();show(event.key==='Home'?tabs[0]:event.key==='End'?tabs[2]:tabs[(index+(event.key==='ArrowRight'?1:2))%3],true);});}
for(const button of document.querySelectorAll<HTMLButtonElement>('[data-bot-horizon]'))button.addEventListener('click',()=>{selected=button.dataset.botHorizon as typeof selected;document.querySelectorAll('[data-bot-horizon]').forEach(el=>el.setAttribute('aria-pressed',String((el as HTMLElement).dataset.botHorizon===selected)));render();});
if(import.meta.hot)import.meta.hot.dispose(()=>{offMarket();offRunner();});
