import './style.css';
import './atelier.css';
import './legacy/risk-core.js';
import './charts/market-chart';
async function start(){
if(document.documentElement.dataset.runtime==='local'){await import('./legacy/local-adapter.js');}else{await import('./legacy/browser-engine.js');}
await import('./core/controller');
await import('./legacy/decision-viz.js');
await import('./legacy/ui.js');

}
start().catch(e=>{const alert=document.getElementById("global-alert");if(alert){alert.hidden=false;alert.textContent="Initialisation interrompue : "+String(e);}});
