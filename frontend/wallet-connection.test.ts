import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {Window} from 'happy-dom';
import {readFileSync} from 'node:fs';
const fake=vi.hoisted(()=>({connect:vi.fn(),refresh:vi.fn(),disconnect:vi.fn(),restore:vi.fn()}));
vi.mock('./exchange',()=>({connectWallet:fake.connect,refreshWallet:fake.refresh,disconnectWallet:fake.disconnect,restoreWallet:fake.restore}));
vi.mock('./shared/mobile-wallet',()=>({connectMobileWallet:vi.fn(async()=>{})}));
let dom:Window;
const el=(id:string)=>dom.document.getElementById(id)! as unknown as HTMLElement;
beforeEach(()=>{
 vi.resetModules();vi.clearAllMocks();fake.connect.mockResolvedValue(undefined);
 dom=new Window({url:'https://omega.test/#pilot'});dom.document.write(readFileSync(new URL('./index.html',import.meta.url),'utf8'));
 (dom as any).BrowserAtelier={environment:{id:'testnet'}};
 vi.stubGlobal('window',dom);vi.stubGlobal('document',dom.document);vi.stubGlobal('location',dom.location);vi.stubGlobal('fetch',vi.fn());
});
afterEach(()=>{dom.happyDOM.abort();vi.unstubAllGlobals();});
it('offers a visible wallet entry without probing localhost or requesting wallet access on load',async()=>{
 await import('./wallet-connection');expect(fetch).not.toHaveBeenCalled();expect(fake.connect).not.toHaveBeenCalled();
 expect(el('connect-wallet-state').textContent).toBe('Wallet non connecté');expect(el('connect-wallet-help').hidden).toBe(false);
 expect(el('connect-service-state').textContent).toContain('Mode web');expect(el('connect-service-help').hidden).toBe(true);
 expect(el('wallet-short')).not.toBeNull();expect(dom.document.querySelector('[data-connect-network="testnet"]')?.getAttribute('aria-pressed')).toBe('true');
});
it('does not present an unfunded perpetual account as ready to start',async()=>{
 await import('./wallet-connection');const {publishWallet}=await import('./shared/wallet-store');const {publishRunner}=await import('./shared/runner-store');
 publishWallet({network:'testnet',address:'0x1111111111111111111111111111111111111111',busy:false,readAt:Date.now(),equity:0,withdrawable:0,position:null,openOrders:0,message:'Compte lu',error:false});
 publishRunner({network:'testnet',connected:true,approved:true,active:false});
 expect(el('next-step-title').textContent).toBe('Compte à approvisionner');expect(el('next-step-action').dataset.target).toBe('funds');
});
it('keeps wallet reads separate from approval and confirmed automation',async()=>{
 await import('./wallet-connection');const {publishWallet}=await import('./shared/wallet-store');const {publishRunner}=await import('./shared/runner-store');
 publishWallet({network:'testnet',address:'0x1111111111111111111111111111111111111111',busy:false,readAt:Date.now(),equity:1200,withdrawable:0,position:{size:-6,entry:2400},openOrders:2,message:'Compte lu',error:false});
 expect(el('connect-position').textContent).toContain('Short');expect(el('connect-position-note').hidden).toBe(false);expect(el('connect-step-wallet').dataset.complete).toBe('true');
 expect(el('connect-step-agent').getAttribute('aria-current')).toBe('step');
 expect(el('connect-step-agent').dataset.complete).toBe('false');expect(fake.connect).not.toHaveBeenCalled();
 publishRunner({connected:false,approved:true,active:true});expect(el('connect-step-start').dataset.complete).toBe('false');
 publishRunner({connected:true,network:'testnet',approved:true,active:false});expect(el('connect-step-agent').dataset.complete).toBe('true');expect(el('connect-step-start').dataset.complete).toBe('false');
 publishRunner({connected:true,network:'testnet',owner:'0x2222222222222222222222222222222222222222',approved:true,active:true});expect(el('connect-step-agent').dataset.complete).toBe('false');expect(el('connect-agent-state').textContent).toContain('autre compte');
 publishWallet({network:'mainnet',address:null,busy:false,readAt:0,equity:9999,withdrawable:0,position:null,openOrders:0,message:'',error:false});expect(el('connect-equity').textContent).toBe('—');
});
it('retains an import/connection error after loading ends, with the retry button available',async()=>{
 const module=await import('./wallet-connection');fake.connect.mockRejectedValueOnce(Error('Module indisponible'));await module.connect();
 expect(el('connect-feedback').textContent).toBe('Module indisponible');expect(el('connect-feedback').dataset.tone).toBe('error');
 expect((dom.document.querySelector('.connect-wallet-actions [data-wallet-connect]') as any).disabled).toBe(false);await module.connect();expect(fake.connect).toHaveBeenCalledTimes(2);
});
it('uses the guarded network selector and surfaces a refusal in the connection card',async()=>{
 await import('./wallet-connection');const select=el('network-select') as any;const change=vi.fn();select.addEventListener('change',change);
 (dom.document.querySelector('[data-connect-network="mainnet"]') as any).click();expect(change).not.toHaveBeenCalled();
 select.disabled=false;(dom.document.querySelector('[data-connect-network="mainnet"]') as any).click();expect(change).toHaveBeenCalledTimes(1);expect(select.value).toBe('mainnet');
 dom.dispatchEvent(new dom.CustomEvent('omega-network-error',{detail:'Arrête le pilote avant de changer de réseau.' as any}));expect(el('connect-feedback').textContent).toContain('Arrête le pilote');
});
it('selects the announced MetaMask provider when another wallet owns window.ethereum',async()=>{
 const fallback={request:vi.fn()},metamask={request:vi.fn()};(dom as any).ethereum=fallback;
 const {walletProvider}=await import('./shared/wallet-provider');expect(walletProvider()).toBe(fallback);
 dom.dispatchEvent(new dom.CustomEvent('eip6963:announceProvider',{detail:{info:{rdns:'io.metamask'},provider:metamask}}));expect(walletProvider()).toBe(metamask);
});

