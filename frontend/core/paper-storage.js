// Preserve invalid state for diagnosis; never silently replace it with fresh capital.
export function validatePaper(p){
 const day=x=>typeof x==='string'&&(x===''||/^\d{4}-\d{2}-\d{2}$/.test(x));
 if(!p||![p.initial,p.cash,p.dailyPnl].every(Number.isFinite)||p.initial<=0||!Array.isArray(p.history)||!Number.isInteger(p.entriesToday)||p.entriesToday<0||!day(p.day)||!day(p.lastEntryDay??'')||p.storageVersion!==undefined&&p.storageVersion!==1)throw Error('État de simulation invalide.');
 for(const name of ['lastEntryAt','lastExitAt','savedAt'])if(p[name]!==undefined&&(!Number.isFinite(p[name])||p[name]<0))throw Error('Horodatage de simulation invalide.');
 if(p.lossStreak!==undefined&&(!Number.isInteger(p.lossStreak)||p.lossStreak<0))throw Error('Compteur de pertes invalide.');
 if(p.position!==null){const q=p.position;if(!q||!['long','short'].includes(q.side)||!['quantity','entry','stop','target','margin','openedAt'].every(k=>Number.isFinite(q[k])&&q[k]>0)||!Number.isFinite(q.entryFee)||q.entryFee<0||!Number.isInteger(q.leverage)||q.leverage<1||q.leverage>15)throw Error('Position simulée invalide.');}
 if(p.history.some(t=>!t||!Number.isFinite(t.netPnl)||!['long','short'].includes(t.side)||![t.entry,t.exit].every(x=>Number.isFinite(x)&&x>0)||!Number.isFinite(Date.parse(t.at))))throw Error('Historique de simulation invalide.');
 return p;
}
export function readPaperState(storage,key){
 const raw=storage.getItem(key);if(raw===null){if(storage.getItem(key+'-backup-v1')!==null)throw Error('État principal absent ; copie de secours conservée. Vérifie les données.');return null;}
 if(raw.length>2*1024*1024)throw Error('Historique local trop volumineux. Exporte les données avant de poursuivre.');
 try{return validatePaper(JSON.parse(raw));}catch{throw Error('Données de simulation illisibles : entrées bloquées. Exporte les données avant toute récupération.');}
}
export function writePaperState(storage,key,paper,now=Date.now()){
 const previous=readPaperState(storage,key),next={...paper,storageVersion:1,savedAt:now};validatePaper(next);
 const raw=JSON.stringify(next);if(raw.length>2*1024*1024)throw Error('Historique local trop volumineux. Exporte les données avant de poursuivre.');
 if(previous)storage.setItem(key+'-backup-v1',JSON.stringify(previous));
 storage.setItem(key,raw);if(storage.getItem(key)!==raw)throw Error('Écriture de la simulation non confirmée.');
 return next;
}
