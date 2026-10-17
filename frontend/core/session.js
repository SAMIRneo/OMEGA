/** Intraday policy shared by paper, replay and delegated execution. Times are seconds. */
export const SESSION_DEFAULTS={maxEntries:4,profitTarget:200,cooldownSeconds:1800,maxLossStreak:2,tradeRisk:100};
export function sessionPolicy(limits={}){
 const maxEntries=limits.max_entries_per_day??4,profitTarget=limits.daily_profit_target??200,tradeRisk=limits.trade_risk??100;
 if(!Number.isInteger(maxEntries)||maxEntries<1||maxEntries>4||![100,200,500].includes(profitTarget)||!Number.isFinite(tradeRisk)||tradeRisk<=0||tradeRisk>100)throw Error('Paramètres de session invalides.');
 return {maxEntries,profitTarget,tradeRisk,cooldownSeconds:1800,maxLossStreak:2};
}
export function sessionBlock(paper,limits,now){
 if(paper.storageBlocked)return 'Sauvegarde locale à vérifier : entrées de simulation bloquées.';
 if(!Number.isFinite(now)||!Number.isFinite(limits.daily_loss_limit??500)||(limits.daily_loss_limit??500)<=0)return 'État de session invalide.';
 const policy=sessionPolicy(limits),day=new Date(now*1000).toISOString().slice(0,10),same=paper.day===day,pnl=same?paper.dailyPnl:0,entries=paper.lastEntryDay===day?paper.entriesToday:0;
 if(!Number.isFinite(pnl)||!Number.isInteger(entries)||entries<0)return 'État de session invalide.';
 if(entries>=policy.maxEntries)return 'Quota quotidien consommé : '+policy.maxEntries+' tentatives UTC.';
 if(pnl>=policy.profitTarget)return 'Objectif journalier atteint : nouvelles entrées en pause.';
 if(pnl<=-(limits.daily_loss_limit??500))return 'Limite de perte quotidienne atteinte.';
 if(!Number.isInteger(paper.lossStreak??0)||(paper.lossStreak??0)<0)return 'État de session invalide.';
 if(same&&(paper.lossStreak??0)>=2)return 'Deux pertes consécutives : session arrêtée pour ce jour UTC.';
 const last=Math.max(paper.lastEntryAt??0,paper.lastExitAt??0);
 if(!Number.isFinite(last)||last>now+5)return 'Horodatage de session invalide.';
 if(last&&now-last<1800)return 'Pause entre opérations : '+Math.ceil((1800-now+last)/60)+' min restantes.';
 return null;
}
