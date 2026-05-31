import { apiFetch, ApiError } from '../auth.js';
import { pobegniHtml, potrdiAkcijo, pokaziToast } from '../components.js';

const STATUS_OZNAKE = {
  v_pregledu:  { label: 'V pregledu', klasa: 'status-pending' },
  v_pripravi:  { label: 'V pripravi', klasa: '' },
  aktiven:     { label: 'Aktiven',    klasa: 'status-approved' },
  promoviran:  { label: 'Promoviran', klasa: 'status-promoted' },
  zakljucen:   { label: 'Zaključen',  klasa: '' },
  odpovedan:   { label: 'Odpovedan',  klasa: 'status-rejected' },
};

let modal = null;
let forma = null;
let alertEl = null;
let shraniBtn = null;
let poslusalciPriklopljeni = false;

function zapriModal() {
  if (modal) modal.classList.remove('show');
}

function pokaziNapako(msg) {
  if (!alertEl) return;
  alertEl.className = 'alert alert-danger mb-3';
  alertEl.textContent = msg;
  alertEl.classList.remove('d-none');
}

function formatDatum(datumStr) {
  const d = new Date(String(datumStr).replace(' ', 'T'));
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('sl-SI', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function renderDogodki(dogodki, el) {
  if (!dogodki.length) {
    el.innerHTML = '<div class="text-center text-muted py-3">Še nimaš dogodkov. <a href="dodaj-dogodek.html">Dodaj prvega →</a></div>';
    return;
  }

  el.innerHTML = '<div class="row g-3">' + dogodki.map(d => {
    const st = STATUS_OZNAKE[d.status] || { label: d.status, klasa: '' };
    const cena = d.tip_cene === 'Brezplačno' ? 'Brezplačno' : `${parseFloat(d.cena || 0).toFixed(2)} €`;
    return `
      <div class="col-md-6">
        <div class="card p-3 h-100 d-flex flex-column">
          <div class="d-flex justify-content-between align-items-start gap-2 mb-1">
            <h6 class="mb-0" style="font-size: 1rem;"><a href="dogodek.html?id=${Number(d.ID_dogodek)}">${pobegniHtml(d.Naslov || 'Brez naslova')}</a></h6>
            <span class="status-badge ${st.klasa} flex-shrink-0">${pobegniHtml(st.label)}</span>
          </div>
          <small class="text-muted d-block mb-1"><i class="bi bi-clock"></i> ${formatDatum(d.datum_zacetka)} • <i class="bi bi-geo-alt"></i> ${pobegniHtml(d.kraj || '—')}</small>
          <small class="text-muted d-block mb-3"><i class="bi bi-people"></i> ${Number(d.st_prijav || 0)} prijav • ${cena}</small>
          <div class="d-flex gap-2 mt-auto">
            <button class="btn btn-sm btn-outline-primary flex-grow-1" data-uredi="${Number(d.ID_dogodek)}"><i class="bi bi-pencil"></i> Uredi</button>
            <button class="btn btn-sm btn-outline-danger" data-brisi="${Number(d.ID_dogodek)}" title="Izbriši dogodek" aria-label="Izbriši dogodek"><i class="bi bi-trash"></i></button>
          </div>
        </div>
      </div>
    `;
  }).join('') + '</div>';

  el.querySelectorAll('[data-uredi]').forEach(btn => {
    btn.addEventListener('click', () => {
      const dogodek = dogodki.find(x => Number(x.ID_dogodek) === Number(btn.dataset.uredi));
      odpriUrejanje(dogodek);
    });
  });

  el.querySelectorAll('[data-brisi]').forEach(btn => {
    btn.addEventListener('click', () => izbrisiDogodek(Number(btn.dataset.brisi)));
  });
}

function odpriUrejanje(d) {
  if (!d || !modal || !forma) return;
  alertEl?.classList.add('d-none');

  forma.id.value = d.ID_dogodek;
  forma.naslov.value = d.Naslov || '';
  forma.kratek_opis.value = d.kratek_opis || '';
  forma.opis.value = d.opis || '';

  const datumStr = String(d.datum_zacetka || '');
  forma.datum.value = datumStr.slice(0, 10);
  forma.ura.value = datumStr.slice(11, 16);

  forma.tip_cene.value = d.tip_cene || 'Plačljivo';
  forma.cena.value = d.cena ?? 0;
  forma.st_sedezov.value = d.st_sedezov ?? '';

  modal.classList.add('show');
}

async function shraniDogodek() {
  if (!forma) return;
  const id = forma.id.value;

  const telo = {
    naslov: forma.naslov.value.trim(),
    kratek_opis: forma.kratek_opis.value.trim(),
    opis: forma.opis.value.trim(),
    tip_cene: forma.tip_cene.value,
    cena: forma.tip_cene.value === 'Brezplačno' ? 0 : (parseFloat(forma.cena.value) || 0),
  };

  if (forma.datum.value && forma.ura.value) {
    telo.datum_zacetka = `${forma.datum.value} ${forma.ura.value}:00`;
  }
  if (forma.st_sedezov.value !== '') {
    telo.st_sedezov = parseInt(forma.st_sedezov.value, 10);
  }

  if (!telo.naslov || !telo.kratek_opis) {
    pokaziNapako('Naslov in kratek opis sta obvezna.');
    return;
  }

  const prvotni = shraniBtn.innerHTML;
  shraniBtn.disabled = true;
  shraniBtn.innerHTML = 'Shranjujem…';

  try {
    const odgovor = await apiFetch(`/dogodki/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(telo),
    });
    pokaziToast('success', odgovor.sporocilo || 'Dogodek posodobljen.', 'Uspešno');
    zapriModal();
    await naloziMojeDogodke();
  } catch (err) {
    pokaziNapako(err instanceof ApiError ? err.message : 'Napaka pri shranjevanju.');
  } finally {
    shraniBtn.disabled = false;
    shraniBtn.innerHTML = prvotni;
  }
}

async function izbrisiDogodek(id) {
  const potrjeno = await potrdiAkcijo({
    naslov: 'Izbriši dogodek',
    sporocilo: 'Dogodek bo trajno izbrisan skupaj z vsemi prijavami in ocenami. Tega ni mogoče razveljaviti.',
    gumbPotrdi: 'Izbriši',
    tipGumba: 'btn-danger',
  });
  if (!potrjeno) return;

  try {
    await apiFetch(`/dogodki/${id}`, { method: 'DELETE' });
    pokaziToast('success', 'Dogodek uspešno izbrisan.');
    await naloziMojeDogodke();
  } catch (err) {
    pokaziToast('danger', err instanceof ApiError ? err.message : 'Napaka pri brisanju.');
  }
}

export async function naloziMojeDogodke() {
  const el = document.getElementById('mojiDogodkiList');
  if (!el) return;

  try {
    const { dogodki } = await apiFetch('/moji-dogodki');
    renderDogodki(dogodki || [], el);
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) return;
    el.innerHTML = `<div class="alert alert-danger">${pobegniHtml(err.message || 'Napaka pri nalaganju.')}</div>`;
  }
}

export async function inicializirajMojeDogodke() {
  modal = document.getElementById('urediDogodekModal');
  forma = document.getElementById('urediDogodekForm');
  alertEl = document.getElementById('urediDogodekAlert');
  shraniBtn = document.getElementById('shraniDogodekBtn');

  if (modal && !poslusalciPriklopljeni) {
    poslusalciPriklopljeni = true;
    document.querySelectorAll('[data-zapri-dogodek-modal]').forEach(b => b.addEventListener('click', zapriModal));
    modal.addEventListener('click', (e) => { if (e.target === modal) zapriModal(); });
    shraniBtn?.addEventListener('click', shraniDogodek);
  }

  await naloziMojeDogodke();
}
