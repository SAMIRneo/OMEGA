import {it,expect,vi,afterEach} from 'vitest';
import {Window} from 'happy-dom';
import {readFileSync} from 'node:fs';
import {sample} from '../core/test-fixtures';
let dom:Window;
afterEach(()=>{dom?.happyDOM.abort();vi.unstubAllGlobals();});
it('reports the observed depth and clears stale liquidity, including after a deferred load',async()=>{
 vi.resetModules();dom=new Window();dom.document.write(readFileSync(new URL('../index.html',import.meta.url),'utf8'));vi.stubGlobal('document',dom.document);
 const {rememberSnapshot}=await import('../shared/market-store');const s=sample();s.market.fresh=true;s.market.book={time:0,levels:[[{px:'2500',sz:'.1'},{px:'2499',sz:'.2'}],[{px:'2501',sz:'.3'}]]};
 rememberSnapshot(s);await import('./liquidity');
 expect(dom.document.getElementById('liquidity-status')!.textContent).toBe('2 ACHATS / 1 VENTE');
 expect(dom.document.getElementById('liquidity-buy')!.textContent).toBe('0,30 ETH');
 expect(dom.document.getElementById('liquidity-bid-area')!.getAttribute('d')).toContain('M400,200');
 s.market.fresh=false;rememberSnapshot(s);
 expect(dom.document.getElementById('liquidity-status')!.textContent).toBe('DONNÉES À VÉRIFIER');
 expect(dom.document.getElementById('liquidity-buy')!.textContent).toBe('—');
 expect(dom.document.getElementById('liquidity-bid-area')!.getAttribute('d')).toBe('');
});
