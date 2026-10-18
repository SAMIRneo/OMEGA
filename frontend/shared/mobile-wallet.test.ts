import {afterEach,beforeEach,it,expect,vi} from 'vitest';
import {Window} from 'happy-dom';
const fake=vi.hoisted(()=>({create:vi.fn(),connect:vi.fn(),disconnect:vi.fn(),provider:{request:vi.fn(),on:vi.fn(),removeListener:vi.fn()}}));
vi.mock('@metamask/connect-evm',()=>({createEVMClient:fake.create}));
const owner='0x1111111111111111111111111111111111111111';
beforeEach(()=>{vi.resetModules();vi.clearAllMocks();const dom=new Window({url:'https://omega.test'});vi.stubGlobal('window',dom);vi.stubGlobal('document',dom.document);vi.stubGlobal('location',dom.location);fake.create.mockResolvedValue({connect:fake.connect,disconnect:fake.disconnect,getProvider:()=>fake.provider});fake.connect.mockResolvedValue({accounts:[owner]});fake.disconnect.mockResolvedValue(undefined);fake.provider.request.mockResolvedValue([owner]);});
afterEach(()=>vi.unstubAllGlobals());
it('loads and connects only on explicit action without signing, then exposes an EIP1193 provider',async()=>{
 const {connectMobileWallet}=await import('./mobile-wallet');const {walletProvider}=await import('./wallet-provider');
 expect(fake.create).not.toHaveBeenCalled();await connectMobileWallet();
 expect(fake.create.mock.calls[0][0].analytics.enabled).toBe(false);
 expect(await walletProvider()!.request({method:'eth_accounts'})).toEqual([owner]);
 expect(await walletProvider()!.request({method:'eth_requestAccounts'})).toEqual([owner]);
 expect(fake.provider.request.mock.calls.map(c=>c[0].method)).toEqual(['eth_accounts','eth_accounts']);
 expect(fake.connect.mock.calls[0][0].forceRequest).toBe(true);
});
it('rejects ambiguous accounts and invalidates a session when multiple accounts are announced',async()=>{
 const {connectMobileWallet}=await import('./mobile-wallet');const {walletProvider}=await import('./wallet-provider');
 fake.connect.mockResolvedValueOnce({accounts:[owner,'0x2222222222222222222222222222222222222222']});
 await expect(connectMobileWallet()).rejects.toThrow('un seul compte');expect(fake.disconnect).toHaveBeenCalledOnce();
 await connectMobileWallet();const handler=vi.fn();walletProvider()!.on!('accountsChanged',handler);
 fake.provider.on.mock.calls.at(-1)![1]([owner,'0x2222222222222222222222222222222222222222']);expect(handler).toHaveBeenCalledWith([]);
 fake.provider.request.mockResolvedValue([owner,'0x2222222222222222222222222222222222222222']);
 await expect(walletProvider()!.request({method:'eth_accounts'})).rejects.toThrow('plusieurs comptes');
});
it('cancels a pending connection and removes the pairing UI without attaching a wallet',async()=>{
 fake.connect.mockImplementationOnce(()=>new Promise(()=>{}));
 const {connectMobileWallet}=await import('./mobile-wallet');const {walletProvider}=await import('./wallet-provider');
 const connecting=connectMobileWallet();await vi.dynamicImportSettled();
 (document.querySelector('.wallet-pairing button') as HTMLButtonElement).click();
 await expect(connecting).rejects.toThrow('annulée');expect(document.querySelector('dialog')).toBeNull();expect(walletProvider()).toBeUndefined();
});
