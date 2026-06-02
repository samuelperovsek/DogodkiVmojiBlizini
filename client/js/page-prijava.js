import { apiFetch, Auth, ApiError } from './auth.js';
import { pobegniHtml, potrdiAkcijo, pokaziToast } from './components.js';

let isGoogleProcessing = false;

function pot(vloga) {
  if (vloga === 'admin') return 'admin.html';
  if (vloga === 'organizator') return 'dodaj-dogodek.html';
  return 'profil.html';
}

function nadaljujPoPrijavi(uporabnik) {
  const urlParams = new URLSearchParams(window.location.search);
  const povratek = urlParams.get('povratek');
  window.location.href = povratek || pot(uporabnik.vloga);
}

document.addEventListener('DOMContentLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const tokenIzGoogla = urlParams.get('token');

  if (tokenIzGoogla) {
    isGoogleProcessing = true;
    try {
      const base64Url = tokenIzGoogla.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));

      const podatkiTokena = JSON.parse(jsonPayload);

      const uporabnik = {
        ID_uporabnik: podatkiTokena.id,
        email: podatkiTokena.email,
        vloga: podatkiTokena.vloga
      };

      Auth.prijavi(tokenIzGoogla, uporabnik, true);

      window.history.replaceState({}, document.title, window.location.pathname);

      pokaziToast('success', 'Uspešna prijava preko Googla!', 'Dobrodošli');

      setTimeout(() => {
        nadaljujPoPrijavi(uporabnik);
      }, 400);

    } catch (err) {
      console.error('Napaka pri prebiranju Google žetona:', err);
      pokaziToast('danger', 'Prijava preko Googla ni uspela. Poskusite znova.');
      isGoogleProcessing = false;
    }
  } else {
    if (Auth.jePrijavljen()) {
      const povratek = urlParams.get('povratek');
      window.location.href = povratek || pot(Auth.getUporabnik()?.vloga);
    }
  }
});

if (window.location.hash === '#registracija') {
  document.querySelector('[data-bs-target="#register"]').click();
}

const url = new URL(window.location.href);
const razlog = url.searchParams.get('razlog');

if (razlog) {
  const el = document.getElementById('redirectInfo');
  const sporocila = {
    'potrebna-prijava': 'Za ta del strani je potrebna prijava.',
    'samo-admin': 'Ta stran je dostopna samo administratorjem.',
    'samo-organizator': 'Ta stran je dostopna samo organizatorjem.',
  };
  const msg = sporocila[razlog];
  if (msg && el) {
    el.querySelector('strong').textContent = msg;
    el.classList.remove('d-none');
  }
}

function pokaziNapako(elId, sporocilo, podrobnosti = []) {
  const el = document.getElementById(elId);
  if (!el) return;
  let html = `<strong>${pobegniHtml(sporocilo)}</strong>`;
  if (podrobnosti.length) {
    html += '<ul class="mb-0 mt-1">' +
      podrobnosti.map(p => `<li>${pobegniHtml(p)}</li>`).join('') +
      '</ul>';
  }
  el.innerHTML = html;
  el.classList.remove('d-none');
}

function skrijNapako(elId) {
  const el = document.getElementById(elId);
  if (el) el.classList.add('d-none');
}

const regGeslo = document.getElementById('regGeslo');
if (regGeslo) {
  const bars = document.querySelectorAll('#regStrengthBars .password-strength-bar');
  const label = document.getElementById('regStrengthLabel');

  regGeslo.addEventListener('input', () => {
    const g = regGeslo.value;
    bars.forEach(b => { b.className = 'password-strength-bar'; });

    if (!g) {
      label.textContent = 'Vsaj 8 znakov, ena velika črka in ena številka.';
      label.className = 'field-hint';
      return;
    }

    let score = 0;
    if (g.length >= 8) score++;
    if (/[A-Z]/.test(g)) score++;
    if (/[0-9]/.test(g)) score++;
    if (/[^A-Za-z0-9]/.test(g) || g.length >= 12) score++;

    const labels = ['Prešibko', 'Šibko', 'Srednje', 'Močno', 'Odlično'];
    const klase = ['weak', 'weak', 'medium', 'strong', 'strong'];
    for (let i = 0; i < score; i++) bars[i].classList.add(klase[score]);
    label.textContent = labels[score];
    label.className = 'field-hint ' + (score < 2 ? 'invalid' : score < 4 ? '' : 'valid');
  });
}

