import {it,expect,vi,afterEach} from 'vitest';
import {Window} from 'happy-dom';
import {readFileSync} from 'node:fs';
let dom:Window;
afterEach(()=>{dom?.happyDOM.abort();vi.unstubAllGlobals();});
it('shows an honestly disconnected service on the public site without probing localhost',async()=>{
 vi.resetModules();dom=new Window({url:'https://omega.kairos-labspro.chatgpt.site/#pilot'});dom.document.write(readFileSync(new URL('./index.html',import.meta.url),'utf8'));
 const fetch=vi.fn();vi.stubGlobal('window',dom);vi.stubGlobal('document',dom.document);vi.stubGlobal('location',dom.location);vi.stubGlobal('fetch',fetch);
 (dom as any).BrowserAtelier={environment:{id:'mainnet'}};await import('./runner-ui');
 expect(fetch).not.toHaveBeenCalled();expect(dom.document.getElementById('runner-service')?.textContent).toBe('Non connecté');
 expect((dom.document.getElementById('runner-start') as any).disabled).toBe(true);expect(dom.document.querySelectorAll('.sidebar [data-view]')).toHaveLength(4);
 (dom.document.getElementById('runner-refresh') as any).click();await new Promise(resolve=>setTimeout(resolve,0));expect(dom.document.getElementById('runner-status')?.textContent).toContain('npm run bot');expect(fetch).not.toHaveBeenCalled();
 const ids=Array.from(dom.document.querySelectorAll('[id]'),el=>el.id);expect(new Set(ids).size).toBe(ids.length);
});
