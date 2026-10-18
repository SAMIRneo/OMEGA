import {it,expect,vi,beforeEach,afterEach} from 'vitest';
import {Window} from 'happy-dom';
import {IDBFactory} from 'fake-indexeddb';
import {webcrypto} from 'node:crypto';
let dom:Window;
beforeEach(()=>{vi.resetModules();dom=new Window({url:'https://omega.test'});Object.defineProperties(dom,{isSecureContext:{value:true,configurable:true},indexedDB:{value:new IDBFactory()},crypto:{value:webcrypto}});Object.defineProperty(dom.navigator,'locks',{value:{request:vi.fn()}});(dom as any).ethereum={request:vi.fn()};vi.stubGlobal('window',dom);});
afterEach(async()=>{await dom.happyDOM.abort();vi.unstubAllGlobals();vi.restoreAllMocks();});
it('confirms actual vault writes without creating an agent, prompting a wallet or leaving preference data',async()=>{
 const {browserReadiness}=await import('./readiness');expect(await browserReadiness()).toMatchObject({secure:true,wallet:true,locks:true,crypto:true,vault:true,memory:true});
 expect((dom as any).ethereum.request).not.toHaveBeenCalled();expect(dom.localStorage.length).toBe(0);
 const {BrowserVault}=await import('./vault');const vault=new BrowserVault();expect(await vault.load('testnet')).toBeNull();expect(await vault.load('mainnet')).toBeNull();await vault.close();
});
it('reports blocked storage and an insecure context without claiming that the account will be remembered',async()=>{
 Object.defineProperty(dom,'isSecureContext',{value:false});vi.spyOn(dom.localStorage,'setItem').mockImplementation(()=>{throw Error('blocked')});
 const {browserReadiness}=await import('./readiness');expect(await browserReadiness()).toMatchObject({secure:false,vault:false,memory:false});expect((dom as any).ethereum.request).not.toHaveBeenCalled();
});
it('keeps a failed vault transaction visible and does not approve a storage probe as usable',async()=>{
 const {BrowserVault}=await import('./vault');vi.spyOn(BrowserVault.prototype,'checkStorage').mockRejectedValue(Error('quota exceeded'));vi.spyOn(BrowserVault.prototype,'close').mockRejectedValue(Error('open failed'));
 const {browserReadiness}=await import('./readiness');expect(await browserReadiness()).toMatchObject({vault:false,error:'quota exceeded'});
});
