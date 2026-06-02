import { Auth, apiFetch, ApiError } from './auth.js';
import { ObvestilaBell } from './obvestila.js';

(function preveriGoogleToken() {
  const urlParams = new URLSearchParams(window.location.search);
  const tokenIzGoogla = urlParams.get('token');

  if (tokenIzGoogla) {
    try {
      const base64Url = tokenIzGoogla.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const podatkiTokena = JSON.parse(atob(base64));

      const uporabnik = {
        id: podatkiTokena.id,
        ID_uporabnik: podatkiTokena.id,
        email: podatkiTokena.email,
        vloga: podatkiTokena.vloga,
        ime: podatkiTokena.ime || 'Google',
        priimek: podatkiTokena.priimek || 'Uporabnik'
      };

      Auth.prijavi(tokenIzGoogla, uporabnik, true);

      window.history.replaceState({}, document.title, window.location.pathname);

      let ciljnaPot = 'profil.html';
      if (uporabnik.vloga === 'admin') ciljnaPot = 'admin.html';
      else if (uporabnik.vloga === 'organizator') ciljnaPot = 'dodaj-dogodek.html';

      window.location.replace(ciljnaPot);
    } catch (err) {
      console.error('Napaka pri prebiranju Google žetona znotraj nav.js:', err);
    }
  }
})();

document.addEventListener('DOMContentLoaded', async () => {
  if (new URLSearchParams(window.location.search).has('token')) return;

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
    if (ime) ime.textContent = u.ime || 'Uporabnik';

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