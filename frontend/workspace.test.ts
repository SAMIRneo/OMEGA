import {it,expect,vi,afterEach} from 'vitest';
import {Window} from 'happy-dom';
import {readFileSync} from 'node:fs';
import {sample,risk} from './core/test-fixtures';
let dom:Window;
afterEach(()=>{dom?.happyDOM.abort();vi.unstubAllGlobals();});
it('renders diagnostics and restores deferred journal updates without referencing retired widgets',async()=>{
 vi.resetModules();dom=new Window({url:'https://omega.test/#pilot'});dom.document.write(readFileSync(new URL('./index.html',import.meta.url),'utf8'));
 vi.stubGlobal('window',dom);vi.stubGlobal('document',dom.document);
 const s=sample();s.paper.history=[{netPnl:125,entry:2500,exit:2520,side:'long',reason:'test'}];
 (dom as any).RiskCore={exports:risk};(dom as any).PaperPilot={evaluate:()=>({status:'wait',candidate:null,reasons:['Attente de signal']})};
 await import('./workspace');
 const emit=()=>dom.dispatchEvent(new dom.CustomEvent('axiom-state',{detail:s}));
 dom.document.getElementById('view-pilot')!.removeAttribute('hidden');emit();expect(dom.document.querySelectorAll('#decision-checklist li').length).toBeGreaterThan(0);expect(dom.document.getElementById('decision-summary')?.textContent).toBe('Attente de signal');
 expect(dom.document.getElementById('journal-net')?.textContent).toBe('0,00 USDC');
 dom.document.getElementById('view-journal')!.removeAttribute('hidden');emit();expect(dom.document.getElementById('journal-net')?.textContent).toBe('125,00 USDC');expect(dom.document.querySelector('#equity-curve polyline')).not.toBeNull();
});
