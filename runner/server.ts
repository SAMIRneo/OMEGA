import {createServer} from 'node:http';
import {readFileSync,writeFileSync,mkdirSync,existsSync,unlinkSync,statSync,chmodSync} from 'node:fs';
import {resolve,extname,sep} from 'node:path';
import {randomBytes,timingSafeEqual} from 'node:crypto';
import {generatePrivateKey,privateKeyToAccount} from 'viem/accounts';
import {ExchangeClient,HttpTransport,InfoClient} from '@nktkas/hyperliquid';
import {bindLedgerNetwork,assertDistinctAgents,networkConfig,type Network} from './policy';
import {LiveEngine,type Ledger} from './engine';
import {loadLedger,saveLedger} from './persistence';
import {loadRisk} from './runtime-risk';
const root=process.cwd(),dir=resolve(root,'.omega-runtime'),port=8766,origin='http://127.0.0.1:'+port;
mkdirSync(dir,{recursive:true,mode:0o700});if(process.platform!=='win32')chmodSync(dir,0o700);
// One process owns every signer, nonce and durable quota on this installation.
const lock=resolve(dir,'runner.pid');
if(existsSync(lock)){
 const pid=Number(readFileSync(lock,'utf8'));let alive=true;try{process.kill(pid,0);}catch(e:any){if(e.code==='ESRCH')alive=false;else throw e;}
 if(alive)throw Error('Un service OMEGA est déjà actif.');unlinkSync(lock);
}
writeFileSync(lock,String(process.pid),{flag:'wx',mode:0o600});
process.on('exit',()=>{try{unlinkSync(lock)}catch{}});
const token=randomBytes(32).toString('hex'),risk=await loadRisk(root),engines={} as Record<Network,LiveEngine>;
for(const network of ['testnet','mainnet'] as const){
 const file=resolve(dir,network+'.json');let ledger:Ledger;
 ledger=loadLedger(file,network)??{owner:null,key:generatePrivateKey(),nonce:0,attemptDay:'',pending:null,owned:false,events:[]};
 bindLedgerNetwork(ledger,network);register(network,ledger);
}
function register(network:Network,ledger:Ledger){
 const file=resolve(dir,network+'.json');
 const save=()=>saveLedger(file,ledger,network);save();
 const wallet=privateKeyToAccount(ledger.key),transport=new HttpTransport(networkConfig(network));
 const exchange=new ExchangeClient({transport,wallet,defaultExpiresAfter:()=>Date.now()+60000,nonceManager:()=>{ledger.nonce=Math.max(Date.now(),ledger.nonce+1);save();return ledger.nonce;}});
 engines[network]=new LiveEngine(network,ledger,wallet.address,new InfoClient({transport}),exchange,risk,save);
}
assertDistinctAgents(engines.mainnet.agent,engines.testnet.agent);
const timer=setInterval(()=>{for(const engine of Object.values(engines))void engine.tick();},10000);
const mime:Record<string,string>={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.wasm':'application/wasm','.png':'image/png','.woff2':'font/woff2'};
const server=createServer(async(req,res)=>{
 const send=(code:number,value:unknown)=>{res.writeHead(code,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(value));};
 try{
  // No CORS. The local control session is only readable by this exact origin.
  if(req.headers.host!=='127.0.0.1:'+port){send(403,{error:'Host refusé.'});return;}
  if(req.headers.origin&&req.headers.origin!==origin||req.headers['sec-fetch-site']==='cross-site'){send(403,{error:'Origine refusée.'});return;}
  const url=new URL(req.url??'/',origin);
  if(url.pathname.startsWith('/api/')){
   if(url.pathname==='/api/live/session'&&req.method==='GET'){send(200,{token});return;}
   const authorization=req.headers['x-omega-session'];
   if(typeof authorization!=='string'||authorization.length!==token.length||!timingSafeEqual(Buffer.from(authorization),Buffer.from(token))){send(401,{error:'Session locale requise.'});return;}
   if(url.searchParams.getAll('network').length!==1)throw Error('Un seul réseau explicite est requis.');const network=url.searchParams.get('network');if(network!=='testnet'&&network!=='mainnet')throw Error('Réseau requis.');const engine=engines[network];
   if(req.method==='GET'&&url.pathname==='/api/live/status'){send(200,engine.status());return;}
   if(req.method!=='POST'){send(405,{error:'Méthode refusée.'});return;}
   let body='';for await(const chunk of req){body+=chunk;if(body.length>8192)throw Error('Requête trop grande.');}const input=JSON.parse(body||'{}');
   switch(url.pathname){
    case '/api/live/configure':await engine.configure(input.owner);engine.ledger.key=generatePrivateKey();engine.ledger.nonce=0;register(network,engine.ledger);send(200,engines[network].status());return;
    case '/api/live/verify':await engine.verifyApproval();break;
    case '/api/live/arm':await engine.arm(input.settings,input.consent);break;
    case '/api/live/stop':engine.stop();break;
    case '/api/live/reconcile':await engine.reconcile();break;
    default:send(404,{error:'Endpoint inconnu.'});return;
   }
   send(200,engine.status());return;
  }
  if(req.method!=='GET'&&req.method!=='HEAD'){send(405,{error:'Méthode refusée.'});return;}
  const dist=resolve(root,'dist'),file=resolve(dist,'.'+decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname));
  if(!file.startsWith(dist+sep)||!existsSync(file)||!statSync(file).isFile()){send(404,{error:'Fichier introuvable.'});return;}
  res.writeHead(200,{'Content-Type':mime[extname(file)]??'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin','Cross-Origin-Resource-Policy':'same-origin','Content-Security-Policy':"frame-ancestors 'none'"});res.end(req.method==='HEAD'?undefined:readFileSync(file));
 }catch(error){send(400,{error:error instanceof Error?error.message:'Erreur du service.'});}
});
server.listen(port,'127.0.0.1',()=>console.log('OMEGA permanent : '+origin+'/#pilot\nEntrées arrêtées au démarrage. Autorisation de l’agent et armement depuis le wallet.'));
for(const signal of ['SIGINT','SIGTERM'] as const)process.on(signal,()=>{clearInterval(timer);for(const e of Object.values(engines))e.active=false;server.close(()=>process.exit(0));setTimeout(()=>process.exit(0),2000).unref();});
