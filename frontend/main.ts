import './interface.css';
import './theme';
import './workspace';
import './legacy/risk-core.js';
import {lazyModule} from './shared/lazy';
import {createFeatureLoader} from './shared/feature-loader';
import type {Candle,Timeframe} from './core/types';
const features=createFeatureLoader(document);
const report=features.report;
// The UI can render before the financial chart module has arrived.
let queued:[Candle[],Timeframe,'candles'|'line',number]|null=null;
const chart=lazyModule(()=>import('./charts/market-chart'));
const loadChart=()=>features.load('Graphique indisponible',()=>chart().then(()=>{if(queued){const args=queued;queued=null;window.TradingChart.render(...args);}}));
window.TradingChart={render(...args){queued=args;void loadChart();},resize(){}};
async function start(){
 if(document.documentElement.dataset.runtime==='local')await import('./legacy/local-adapter.js');else await import('./legacy/browser-engine.js');
 await import('./core/controller');
 const cockpit=lazyModule(()=>import('./cockpit'));
 const research=lazyModule(()=>import('./research'));
 const runner=lazyModule(()=>import('./runner-ui'));
 const dashboard=lazyModule(()=>import('./bot-dashboard'));
 const depth=lazyModule(()=>import('./visuals/liquidity'));
 const exchange=lazyModule(()=>import('./exchange'));
 const dataSettings=lazyModule(()=>import('./data-settings'));
 const connection=lazyModule(()=>import('./wallet-connection'));
 document.addEventListener('click',event=>{
  if(!(event.target instanceof Element)||!event.target.closest('[data-wallet-connect]'))return;
  event.preventDefault();location.hash='pilot';
  void connection().then(module=>module.connect()).catch(e=>report('Connexion MetaMask indisponible',e));
 });
 const manual=document.querySelector<HTMLDetailsElement>('.execution-details')!;
 const connect=document.getElementById('testnet-connect') as HTMLButtonElement;
 connect.disabled=true;
 const loadExchange=()=>{if(!manual.open||!window.BrowserAtelier.environment)return;manual.setAttribute('aria-busy','true');void features.load('Outils manuels indisponibles',()=>exchange().then(()=>{connect.disabled=false;})).finally(()=>manual.removeAttribute('aria-busy'));};
 const route=()=>{
  const view=location.hash.slice(1)||'cockpit';
  if(view==='cockpit'){void features.load('Cockpit indisponible',cockpit);void features.load('Pilotage indisponible',runner);}
  if(view==='terminal'){void loadChart();void features.load('Vue de liquidité indisponible',depth);}
  if(view==='wallet'||view==='journal')void features.load('Sauvegardes indisponibles',dataSettings);
  if(view==='pilot'||view==='wallet')void features.load('Connexion wallet indisponible',connection);
  if(view==='research')void features.load('Recherche indisponible',research);
  if(view==='pilot'){void features.load('Vue du bot indisponible',dashboard);void features.load('Pilotage indisponible',runner);loadExchange();}
 };
 manual.addEventListener('toggle',loadExchange);
 window.addEventListener('hashchange',route);
 await import('./legacy/ui.js');
 await import('./network');
 route();
}
start().catch(e=>report('Initialisation interrompue',e));