document.querySelectorAll('input[type="email"]').forEach(input => {
  let hint = input.parentElement.querySelector('.field-hint.email-hint');
  if (!hint) {
    hint = document.createElement('span');
    hint.className = 'field-hint email-hint';
    input.parentElement.appendChild(hint);
  }
  input.addEventListener('input', () => {
    const v = input.value.trim();
    if (!v) { hint.innerHTML = ''; hint.className = 'field-hint email-hint'; return; }
    const ok = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
    hint.innerHTML = ok
      ? '<i class="bi bi-check-circle-fill"></i> Veljaven format.'
      : '<i class="bi bi-x-circle-fill"></i> Vnesi veljaven email.';
    hint.className = 'field-hint email-hint ' + (ok ? 'valid' : 'invalid');
  });
});

document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  skrijNapako('loginError');

  const gumb = document.getElementById('loginSubmit');
  gumb.disabled = true;
  gumb.textContent = 'Prijavljam...';

  const podatki = {
    email: e.target.email.value.trim(),
    geslo: e.target.geslo.value,
  };
  const zapomni = document.getElementById('remember')?.checked || false;

  try {
    const odgovor = await apiFetch('/prijava', {
      method: 'POST',
      body: JSON.stringify(podatki),
    });
    Auth.prijavi(odgovor.token, odgovor.uporabnik, zapomni);
    nadaljujPoPrijavi(odgovor.uporabnik);
  } catch (err) {
    if (err instanceof ApiError) {
      pokaziNapako('loginError', err.message, err.podrobnosti);
    } else {
      pokaziNapako('loginError', 'Strežnik ni dosegljiv. Preveri, če teče.');
    }
    gumb.disabled = false;
    gumb.textContent = 'Prijava';
  }
});

document.getElementById('registerForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  skrijNapako('registerError');

  const gumb = document.getElementById('registerSubmit');
  gumb.disabled = true;
  gumb.textContent = 'Ustvarjam račun...';

  const izbraniInteresi = Array.from(e.target.querySelectorAll('input[name="interesi[]"]:checked'))
                               .map(cb => cb.value);

  const podatki = {
    ime:     e.target.ime.value.trim(),
    priimek: e.target.priimek.value.trim(),
    email:   e.target.email.value.trim(),
    geslo:   e.target.geslo.value,
    interesi: izbraniInteresi 
  };

  try {
    const odgovor = await apiFetch('/registracija', {
      method: 'POST',
      body: JSON.stringify(podatki),
    });
    Auth.prijavi(odgovor.token, odgovor.uporabnik);
    nadaljujPoPrijavi(odgovor.uporabnik);
  } catch (err) {
    if (err instanceof ApiError) {
      pokaziNapako('registerError', err.message, err.podrobnosti);
    } else {
      pokaziNapako('registerError', 'Strežnik ni dosegljiv. Preveri, če teče.');
    }
    gumb.disabled = false;
    gumb.textContent = 'Ustvari račun';
  }
});

document.getElementById('pozabljenoGesloLink')?.addEventListener('click', async (e) => {
  e.preventDefault();

  const vneseniEmail = await potrdiAkcijo({
    naslov: 'Pozabljeno geslo',
    sporocilo: 'Vnesi e-poštni naslov, povezan s tvojim računom. Poslali ti bomo povezavo za ponastavitev gesla (velja 15 minut).',
    vnos: { label: 'E-poštni naslov', placeholder: 'ime@email.si' },
    gumbPotrdi: 'Pošlji povezavo',
    tipGumba: 'btn-primary',
  });

  if (vneseniEmail === null) return;
  const email = vneseniEmail.trim();
  if (!email) {
    pokaziToast('warning', 'Prosim, vnesi e-poštni naslov.');
    return;
  }

  try {
    const odgovor = await apiFetch('/pozabljeno-geslo', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
    pokaziToast('success', odgovor.sporocilo, 'Preveri e-pošto', 6000);
  } catch (err) {
    pokaziToast('danger', err instanceof ApiError ? err.message : 'Strežnik ni dosegljiv.');
  }
});