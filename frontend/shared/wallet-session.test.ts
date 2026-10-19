import {beforeEach,afterEach,it,expect,vi} from 'vitest';
import {Window} from 'happy-dom';
const fake=vi.hoisted(()=>({reads:[] as any[],fail:false,read:null as null|(()=>Promise<any>),mobile:vi.fn()}));
vi.mock('@nktkas/hyperliquid',()=>({HttpTransport:class{options:any;constructor(options:any){this.options=options;}},InfoClient:class{transport:any;constructor({transport}:any){this.transport=transport;}async clearinghouseState(args:any){fake.reads.push({args,options:this.transport.options});if(fake.read)return fake.read();if(fake.fail)throw Error('Account unavailable');return {marginSummary:{accountValue:'1200'},withdrawable:'1000',assetPositions:[]};}}}));
vi.mock('./wallet-help',()=>({openWalletHelp:fake.mobile}));
const owner='0x1111111111111111111111111111111111111111';let dom:Window,request:ReturnType<typeof vi.fn>,handlers:Map<string,Function>;
beforeEach(()=>{vi.resetModules();fake.reads=[];fake.fail=false;fake.read=null;fake.mobile.mockReset();dom=new Window({url:'https://omega.test/#pilot'});handlers=new Map();request=vi.fn(async()=>[owner]);(dom as any).ethereum={request,on:(event:string,fn:Function)=>handlers.set(event,fn),removeListener:(event:string,fn:Function)=>{if(handlers.get(event)===fn)handlers.delete(event);}};(dom as any).BrowserAtelier={environment:{id:'testnet'},setAddress:vi.fn(async()=>{})};vi.stubGlobal('window',dom);vi.stubGlobal('document',dom.document);vi.stubGlobal('navigator',{});});
afterEach(()=>{dom.happyDOM.abort();vi.unstubAllGlobals();});
it.each(['testnet','mainnet'] as const)('connects %s without manual-order APIs, signing, Web Locks or an agent vault',async network=>{
 (dom as any).BrowserAtelier.environment.id=network;const session=await import('./wallet-session');expect(request).not.toHaveBeenCalled();
 await session.connectWallet();expect(session.walletSession()).toMatchObject({network,address:owner,equity:1200,busy:false,error:false});
 expect(request).toHaveBeenCalledExactlyOnceWith({method:'eth_requestAccounts'});expect(fake.reads).toHaveLength(1);expect(fake.reads[0].options.isTestnet).toBe(network==='testnet');
 await session.requireWallet();expect(request.mock.calls.map(c=>c[0].method)).toEqual(['eth_requestAccounts','eth_accounts']);
});
it('coalesces repeated clicks into a single account request',async()=>{
 const session=await import('./wallet-session');await Promise.all([session.connectWallet(),session.connectWallet(),session.connectWallet()]);expect(request).toHaveBeenCalledOnce();
});
it('allows retry after a permission refusal and never signs',async()=>{
 const session=await import('./wallet-session');request.mockRejectedValueOnce({code:4001});await session.connectWallet();expect(session.walletSession()).toMatchObject({address:null,error:true,busy:false});expect(session.walletSession().message).toContain('4001');
 await session.connectWallet();expect(session.walletSession().address).toBe(owner);expect(request.mock.calls.every(c=>c[0].method==='eth_requestAccounts')).toBe(true);
});
it('restores a remembered owner without requesting permission',async()=>{
 dom.localStorage.setItem('omega-wallet-session-v1',JSON.stringify({address:owner,reconnect:true}));const session=await import('./wallet-session');await session.restoreWallet();expect(request).toHaveBeenCalledExactlyOnceWith({method:'eth_accounts'});expect(session.walletSession().address).toBe(owner);
});
it('discards an in-flight core read after disconnect and keeps the account blank',async()=>{
 const session=await import('./wallet-session');await session.connectWallet();let resolve!:(value:any)=>void;fake.read=()=>new Promise(done=>resolve=done);
 const reading=session.refreshWallet();await vi.dynamicImportSettled();session.disconnectWallet();resolve({marginSummary:{accountValue:'9999'},withdrawable:'9999',assetPositions:[]});await reading;
 expect(session.walletSession()).toMatchObject({address:null,equity:null,readAt:0,busy:false});
});
it('invalidates a changed owner and does not silently select the replacement',async()=>{
 const session=await import('./wallet-session');await session.connectWallet();handlers.get('accountsChanged')!(['0x2222222222222222222222222222222222222222']);expect(session.walletSession().address).toBeNull();expect(dom.localStorage.getItem('omega-wallet-session-v1')).toBeNull();
});
it('resets only the connection preference, preserving unrelated journals',async()=>{
 const session=await import('./wallet-session');await session.connectWallet();dom.localStorage.setItem('omega-testnet-exchange-pending-'+owner,'pending-fixture');
 await session.resetWalletConnection();expect(session.walletSession().address).toBeNull();expect(dom.localStorage.getItem('omega-wallet-session-v1')).toBeNull();expect(dom.localStorage.getItem('omega-testnet-exchange-pending-'+owner)).toBe('pending-fixture');
});
it('blocks agent authorization while a manual wallet operation is active',async()=>{
 const session=await import('./wallet-session');await session.connectWallet();session.setWalletActivity(true);await expect(session.requireWallet()).rejects.toThrow('manuelle');session.setWalletActivity(false);
});
it('keeps wallet permission independent from an unavailable Hyperliquid read and retries the read without new permission',async()=>{
 const session=await import('./wallet-session');fake.fail=true;await session.connectWallet();expect(session.walletSession()).toMatchObject({address:owner,readAt:0,error:true});
 expect((await session.requireWallet()).owner).toBe(owner);fake.fail=false;await session.refreshWallet();expect(session.walletSession()).toMatchObject({readAt:expect.any(Number),error:false,equity:1200});
 expect(request.mock.calls.filter(c=>c[0].method==='eth_requestAccounts')).toHaveLength(1);
});
it('shows native-wallet guidance without claiming this browser is connected when no provider is available',async()=>{
 delete (dom as any).ethereum;const session=await import('./wallet-session');await session.connectWallet();expect(fake.mobile).toHaveBeenCalledOnce();expect(session.walletSession()).toMatchObject({address:null,busy:false,readAt:0});expect(fake.reads).toHaveLength(0);
});
it('keeps the pending manual-send guard available without loading the manual interface',async()=>{
 const session=await import('./wallet-session');await session.connectWallet();dom.localStorage.setItem('omega-testnet-exchange-pending-'+owner,'pending-fixture');
 await expect((dom as any).TestnetGate()).rejects.toThrow('envoi manuel');
});
