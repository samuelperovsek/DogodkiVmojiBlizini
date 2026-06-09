import { Auth, apiFetch, ApiError } from './auth.js';

const POLJA_ZA_OSNUTEK = [
  { id: 'naslov', tip: 'text' },
  { id: 'kategorija', tip: 'text' },
  { id: 'podkategorija', tip: 'text' },
  { id: 'kratek_opis', tip: 'text' },
  { id: 'podroben_opis', tip: 'text' },
  { id: 'lokacija_naslov', tip: 'text' },
  { id: 'lokacija_mesto', tip: 'text' },
  { id: 'lokacija_prizorisce', tip: 'text' },
  { selector: '[data-zacetni-datum]', tip: 'text' },
  { selector: '[data-zacetna-ura]', tip: 'text' },
  { selector: '[data-koncni-datum]', tip: 'text' },
  { selector: '[data-koncna-ura]', tip: 'text' },
  { id: 'vecdnevno', tip: 'checkbox' },
  { id: 'tip_cene', tip: 'text' },
  { id: 'cena', tip: 'text' },
  { id: 'stevilo_mest', tip: 'text' },
  { id: 'prijave', tip: 'checkbox' },
  { id: 'opomnik', tip: 'checkbox' },
  { id: 'kontakt_email', tip: 'text' },
  { id: 'kontakt_telefon', tip: 'text' },
  { id: 'spletna_stran', tip: 'text' }
];

