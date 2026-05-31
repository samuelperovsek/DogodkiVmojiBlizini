import { Auth, apiFetch, ApiError } from './auth.js';
import { ObvestilaBell } from './obvestila.js';

document.addEventListener('DOMContentLoaded', async () => {
  const gumbi = document.querySelector('[data-auth-buttons]');
  const meni  = document.querySelector('[data-user-menu]');

  aplicirajVlogo(Auth.getUporabnik()?.vloga);

  if (gumbi && meni) {
    if (Auth.jePrijavljen()) {
      pokaziPrijavljenega(Auth.getUporabnik());

      try {
        const { uporabnik } = await apiFetch('/me');
        Auth.osveziUporabnika(uporabnik);
        pokaziPrijavljenega(uporabnik);
        aplicirajVlogo(uporabnik.vloga);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          Auth.odjavi();
          pokaziGoste();
          aplicirajVlogo(null);
        }
      }
    } else {
      pokaziGoste();
    }
  }

  document.querySelectorAll('[data-logout]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      Auth.odjavi();
      window.location.href = 'index.html';
    });
  });

  pripraviNovicnik();

  document.addEventListener('app:akcija', async (ev) => {
    const pot = ev.detail?.pot || '';
    if (pot === '/me' || pot.startsWith('/admin/uporabniki')) {
      try {
        const { uporabnik } = await apiFetch('/me');
        Auth.osveziUporabnika(uporabnik);
        if (Auth.jePrijavljen() && gumbi && meni && !meni.classList.contains('d-none')) {
          const ime = meni.querySelector('[data-user-name]');
          if (ime) ime.textContent = uporabnik.ime;
          const vlogaEl = meni.querySelector('[data-user-vloga]');
          if (vlogaEl) vlogaEl.textContent = uporabnik.vloga;
          aplicirajVlogo(uporabnik.vloga);
        }
      } catch {}
    }
  });

  function pokaziPrijavljenega(u) {
    gumbi.classList.add('d-none');
    meni.classList.remove('d-none');

    const ime = meni.querySelector('[data-user-name]');
    if (ime) ime.textContent = u.ime;

    const vlogaEl = meni.querySelector('[data-user-vloga]');
    if (vlogaEl) vlogaEl.textContent = u.vloga;

    ObvestilaBell.inicializiraj();
  }

  function pokaziGoste() {
    gumbi.classList.remove('d-none');
    meni.classList.add('d-none');
    ObvestilaBell.skrij();
  }

  function aplicirajVlogo(vloga) {
    const sme = vloga === 'organizator';
    document.querySelectorAll('[data-only-organizator]').forEach(el => {
      el.classList.toggle('d-none', !sme);
    });
  }

  function pripraviNovicnik() {
    document.querySelectorAll('[data-novicnik-form]').forEach(forma => {
      forma.addEventListener('submit', async (e) => {
        e.preventDefault();
        const vnos = forma.querySelector('input[type="email"]');
        const gumb = forma.querySelector('button[type="submit"]');
        const email = vnos?.value.trim();

        if (!email) {
          window.pokaziToast?.('warning', 'Vnesi svoj e-naslov.', 'Manjka email');
          return;
        }

        const prvotniGumb = gumb.innerHTML;
        gumb.disabled = true;
        gumb.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';

        try {
          const odgovor = await apiFetch('/novicnik', {
            method: 'POST',
            body: JSON.stringify({ email }),
          });
          window.pokaziToast?.('success', odgovor.sporocilo, 'Naročen!');
          forma.reset();
        } catch (err) {
          window.pokaziToast?.('danger', err instanceof ApiError ? err.message : 'Napaka pri naročanju.', 'Napaka');
        } finally {
          gumb.disabled = false;
          gumb.innerHTML = prvotniGumb;
        }
      });
    });
  }
});
