import {it,expect,vi,afterEach} from 'vitest';
import {Window} from 'happy-dom';
import {readFileSync} from 'node:fs';
import {sample} from './core/test-fixtures';
let dom:Window;
afterEach(()=>{dom?.happyDOM.abort();vi.unstubAllGlobals();});
it('keeps account and simulation widgets separate and only delegates an explicitly requested stop',async()=>{
 vi.resetModules();dom=new Window({url:'https://omega.test/#cockpit'});dom.document.write(readFileSync(new URL('./index.html',import.meta.url),'utf8'));vi.stubGlobal('window',dom);vi.stubGlobal('document',dom.document);
 (dom as any).BrowserAtelier={environment:{id:'testnet'}};(dom as any).PaperPilot={evaluate:()=>({status:'wait',candidate:null,reasons:['Attendre la clôture']}),state:{events:[]}};
 await import('./cockpit');const {rememberSnapshot}=await import('./shared/market-store'),{publishRunner}=await import('./shared/runner-store');rememberSnapshot(sample());
 expect(dom.document.getElementById('cockpit-equity')?.textContent).toBe('10 000,00');expect(dom.document.getElementById('cockpit-bot-state')?.textContent).toBe('À connecter');
 const select=dom.document.getElementById('cockpit-source') as any;select.value='account';select.dispatchEvent(new dom.Event('change'));
 expect(dom.document.getElementById('cockpit-equity')?.textContent).toBe('—');expect(dom.document.getElementById('cockpit-positions')?.textContent).toContain('Consulte ton compte');
 publishRunner({connected:true,network:'mainnet',active:true});expect(dom.document.getElementById('cockpit-bot-state')?.textContent).toBe('À connecter');
 const stop=dom.document.getElementById('runner-stop') as any,onStop=vi.fn();stop.addEventListener('click',onStop);
 publishRunner({connected:true,network:'testnet',active:true});expect(dom.document.getElementById('cockpit-bot-state')?.textContent).toBe('En marche');expect(onStop).not.toHaveBeenCalled();
 const action=dom.document.getElementById('cockpit-stop') as any;action.click();expect(onStop).not.toHaveBeenCalled();stop.disabled=false;action.click();expect(onStop).toHaveBeenCalledTimes(1);
});
