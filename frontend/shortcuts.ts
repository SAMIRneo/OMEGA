/** Workspace keyboard navigation. The nav already advertises digits 01–05, so
 *  pressing 1–5 opens the matching view. Typing targets are left untouched. */
const VIEWS=['terminal','pilot','wallet','journal','research'] as const;
function isTyping(target:EventTarget|null):boolean{
  return target instanceof HTMLElement&&(target.isContentEditable||['INPUT','TEXTAREA','SELECT'].includes(target.tagName));
}
function isView(hash:string):boolean{
  return (VIEWS as readonly string[]).includes(hash);
}
/** Views run long, so opening one starts at its first line instead of inheriting
 *  the scroll offset of the view you just left. */
function resetScroll():void{
  const smooth=!window.matchMedia('(prefers-reduced-motion:reduce)').matches;
  window.scrollTo({top:0,left:0,behavior:smooth?'smooth':'auto'});
}
document.addEventListener('keydown',(event:KeyboardEvent)=>{
  if(event.defaultPrevented||event.ctrlKey||event.metaKey||event.altKey||event.repeat)return;
  if(isTyping(event.target))return;
  const index=Number(event.key)-1;
  if(!Number.isInteger(index)||index<0||index>=VIEWS.length)return;
  const next='#'+VIEWS[index];
  if(window.location.hash===next)return;
  event.preventDefault();
  window.location.hash=next;
  // Hand keyboard users the new view's landmark instead of leaving focus behind.
  document.getElementById('workspace-content')?.focus({preventScroll:true});
});
window.addEventListener('hashchange',()=>{
  if(isView(window.location.hash.slice(1)))resetScroll();
});
