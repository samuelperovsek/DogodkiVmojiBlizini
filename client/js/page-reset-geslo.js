import { apiFetch, ApiError } from './auth.js';
import { pobegniHtml } from './components.js';

const params = new URLSearchParams(window.location.search);
const token = params.get('token');
const id = params.get('id');

const elPreverjanje = document.getElementById('stanje-preverjanje');
const elNapaka = document.getElementById('stanje-napaka');
const elUspeh = document.getElementById('stanje-uspeh');
const elForm = document.getElementById('resetForm');
const elPodnaslov = document.getElementById('podnaslov');
const elError = document.getElementById('resetError');

function pokaziStanje(stanje) {
  elPreverjanje.classList.add('d-none');
  elNapaka.classList.add('d-none');
  elUspeh.classList.add('d-none');
  elForm.classList.add('d-none');

  if (stanje === 'preverjanje') elPreverjanje.classList.remove('d-none');
  if (stanje === 'napaka')      elNapaka.classList.remove('d-none');
  if (stanje === 'uspeh')       elUspeh.classList.remove('d-none');
  if (stanje === 'form')        elForm.classList.remove('d-none');
}

async function preveriToken() {
  if (!token || !id) {
    elPodnaslov.textContent = 'Povezava ni veljavna.';
    pokaziStanje('napaka');
    return;
  }

  try {
    const odgovor = await apiFetch(`/reset-geslo/preveri?id=${encodeURIComponent(id)}&token=${encodeURIComponent(token)}`);
    if (odgovor.veljaven) {
      elPodnaslov.textContent = 'Vnesi novo geslo za svoj račun.';
      pokaziStanje('form');
    } else {
      elPodnaslov.textContent = 'Povezava ni veljavna ali je potekla.';
      pokaziStanje('napaka');
    }
  } catch {
    elPodnaslov.textContent = 'Strežnik ni dosegljiv.';
    pokaziStanje('napaka');
  }
}

function ocenaGesla(g) {
  const bars = document.querySelectorAll('#strengthBars .password-strength-bar');
  const label = document.getElementById('strengthLabel');
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
}

function preveriUjemanje() {
  const novo = document.getElementById('novoGesloInput').value;
  const potrdi = document.getElementById('potrdiGesloInput').value;
  const hint = document.getElementById('potrdiHint');
  if (!potrdi) { hint.textContent = ''; hint.className = 'field-hint'; return; }
  if (novo === potrdi) {
    hint.innerHTML = '<i class="bi bi-check-circle-fill"></i> Gesli se ujemata.';
    hint.className = 'field-hint valid';
  } else {
    hint.innerHTML = '<i class="bi bi-x-circle-fill"></i> Gesli se ne ujemata.';
    hint.className = 'field-hint invalid';
  }
}

document.getElementById('novoGesloInput').addEventListener('input', (e) => {
  ocenaGesla(e.target.value);
  preveriUjemanje();
});
document.getElementById('potrdiGesloInput').addEventListener('input', preveriUjemanje);

elForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  elError.classList.add('d-none');

  const novo = document.getElementById('novoGesloInput').value;
  const potrdi = document.getElementById('potrdiGesloInput').value;

  if (novo !== potrdi) {
    elError.innerHTML = `<strong>${pobegniHtml('Gesli se ne ujemata.')}</strong>`;
    elError.classList.remove('d-none');
    return;
  }

  const gumb = document.getElementById('resetSubmit');
  gumb.disabled = true;
  gumb.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Shranjujem...';

  try {
    await apiFetch('/reset-geslo', {
      method: 'POST',
      body: JSON.stringify({ id: Number(id), token, novo_geslo: novo }),
    });
    pokaziStanje('uspeh');
  } catch (err) {
    const sporocilo = err instanceof ApiError ? err.message : 'Strežnik ni dosegljiv.';
    let html = `<strong>${pobegniHtml(sporocilo)}</strong>`;
    if (err instanceof ApiError && err.podrobnosti?.length) {
      html += '<ul class="mb-0 mt-1">' +
        err.podrobnosti.map(p => `<li>${pobegniHtml(p)}</li>`).join('') +
        '</ul>';
    }
    elError.innerHTML = html;
    elError.classList.remove('d-none');
    gumb.disabled = false;
    gumb.innerHTML = '<i class="bi bi-check-circle"></i> Ponastavi geslo';
  }
});

preveriToken();
