export interface RunnerView {network?:string;busy?:boolean;owner?:string|null;active?:boolean;approved?:boolean;approvedUntil?:number|null;pending?:boolean;owned?:boolean;heartbeat?:number;equity?:number|null;events?:{at:number;message:string}[];settings?:{profile:string;leverage:number};connected:boolean;reason?:string}
let current:RunnerView={connected:false};
const subscribers=new Set<(state:RunnerView)=>void>();
export function publishRunner(state:RunnerView){current=state;for(const fn of subscribers)fn(state);}
export function subscribeRunner(fn:(state:RunnerView)=>void){subscribers.add(fn);fn(current);return ()=>subscribers.delete(fn);}
