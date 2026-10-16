import {it,expect,vi,afterEach} from 'vitest';
import {Window} from 'happy-dom';
import {readFileSync} from 'node:fs';
let dom:Window;
afterEach(()=>{dom?.happyDOM.abort();vi.unstubAllGlobals();vi.useRealTimers();});
it('checks the permanent runner before a network switch even before the Bot tab was visited',async()=>{
 vi.resetModules();vi.useFakeTimers();dom=new Window({url:'http://127.0.0.1:8766/#terminal'});dom.document.write(readFileSync(new URL('./index.html',import.meta.url),'utf8'));
 vi.stubGlobal('window',dom);vi.stubGlobal('document',dom.document);vi.stubGlobal('location',dom.location);vi.stubGlobal('navigator',{locks:{request:vi.fn()}});
 const request=vi.fn(),stop=vi.fn();(dom as any).BrowserAtelier={environment:{id:'mainnet'},request};(dom as any).PaperPilot={stop};
 const fetch=vi.fn(async(path:string)=>({ok:true,json:async()=>path.includes('/session')?{token:'test-session'}:{network:'mainnet',active:true,approved:true,owner:null,events:[],reason:'Actif'}}));vi.stubGlobal('fetch',fetch);
 await import('./network');const select=dom.document.getElementById('network-select') as any;select.value='testnet';select.dispatchEvent(new dom.Event('change'));
 // Flush dynamic imports without advancing the service's polling interval.
 await vi.dynamicImportSettled();await vi.advanceTimersByTimeAsync(0);
 expect(dom.document.getElementById('connection-detail')?.textContent).toContain('Arrête le pilote automatique');expect(request).not.toHaveBeenCalled();expect(stop).not.toHaveBeenCalled();expect(select.value).toBe('mainnet');
});
