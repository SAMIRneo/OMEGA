import {it,expect,vi,afterEach} from 'vitest';
import {Window} from 'happy-dom';
import {readFileSync} from 'node:fs';
import {sample,risk} from './core/test-fixtures';
let dom:Window;
afterEach(()=>{dom?.happyDOM.abort();vi.unstubAllGlobals();});
it('switches accessible Bot panels, inspects real horizon values and uses only confirmed service events',async()=>{
 vi.resetModules();dom=new Window({url:'https://omega.test/#pilot'});dom.document.write(readFileSync(new URL('./index.html',import.meta.url),'utf8'));
 vi.stubGlobal('window',dom);vi.stubGlobal('document',dom.document);vi.stubGlobal('matchMedia',()=>({matches:true,addEventListener:vi.fn(),removeEventListener:vi.fn()}));
 (dom as any).RiskCore={exports:risk};(dom as any).PaperPilot={evaluate:()=>({status:'wait',candidate:null,reasons:['Attente de nouvelle clôture']})};
 await import('./bot-dashboard');const {rememberSnapshot}=await import('./shared/market-store');const {publishRunner}=await import('./shared/runner-store');rememberSnapshot(sample());
 expect(dom.document.getElementById('bot-execution-badge')?.textContent).toBe('NON RELIÉ');expect(dom.document.getElementById('bot-alignment')?.textContent).toBe('3 / 3');
 (dom.document.querySelector('[data-bot-horizon="15m"]') as any).click();expect(dom.document.getElementById('bot-horizon-detail')?.textContent).toContain('RSI 60,0');
 (dom.document.getElementById('bot-tab-settings') as any).click();expect(dom.document.getElementById('bot-settings')?.hasAttribute('hidden')).toBe(false);expect(dom.document.getElementById('bot-overview')?.hasAttribute('hidden')).toBe(true);
 dom.document.getElementById('bot-tab-settings')!.dispatchEvent(new dom.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));expect(dom.document.getElementById('bot-activity')?.hasAttribute('hidden')).toBe(false);
 publishRunner({connected:true,network:'testnet',active:true,events:[{at:Date.now(),message:'Armement confirmé'}]});expect(dom.document.getElementById('bot-execution-badge')?.textContent).toBe('PILOTE ACTIF');expect(dom.document.getElementById('bot-activity-list')?.textContent).toContain('Armement confirmé');
 publishRunner({connected:false,active:true,events:[{at:Date.now(),message:'ancien état'}]});expect(dom.document.getElementById('bot-execution-badge')?.textContent).toBe('NON RELIÉ');expect(dom.document.getElementById('bot-activity-list')?.textContent).not.toContain('ancien état');
});
