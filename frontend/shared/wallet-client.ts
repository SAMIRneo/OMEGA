import {createWalletClient,custom,type Address} from 'viem';
import {walletRequest,type Provider} from './wallet-provider';

/** A wallet prompt is sent once; transport retries must never repeat a signing request. */
export function sessionWallet(provider:Provider,owner:Address,network:'testnet'|'mainnet'){
 const request=async(args:{method:string;params?:any})=>{
  if(args.method==='eth_signTypedData_v4'){
   const accounts=await walletRequest(provider,{method:'eth_accounts'});
   if(accounts[0]?.toLowerCase()!==owner.toLowerCase()||args.params?.[0]?.toLowerCase()!==owner.toLowerCase())throw Error('Compte MetaMask modifié avant signature. Reconnecte le compte souhaité.');
   const data=JSON.parse(args.params[1]);
   if(data.primaryType==='HyperliquidTransaction:ApproveAgent'){
    const chain=await walletRequest(provider,{method:'eth_chainId'});
    if(!/^0x[0-9a-fA-F]+$/.test(chain)||BigInt(chain)!==BigInt(data.domain.chainId))throw Error('La chaîne MetaMask a changé pendant la préparation. Relance l’autorisation sur la chaîne actuellement sélectionnée.');
    if(data.message.hyperliquidChain!==(network==='testnet'?'Testnet':'Mainnet'))throw Error('Réseau Hyperliquid incohérent avant signature.');
   }
  }
  return walletRequest(provider,args);
 };
 return createWalletClient({account:owner,transport:custom({request:request as any},{retryCount:0})});
}
