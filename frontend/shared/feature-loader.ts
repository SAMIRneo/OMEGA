/** Module recovery is presentation-only: retry callbacks must never sign or trade. */
export function createFeatureLoader(doc:Document){
 const panel=doc.getElementById('module-alert')!,message=doc.getElementById('module-errors')!;
 const button=doc.getElementById('module-retry') as HTMLButtonElement;
 const failures=new Map<string,{detail:string;retry?:()=>Promise<unknown>}>();
 const pending=new Map<string,Promise<void>>();
 function render(){
  if(!failures.size&&panel.hidden)return;
  const value=[...failures].map(([label,error])=>label+' : '+error.detail).join('\n');
  if(message.textContent!==value)message.textContent=value;
  button.disabled=pending.size>0||![...failures.values()].some(error=>error.retry);
  panel.setAttribute('aria-busy',String(pending.size>0));
  if(!failures.size&&panel.contains(doc.activeElement))doc.getElementById('workspace-content')?.focus({preventScroll:true});
  panel.hidden=failures.size===0;
 }
 function report(label:string,error:unknown,retry?:()=>Promise<unknown>){
  failures.set(label,{detail:(error instanceof Error?error.message:String(error)).slice(0,300),retry});render();
 }
 function load(label:string,task:()=>Promise<unknown>):Promise<void>{
  const existing=pending.get(label);if(existing)return existing;
  const attempt=Promise.resolve().then(task).then(()=>{failures.delete(label);},error=>{report(label,error,task);}).finally(()=>{pending.delete(label);render();});
  pending.set(label,attempt);render();return attempt;
 }
 async function retry(){await Promise.all([...failures].filter(([,error])=>error.retry).map(([label,error])=>load(label,error.retry!)));}
 function dismiss(){failures.clear();render();}
 button.addEventListener('click',()=>{void retry();});
 doc.getElementById('module-dismiss')!.addEventListener('click',dismiss);
 return {load,report,retry,dismiss};
}
