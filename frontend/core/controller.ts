import {evaluateDaily,intent,utcDay} from './daily';
import type {Snapshot,RustRisk,ControllerEvent,Evaluation,TradeIntent} from './types';
const EVENT_KEY='axiom-daily-events-v1',BAR_KEY='axiom-daily-evaluation-v1';
let active=false,paused=false,lastBar=0,resumeAfter=0,inflight=false,reason='Daily en observation.',evaluation:Evaluation|null=null;
let events:ControllerEvent[]=[];try{const parsed=JSON.parse(localStorage.getItem(EVENT_KEY)||'[]');if(Array.isArray(parsed))events=parsed.slice(-200);}catch{}
function log(kind:string,message:string){events.push({at:Date.now(),kind,message});events=events.slice(-200);try{localStorage.setItem(EVENT_KEY,JSON.stringify(events))}catch{}}
function core():RustRisk|null{return window.RiskCore?.exports??null}
export const controller={
 start(s:Snapshot){if(!navigator.locks)throw Error('Web Locks requis pour le contrôleur.');if(!s.market.fresh||!s.indicators['15m']?.ready||!s.indicators['1h']?.ready||!s.indicators['1d']?.ready)throw Error('Attends le carnet et les horizons 15 min / 1 h / 1 jour.');if(s.paper.position)throw Error('Une position est déjà ouverte.');if(s.paper.lastEntryDay===utcDay(s.time)&&s.paper.entriesToday>=1)throw Error('Entrée quotidienne déjà consommée.');active=true;paused=false;lastBar=s.indicators['15m'].lastClosedTime??0;resumeAfter=Date.now();reason='Daily armé · attente d’une nouvelle clôture 15 min.';log('ARMEMENT','Daily armé. Aucune entrée sur un signal passé.');},
 stop(){active=false;reason='Daily en observation · entrées arrêtées.';log('ARRÊT','Nouvelles entrées quotidiennes arrêtées.');},
 suspend(){if(active&&!paused){paused=true;reason='Suspendu · onglet masqué.';log('PAUSE','Entrées suspendues ; pas de rattrapage.');}},
 signal(s:Snapshot){const e=evaluateDaily(s,core()),args=intent(e,s.indicators['15m']?.lastClosedTime??0);return args?{args}:{blocked:e.reasons.join(' ')};},
 evaluate(s:Snapshot){evaluation=evaluateDaily(s,core());return evaluation;},
 async tick(s:Snapshot,open:(a:TradeIntent)=>Promise<unknown>,latest?:()=>Promise<Snapshot>){evaluation=evaluateDaily(s,core());if(!active||inflight)return;if(document.hidden){this.suspend();return;}const stamp=s.indicators['15m']?.lastClosedTime??0;
 if(!s.market.fresh){paused=true;reason='Suspendu · carnet ancien.';return;}
 if(paused){paused=false;resumeAfter=Date.now();lastBar=stamp;reason='Reprise · clôtures de l’absence ignorées.';return;}
 if(stamp<=resumeAfter||stamp<=lastBar){reason=evaluation.status==='blocked'?evaluation.reasons.join(' '):'Attente de la prochaine clôture 15 min.';return;}
 lastBar=stamp;inflight=true;
 try{await navigator.locks.request('axiom-daily-controller',async()=>{if(!active||document.hidden)return;const done=Number(localStorage.getItem(BAR_KEY)||0);if(stamp<=done){reason='Clôture déjà examinée par un autre onglet.';return;}localStorage.setItem(BAR_KEY,String(stamp));const current=latest?await latest():s;if(!active||document.hidden)return;if((current.indicators['15m']?.lastClosedTime??0)!==stamp){reason='Clôture modifiée pendant la validation : aucune entrée.';log('OBSERVATION',reason);return;}const e=evaluateDaily(current,core()),a=intent(e,stamp);evaluation=e;if(!a){reason=e.reasons.join(' ');log(e.status==='blocked'?'BLOCAGE':'OBSERVATION',reason);return;}await open(a);reason='Entrée Daily '+a.side.toUpperCase()+' simulée.';log('ENTRÉE',reason+' Marge '+a.margin.toFixed(2)+' USDC.');});}catch(error){reason=error instanceof Error?error.message:String(error);log('REFUS',reason);}finally{inflight=false;}
 },
 get state(){return {active,paused,reason,events:[...events],evaluation};},log
};
window.PaperPilot=controller;
document.addEventListener('visibilitychange',()=>{if(document.hidden)controller.suspend()});
