/** Public navigation only. The wallet connects directly inside its own browser or extension. */
export function walletLinks(){
 const site=location.protocol==='https:'?location.origin+location.pathname+'#pilot':'https://omega.kairos-labspro.chatgpt.site/#pilot';
 return {site,mobile:'https://metamask.app.link/dapp/'+site.replace(/^https:\/\//,'')};
}
export function openWalletHelp(){
 const {mobile}=walletLinks(),dialog=document.createElement('dialog');dialog.className='wallet-pairing';dialog.setAttribute('aria-labelledby','wallet-pairing-title');
 const title=document.createElement('h2');title.id='wallet-pairing-title';title.textContent='Ouvrir OMEGA avec MetaMask';
 const note=document.createElement('p');note.textContent='Sur ordinateur, ouvre ce site avec l’extension MetaMask. Sur téléphone, utilise le navigateur intégré de l’application MetaMask.';
 const open=document.createElement('a');open.className='button primary';open.href=mobile;open.target='_blank';open.rel='noopener noreferrer';open.textContent='Ouvrir dans MetaMask';
 const qr=document.createElement('div');qr.className='wallet-pairing-qr';qr.setAttribute('aria-label','QR du lien public OMEGA dans MetaMask');
 const tip=document.createElement('p');tip.className='micro';tip.textContent='Ce QR ouvre le site sur ton téléphone. Le bot s’exécutera dans le navigateur où tu te connectes ; il ne relie pas ton téléphone à cet onglet.';
 const install=document.createElement('a');install.href='https://metamask.io/download/';install.target='_blank';install.rel='noopener noreferrer';install.textContent='Installer l’extension officielle ↗';
 const close=document.createElement('button');close.type='button';close.className='button';close.textContent='Fermer';
 dialog.append(title,note,open,qr,tip,install,close);document.body.append(dialog);dialog.showModal();
 void import('qr-code-styling').then(({default:QRCode})=>{if(dialog.isConnected)new QRCode({width:240,height:240,type:'svg',data:mobile,dotsOptions:{color:'#142638'},backgroundOptions:{color:'#fff'}}).append(qr);}).catch(()=>{qr.textContent='Utilise le lien ci-dessus pour ouvrir MetaMask.';});
 return new Promise<void>(resolve=>{const finish=()=>{dialog.close();dialog.remove();resolve();};close.addEventListener('click',finish);dialog.addEventListener('cancel',event=>{event.preventDefault();finish();});});
}
