/* A paper-only controller. It has no exchange/signing method. */
(()=>{
const EVENT_KEY='eth-atelier-events-v2',BAR_KEY='eth-atelier-last-evaluated-v2';
let active=false,paused=false,lastBar=0,resumeAfter=0,inflight=false,reason='À l’arrêt.',events=[];
try{events=JSON.parse(localStorage.getItem(EVENT_KEY)||'[]');if(!Array.isArray(events))events=[]}catch{}
function log(kind,message){events.push({at:Date.now(),kind,message});events=events.slice(-200);try{localStorage.setItem(EVENT_KEY,JSON.stringify(events))}catch{}}
function signal(s){const a=s.indicators['5m'],h=s.indicators['1h'];if(!a?.ready||!h?.ready)return {blocked:'Historique 5 min / 1 h en chargement.'};
 const now=s.time,st=s.candleStatus;
 if(!s.market.fresh||!st['5m']||!st['1h']||now-st['5m'].fetchedAt>120||now-st['1h'].fetchedAt>240||now-a.lastClosedTime/1000>420||now-h.lastClosedTime/1000>3900)return {blocked:'Marché ou bougies périmés.'};
 const up=a.previousEma20<=a.previousEma50&&a.ema20>a.ema50,down=a.previousEma20>=a.previousEma50&&a.ema20<a.ema50;
 if(!up&&!down)return {blocked:'Aucun nouveau croisement EMA20/50.'};
 const side=up?'long':'short';if(h.trend!==(up?'bullish':'bearish'))return {blocked:'Croisement sans confirmation 1 h.'};
 if(!(a.atr>0))return {blocked:'ATR indisponible.'};
 const d=up?1:-1,L=s.limits,best=+s.market.book.levels[up?1:0][0].px,entry=best*(1+d*L.slippage_bps/10000),stop=entry-d*a.atr*1.5,target=entry+d*a.atr*3;
 if(!(stop>0&&target>0))return {blocked:'Niveaux non valides.'};
 const core=window.RiskCore?.exports;if(!core)return {blocked:'Calcul du risque indisponible.'};
 const margin=core.size_margin(d,best,a.atr,L.leverage,L.max_margin,L.max_risk,s.paper.cash,L.fee_bps,L.slippage_bps);
 if(margin<.01)return {blocked:'Capital ou budget de risque insuffisant.'};
 return {args:{side,margin,stop,target}};
}
window.PaperPilot={
 start(s){if(!navigator.locks)throw Error('Ce navigateur ne prend pas en charge le verrouillage nécessaire.');if(!s?.market.fresh||!s.indicators['5m']?.ready||!s.indicators['1h']?.ready)throw Error('Attends le carnet et les horizons 5 min / 1 h.');if(s.paper.position)throw Error('Clôture la position manuelle avant de démarrer le bot.');active=true;paused=false;resumeAfter=Date.now();lastBar=s.indicators['5m'].lastClosedTime;reason='Armé · attente de la prochaine bougie 5 min clôturée.';log('DÉMARRAGE','Bot simulé activé. Aucun signal passé exécuté.');},
 stop(){active=false;reason='À l’arrêt · position éventuelle toujours surveillée.';log('ARRÊT','Nouvelles entrées automatiques arrêtées.');},
 suspend(){if(active){paused=true;reason='Suspendu · onglet masqué.';log('PAUSE','Onglet masqué : entrées suspendues, aucun rattrapage.');}},
 async tick(s,open){if(!active||inflight)return;if(document.hidden){this.suspend();return;}const stamp=s.indicators['5m']?.lastClosedTime;if(!s.market.fresh){paused=true;reason='Suspendu · flux indisponible.';return;}if(paused){resumeAfter=Date.now();lastBar=stamp;paused=false;reason='Reprise · attente d’une nouvelle bougie.';log('REPRISE','Reprise visible, bougies de l’absence ignorées.');return;}
 if(stamp&&stamp<=resumeAfter){lastBar=stamp;reason='Armé · attente d’une clôture après reprise.';return;}if(!stamp||stamp===lastBar){reason=s.market.fresh?'Armé · attente de la prochaine clôture 5 min.':'Suspendu · flux de marché indisponible.';return;}
 if(stamp<lastBar)return;
 lastBar=stamp;inflight=true;
 try{await navigator.locks.request('eth-pilot-evaluation',async()=>{if(!active||document.hidden)return;let done=0;try{done=Number(localStorage.getItem(BAR_KEY)||0)}catch{throw Error('Stockage requis pour le bot simulé.');}if(stamp<=done){reason='Bougie déjà traitée par un autre onglet.';return;}localStorage.setItem(BAR_KEY,String(stamp));
 if(s.paper.position){reason='Position ouverte · aucune nouvelle entrée.';return;}if(s.paper.dailyPnl<=-s.limits.daily_loss_limit){this.stop();reason='Arrêt · limite de perte quotidienne atteinte.';log('LIMITE',reason);return;}
 const result=signal(s);if(result.blocked){reason=result.blocked;log('OBSERVÉ',reason);return;}
 await open(result.args);reason='Position '+result.args.side.toUpperCase()+' simulée ouverte.';log('ENTRÉE',reason+' Marge '+result.args.margin.toFixed(2)+' USDC.');});}catch(e){reason='Entrée refusée : '+e.message;log('REFUS',reason);}finally{inflight=false;}
 },get state(){return {active,paused,reason,events:[...events]};},log,signal};
document.addEventListener('visibilitychange',()=>{if(document.hidden)PaperPilot.suspend()});
})();