it('connects from the primary local action and never authorizes or arms just from state updates',async()=>{
 dom.location.href='http://127.0.0.1:8766/#pilot';await import('./wallet-connection');const {publishWallet}=await import('./shared/wallet-store');const {publishRunner}=await import('./shared/runner-store');
 expect(el('next-step-title').textContent).toBe('Relier mon compte');
 (el('next-step-action') as any).click();await vi.dynamicImportSettled();expect((el('account-disclosure') as HTMLDetailsElement).open).toBe(true);expect(fake.connect).toHaveBeenCalledTimes(1);
 publishWallet({network:'testnet',address:'0x1111111111111111111111111111111111111111',busy:false,readAt:Date.now(),equity:1200,withdrawable:0,position:null,openOrders:0,message:'Compte lu',error:false});
 expect(el('next-step-title').textContent).toBe('Vérifier OMEGA local');
 (el('next-step-action') as any).click();expect((el('connect-service-help') as HTMLDetailsElement).open).toBe(true);
 publishRunner({connected:true,network:'testnet',approved:true,active:false});expect(el('next-step-action').dataset.target).toBe('ready');
 publishRunner({connected:true,network:'testnet',approved:true,pending:true});expect(el('next-step-action').dataset.target).toBe('pending');
 publishRunner({connected:false,network:'testnet',approved:true,active:true});expect(el('next-step-action').dataset.target).toBe('service');expect(fake.connect).toHaveBeenCalledTimes(1);expect(fetch).not.toHaveBeenCalled();
});

it('keeps mainnet start explicit and requires the visible real-funds consent',async()=>{
 (dom as any).BrowserAtelier.environment.id='mainnet';await import('./wallet-connection');
 const {publishWallet}=await import('./shared/wallet-store'),{publishRunner}=await import('./shared/runner-store');
 publishWallet({network:'mainnet',address:'0x1111111111111111111111111111111111111111',busy:false,readAt:Date.now(),equity:1000,withdrawable:1000,position:null,openOrders:0,message:'Compte lu',error:false});
 const authorize=vi.fn(),start=vi.fn();el('runner-authorize').addEventListener('click',authorize);el('runner-start').addEventListener('click',start);
 (el('runner-authorize') as HTMLButtonElement).disabled=false;(el('runner-start') as HTMLButtonElement).disabled=false;
 publishRunner({connected:true,network:'mainnet',approved:false,owner:'0x1111111111111111111111111111111111111111'});
 expect(authorize).not.toHaveBeenCalled();(el('next-step-action') as HTMLButtonElement).click();expect(authorize).toHaveBeenCalledTimes(1);
 publishRunner({connected:true,network:'mainnet',approved:true});expect(start).not.toHaveBeenCalled();expect(el('next-step-action').textContent).toContain('Confirmer les fonds réels');
 (el('next-step-action') as HTMLButtonElement).click();expect(start).not.toHaveBeenCalled();expect(dom.document.activeElement?.id).toBe('runner-mainnet');
 (el('runner-mainnet') as HTMLInputElement).checked=true;el('runner-mainnet').dispatchEvent(new dom.Event('change') as unknown as Event);expect(start).not.toHaveBeenCalled();
 (el('next-step-action') as HTMLButtonElement).click();expect(start).toHaveBeenCalledTimes(1);
 publishRunner({connected:false,network:'mainnet',approved:true});(el('next-step-action') as HTMLButtonElement).click();expect(start).toHaveBeenCalledTimes(1);
});
it('disables the primary connection action while the service is busy',async()=>{
 await import('./wallet-connection');const {publishRunner}=await import('./shared/runner-store');publishRunner({connected:true,network:'testnet',busy:true});
 expect((el('next-step-action') as HTMLButtonElement).disabled).toBe(true);expect(el('next-step-action').textContent).toContain('Action en cours');expect(fake.connect).not.toHaveBeenCalled();
});

it('restores only a previously remembered session, without another connection request',async()=>{
 dom.localStorage.setItem('omega-wallet-session-v1',JSON.stringify({address:'0x1111111111111111111111111111111111111111',reconnect:true}));
 await import('./wallet-connection');await vi.dynamicImportSettled();
 expect(fake.restore).toHaveBeenCalledOnce();expect(fake.connect).not.toHaveBeenCalled();expect(fetch).not.toHaveBeenCalled();
});

it('offers direct web connection without requiring a local installation',async()=>{
 await import('./wallet-connection');expect(el('next-step-action').dataset.target).toBe('wallet');
 (el('next-step-action') as any).click();await vi.dynamicImportSettled();expect(fake.connect).toHaveBeenCalledOnce();expect(el('connect-service-help').hidden).toBe(true);
});

it('continues to show confirmed Node activity when MetaMask is locked without implying a new connection is required',async()=>{
 await import('./wallet-connection');const {publishRunner}=await import('./shared/runner-store');
 publishRunner({connected:true,mode:'local',network:'testnet',owner:'0x1111111111111111111111111111111111111111',approved:true,active:true});
 expect(el('next-step-action').dataset.target).toBe('active');expect(fake.connect).not.toHaveBeenCalled();expect(el('connect-step-wallet').dataset.complete).toBe('false');
});
