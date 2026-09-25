// Kleine UX-Hilfe: externe/Anker-Links werden sanft behandelt; die Seite funktioniert auch ohne JavaScript.
document.querySelectorAll('a[href^="#"]').forEach(link=>{link.addEventListener('click',()=>{document.body.classList.add('navigating');setTimeout(()=>document.body.classList.remove('navigating'),250)})});

// Kontaktformular: Anfrage direkt an Klarglas senden, ohne das E-Mail-Programm des Besuchers zu öffnen.
const contactForm=document.getElementById('contactForm');
const formStatus=document.getElementById('formStatus');

if(contactForm&&formStatus){
  contactForm.addEventListener('submit',async(event)=>{
    event.preventDefault();
    const button=contactForm.querySelector('button[type="submit"]');
    const originalButtonText=button.innerHTML;
    button.disabled=true;
    button.innerHTML='Wird gesendet …';
    formStatus.textContent='Ihre Anfrage wird gesendet …';

    try{
      const response=await fetch(contactForm.action,{
        method:'POST',
        headers:{'Accept':'application/json'},
        body:new FormData(contactForm)
      });

      const data=await response.json().catch(()=>({}));

      if(!response.ok||data.success===false){
        throw new Error('Formular konnte nicht gesendet werden.');
      }

      contactForm.reset();
      formStatus.textContent='Vielen Dank! Ihre Anfrage wurde erfolgreich gesendet.';
    }catch(error){
      formStatus.textContent='Das hat leider nicht funktioniert. Bitte schreiben Sie uns direkt an info@klarglas-berlin.de.';
    }finally{
      button.disabled=false;
      button.innerHTML=originalButtonText;
    }
  });
}
