import {readFileSync} from 'node:fs';
import type {RustRisk} from '../frontend/core/types';
export async function loadRisk(root:string):Promise<RustRisk>{
 const source=readFileSync(root+'/frontend/legacy/risk-core.js','utf8');
 const encoded=source.match(/atob\('([A-Za-z0-9+/=]+)'\)/)?.[1];
 if(!encoded)throw Error('Noyau Rust/WASM introuvable.');
 const result=await WebAssembly.instantiate(Buffer.from(encoded,'base64'),{});
 return result.instance.exports as unknown as RustRisk;
}
