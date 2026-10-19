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
 const sessionFile=readdirSync('dist/assets').find(name=>/^wallet-session-.*\.js$/.test(name));assert.ok(sessionFile,'Missing emitted wallet session.');
 const owner='0x1111111111111111111111111111111111111111',methods=[];
 dom.BrowserAtelier={environment:{id:'testnet'},setAddress:async()=>{}};
 dom.ethereum={request:async({method})=>{methods.push(method);assert.ok(['eth_requestAccounts','eth_accounts'].includes(method),'Unexpected wallet signature request');return [owner];},on(){},removeListener(){}};
 // Rolldown shares this module with the manual adapter and emits an explicit lazy initializer.
 // Resolve the initializer/namespace exactly as the built connection UI does, rather than guessing minified names.
 const uiFile=readdirSync('dist/assets').find(name=>/^wallet-connection-.*\.js$/.test(name));
 const ui=readFileSync(resolve('dist/assets',uiFile),'utf8');
 const binding=ui.match(/import\(`\.\/wallet-session-[^`]+`\)\.then\((\w+)=>\(\1\.(\w+)\(\),\1\.(\w+)\)\)/);
 const compiled=await import(pathToFileURL(resolve('dist/assets',sessionFile)).href);
 let session=compiled;
 if(binding){compiled[binding[2]]();session=compiled[binding[3]];}
 assert.equal(methods.length,0,'Loading a wallet session must not request permission.');
 let fixtureReads=0;
 globalThis.fetch=async(url,options)=>{
  assert.equal(String(url),'https://api.hyperliquid-testnet.xyz/info');assert.equal(JSON.parse(options.body).type,'clearinghouseState');fixtureReads++;
  const margin={accountValue:'1200',totalNtlPos:'0',totalRawUsd:'1200',totalMarginUsed:'0'};
  return new Response(JSON.stringify({marginSummary:margin,crossMarginSummary:margin,crossMaintenanceMarginUsed:'0',withdrawable:'1200',assetPositions:[],time:Date.now()}),{headers:{'content-type':'application/json'}});
 };
 await session.connectWallet();assert.equal(session.walletSession().address,owner);assert.equal(session.walletSession().equity,1200);assert.equal(session.walletSession().error,false);assert.equal(fixtureReads,1);
 await session.requireWallet();assert.deepEqual(methods,['eth_requestAccounts','eth_accounts']);session.disconnectWallet();assert.equal(session.walletSession().address,null);
 assert.equal(networkCalls,0);
 console.log('Production bundles: disarmed runtimes and unified wallet connection validated; account API intercepted in-process; no agent, signature or external request.');
}catch(error){console.error('Production web bundle failed:',error instanceof Error?error.message:String(error));process.exitCode=1;}finally{
 dom.dispatchEvent(new dom.Event('pagehide'));await dom.happyDOM.abort();
 for(const [name,descriptor] of previous)if(descriptor)Object.defineProperty(globalThis,name,descriptor);else delete globalThis[name];
}
