/** Load the actual emitted lazy runtime: source mocks cannot detect chunk-order failures. */
import {readFileSync,readdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {strict as assert} from 'node:assert';
import {Window} from 'happy-dom';
import {IDBFactory} from 'fake-indexeddb';
import {webcrypto} from 'node:crypto';
const file=readdirSync('dist/assets').find(name=>/^runner-(?!ui-|store-).*\.js$/.test(name));
assert.ok(file,'Build the web application before checking its runtime.');
const dom=new Window({url:'https://omega-bundle.test/#pilot'});
dom.document.write(readFileSync('frontend/index.html','utf8'));
Object.defineProperties(dom,{isSecureContext:{value:true},indexedDB:{value:new IDBFactory()},crypto:{value:webcrypto}});
const previous=new Map();let networkCalls=0;
function install(name,value){previous.set(name,Object.getOwnPropertyDescriptor(globalThis,name));Object.defineProperty(globalThis,name,{value,configurable:true,writable:true});}
for(const [name,value] of Object.entries({window:dom,document:dom.document,location:dom.location,navigator:{locks:{request:async(name,options,callback)=>callback({name})}},setInterval:()=>0,fetch:()=>{networkCalls++;throw Error('No network calls permitted in bundle check.');}}))install(name,value);
try{
 const {browserRequest}=await import(pathToFileURL(resolve('dist/assets',file)).href);
 for(const network of ['testnet','mainnet']){const state=await browserRequest('status',undefined,network);assert.equal(state.network,network);assert.equal(state.mode,'web');assert.equal(state.active,false);assert.equal(state.agent,null);assert.equal(state.approved,false);assert.equal('key' in state,false);}
 assert.equal(networkCalls,0);
 console.log('Production web bundle: SDK initialized; both networks remain disarmed; no agent, signature or external request.');
}catch(error){console.error('Production web bundle failed:',error instanceof Error?error.message:String(error));process.exitCode=1;}finally{
 dom.dispatchEvent(new dom.Event('pagehide'));await dom.happyDOM.abort();
 for(const [name,descriptor] of previous)if(descriptor)Object.defineProperty(globalThis,name,descriptor);else delete globalThis[name];
}
