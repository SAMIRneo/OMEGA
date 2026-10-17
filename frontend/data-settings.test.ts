import {it,expect,vi,afterEach} from 'vitest';
import {Window} from 'happy-dom';
import {readFileSync} from 'node:fs';
let dom:Window;
async function start(){vi.resetModules();dom=new Window({url:'https://omega.test/#wallet'});dom.document.write(readFileSync(new URL('./index.html',import.meta.url),'utf8'));vi.stubGlobal('window',dom);vi.stubGlobal('document',dom.document);const persist=vi.fn(async()=>true);vi.stubGlobal('navigator',{storage:{persist}});return {persist};}
afterEach(()=>{dom.happyDOM.abort();vi.unstubAllGlobals();});
it('shows separate network save health and only requests persistent storage after a click',async()=>{
 const {persist}=await start();dom.localStorage.setItem('axiom-eth-daily-paper-v1','broken');await import('./data-settings');
 expect(dom.document.getElementById('data-mainnet')!.textContent).toContain('à vérifier');expect(dom.document.getElementById('data-testnet')!.textContent).toContain('Aucune simulation');expect(persist).not.toHaveBeenCalled();
 (dom.document.getElementById('data-persist') as any).click();await Promise.resolve();expect(persist).toHaveBeenCalledOnce();expect(dom.document.getElementById('data-feedback')!.textContent).toContain('accordée');expect(dom.localStorage.getItem('axiom-eth-daily-paper-v1')).toBe('broken');
});
it('reports denied storage without failing the whole settings module',async()=>{
 await start();Object.defineProperty(dom,'localStorage',{get(){throw Error('SecurityError')}});await import('./data-settings');
 expect(dom.document.getElementById('data-storage-state')!.textContent).toContain('indisponible');
});
