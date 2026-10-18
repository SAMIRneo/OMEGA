import {afterEach,beforeEach,it,expect,vi} from 'vitest';
import {Window} from 'happy-dom';
beforeEach(()=>{vi.resetModules();vi.stubGlobal('window',new Window());});
afterEach(()=>vi.unstubAllGlobals());
it('requests account permission directly and reports nested provider failures',async()=>{
 const {requestWalletAccount,walletError}=await import('./wallet-provider');
 const request=vi.fn(async({method})=>{if(method==='eth_accounts')throw {code:4100};return ['0x1111111111111111111111111111111111111111'];});
 expect(await requestWalletAccount({request:request as any})).toMatch(/^0x1/);expect(request).toHaveBeenCalledExactlyOnceWith({method:'eth_requestAccounts'});
 expect(walletError({message:'Unknown RPC error',cause:{code:4001,message:'Rejected'}})).toContain('refusée');
 expect(walletError({cause:{code:4100}})).toContain('non autorisé');
});
it('uses the wallet chain for signing and rejects malformed chain responses',async()=>{
 const {signingChainId}=await import('./wallet-provider');
 expect(await signingChainId({request:vi.fn(async()=>'0xa4b1') as any})).toBe('0xa4b1');
 await expect(signingChainId({request:vi.fn(async()=>'mainnet') as any})).rejects.toThrow('illisible');
});
it('reuses permission for an authorized owner and requests it only when missing',async()=>{
 const {authorizedWalletAccount}=await import('./wallet-provider');const owner='0x1111111111111111111111111111111111111111';
 const request=vi.fn(async()=>[owner]);expect(await authorizedWalletAccount({request:request as any})).toBe(owner);expect(request).toHaveBeenCalledExactlyOnceWith({method:'eth_accounts'});
 request.mockImplementationOnce(async()=>[]);await authorizedWalletAccount({request:request as any});expect(request.mock.calls.at(-1)).toEqual([{method:'eth_requestAccounts'}]);
 request.mockImplementationOnce(async()=>{throw {code:4100};});await authorizedWalletAccount({request:request as any});expect(request.mock.calls.at(-1)).toEqual([{method:'eth_requestAccounts'}]);
});
