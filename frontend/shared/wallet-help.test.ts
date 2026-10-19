import {beforeEach,afterEach,it,expect,vi} from 'vitest';
import {Window} from 'happy-dom';
vi.mock('qr-code-styling',()=>({default:class{append(element:HTMLElement){element.textContent='Public site QR';}}}));
let dom:Window;
beforeEach(()=>{vi.resetModules();dom=new Window({url:'https://omega.test/app/?discard=fixture#old'});vi.stubGlobal('window',dom);vi.stubGlobal('document',dom.document);vi.stubGlobal('location',dom.location);vi.stubGlobal('fetch',vi.fn());});
afterEach(()=>{dom.happyDOM.abort();vi.unstubAllGlobals();});
it('builds a public MetaMask navigation link without copying query strings or previous fragments',async()=>{
 const {walletLinks}=await import('./wallet-help');expect(walletLinks()).toEqual({site:'https://omega.test/app/#pilot',mobile:'https://metamask.app.link/dapp/omega.test/app/#pilot'});
});
it('opens and closes help without a wallet request, relay connection or remote fetch',async()=>{
 const {openWalletHelp}=await import('./wallet-help');const waiting=openWalletHelp();
 expect(document.querySelector('dialog')?.getAttribute('open')).not.toBeNull();expect(document.querySelector('a')?.getAttribute('href')).toContain('metamask.app.link/dapp/');
 (document.querySelector('dialog button') as HTMLButtonElement).click();await waiting;expect(document.querySelector('dialog')).toBeNull();expect(fetch).not.toHaveBeenCalled();
});
it('uses the public site when previewing locally instead of sending a loopback URL to a phone',async()=>{
 dom.location.href='http://127.0.0.1:4173/#pilot';const {walletLinks}=await import('./wallet-help');expect(walletLinks().site).toBe('https://omega.kairos-labspro.chatgpt.site/#pilot');
});
