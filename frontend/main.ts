import './interface.css';
import './workspace';
import './legacy/risk-core.js';
import {lazyModule} from './shared/lazy';
import type {Candle,Timeframe} from './core/types';
const report=(label:string,error:unknown)=>{const alert=document.getElementById('global-alert');if(alert){alert.hidden=false;alert.textContent=label+' : '+String(error);}};
// The UI can render before the financial chart module has arrived.
let queued:[Candle[],Timeframe,'candles'|'line',number]|null=null;
const chart=lazyModule(()=>import('./charts/market-chart'));
const loadChart=()=>chart().then(()=>{if(queued){const args=queued;queued=null;window.TradingChart.render(...args);}}).catch(e=>report('Graphique indisponible',e));
window.TradingChart={render(...args){queued=args;void loadChart();},resize(){}};
async function start(){
 if(document.documentElement.dataset.runtime==='local')await import('./legacy/local-adapter.js');else await import('./legacy/browser-engine.js');
 await import('./core/controller');
 const research=lazyModule(()=>import('./research'));
 const runner=lazyModule(()=>import('./runner-ui'));
 const dashboard=lazyModule(()=>import('./bot-dashboard'));
 const depth=lazyModule(()=>import('./visuals/depth-scene'));
 const exchange=lazyModule(()=>import('./exchange'));
 const connection=lazyModule(()=>import('./wallet-connection'));
 document.addEventListener('click',event=>{
  if(!(event.target instanceof Element)||!event.target.closest('[data-wallet-connect]'))return;
  event.preventDefault();location.hash='pilot';
  void connection().then(module=>module.connect()).catch(e=>report('Connexion MetaMask indisponible',e));
 });
 const manual=document.querySelector<HTMLDetailsElement>('.execution-details')!;
 const connect=document.getElementById('testnet-connect') as HTMLButtonElement;
 connect.disabled=true;
 const loadExchange=()=>{if(!manual.open||!window.BrowserAtelier.environment)return;manual.setAttribute('aria-busy','true');void exchange().then(()=>{connect.disabled=false;manual.removeAttribute('aria-busy');}).catch(e=>{manual.removeAttribute('aria-busy');report('Signature wallet indisponible',e);});};
 const route=()=>{
  const view=location.hash.slice(1)||'terminal';
  if(view==='terminal'){void loadChart();void depth().catch(e=>report('Vue de liquidité indisponible',e));}
  if(view==='pilot'||view==='wallet')void connection().catch(e=>report('Connexion wallet indisponible',e));
  if(view==='research')void research().catch(e=>report('Recherche indisponible',e));
  if(view==='pilot'){void dashboard().catch(e=>report('Vue du bot indisponible',e));void runner().catch(e=>report('Pilotage indisponible',e));loadExchange();}
 };
 manual.addEventListener('toggle',loadExchange);
 window.addEventListener('hashchange',route);
 await import('./legacy/ui.js');
 await import('./network');
 route();
}
start().catch(e=>report('Initialisation interrompue',e));
