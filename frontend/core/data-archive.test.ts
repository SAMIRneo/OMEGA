import {it,expect} from 'vitest';
import {createArchive,verifyArchive} from './data-archive';
it('exports both paper networks but excludes permissions, keys, session tokens and pending orders',async()=>{
 const entries:Record<string,string>={'axiom-eth-daily-paper-v1':'main','axiom-eth-daily-paper-v1-testnet':'test','axiom-eth-daily-paper-v1-testnet-backup-v1':'previous','omega-wallet-session-v1':'permission','omega-mainnet-exchange-pending-0x123':'pending','secret-key':'private','token':'session'};
 const archive=await createArchive({getItem:k=>entries[k]??null});expect(Object.keys(archive.entries)).toHaveLength(3);expect(archive.entries['axiom-eth-daily-paper-v1-testnet']).toBe('test');expect(JSON.stringify(archive)).not.toMatch(/permission|private|pending|session/);expect((await verifyArchive(JSON.stringify(archive))).sha256).toBe(archive.sha256);
});
it('rejects altered, foreign and oversized archive data',async()=>{
 const archive=await createArchive({getItem:()=>null});await expect(verifyArchive(JSON.stringify({...archive,entries:{'axiom-leverage':'15'}}))).rejects.toThrow('Empreinte');
 await expect(verifyArchive(JSON.stringify({...archive,entries:{key:'secret'}}))).rejects.toThrow('non autorisé');await expect(verifyArchive(JSON.stringify({...archive,version:2}))).rejects.toThrow('Format');await expect(verifyArchive('x'.repeat(6*1024*1024+1))).rejects.toThrow('volumineux');
});
