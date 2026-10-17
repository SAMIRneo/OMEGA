// Only the public address and the user's reconnect preference live in browser storage.
const key='omega-wallet-session-v1';
export function rememberedWallet():string|null{
 try{const value=JSON.parse(window.localStorage.getItem(key)||'null');return value?.reconnect===true&&/^0x[0-9a-f]{40}$/.test(value.address)&&!/^0x0{40}$/.test(value.address)?value.address:null;}catch{return null;}
}
export function rememberWallet(address:string){try{window.localStorage.setItem(key,JSON.stringify({address:address.toLowerCase(),reconnect:true}));}catch{}}
export function forgetWallet(){try{window.localStorage.removeItem(key);}catch{}}
