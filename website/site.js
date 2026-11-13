document.querySelectorAll('[data-copy]').forEach(button=>button.addEventListener('click',async()=>{
 const status=document.querySelector('.copy-status');
 try{await navigator.clipboard.writeText(button.dataset.copy);status.textContent='已复制';}
 catch{status.textContent=button.dataset.copy;}
 status.classList.add('visible');setTimeout(()=>status.classList.remove('visible'),2500);
}));
