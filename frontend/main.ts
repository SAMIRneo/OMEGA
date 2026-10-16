import './interface.css';
import './workspace';
import './legacy/risk-core.js';
import './charts/market-chart';
async function start(){
if(document.documentElement.dataset.runtime==='local'){await import('./legacy/local-adapter.js');}else{await import('./legacy/browser-engine.js');}
await import('./core/controller');

await import('./legacy/ui.js');
await import('./research');
await import('./network');
await import('./runner-ui');
// Load wallet signing only when its workspace is visited.
if(window.BrowserAtelier.environment){
 let exchangeLoading:Promise<unknown>|null=null;
 const loadExchange=()=>{if(location.hash!=='#pilot'||exchangeLoading)return;exchangeLoading=import('./exchange').catch(error=>{exchangeLoading=null;const el=document.getElementById('global-alert')!;el.hidden=false;el.textContent='Connexion wallet indisponible : '+String(error);});};
 window.addEventListener('hashchange',loadExchange);loadExchange();
}


}
start().catch(e=>{const alert=document.getElementById("global-alert");if(alert){alert.hidden=false;alert.textContent="Initialisation interrompue : "+String(e);}});
