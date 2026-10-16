/** Share in-flight imports and permit retry after a failed network request. */
export function lazyModule<T>(load:()=>Promise<T>){let task:Promise<T>|null=null;return ()=>task??=(load().catch(error=>{task=null;throw error;}));}
