import { apiFetch, Auth } from '../auth.js';
import { pobegniHtml } from '../components.js';

const modal = document.getElementById('urediModal');
const podatkiForm = document.getElementById('podatkiForm');
const gesloForm = document.getElementById('gesloForm');
const podatkiAlert = document.getElementById('podatkiAlert');
const gesloAlert = document.getElementById('gesloAlert');
const shraniBtn = document.getElementById('shraniBtn');

function pokaziNapako(el, msg, podrobnosti = []) {
  let html = `<strong>${pobegniHtml(msg)}</strong>`;
  if (podrobnosti.length) html += '<ul class="mb-0 mt-1">' + podrobnosti.map(p => `<li>${pobegniHtml(p)}</li>`).join('') + '</ul>';
  el.className = 'alert alert-danger mb-3';
  el.innerHTML = html;
  el.classList.remove('d-none');
}

function pokaziUspeh(el, msg) {
  el.className = 'alert alert-success mb-3';
  el.textContent = msg;
  el.classList.remove('d-none');
}

function ocenaGesla(g) {
  const bars = document.querySelectorAll('#strengthBars .password-strength-bar');
  const label = document.getElementById('strengthLabel');
  bars.forEach(b => { b.className = 'password-strength-bar'; });

  if (!g) { label.textContent = 'Vsaj 8 znakov, ena velika črka in ena številka.'; label.className = 'field-hint'; return; }

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
  if (novo === potrdi) { hint.textContent = '✓ Gesli se ujemata.'; hint.className = 'field-hint valid'; }
  else { hint.textContent = '✗ Gesli se ne ujemata.'; hint.className = 'field-hint invalid'; }
}

 
export function initEditModal({ getUporabnik, onUpdate }) {
  document.getElementById('urediProfilBtn').addEventListener('click', () => {
    const u = getUporabnik();
    if (!u) return;
    podatkiForm.ime.value = u.ime;
    podatkiForm.priimek.value = u.priimek;
    podatkiForm.email.value = u.email;
    podatkiAlert.classList.add('d-none');
    gesloAlert.classList.add('d-none');
    gesloForm.reset();
    ocenaGesla('');
    modal.classList.add('show');
  });

  document.querySelectorAll('[data-zapri-modal]').forEach(btn => {
    btn.addEventListener('click', () => modal.classList.remove('show'));
  });
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.remove('show');
  });

  document.getElementById('novoGesloInput').addEventListener('input', (e) => {
    ocenaGesla(e.target.value);
    preveriUjemanje();
  });
  document.getElementById('potrdiGesloInput').addEventListener('input', preveriUjemanje);

  shraniBtn.addEventListener('click', async () => {
    const aktivenTab = document.querySelector('.tab-pane.active').id;

    shraniBtn.disabled = true;
    const originalHTML = shraniBtn.innerHTML;
    shraniBtn.innerHTML = 'Shranjujem...';

    try {
      if (aktivenTab === 'tabPodatki') {
        const podatki = {
          ime: podatkiForm.ime.value.trim(),
          priimek: podatkiForm.priimek.value.trim(),
          email: podatkiForm.email.value.trim(),
        };
        const odgovor = await apiFetch('/me', { method: 'PATCH', body: JSON.stringify(podatki) });
        Auth.osveziUporabnika(odgovor.uporabnik);
        onUpdate?.(odgovor.uporabnik);
        pokaziUspeh(podatkiAlert, odgovor.sporocilo);
        setTimeout(() => modal.classList.remove('show'), 1200);
      } else {
        const novo = gesloForm.novo_geslo.value;
        const potrdi = document.getElementById('potrdiGesloInput').value;
        if (novo !== potrdi) {
          pokaziNapako(gesloAlert, 'Novi gesli se ne ujemata.');
          return;
        }
        const odgovor = await apiFetch('/me/spremeni-geslo', {
          method: 'POST',
          body: JSON.stringify({
            staro_geslo: gesloForm.staro_geslo.value,
            novo_geslo: novo,
          }),
        });
        gesloForm.reset();
        ocenaGesla('');
        pokaziUspeh(gesloAlert, odgovor.sporocilo);
        setTimeout(() => modal.classList.remove('show'), 1200);
      }
    } catch (err) {
      const cilj = aktivenTab === 'tabPodatki' ? podatkiAlert : gesloAlert;
      pokaziNapako(cilj, err.message || 'Napaka.', err.podrobnosti || []);
    } finally {
      shraniBtn.disabled = false;
      shraniBtn.innerHTML = originalHTML;
    }
  });
}
