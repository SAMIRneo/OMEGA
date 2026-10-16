// Exercise the real local HTTP boundary without authorizing any exchange agent.
import {spawn} from 'node:child_process';
import {mkdtempSync,mkdirSync,copyFileSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {request as httpRequest} from 'node:http';
const root=process.cwd(),temp=mkdtempSync(resolve(tmpdir(),'omega-runner-'));
mkdirSync(resolve(temp,'frontend/legacy'),{recursive:true});mkdirSync(resolve(temp,'dist'));
copyFileSync(resolve(root,'frontend/legacy/risk-core.js'),resolve(temp,'frontend/legacy/risk-core.js'));writeFileSync(resolve(temp,'dist/index.html'),'<html>OMEGA test</html>');
const child=spawn(process.execPath,[resolve(root,'runner-dist/server.mjs')],{cwd:temp,stdio:['ignore','pipe','pipe']});
try{
 await new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(Error('Runner startup timed out')),10000);child.stdout.once('data',()=>{clearTimeout(timeout);resolve();});child.once('exit',code=>{clearTimeout(timeout);reject(Error('Runner exited '+code));});child.stderr.once('data',()=>{clearTimeout(timeout);reject(Error('Runner startup failed'));});});
 const origin='http://127.0.0.1:8766',session=await (await fetch(origin+'/api/live/session')).json();
 assert.equal((await fetch(origin+'/api/live/status?network=testnet')).status,401);
 assert.equal((await fetch(origin+'/api/live/session',{headers:{Origin:'https://evil.invalid'}})).status,403);
 assert.equal(await new Promise((resolve,reject)=>{const r=httpRequest(origin+'/api/live/session',{headers:{Host:'evil.invalid'}},res=>{res.resume();resolve(res.statusCode)});r.on('error',reject);r.end();}),403);
 const headers={'X-Omega-Session':session.token,'Content-Type':'application/json'};
 const status=async(network)=>{const r=await fetch(origin+'/api/live/status?network='+network,{headers});assert.equal(r.status,200);return r.json();};
 const main=await status('mainnet'),test=await status('testnet');assert.notEqual(main.agent,test.agent);assert.equal(main.active,false);assert.equal(test.active,false);assert.equal('key' in test,false);assert.equal('nonce' in test,false);assert.equal(test.owner,null);
 const configure=async()=>{const response=await fetch(origin+'/api/live/configure?network=testnet',{method:'POST',headers,body:JSON.stringify({owner:'0x1111111111111111111111111111111111111111'})});assert.equal(response.status,200);return response.json();};
 const first=await configure(),second=await configure();assert.notEqual(first.agent,second.agent);assert.equal((await status('mainnet')).owner,null);
 const arm=await fetch(origin+'/api/live/arm?network=mainnet',{method:'POST',headers,body:JSON.stringify({settings:{profile:'balanced',leverage:15}})});assert.equal(arm.status,400);assert.match((await arm.json()).error,/MAINNET/);
 const invalid=await fetch(origin+'/api/live/status?network=other',{headers});assert.equal(invalid.status,400);
 assert.match(await (await fetch(origin+'/')).text(),/OMEGA test/);
 console.log('Local runner: auth, Origin/Host, network isolation, rotation, no secret exposure, mainnet consent and static serving passed. No exchange orders sent.');
}finally{child.kill('SIGTERM');await new Promise(resolve=>child.once('exit',resolve));rmSync(temp,{recursive:true,force:true});}
