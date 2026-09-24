// Kleine UX-Hilfe: externe/Anker-Links werden sanft behandelt; die Seite funktioniert auch ohne JavaScript.
document.querySelectorAll('a[href^="#"]').forEach(link=>{link.addEventListener('click',()=>{document.body.classList.add('navigating');setTimeout(()=>document.body.classList.remove('navigating'),250)})});
