import { Auth, apiFetch, ApiError } from './auth.js';

document.addEventListener('DOMContentLoaded', async () => {
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

        window.pokaziToast('success', 'Dogodek in slika sta bila uspešno naložena!', 'Uspešno oddano');
        forma.reset();
      } catch (err) {
        console.error('Napaka pri pošiljanju:', err);
        window.pokaziToast('danger', err instanceof ApiError ? err.message : 'Napaka pri shranjevanju.', 'Napaka');
      } finally {
        gumbSubmit.disabled = false;
        gumbSubmit.innerHTML = originalnaVsebina;
      }
    });
  }
});
