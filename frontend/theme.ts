const root=document.documentElement,button=document.getElementById('theme-toggle') as HTMLButtonElement;
function update(){const dark=root.dataset.theme==='dark';button.setAttribute('aria-pressed',String(dark));button.textContent=dark?'Clair':'Sombre';button.setAttribute('aria-label',dark?'Activer le thème clair':'Activer le thème sombre');document.querySelector('meta[name="theme-color"]')?.setAttribute('content',getComputedStyle(root).getPropertyValue('--bg').trim());}
button.addEventListener('click',()=>{root.dataset.theme=root.dataset.theme==='dark'?'light':'dark';try{localStorage.setItem('omega-theme',root.dataset.theme);}catch{}update();window.dispatchEvent(new CustomEvent('omega-theme'));});
update();
