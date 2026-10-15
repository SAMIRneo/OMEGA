import {compareReplayCosts} from './core/replay';
import type {ReplayData,ReplayOptions} from './core/replay';
self.onmessage=(event:MessageEvent<{data:ReplayData;options:ReplayOptions}>)=>{
 try{const result=compareReplayCosts(event.data.data,event.data.options,percent=>self.postMessage({type:'progress',percent}));self.postMessage({type:'result',result});}
 catch(error){self.postMessage({type:'error',message:error instanceof Error?error.message:String(error)});}
};