document.addEventListener('DOMContentLoaded', async () => {
  osveziPrikazOsnutkov();

  const gumbOsnutek = document.querySelector('button.btn-outline-primary i.bi-floppy')?.parentElement;
  if (gumbOsnutek) {
    gumbOsnutek.addEventListener('click', (e) => {
      e.preventDefault();
      shraniTrenutniOsnutek();
    });
  }

  const zac = document.querySelector('[data-zacetni-datum]');
  if (zac) {
    zac.min = new Date().toISOString().split('T')[0];
  }

  const uporabnik = Auth.getUporabnik();

  if (uporabnik) {
    try {
      const elEmail = document.getElementById('kontakt_email');
      if (elEmail) {
        elEmail.value = uporabnik.email || '';
      }

      const organizator = await apiFetch('/organizator-podatki');

      const elTelefon = document.getElementById('kontakt_telefon');
      const elSpletna = document.getElementById('spletna_stran');

      if (elTelefon) elTelefon.value = organizator.telefon || '';
      if (elSpletna) elSpletna.value = organizator.spletna_stran || '';
    } catch (err) {
      if (!(err instanceof ApiError && err.status === 401)) {
        console.error('Napaka pri samodejnem izpolnjevanju forme:', err);
      }
    }
  }

  const vnosMesto = document.getElementById('lokacija_mesto');
  
  if (vnosMesto) {
    vnosMesto.parentElement.classList.add('position-relative');
    vnosMesto.setAttribute('autocomplete', 'off');

    const predlogiMeni = document.createElement('div');
    predlogiMeni.className = 'dropdown-menu w-100 shadow';
    predlogiMeni.style.position = 'absolute';
    predlogiMeni.style.top = '100%';
    predlogiMeni.style.left = '0';
    predlogiMeni.style.zIndex = '1050';
    vnosMesto.parentElement.appendChild(predlogiMeni);

    let timeoutId = null;

    vnosMesto.addEventListener('input', (e) => {
      const iskanje = e.target.value.trim();

      clearTimeout(timeoutId);
      if (iskanje.length < 2) {
        predlogiMeni.classList.remove('show');
        return;
      }

      timeoutId = setTimeout(async () => {
        try {
          const kraji = await apiFetch(`/kraji/iskanje?q=${encodeURIComponent(iskanje)}`);
          
          if (kraji && kraji.length > 0) {
            predlogiMeni.innerHTML = kraji.map(k => `
              <button type="button" class="dropdown-item predlog-kraj-gumb" data-kraj="${k.kraj}">
                <strong>${k.kraj}</strong> <span class="text-muted small">(${k.postna_stevilka})</span>
              </button>
            `).join('');
            predlogiMeni.classList.add('show');
          } else {
            predlogiMeni.classList.remove('show');
          }
        } catch (err) {
          console.error('Napaka pri pridobivanju predlogov krajev:', err);
        }
      }, 250);
    });

    predlogiMeni.addEventListener('click', (e) => {
      const gumb = e.target.closest('.predlog-kraj-gumb');
      if (gumb) {
        vnosMesto.value = gumb.dataset.kraj;
        predlogiMeni.classList.remove('show');
      }
    });

    document.addEventListener('click', (e) => {
      if (e.target !== vnosMesto) {
        predlogiMeni.classList.remove('show');
      }
    });
  }

  const forma = document.getElementById('formaDogodek');

  if (forma) {
    forma.addEventListener('submit', async (e) => {
      e.preventDefault();

      const formData = new FormData();

      formData.append('naslov', document.getElementById('naslov')?.value || '');
      formData.append('kategorija', document.getElementById('kategorija')?.value || '');
      formData.append('podkategorija', document.getElementById('podkategorija')?.value || '');
      formData.append('kratek_opis', document.getElementById('kratek_opis')?.value || '');
      formData.append('opis', document.getElementById('podroben_opis')?.value || '');

      formData.append('lokacija_naslov', document.getElementById('lokacija_naslov')?.value || '');
      formData.append('lokacija_mesto', document.getElementById('lokacija_mesto')?.value || '');
      formData.append('lokacija_prizorisce', document.getElementById('lokacija_prizorisce')?.value || '');

      formData.append('datum_zacetka', document.querySelector('[data-zacetni-datum]')?.value || '');
      formData.append('ura_zacetka', document.querySelector('[data-zacetna-ura]')?.value || '');
      formData.append('datum_konca', document.querySelector('[data-koncni-datum]')?.value || '');
      formData.append('ura_konca', document.querySelector('[data-koncna-ura]')?.value || '');

      formData.append('vecdnevno', document.getElementById('vecdnevno')?.checked || false);

      formData.append('tip_cene', document.getElementById('tip_cene')?.value || '');
      formData.append('cena', document.getElementById('cena')?.value || '0');
      formData.append('stevilo_mest', document.getElementById('stevilo_mest')?.value || '');

      formData.append('prijave_omogocene', document.getElementById('prijave')?.checked || false);
      formData.append('opomnik_omogocen', document.getElementById('opomnik')?.checked || false);

      formData.append('kontakt_email', document.getElementById('kontakt_email')?.value || '');
      formData.append('kontakt_telefon', document.getElementById('kontakt_telefon')?.value || '');
      formData.append('spletna_stran', document.getElementById('spletna_stran')?.value || '');

      const slikaInput = document.getElementById('upload');
      if (slikaInput && slikaInput.files.length > 0) {
        formData.append('slika', slikaInput.files[0]);
      }

      const gumbSubmit = forma.querySelector('button[type="submit"]');
      const originalnaVsebina = gumbSubmit.innerHTML;
      gumbSubmit.disabled = true;
      gumbSubmit.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Pošiljam...';

      try {
        await apiFetch('/dogodki', {
          method: 'POST',
          body: formData,
        });

        window.pokaziToast?.('success', 'Dogodek in slika sta bila uspešno naložena!', 'Uspešno oddano');
        forma.reset();
        
      } catch (err) {
        console.error('Napaka pri pošiljanju:', err);
        window.pokaziToast?.('danger', err instanceof ApiError ? err.message : 'Napaka pri shranjevanju.', 'Napaka');
      } finally {
        gumbSubmit.disabled = false;
        gumbSubmit.innerHTML = originalnaVsebina;
      }
    });
  }
});

