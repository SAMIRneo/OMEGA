import type {ReplayData,ReplayOptions,ReplayResult} from './core/replay';
const $=(id:string)=>document.getElementById(id)!;
const number=(n:number|null,d=2)=>n===null||!Number.isFinite(n)?'—':n.toLocaleString('fr-FR',{maximumFractionDigits:d,minimumFractionDigits:d});
let last:ReplayResult|null=null,running=false,worker:Worker|null=null,abort:AbortController|null=null,generation=0;
let cached:{start:number;end:number;data:ReplayData}|null=null;
const environment=window.BrowserAtelier.environment??{id:'mainnet',api:'https://api.hyperliquid.xyz/info'};
const key='omega-research-last-v2'+(environment.id==='testnet'?'-testnet':'');
function text(id:string,value:string){$(id).textContent=value;}
function setBusy(value:boolean){running=value;($('research-run') as HTMLButtonElement).disabled=value;($('research-cancel') as HTMLButtonElement).disabled=!value;for(const el of document.querySelectorAll<HTMLInputElement|HTMLSelectElement>('#research-form input,#research-form select'))el.disabled=value;($('research-export') as HTMLButtonElement).disabled=value||!last;}
function fail(message:string){text('research-status',message);$('research-status').classList.add('negative');}
function showResult(result:ReplayResult){
 last=result;$('research-results').hidden=false;($('research-export') as HTMLButtonElement).disabled=false;
 text('research-net',number(result.stats.net)+' USDC');$('research-net').className=result.stats.net>=0?'positive':'negative';
 text('research-trades',String(result.stats.trades));text('research-drawdown',number(result.maxDrawdownPercent)+' %');text('research-fees',number(result.stats.fees)+' USDC');
 text('research-winrate',result.stats.winRate===null?'—':number(result.stats.winRate,1)+' %');text('research-factor',number(result.stats.profitFactor));const segment=(stats:ReplayResult['stats'])=>number(stats.net)+' USDC / '+stats.trades+' trade'+(stats.trades===1?'':'s');text('research-first',segment(result.firstSegment));text('research-last',segment(result.lastSegment));
 const dates=(time:number)=>new Date(time).toLocaleString('fr-FR',{dateStyle:'short',timeStyle:'short',timeZone:'UTC'});
 text('research-range',dates(result.options.start)+' → '+dates(result.options.end)+' UTC');
 text('research-detail','Profil '+({balanced:'Equilibre',selective:'Selectif',aggressive:'Offensif'})[result.options.strategyProfile||'balanced']+' / confluence v2 - '+result.evaluations+' clôtures 15 min examinées · '+result.ambiguousBars+' bougies ambiguës traitées au stop · '+number(result.options.feeBps,1)+' bps de frais / côté · '+number(result.options.slippageBps,1)+' bps de slippage / côté · spread modélisé '+number(result.options.spreadBps,1)+' bps.');
 text('research-sample-note',result.stats.trades<20?'Échantillon très court : '+result.stats.trades+' trades. Ces résultats ne suffisent pas à établir la robustesse du modèle.':'Résultats exploratoires sur une période récente. Aucun paramètre n’a été optimisé sur cet échantillon.');
 $('research-cost-comparison').hidden=!result.comparison;
 if(result.comparison){const standard=result.options.slippageBps===2?result:result.comparison,stress=result.options.slippageBps===4?result:result.comparison;for(const [prefix,value] of [['base',standard],['stress',stress]] as const){text('research-'+prefix+'-net',number(value.stats.net)+' USDC');$('research-'+prefix+'-net').className=value.stats.net>=0?'positive':'negative';text('research-'+prefix+'-detail',value.stats.trades+' trades · drawdown '+number(value.maxDrawdownPercent)+' %');}text('research-sensitivity',standard.stats.net>0&&stress.stats.net<0?'Le résultat change de signe quand les coûts augmentent : forte sensibilité aux hypothèses d’exécution.':'Écart net entre scénarios : '+number(stress.stats.net-standard.stats.net)+' USDC. Les coûts peuvent aussi modifier les entrées retenues.');}
 const refusals=$('research-refusals');refusals.replaceChildren();for(const item of result.refusals.slice(0,6)){const row=document.createElement('div'),reason=document.createElement('span'),count=document.createElement('strong');reason.textContent=item.reason;count.textContent=String(item.count);row.append(reason,count);refusals.append(row);}
 const root=$('research-history');root.replaceChildren();
 if(!result.trades.length){const p=document.createElement('p');p.className='empty';p.textContent='Aucun trade ne remplit les règles sur cette période et sous ces hypothèses.';root.append(p);}else{
  const table=document.createElement('table'),thead=document.createElement('thead'),header=document.createElement('tr'),tbody=document.createElement('tbody');
  for(const label of ['Entrée UTC','Sens','Levier','P&L net','Risque prévu','Sortie']){const th=document.createElement('th');th.scope='col';th.textContent=label;header.append(th);}thead.append(header);
  for(const t of [...result.trades].reverse()){const tr=document.createElement('tr');[dates(t.openedAt),t.side==='long'?'Long':'Short','×'+t.leverage,number(t.netPnl)+' USDC',number(t.plannedLoss)+' USDC',t.reason].forEach((value,i)=>{const td=document.createElement('td');td.textContent=value;if(i===3)td.className=t.netPnl>=0?'positive':'negative';tr.append(td)});tbody.append(tr);}table.append(thead,tbody);root.append(table);
 }
 const svg=$('research-curve'),ns='http://www.w3.org/2000/svg',values=result.equity.map(p=>p.value),low=Math.min(...values),high=Math.max(...values),range=high-low||1,line=document.createElementNS(ns,'polyline');
 line.setAttribute('points',result.equity.map((p,i)=>`${20+i/Math.max(1,result.equity.length-1)*960},${175-(p.value-low)/range*145}`).join(' '));line.setAttribute('fill','none');line.setAttribute('stroke','currentColor');line.setAttribute('stroke-width','2');line.setAttribute('vector-effect','non-scaling-stroke');svg.replaceChildren(line);svg.setAttribute('aria-label','Équité simulée : minimum '+number(low)+', maximum '+number(high)+', finale '+number(result.equity.at(-1)!.value)+' USDC.');
}
async function loadSeries(tf:string,start:number,end:number,signal:AbortSignal){
 const response=await fetch(environment.api,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({type:'candleSnapshot',req:{coin:'ETH',interval:tf,startTime:start,endTime:end}}),signal});
 if(!response.ok)throw Error('Historique '+tf+' : HTTP '+response.status);const raw=await response.json();if(!Array.isArray(raw))throw Error('Réponse historique '+tf+' invalide.');return raw;
}
function stop(){generation++;abort?.abort();worker?.terminate();worker=null;abort=null;setBusy(false);}
$('research-form').addEventListener('submit',async event=>{
 event.preventDefault();if(running)return;const run=++generation,values=new FormData(event.target as HTMLFormElement),days=Number(values.get('days')),end=Math.floor(Date.now()/300000)*300000,start=end-days*86400000,stress=values.get('costs')==='stress';
 const options:ReplayOptions={start,end,feeBps:4.5,slippageBps:stress?4:2,spreadBps:stress?4:2,strategyProfile:values.get('profile') as ReplayOptions['strategyProfile'],leverageCap:Number(values.get('leverage'))};
 if(![7,14].includes(days)){fail('Choisis 7 ou 14 jours.');return;}
 setBusy(true);$('research-status').classList.remove('negative');text('research-status','Chargement des historiques ETH…');$('research-progress').setAttribute('value','0');
 abort=new AbortController();const controller=abort,timeout=setTimeout(()=>controller.abort(),45000);
 try{
  let data={} as ReplayData;let done=0;
  // Two requests at a time; warm-up series are fetched once per run.
  if(cached?.start===start&&cached.end===end)data=cached.data;
  else{for(const batch of [['5m','15m'],['1h','1d']] as const){await Promise.all(batch.map(async tf=>{const duration=tf==='5m'?300000:tf==='15m'?900000:tf==='1h'?3600000:86400000;data[tf]=await loadSeries(tf,start-(tf==='5m'?0:350*duration),end,controller.signal);if(run!==generation)return;done++;text('research-status','Historiques reçus : '+done+' / 4');}));}cached={start,end,data};}
  clearTimeout(timeout);if(controller.signal.aborted||run!==generation)return;
  text('research-status','Replay chronologique en cours…');worker=new Worker(new URL('./research.worker.ts',import.meta.url),{type:'module'});
  worker.onmessage=event=>{if(run!==generation)return;if(event.data.type==='progress'){$('research-progress').setAttribute('value',String(event.data.percent));text('research-status','Analyse chronologique : '+event.data.percent+' %');}else if(event.data.type==='result'){const result=event.data.result as ReplayResult;showResult(result);text('research-status','Replay terminé. Résultats sous hypothèses, sans ordre ni modification du compte paper.');try{localStorage.setItem(key,JSON.stringify({savedAt:Date.now(),result}))}catch{text('research-status','Replay terminé, sauvegarde locale impossible. Exporte le CSV avant de quitter.');}stop();}else{fail(event.data.message);stop();}};
  worker.onerror=()=>{if(run!==generation)return;fail('Le calcul a échoué. Les derniers résultats restent disponibles.');stop();};worker.postMessage({data,options});
 }catch(error){if(run!==generation)return;if(controller.signal.aborted)fail('Chargement annulé ou délai de 45 secondes dépassé.');else fail(error instanceof Error?error.message:String(error));stop();}finally{clearTimeout(timeout);}
});
$('research-cancel').addEventListener('click',()=>{stop();text('research-status','Analyse annulée. Les derniers résultats sont conservés.');});
$('research-form').addEventListener('change',()=>{if(last&&!running)text('research-status','Paramètres modifiés. Relance le replay : les résultats affichés correspondent encore aux hypothèses indiquées sous la courbe.');});
$('research-export').addEventListener('click',()=>{if(!last)return;const rows=[['entry_utc','exit_utc','side','leverage','entry','exit','net_usdc','fees_usdc','planned_risk_usdc','reason'],...last.trades.map(t=>[new Date(t.openedAt).toISOString(),new Date(t.closedAt).toISOString(),t.side,t.leverage,t.entry,t.exit,t.netPnl,t.entryFee+t.exitFee,t.plannedLoss,t.reason])];const csv='\uFEFF'+rows.map(row=>row.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(';')).join('\r\n'),url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download='omega-'+environment.id+'-'+(last.options.strategyProfile||'balanced')+'-recherche-'+last.options.start+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
try{const saved=JSON.parse(localStorage.getItem(key)||'null');if(saved?.result?.options&&Array.isArray(saved.result.trades)&&Array.isArray(saved.result.equity)){showResult(saved.result);const form=$('research-form') as HTMLFormElement,o=saved.result.options;(form.elements.namedItem('profile') as HTMLSelectElement).value=o.strategyProfile||'balanced';(form.elements.namedItem('days') as HTMLSelectElement).value=String(Math.round((o.end-o.start)/86400000));(form.elements.namedItem('leverage') as HTMLSelectElement).value=String(o.leverageCap);(form.elements.namedItem('costs') as HTMLSelectElement).value=o.slippageBps===4?'stress':'standard';text('research-status','Dernier résultat local, enregistré le '+new Date(saved.savedAt).toLocaleString('fr-FR')+'. Relance l’analyse pour actualiser.');}}catch{last=null;text('research-status','Dernière recherche locale illisible. Les données sont conservées ; relance le replay.');}

// Enabled only after the deferred module has installed its submit handler.
($('research-run') as HTMLButtonElement).disabled=false;
