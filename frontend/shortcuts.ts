/** Workspace keyboard navigation. The nav already advertises digits 01–05, so
 *  pressing 1–5 opens the matching view. Typing targets are left untouched. */
const VIEWS=['terminal','pilot','wallet','journal','research'] as const;
function isTyping(target:EventTarget|null):boolean{
  return target instanceof HTMLElement&&(target.isContentEditable||['INPUT','TEXTAREA','SELECT'].includes(target.tagName));
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
});
