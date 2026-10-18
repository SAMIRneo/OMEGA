import {it,expect,vi,afterEach} from 'vitest';
import {Window} from 'happy-dom';
import {readFileSync} from 'node:fs';
import {createFeatureLoader} from './feature-loader';
let dom:Window;
afterEach(()=>dom?.happyDOM.abort());
function fixture(){dom=new Window();dom.document.write(readFileSync(new URL('../index.html',import.meta.url),'utf8'));return createFeatureLoader(dom.document as unknown as Document);}
it('keeps module errors separate from market alerts and clears only a recovered module',async()=>{
 const features=fixture(),graph=vi.fn().mockRejectedValueOnce(Error('offline')).mockResolvedValue(undefined),depth=vi.fn().mockRejectedValue(Error('offline'));
 await features.load('Graphique indisponible',graph);await features.load('Liquidité indisponible',depth);
 dom.document.getElementById('global-alert')!.setAttribute('hidden','');
 expect(dom.document.getElementById('module-alert')!.hasAttribute('hidden')).toBe(false);
 expect(dom.document.getElementById('module-errors')!.textContent).toContain('Graphique indisponible');
 await features.load('Graphique indisponible',graph);
 expect(dom.document.getElementById('module-errors')!.textContent).not.toContain('Graphique indisponible');
 expect(dom.document.getElementById('module-errors')!.textContent).toContain('Liquidité indisponible');
});
it('shares concurrent attempts and retries only failed module loads, never wallet actions',async()=>{
 const features=fixture();let release!:()=>void;
 const task=vi.fn(()=>new Promise<void>(resolve=>{release=resolve;}));
 const a=features.load('Graphique indisponible',task),b=features.load('Graphique indisponible',task);await Promise.resolve();
 expect(task).toHaveBeenCalledTimes(1);release();await Promise.all([a,b]);
 const retry=vi.fn().mockRejectedValueOnce(Error('offline')).mockResolvedValue(undefined);
 await features.load('Recherche indisponible',retry);features.report('Signature refusée',Error('refus'));
 await features.retry();expect(retry).toHaveBeenCalledTimes(2);
 expect(dom.document.getElementById('module-errors')!.textContent).toContain('Signature refusée');
 expect((dom.document.getElementById('module-retry') as any).disabled).toBe(true);
 features.dismiss();expect(dom.document.getElementById('module-alert')!.hasAttribute('hidden')).toBe(true);
});
