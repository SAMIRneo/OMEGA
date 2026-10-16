import type {Snapshot} from '../core/types';
let latest:Snapshot|null=null;
const listeners=new Set<(snapshot:Snapshot)=>void>();
export function rememberSnapshot(snapshot:Snapshot){latest=snapshot;for(const listener of listeners)listener(snapshot);}
export function subscribeMarket(listener:(snapshot:Snapshot)=>void){listeners.add(listener);if(latest)listener(latest);return ()=>listeners.delete(listener);}
