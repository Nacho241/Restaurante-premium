(() => {
  const nav = document.getElementById('nav');
  const mobileMenu = document.getElementById('mobileMenu');

  const updateNav = () => nav?.classList.toggle('scrolled', window.scrollY > 40);
  updateNav();
  window.addEventListener('scroll', updateNav, { passive: true });

  if (mobileMenu) {
    mobileMenu.querySelectorAll('a[href^="#"]').forEach(a => {
      a.addEventListener('click', () => mobileMenu.removeAttribute('open'));
    });
    document.addEventListener('click', e => {
      if (mobileMenu.hasAttribute('open') && !mobileMenu.contains(e.target)) mobileMenu.removeAttribute('open');
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') mobileMenu.removeAttribute('open');
    });
  }

  document.querySelectorAll('img').forEach(img => {
    img.addEventListener('error', () => img.classList.add('img-failed'));
  });

  const form = document.getElementById('reservationForm');
  if (!form) return;

  const dateInput = document.getElementById('date');
  const status = document.getElementById('formStatus');
  const button = document.getElementById('reserveButton');
  const codeBox = document.getElementById('reserveCode');

  const localToday = new Date();
  const yyyy = localToday.getFullYear();
  const mm = String(localToday.getMonth() + 1).padStart(2, '0');
  const dd = String(localToday.getDate()).padStart(2, '0');
  dateInput.min = `${yyyy}-${mm}-${dd}`;

  const setStatus = (message, type = '') => {
    status.textContent = message;
    status.className = `form-status ${type}`.trim();
  };

  form.addEventListener('submit', async e => {
    e.preventDefault();
    codeBox.classList.remove('show');
    codeBox.textContent = '';
    setStatus('');

    if (!form.reportValidity()) return;

    const data = Object.fromEntries(new FormData(form).entries());
    data.persons = Number(data.persons);

    button.disabled = true;
    button.textContent = 'Enviando…';
    setStatus('Registrando tu solicitud…');

    try {
      const res = await fetch('/api/reservas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(data)
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'No se pudo registrar la reserva.');

      setStatus('Solicitud registrada correctamente.', 'ok');
      codeBox.innerHTML = `Código de solicitud: <strong>${json.code}</strong><br><small>Estado: pendiente de confirmación.</small>`;
      codeBox.classList.add('show');
      form.reset();
      dateInput.min = `${yyyy}-${mm}-${dd}`;
    } catch (err) {
      setStatus(err.message || 'Ocurrió un error. Probá nuevamente.', 'error');
    } finally {
      button.disabled = false;
      button.textContent = 'Enviar solicitud';
    }
  });
})();
