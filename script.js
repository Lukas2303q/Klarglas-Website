// Sanfte Navigation
document.querySelectorAll('a[href^="#"]').forEach(link => {
  link.addEventListener('click', () => {
    document.body.classList.add('navigating');

    setTimeout(() => {
      document.body.classList.remove('navigating');
    }, 250);
  });
});


// Kontaktformular
const form = document.querySelector('.contact-form');

if (form) {
  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const button = form.querySelector('button[type="submit"]');
    const originalButtonText = button.innerHTML;

    button.disabled = true;
    button.innerHTML = 'Wird gesendet …';

    try {
      const response = await fetch(form.action, {
        method: 'POST',
        body: new FormData(form),
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Fehler beim Senden');
      }

      form.reset();

      button.innerHTML = '✓ Anfrage gesendet';

      setTimeout(() => {
        button.innerHTML = originalButtonText;
        button.disabled = false;
      }, 4000);

    } catch (error) {
      button.innerHTML = 'Fehler beim Senden';

      setTimeout(() => {
        button.innerHTML = originalButtonText;
        button.disabled = false;
      }, 4000);
    }
  });
}
