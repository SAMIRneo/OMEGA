import type {Snapshot,Timeframe} from './types';
import type {RunnerView} from '../shared/runner-store';
export function horizonReading(snapshot:Snapshot,tf:Timeframe){
 const value=snapshot.indicators[tf];let trend:'bullish'|'bearish'|'neutral'='neutral';
 const duration=tf==='1d'?86400:tf==='1h'?3600:900,record=snapshot.candleStatus[tf];
 const fresh=!!value?.ready&&!!value.lastClosedTime&&value.lastClosedTime<snapshot.time*1000&&snapshot.time-value.lastClosedTime/1000<duration+300&&!!record&&!record.error&&snapshot.time-record.fetchedAt>=-5&&snapshot.time-record.fetchedAt<(tf==='1d'?1800:tf==='1h'?300:180);
 if(fresh){if(tf==='1d'&&Number.isFinite(value?.close)&&Number.isFinite(value?.ema20))trend=value!.close!>value!.ema20!?'bullish':'bearish';else if(tf==='15m'&&Number.isFinite(value?.ema20)&&Number.isFinite(value?.ema50))trend=value!.ema20!>value!.ema50!?'bullish':value!.ema20!<value!.ema50!?'bearish':'neutral';else if(tf==='1h')trend=value?.trend??'neutral';}
 return {trend,fresh,rsi:fresh&&Number.isFinite(value?.rsi)?value!.rsi!:null};
}
export function executionLabel(state:RunnerView){
 if(!state.connected)return {label:'NON RELIÉ',tone:'offline',detail:'Le moteur n’a pas confirmé son état.'};
 if(state.pending)return {label:'À VÉRIFIER',tone:'blocked',detail:'Un envoi exchange doit être réconcilié.'};
 if(state.active)return {label:'PILOTE ACTIF',tone:'live',detail:'État confirmé du moteur d’exécution.'};
 if(state.owned)return {label:'SURVEILLANCE',tone:'watch',detail:'Position du bot sous surveillance, entrées arrêtées.'};
 return {label:'À L’ARRÊT',tone:'idle',detail:state.approved?'Agent autorisé ; armement manuel requis.':'L’agent doit être autorisé sur ce réseau.'};
}
