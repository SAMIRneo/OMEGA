const formats=new Map<number,Intl.NumberFormat>();
const compact=new Intl.NumberFormat('fr-FR',{notation:'compact',maximumFractionDigits:2});
export function formatNumber(value:number,digits=2){
 if(!Number.isFinite(value))return '—';digits=Math.max(0,Math.min(8,Math.round(digits)));
 let formatter=formats.get(digits);if(!formatter){formatter=new Intl.NumberFormat('fr-FR',{minimumFractionDigits:digits,maximumFractionDigits:digits});formats.set(digits,formatter);}return formatter.format(value);
}
export function formatCompact(value:number){return Number.isFinite(value)?compact.format(value):'—';}
