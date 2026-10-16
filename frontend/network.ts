import type {Snapshot} from './core/types';
const api=window.BrowserAtelier,environment=api.environment;
const select=document.getElementById('network-select') as HTMLSelectElement;
const status=document.getElementById('connection-detail')!;
if(!environment){select.disabled=true;status.textContent='Réseau géré par le serveur local.';}
else{
 const testnet=environment.id==='testnet',name=testnet?'Testnet':'Mainnet';
 select.value=environment.id;select.disabled=false;
 document.documentElement.dataset.network=environment.id;
 document.querySelectorAll<HTMLElement>('[data-network-label]').forEach(el=>el.textContent=name);
 document.getElementById('network-description')!.textContent=testnet?'Fonds de test · ordres sur le véritable exchange testnet.':'Fonds réels · wallet ou agent API autorisé.';
 document.querySelectorAll<HTMLElement>('[data-account-kind]').forEach(el=>el.textContent=testnet?'Compte testnet':'Compte réel');
 document.getElementById('wallet-source-note')!.textContent='L’adresse est envoyée uniquement à l’API '+name+' Hyperliquid. Actualisation toutes les 30 s quand la page est visible.';
 select.addEventListener('change',async()=>{
  const next=select.value;
  select.disabled=true;
  try{
   // Read storage under the same lock as entries: no network change across an in-flight trade.
   if(!navigator.locks)throw Error('Changement de réseau indisponible sur ce navigateur.');
   // A permanent runner may be active even when Bot has never been visited in this tab.
   if(location.origin==='http://127.0.0.1:8766'&&!window.OmegaRunnerGate)await import('./runner-ui');
   await window.OmegaRunnerGate?.();
   await window.TestnetGate?.();
   window.PaperPilot.stop();
   await api.request('/api/network',{method:'POST',body:JSON.stringify({network:next})});
   location.reload();
  }catch(error){select.value=environment.id;select.disabled=false;status.textContent=error instanceof Error?error.message:String(error);select.disabled=false;}
 });
 window.addEventListener('axiom-state',((event:CustomEvent<Snapshot & {connection?:{source:string;websocket:boolean;latencyMs:number|null;reconnectAttempts:number;error:string;retryAt:number}}>)=>{
  const s=event.detail,c=s.connection;if(!c)return;
  const mode=s.market.fresh?(c.source==='websocket'?'WebSocket direct':'Secours REST'):'Données en attente';
  status.textContent=name+' · '+mode+(c.latencyMs!==null?' · API '+c.latencyMs+' ms':'')+(c.reconnectAttempts?' · reconnexion '+c.reconnectAttempts:'')+(c.error?' · '+c.error:'');
  status.dataset.health=s.market.fresh?'live':'waiting';
 }) as EventListener);
}
