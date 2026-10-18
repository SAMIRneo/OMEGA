import {AUTHORIZATION_DAYS} from '../shared/authorization';
import {subscribeWallet,type WalletView} from './shared/wallet-store';
import {subscribeRunner,type RunnerView} from './shared/runner-store';
import {walletProvider,walletError} from './shared/wallet-provider';
import {rememberedWallet} from './shared/wallet-memory';
import {lazyModule} from './shared/lazy';
import {formatNumber} from './shared/format';
import {browserReadiness,type Readiness} from './web/readiness';
const $=(id:string)=>document.getElementById(id)!;
const exchange=lazyModule(()=>import('./exchange'));
const local=location.origin==='http://127.0.0.1:8766';
const accountDisclosure=$('account-disclosure') as HTMLDetailsElement;
accountDisclosure.open=false;
const network=window.BrowserAtelier.environment?.id??'',label=network==='testnet'?'Testnet':'Mainnet';
let wallet:WalletView|null=null,runner:RunnerView={connected:false},loading=false,loadError='';
let readiness:Readiness|null=null,checking=false;
async function checkDevice(){
 if(checking)return;checking=true;($('connect-device-check') as HTMLButtonElement).disabled=true;
 $('connect-device-status').textContent='Vérification du navigateur et du coffre…';
 try{readiness=await browserReadiness();render();}finally{checking=false;($('connect-device-check') as HTMLButtonElement).disabled=false;}
}
function render(){
 if(readiness){
  const rows:[string,boolean,string][]=[['secure',readiness.secure,'Connexion sécurisée'],['wallet',!!walletProvider(),'MetaMask / wallet compatible'],['vault',readiness.vault&&readiness.crypto,'Coffre chiffré · écriture vérifiée'],['memory',readiness.memory,'Mémorisation du compte'],['locks',readiness.locks,'Exclusivité entre onglets']];
  for(const [id,ok,label] of rows){const el=$('connect-check-'+id);el.textContent=(ok?'✓ ':'À vérifier · ')+label;el.dataset.ready=String(ok);}
  const ready=readiness.secure&&readiness.vault&&readiness.crypto&&readiness.locks;
  $('connect-device-status').textContent=ready?(walletProvider()?'Cet appareil est compatible avec le bot web.':'Stockage prêt · ouvre OMEGA avec MetaMask pour continuer.'):'Le bot web reste bloqué tant que les contrôles requis ne passent pas.';
  $('connect-storage-note').textContent=readiness.error||(!readiness.vault?'Le coffre n’a pas pu être vérifié.':readiness.retained===true?'Stockage persistant accordé par le navigateur.':'Le navigateur peut effacer son stockage. Garde le même profil et n’efface pas les données du site pour retrouver tes agents.');
 }
 const known=wallet?.network===network?wallet:null,read=!!known?.readAt,connected=!!known?.address,busy=loading||!!known?.busy||!!(runner.connected&&runner.network===network&&runner.busy),service=runner.connected&&runner.network===network,mismatch=!!(service&&known?.address&&runner.owner&&known.address.toLowerCase()!==runner.owner.toLowerCase());
 $('connect-network-name').textContent=label+(network==='testnet'?' · fonds de test':' · fonds réels');
 for(const button of document.querySelectorAll<HTMLButtonElement>('[data-connect-network]')){button.setAttribute('aria-pressed',String(button.dataset.connectNetwork===network));button.disabled=busy||!network;}
 for(const button of document.querySelectorAll<HTMLButtonElement>('[data-wallet-connect]')){button.disabled=busy||!network;(button.querySelector('[data-wallet-label]')??button).textContent=busy?'Patiente…':connected?'Vérifier MetaMask':'Connecter MetaMask';}
 $('connect-address').textContent=known?.address??'Ton compte apparaîtra ici';
 const accountCard=document.querySelector<HTMLElement>('.connect-account')!;accountCard.setAttribute('aria-busy',String(busy));accountCard.dataset.state=busy?'loading':known?.error||loadError?'error':read?'success':'idle';
 $('connect-account-summary').textContent=read&&!known?.error?(known?.equity!==null?formatNumber(known!.equity!,2)+' USDC':'Compte connecté'):'Non connecté';
 $('connection-network-label').textContent=label+(network==='mainnet'?' · fonds réels':' · fonds de test');
 document.querySelector<HTMLElement>('.connect-balances')!.hidden=!read;
 $('connect-read-time').hidden=!read;$('connect-address').hidden=!connected;
 (document.querySelector('.connect-wallet-actions [data-wallet-connect]') as HTMLButtonElement).hidden=!connected;
 $('connect-wallet-state').textContent=busy?'Action en cours…':known?.error?'Connexion à vérifier':read?'Compte Hyperliquid lu':connected?'Wallet autorisé · lecture à terminer':'Wallet non connecté';
 $('connect-equity').textContent=read&&known?.equity!==null?formatNumber(known!.equity!,2)+' USDC':'—';
 $('connect-position').textContent=read?(known?.position?(known.position.size<0?'Short':'Long')+' · '+formatNumber(Math.abs(known.position.size),4)+' ETH':'Aucune position ETH'):'Connecte MetaMask pour consulter';
 $('connect-read-time').textContent=read?'Dernière lecture '+new Date(known!.readAt).toLocaleTimeString('fr-FR')+' · '+label:'Compte perpétuel · lecture seule';
 $('connect-feedback').textContent=loadError||known?.message||'Le compte est mémorisé sur ce navigateur. La connexion ne signe aucun ordre et ne démarre pas le bot.';
 $('connect-feedback').dataset.tone=loadError||known?.error?'error':'info';
 $('connect-wallet-help').hidden=!!walletProvider();
 ($('connect-refresh') as HTMLButtonElement).disabled=busy||!read;
 ($('connect-disconnect') as HTMLButtonElement).disabled=busy||!connected;
 $('connect-position-note').hidden=!known?.position&&!known?.openOrders;
 $('connect-position-note').textContent=known?.position?'Une position ETH existe déjà. Consulte-la avant toute nouvelle entrée.':known?.openOrders?'Des ordres ETH sont déjà ouverts. Consulte leurs protections avant de poursuivre.':'';
 $('connect-service-state').textContent=service?(local?'Service local connecté':'Mode web prêt · cet onglet'):local?'Service local à vérifier':'Mode web à vérifier';
 $('connect-agent-state').textContent=mismatch?'Le service utilise un autre compte : '+runner.owner+'. Vérifie le compte avant de continuer.':service?(runner.approved?'Agent autorisé sur '+label:'Autorisation MetaMask à signer'):'Connexion du moteur à vérifier';
 $('connect-ready-state').textContent=mismatch?'Vérifie le compte du service avant de démarrer.':!service?'Après autorisation':runner.active?'Bot automatique actif':runner.pending?'Envoi à vérifier':runner.owned?'Position sous surveillance':'Démarrage séparé, après autorisation';
 $('connect-service-help').hidden=!local||service;document.querySelector<HTMLElement>('.connect-service-note')!.hidden=!local;
 const step=$('connect-step-wallet');step.dataset.complete=String(read&&!known?.error);$('connect-step-agent').dataset.complete=String(service&&!!runner.approved&&!mismatch);$('connect-step-start').dataset.complete=String(service&&!!runner.active&&!mismatch);
 $('connect-manual').textContent=known?.position||known?.openOrders?'Gérer la position ETH':'Ordre manuel';
 $('connect-next-label').textContent=mismatch?'Vérifier le compte':service?(runner.approved?'Voir les commandes':'Autoriser l’agent'):'Configurer le service';
 const state=mismatch?'mismatch':service&&runner.active?'active':service&&runner.pending?'pending':!read||known?.error||loadError?'wallet':!service?'service':runner.owned?'owned':!runner.approved?'authorize':'ready';
 const guidance={
  wallet:rememberedWallet()?['Reprendre mon compte','Le compte et les agents sont mémorisés. Déverrouille MetaMask ; aucune nouvelle autorisation si les agents sont valides.','Reprendre MetaMask']:['Relier mon compte','Une connexion MetaMask, puis une autorisation pour chaque réseau. Le compte sera mémorisé sur cet appareil.','Connecter MetaMask'],
  mismatch:['Vérifier le compte du service','Le service et le wallet utilisent des comptes différents.','Vérifier le compte'],
  service:[local?'Vérifier OMEGA local':'Vérifier le mode web',local?'Le service local doit être disponible.':'Les contrôles du navigateur doivent être disponibles pour autoriser le bot.','Vérifier la connexion'],
  pending:['Vérifier le dernier envoi','Un ordre attend un rapprochement. Vérifiez son état avant toute nouvelle entrée.','Voir la vérification'],
  active:['Le pilote est actif','Le service confirme son activité. Les événements sont disponibles dans Activité.','Voir l’activité'],
  owned:['Une position est sous surveillance','Les nouvelles entrées sont arrêtées ; le service surveille la position attribuée au bot.','Voir le compte'],
  authorize:['Autoriser le bot','Connexion mémorisée · '+AUTHORIZATION_DAYS+' jours maximum, révocable. Une signature par réseau manquant.','Configurer dans MetaMask'],
  ready:['Le bot est prêt','Vérifie les réglages. Le démarrage est une action séparée.','Démarrer le bot']
 }[state];
 $('next-step-title').textContent=guidance[0];$('next-step-detail').textContent=guidance[1];$('next-step-action').textContent=guidance[2]+' →';
 const consentNeeded=state==='ready'&&network==='mainnet'&&!($('runner-mainnet') as HTMLInputElement).checked;
 if(consentNeeded){$('next-step-detail').textContent='Confirme l’utilisation de fonds réels avant de démarrer.';$('next-step-action').textContent='Confirmer les fonds réels →';}
 if(busy)$('next-step-action').textContent='Action en cours…';
 $('next-step-action').setAttribute('aria-busy',String(busy));
 $('next-step-action').dataset.target=state;($('next-step-action') as HTMLButtonElement).disabled=busy;
 document.querySelector<HTMLElement>('.next-step')!.dataset.state=state;
 const currentStep=!read||state==='wallet'||state==='mismatch'?0:state==='service'||state==='authorize'?1:2;
 ['connect-step-wallet','connect-step-agent','connect-step-start'].forEach((id,i)=>{const step=$(id);step.querySelector('.connect-step-number')!.textContent=step.dataset.complete==='true'?'✓':String(i+1);if(i===currentStep&&step.dataset.complete!=='true')step.setAttribute('aria-current','step');else step.removeAttribute('aria-current');});

}
export async function connect(){
 if(loading)return;accountDisclosure.open=true;loading=true;loadError='';render();
 try{await (await exchange()).connectWallet();}catch(error){loadError=walletError(error);}
 finally{loading=false;render();}
}
$('runner-mainnet').addEventListener('change',render);
$('connect-device-check').addEventListener('click',()=>void checkDevice());
window.addEventListener('eip6963:announceProvider',()=>{queueMicrotask(render);});
void checkDevice();
const offWallet=subscribeWallet(state=>{wallet=state;render();}),offRunner=subscribeRunner(state=>{runner=state;render();});
for(const button of document.querySelectorAll<HTMLButtonElement>('[data-connect-network]'))button.addEventListener('click',()=>{
 if(button.dataset.connectNetwork===network)return;
 const select=$('network-select') as HTMLSelectElement;
 if(select.disabled){$('connect-feedback').textContent='Une opération est en cours. Attends sa fin avant de changer de réseau.';return;}
 $('connect-feedback').textContent='Changement de réseau… Les soldes et autorisations sont séparés.';
 select.value=button.dataset.connectNetwork!;select.dispatchEvent(new window.Event('change',{bubbles:true}));
});
const failure=(error:unknown)=>{loadError=walletError(error);render();};
window.addEventListener('omega-network-error',((event:CustomEvent<string>)=>{loadError=event.detail;render();}) as EventListener);
$('connect-refresh').addEventListener('click',()=>{loadError='';void exchange().then(module=>module.refreshWallet()).catch(failure);});
$('connect-disconnect').addEventListener('click',()=>{loadError='';void exchange().then(module=>module.disconnectWallet()).catch(failure);});
$('connect-manual').addEventListener('click',()=>{
 ($('bot-tab-settings') as HTMLButtonElement).click();
 const details=document.querySelector<HTMLDetailsElement>('.execution-details')!;details.open=true;details.scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});details.querySelector('summary')?.focus();
});
$('next-step-action').addEventListener('click',()=>{
 const state=$('next-step-action').dataset.target;
 if(state==='service'){($(local?'connect-local-guide':'runner-refresh') as HTMLButtonElement).click();return;}
 if(state==='active'){($('bot-tab-activity') as HTMLButtonElement).click();$('bot-tab-activity').focus();return;}
 if(state==='owned'){location.hash='wallet';return;}
 if(state==='wallet'){void connect();return;}
 if(state==='mismatch'){accountDisclosure.open=true;const button=document.querySelector<HTMLButtonElement>('.connect-wallet-actions [data-wallet-connect]')!;button.scrollIntoView({block:'center'});button.focus();return;}
 if(state==='authorize'){const button=$('runner-authorize') as HTMLButtonElement;if(!button.disabled)button.click();return;}
 if(state==='ready'){
  if(network==='mainnet'&&!($('runner-mainnet') as HTMLInputElement).checked){$('runner-mainnet').scrollIntoView({block:'center'});$('runner-mainnet').focus();return;}
  const button=$('runner-start') as HTMLButtonElement;if(!button.disabled)button.click();return;
 }
 const target=$('runner-reconcile');target.scrollIntoView({block:'center'});target.focus();
});
$('connect-local-guide').addEventListener('click',()=>{
 accountDisclosure.open=true;
 if(runner.connected&&runner.network===network){document.querySelector('.runner-panel')?.scrollIntoView({block:'start'});($(runner.approved?'runner-start':'runner-authorize') as HTMLButtonElement).focus();return;}
 const details=$('connect-service-help') as HTMLDetailsElement;details.hidden=false;details.open=true;details.scrollIntoView({block:'nearest'});
});
if(rememberedWallet()){loading=true;render();void exchange().then(module=>module.restoreWallet()).catch(failure).finally(()=>{loading=false;render();});}
if(import.meta.hot)import.meta.hot.dispose(()=>{offWallet();offRunner();});
