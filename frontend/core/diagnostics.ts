import {sessionBlock} from './session.js';
import {spreadBps} from './execution';
import type {Evaluation,Snapshot} from './types';
export interface Check {label:string;state:'pass'|'wait'|'blocked';detail:string}
export function diagnose(s:Snapshot,e:Evaluation,riskReady:boolean):Check[]{
 const out:Check[]=[],add=(label:string,ok:boolean,detail:string,blocking=false)=>out.push({label,state:ok?'pass':blocking?'blocked':'wait',detail});
 add('Flux de marché',s.market.fresh,s.market.fresh?'Carnet récent':'Carnet absent ou périmé',true);
 for(const [tf,max] of [['15m',180],['1h',300],['1d',1800]] as const){
  const a=s.indicators[tf],c=s.candleStatus[tf],age=c?s.time-c.fetchedAt:Infinity,duration=tf==='15m'?900:tf==='1h'?3600:86400;
  const ok=!!a?.ready&&!!a.lastClosedTime&&a.lastClosedTime<s.time*1000&&s.time-a.lastClosedTime/1000<duration+300&&age>=-5&&age<max&&!c?.error;
  add('Historique '+tf,ok,c?.error?'Actualisation en échec':ok?'Clôture disponible · actualisé il y a '+Math.max(0,Math.floor(age))+' s':'Attente d’un historique récent',true);
 }
 const meta=s.context.updatedAt,metadataOK=meta!==undefined&&Number.isFinite(meta)&&s.time-meta<=120&&meta<=s.time+5;
 add('Métadonnées exchange',metadataOK,metadataOK?'Plafond de levier actualisé':'Métadonnées absentes ou anciennes',true);
 add('Calcul du risque',riskReady,riskReady?'Module Rust disponible':'Entrées indisponibles sans module Rust',true);
 const blocked=sessionBlock(s.paper,s.limits,s.time);
 add('Quota et capital',!s.paper.position&&!blocked,s.paper.position?'Position déjà ouverte':blocked||'Session disponible · jour UTC',true);
 const f=s.indicators['15m'],d=s.indicators['1d'],h=s.indicators['1h'];
 const bias=d?.ready&&Number.isFinite(d.close)&&Number.isFinite(d.ema20)?(d.close!>d.ema20!?'bullish':'bearish'):null;
 const aligned=!!bias&&h?.trend===bias&&!!f?.ready&&(bias==='bullish'?f.ema20!>f.ema50!:f.ema20!<f.ema50!);
 add('Alignement des horizons',aligned,!bias?'Contexte journalier indisponible':aligned?(bias==='bullish'?'Contexte haussier concordant':'Contexte baissier concordant'):'Daily, 1 h et 15 min ne concordent pas');
 const spread=spreadBps(s.market.book);
 add('Coût du spread',spread<=8,Number.isFinite(spread)?spread.toFixed(2)+' bps · plafond 8 bps':'Carnet invalide',true);
 const candidate=e.candidate;
 add('Configuration et exécution',!!candidate,candidate?'Profondeur et risque vérifiés · ×'+candidate.leverage:e.reasons.join(' '),e.status==='blocked');
 return out;
}
