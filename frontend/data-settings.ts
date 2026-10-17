import {readPaperState} from './core/paper-storage.js';
import {createArchive,verifyArchive,dataKeys} from './core/data-archive';
const $=(id:string)=>document.getElementById(id)!;
const storage=(()=>{try{return window.localStorage;}catch{return null;}})();
function message(value:string){$('data-feedback').textContent=value;}
function render(){
 try{
  if(!storage)throw Error('Stockage indisponible.');
  const probe='omega-storage-probe';storage.setItem(probe,'1');storage.removeItem(probe);
  let bytes=0;for(const key of dataKeys)bytes+=(storage.getItem(key)?.length??0)*2;
  $('data-storage-state').textContent='Stockage accessible · '+(bytes/1024).toLocaleString('fr-FR',{maximumFractionDigits:1})+' Ko';
  for(const network of ['mainnet','testnet']){let label='Aucune simulation enregistrée';
   try{const p=readPaperState(storage,'axiom-eth-daily-paper-v1'+(network==='testnet'?'-testnet':''));if(p)label=p.savedAt?'Enregistré le '+new Date(p.savedAt).toLocaleString('fr-FR'):'Données antérieures · date non disponible';}catch{label='Données à vérifier · export recommandé';}
   $('data-'+network).textContent=label;
  }
 }catch{$('data-storage-state').textContent='Stockage indisponible · vérifie les réglages du navigateur';}
}
$('data-export').addEventListener('click',async()=>{
 const button=$('data-export') as HTMLButtonElement;button.disabled=true;
 try{if(!storage)throw Error('Stockage inaccessible : export impossible.');const archive=await createArchive(storage),url=URL.createObjectURL(new Blob([JSON.stringify(archive,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='OMEGA-donnees-'+new Date().toISOString().slice(0,10)+'.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);message('Sauvegarde générée : simulations, réglages, journaux et dernier replay des deux réseaux. Empreinte SHA-256 incluse.');}
 catch(error){message(error instanceof Error?error.message:String(error));}finally{button.disabled=false;render();}
});
const input=$('data-file') as HTMLInputElement;
$('data-verify').addEventListener('click',()=>input.click());
input.addEventListener('change',async()=>{try{const file=input.files?.[0];if(!file)return;if(file.size>6*1024*1024)throw Error('Fichier trop volumineux.');const archive=await verifyArchive(await file.text());message('Empreinte valide · '+Object.keys(archive.entries).length+' blocs · '+new Date(archive.createdAt).toLocaleString('fr-FR')+'. Le contenu n’a pas été restauré.');}catch(error){message(error instanceof Error?error.message:String(error));}finally{input.value='';}});
const persist=$('data-persist') as HTMLButtonElement;persist.hidden=!navigator.storage?.persist;
persist.addEventListener('click',async()=>{try{message(await navigator.storage.persist()?'Protection contre l’éviction accordée par le navigateur. Une suppression manuelle reste possible.':'Protection non accordée. Conserve un export de tes données.');}catch{message('Protection indisponible. Conserve un export de tes données.');}});
window.addEventListener('storage',render);window.addEventListener('hashchange',render);document.addEventListener('visibilitychange',()=>{if(!document.hidden)render();});render();