function shraniTrenutniOsnutek() {
  const osnutek = { _podatki: {} };
  
  // Zberemo vrednosti iz vseh definiranih polj obrazca
  POLJA_ZA_OSNUTEK.forEach((polje, indeks) => {
    const el = polje.id ? document.getElementById(polje.id) : document.querySelector(polje.selector);
    if (el) {
      const kljuc = polje.id || `polje_${indeks}`;
      if (polje.tip === 'checkbox') {
        osnutek._podatki[kljuc] = el.checked;
      } else {
        osnutek._podatki[kljuc] = el.value;
      }
    }
  });

  const vpisaniNaslov = document.getElementById('naslov')?.value.trim();
  const prikazniNaslov = vpisaniNaslov || `Brez naslova (${new Date().toLocaleTimeString('sl-SI', {hour: '2-digit', minute:'2-digit'})})`;

  osnutek._meta = {
    id: Date.now(),
    naslovGumba: prikazniNaslov,
    datum: new Date().toLocaleDateString('sl-SI')
  };

  let vsiOsnutki = JSON.parse(localStorage.getItem('eventli_osnutki')) || [];
  
  vsiOsnutki.unshift(osnutek);
  
  if (vsiOsnutki.length > 5) vsiOsnutki.pop();

  localStorage.setItem('eventli_osnutki', JSON.stringify(vsiOsnutki));
  
  if (window.pokaziToast) {
    window.pokaziToast('success', 'Osnutek je uspešno shranjen v pomnilnik brskalnika.', 'Osnutek shranjen');
  } else {
    alert('Osnutek shranjen!');
  }

  osveziPrikazOsnutkov();
}

function osveziPrikazOsnutkov() {
  const kontejner = document.getElementById('osnutki-kontejner');
  const seznam = document.getElementById('seznam-osnutkov');
  if (!kontejner || !seznam) return;

  const vsiOsnutki = JSON.parse(localStorage.getItem('eventli_osnutki')) || [];

  if (vsiOsnutki.length === 0) {
    kontejner.classList.add('hidden');
    return;
  }

  kontejner.classList.remove('hidden');
  
  seznam.innerHTML = vsiOsnutki.map(osnutek => `
    <div class="inline-flex items-center rounded-xl border border-amber-200 bg-white dark:bg-ink-900 shadow-sm overflow-hidden text-sm">
      <button type="button" class="gumb-nalozi-osnutek px-3 py-1.5 hover:bg-amber-100/50 dark:hover:bg-amber-950/30 text-amber-900 dark:text-amber-300 font-medium transition-colors" data-id="${osnutek._meta.id}">
        <i class="bi bi-file-earmark-text"></i> ${pobegniHtml(osnutek._meta.naslovGumba)} <span class="text-xs text-ink-400 font-normal">(${osnutek._meta.datum})</span>
      </button>
      <button type="button" class="gumb-izbrisi-osnutek px-2.5 py-1.5 border-l border-amber-100 dark:border-amber-900 hover:bg-red-50 text-red-500 hover:text-red-700 transition-colors" data-id="${osnutek._meta.id}" title="Izbriši osnutek">
        <i class="bi bi-trash3-fill text-xs"></i>
      </button>
    </div>
  `).join('');

  seznam.querySelectorAll('.gumb-nalozi-osnutek').forEach(gumb => {
    gumb.addEventListener('click', () => {
      const id = parseInt(gumb.getAttribute('data-id'));
      naloziOsnutekVFormo(id);
    });
  });

  seznam.querySelectorAll('.gumb-izbrisi-osnutek').forEach(gumb => {
    gumb.addEventListener('click', () => {
      const id = parseInt(gumb.getAttribute('data-id'));
      izbrisiOsnutek(id);
    });
  });
}

function naloziOsnutekVFormo(id) {
  const vsiOsnutki = JSON.parse(localStorage.getItem('eventli_osnutki')) || [];
  const izbran = vsiOsnutki.find(o => o._meta.id === id);

  if (!izbran) return;

  POLJA_ZA_OSNUTEK.forEach((polje, indeks) => {
    const el = polje.id ? document.getElementById(polje.id) : document.querySelector(polje.selector);
    const kljuc = polje.id || `polje_${indeks}`;
    
    if (el && izbran._podatki[kljuc] !== undefined) {
      if (polje.tip === 'checkbox') {
        el.checked = izbran._podatki[kljuc];
      } else {
        el.value = izbran._podatki[kljuc];
      }
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }
  });

  if (window.pokaziToast) {
    window.pokaziToast('info', 'Vsa polja so bila prepisana s podatki iz izbranega osnutka.', 'Osnutek naložen');
  }
}

function izbrisiOsnutek(id) {
  let vsiOsnutki = JSON.parse(localStorage.getItem('eventli_osnutki')) || [];
  vsiOsnutki = vsiOsnutki.filter(o => o._meta.id !== id);
  localStorage.setItem('eventli_osnutki', JSON.stringify(vsiOsnutki));
  osveziPrikazOsnutkov();
}

function pobegniHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}