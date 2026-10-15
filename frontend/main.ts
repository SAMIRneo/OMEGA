import './interface.css';
import './workspace';
import './shortcuts';
import './legacy/risk-core.js';
import './charts/market-chart';
async function start(){
if(document.documentElement.dataset.runtime==='local'){await import('./legacy/local-adapter.js');}else{await import('./legacy/browser-engine.js');}
await import('./core/controller');
await import('./legacy/decision-viz.js');
await import('./legacy/ui.js');
await import('./research');
await import('./network');
if(window.BrowserAtelier.environment?.id==='testnet')await import('./testnet');

}
start().catch(e=>{const alert=document.getElementById("global-alert");if(alert){alert.hidden=false;alert.textContent="Initialisation interrompue : "+String(e);}});
