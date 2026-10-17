/** Canonical Hyperliquid networks. Never infer the signing network from an EVM chain ID. */
export const NETWORKS=Object.freeze({
 mainnet:Object.freeze({id:'mainnet',label:'Mainnet',isTestnet:false,apiUrl:'https://api.hyperliquid.xyz',ws:'wss://api.hyperliquid.xyz/ws',app:'https://app.hyperliquid.xyz/'}),
 testnet:Object.freeze({id:'testnet',label:'Testnet',isTestnet:true,apiUrl:'https://api.hyperliquid-testnet.xyz',ws:'wss://api.hyperliquid-testnet.xyz/ws',app:'https://app.hyperliquid-testnet.xyz/'})
});
export function networkDefinition(network){
 if(network!=='mainnet'&&network!=='testnet')throw Error('Réseau Hyperliquid inconnu : aucune signature autorisée.');
 return NETWORKS[network];
}
export function networkConfig(network){const n=networkDefinition(network);return {isTestnet:n.isTestnet,apiUrl:n.apiUrl,timeout:12000};}
export function assertEnvironment(environment){
 const n=networkDefinition(environment?.id);
 if(environment.api!==undefined&&environment.api!==n.apiUrl+'/info'||environment.ws!==undefined&&environment.ws!==n.ws)throw Error('Endpoints incohérents avec le réseau Hyperliquid.');
 return n;
}
