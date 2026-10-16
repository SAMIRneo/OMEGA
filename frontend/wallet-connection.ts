import {subscribeWallet,type WalletView} from './shared/wallet-store';
import {subscribeRunner,type RunnerView} from './shared/runner-store';
import {walletProvider,walletError} from './shared/wallet-provider';
import {lazyModule} from './shared/lazy';
import {formatNumber} from './shared/format';
const $=(id:string)=>document.getElementById(id)!;
const exchange=lazyModule(()=>import('./exchange'));
const local=location.origin==='http://127.0.0.1:8766';
const network=window.BrowserAtelier.environment?.id??'',label=network==='testnet'?'Testnet':'Mainnet';
let wallet:WalletView|null=null,runner:RunnerView={connected:false},loading=false,loadError='',guided=false;
function render(){
 const known=wallet?.network===network?wallet:null,read=!!known?.readAt,connected=!!known?.address,busy=loading||!!known?.busy,service=runner.connected&&runner.network===network,mismatch=!!(service&&known?.address&&runner.owner&&known.address.toLowerCase()!==runner.owner.toLowerCase());
 $('connect-network-name').textContent=label+(network==='testnet'?' · fonds de test':' · fonds réels');
 for(const button of document.querySelectorAll<HTMLButtonElement>('[data-connect-network]')){button.setAttribute('aria-pressed',String(button.dataset.connectNetwork===network));button.disabled=busy||!network;}
 for(const button of document.querySelectorAll<HTMLButtonElement>('[data-wallet-connect]')){button.disabled=busy||!network;(button.querySelector('[data-wallet-label]')??button).textContent=busy?'Patiente…':connected?'Reconnecter MetaMask':'Connecter MetaMask';}
 $('connect-address').textContent=known?.address??'Ton compte apparaîtra ici';
 const accountCard=document.querySelector<HTMLElement>('.connect-account')!;accountCard.setAttribute('aria-busy',String(busy));accountCard.dataset.state=busy?'loading':known?.error||loadError?'error':read?'success':'idle';
 if(read&&!guided){guided=true;($('connect-automation') as HTMLDetailsElement).open=true;}
 $('connect-wallet-state').textContent=busy?'Action en cours…':known?.error?'Connexion à vérifier':read?'Compte Hyperliquid lu':connected?'Wallet autorisé · lecture à terminer':'Wallet non connecté';
 $('connect-equity').textContent=read&&known?.equity!==null?formatNumber(known!.equity!,2)+' USDC':'—';
 $('connect-position').textContent=read?(known?.position?(known.position.size<0?'Short':'Long')+' · '+formatNumber(Math.abs(known.position.size),4)+' ETH':'Aucune position ETH'):'Connecte MetaMask pour consulter';
 $('connect-read-time').textContent=read?'Dernière lecture '+new Date(known!.readAt).toLocaleTimeString('fr-FR')+' · '+label:'Compte perpétuel · lecture seule';
 $('connect-feedback').textContent=loadError||known?.message||'Autorise uniquement l’accès à ton adresse dans MetaMask. Aucun ordre ni autorisation de trading à cette étape.';
 $('connect-feedback').dataset.tone=loadError||known?.error?'error':'info';
 $('connect-wallet-help').hidden=!!walletProvider();
 ($('connect-refresh') as HTMLButtonElement).disabled=busy||!read;
 ($('connect-disconnect') as HTMLButtonElement).disabled=busy||!connected;
 $('connect-position-note').hidden=!known?.position&&!known?.openOrders;
 $('connect-position-note').textContent=known?.position?'Une position ETH existe déjà. Consulte-la avant toute nouvelle entrée.':known?.openOrders?'Des ordres ETH sont déjà ouverts. Consulte leurs protections avant de poursuivre.':'';
 $('connect-service-state').textContent=service?'Service local connecté':local?'Service local à vérifier':'Automatisation : service local requis';
 $('connect-agent-state').textContent=mismatch?'Le service utilise un autre compte : '+runner.owner+'. Vérifie le compte avant de continuer.':service?(runner.approved?'Agent autorisé sur '+label:'Autorisation MetaMask à signer'):'L’autorisation de l’agent se fait dans OMEGA local.';
 $('connect-ready-state').textContent=mismatch?'Vérifie le compte du service avant de démarrer.':!service?'Disponible après connexion du service':runner.active?'Bot automatique actif':runner.pending?'Envoi à vérifier':runner.owned?'Position sous surveillance':'Démarrage séparé, après autorisation';
 $('connect-service-help').hidden=local&&service;
 const step=$('connect-step-wallet');step.dataset.complete=String(read&&!known?.error);$('connect-step-agent').dataset.complete=String(service&&!!runner.approved&&!mismatch);$('connect-step-start').dataset.complete=String(service&&!!runner.active&&!mismatch);
 $('connect-manual').textContent=known?.position||known?.openOrders?'Gérer la position ETH':'Ordre manuel';
 $('connect-next-label').textContent=mismatch?'Vérifier le compte':service?(runner.approved?'Voir les commandes':'Autoriser l’agent'):'Configurer le service';
}
export async function connect(){
 if(loading)return;loading=true;loadError='';render();
 try{await (await exchange()).connectWallet();}catch(error){loadError=walletError(error);}
 finally{loading=false;render();}
}
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
$('connect-local-guide').addEventListener('click',()=>{
 if(runner.connected&&runner.network===network){document.querySelector('.runner-panel')?.scrollIntoView({block:'start'});($(runner.approved?'runner-start':'runner-authorize') as HTMLButtonElement).focus();return;}
 const details=$('connect-service-help') as HTMLDetailsElement;details.hidden=false;details.open=true;details.scrollIntoView({block:'nearest'});
});
if(import.meta.hot)import.meta.hot.dispose(()=>{offWallet();offRunner();});
