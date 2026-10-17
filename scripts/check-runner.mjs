// Exercise the real local HTTP boundary without authorizing any exchange agent.
import {spawn} from 'node:child_process';
import {mkdtempSync,mkdirSync,copyFileSync,rmSync,writeFileSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {request as httpRequest} from 'node:http';
const root=process.cwd(),temp=mkdtempSync(resolve(tmpdir(),'omega-runner-'));
mkdirSync(resolve(temp,'frontend/legacy'),{recursive:true});mkdirSync(resolve(temp,'dist'));
copyFileSync(resolve(root,'frontend/legacy/risk-core.js'),resolve(temp,'frontend/legacy/risk-core.js'));writeFileSync(resolve(temp,'dist/index.html'),'<html>OMEGA test</html>');
const launch=()=>spawn(process.execPath,[resolve(root,'runner-dist/server.mjs')],{cwd:temp,stdio:['ignore','pipe','pipe']});
let child=launch();
async function stop(){if(child.exitCode!==null||child.signalCode!==null)return;child.kill('SIGTERM');await new Promise(resolve=>child.once('exit',resolve));}
async function ready(){await new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(Error('Runner startup timed out')),10000);child.stdout.once('data',()=>{clearTimeout(timeout);resolve();});child.once('exit',code=>{clearTimeout(timeout);reject(Error('Runner exited '+code));});child.stderr.once('data',()=>{clearTimeout(timeout);reject(Error('Runner startup failed'));});});}
try{
 await ready();
 const origin='http://127.0.0.1:8766',session=await (await fetch(origin+'/api/live/session')).json();
 assert.equal((await fetch(origin+'/api/live/status?network=testnet')).status,401);
 assert.equal((await fetch(origin+'/api/live/session',{headers:{Origin:'https://evil.invalid'}})).status,403);
 assert.equal(await new Promise((resolve,reject)=>{const r=httpRequest(origin+'/api/live/session',{headers:{Host:'evil.invalid'}},res=>{res.resume();resolve(res.statusCode)});r.on('error',reject);r.end();}),403);
 const headers={'X-Omega-Session':session.token,'Content-Type':'application/json'};
 const status=async(network)=>{const r=await fetch(origin+'/api/live/status?network='+network,{headers});assert.equal(r.status,200);return r.json();};
 const main=await status('mainnet'),test=await status('testnet');assert.notEqual(main.agent,test.agent);assert.equal(main.active,false);assert.equal(test.active,false);assert.equal('key' in test,false);assert.equal('nonce' in test,false);assert.equal(test.owner,null);
 const configure=async()=>{const response=await fetch(origin+'/api/live/configure?network=testnet',{method:'POST',headers,body:JSON.stringify({owner:'0x1111111111111111111111111111111111111111'})});assert.equal(response.status,200);return response.json();};
 const first=await configure(),second=await configure();assert.equal(first.agent,second.agent);assert.equal((await status('mainnet')).owner,null);
 const arm=await fetch(origin+'/api/live/arm?network=mainnet',{method:'POST',headers,body:JSON.stringify({settings:{profile:'balanced',leverage:15}})});assert.equal(arm.status,400);assert.match((await arm.json()).error,/MAINNET/);
 for(const query of ['', '?network=other','?network=mainnet&network=testnet']){const invalid=await fetch(origin+'/api/live/status'+query,{headers});assert.equal(invalid.status,400);}
 assert.equal((await status('testnet')).network,'testnet');assert.equal((await status('mainnet')).network,'mainnet');
 assert.match(await (await fetch(origin+'/')).text(),/OMEGA test/);
 // Restart with only synthetic pending/quota/settings; no order or approval is sent.
 await stop();const ledgerFile=resolve(temp,'.omega-runtime/testnet.json'),fixture=JSON.parse(readFileSync(ledgerFile,'utf8'));
 fixture.attemptDay=new Date().toISOString().slice(0,10);fixture.attemptCount=3;fixture.pending={cloid:'0x'+'2'.repeat(32),at:Date.now()};fixture.settings={profile:'selective',leverage:3,dailyTarget:100};writeFileSync(ledgerFile,JSON.stringify(fixture));
 child=launch();await ready();const nextSession=await (await fetch(origin+'/api/live/session')).json();assert.notEqual(nextSession.token,session.token);
 assert.equal((await fetch(origin+'/api/live/status?network=testnet',{headers})).status,401);
 const restored=await (await fetch(origin+'/api/live/status?network=testnet',{headers:{'X-Omega-Session':nextSession.token}})).json();
 assert.equal(restored.agent,second.agent);assert.equal(restored.active,false);assert.equal(restored.pending,true);assert.equal(restored.attemptCount,3);assert.equal(restored.settings.leverage,3);
 assert.equal(JSON.parse(readFileSync(ledgerFile+'.bak','utf8')).pending.cloid,fixture.pending.cloid);
 console.log('Local runner: auth, Origin/Host, network isolation, idempotent preparation, no secret exposure, mainnet consent, static serving and durable restart passed. No exchange orders sent.');
}finally{await stop();rmSync(temp,{recursive:true,force:true});}
