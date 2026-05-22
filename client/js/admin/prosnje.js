import { apiFetch, ApiError } from '../auth.js';
import { pokaziToast, potrdiAkcijo, pobegniHtml, varnoUrl } from '../components.js';
import { naloziUporabnike } from './uporabniki.js';

const prosnjeList = document.getElementById('prosnjeList');
const prosnjeCount = document.getElementById('prosnjeCount');
const sidebarBadge = document.getElementById('sidebarProsnjeBadge');

function statusBadge(status) {
  const map = { cakajoca: 'status-pending', odobrena: 'status-approved', zavrnjena: 'status-rejected' };
  return `<span class="status-badge ${map[status] || ''}">${status}</span>`;
}

function renderProsnje(prosnje) {
  if (!prosnjeList) return;
  const cakajoce = prosnje.filter(p => p.status === 'cakajoca');
  prosnjeCount.textContent = `${cakajoce.length} čaka`;
  if (cakajoce.length) {
    sidebarBadge.textContent = cakajoce.length;
    sidebarBadge.classList.remove('d-none');
  } else {
    sidebarBadge.classList.add('d-none');
  }

  if (!prosnje.length) {
    prosnjeList.innerHTML = '<div class="text-center text-muted py-3">Trenutno ni nobenih prošenj.</div>';
    return;
  }

  prosnjeList.innerHTML = prosnje.map(p => {
    const datum = new Date(p.datum_prosnje).toLocaleString('sl-SI');
    const akcije = p.status === 'cakajoca' ? `
      <div class="d-flex gap-2 mt-3">
        <button class="btn btn-sm btn-success" data-akcija="odobri" data-id="${p.id}">
          <i class="bi bi-check-lg"></i> Odobri
        </button>
        <button class="btn btn-sm btn-outline-danger" data-akcija="zavrni" data-id="${p.id}">
          <i class="bi bi-x-lg"></i> Zavrni
        </button>
      </div>
    ` : `
      <div class="mt-2 text-muted" style="font-size: 0.85rem;">
        <i class="bi bi-clock"></i> Obravnavano ${p.datum_obravnave ? new Date(p.datum_obravnave).toLocaleString('sl-SI') : ''}
        ${p.opomba_admina ? `<br><strong>Opomba:</strong> ${pobegniHtml(p.opomba_admina)}` : ''}
      </div>
    `;

    return `
      <div class="card p-3 mb-3" data-prosnja-row="${p.id}">
        <div class="d-flex justify-content-between align-items-start gap-3 flex-wrap mb-2">
          <div>
            <h5 class="mb-1">${pobegniHtml(p.naziv_podjetja)}</h5>
            <small class="text-muted">
              <i class="bi bi-person"></i> ${pobegniHtml(p.ime)} ${pobegniHtml(p.priimek)} (${pobegniHtml(p.email)})
              <span class="ms-2"><i class="bi bi-calendar"></i> ${datum}</span>
            </small>
          </div>
          ${statusBadge(p.status)}
        </div>
        ${p.spletna_stran ? `<p class="mb-1"><i class="bi bi-globe text-primary"></i> <a href="${varnoUrl(p.spletna_stran)}" target="_blank" rel="noopener noreferrer">${pobegniHtml(p.spletna_stran)}</a></p>` : ''}
        ${p.opis ? `<p class="text-muted mb-2" style="font-size: 0.92rem;">${pobegniHtml(p.opis)}</p>` : ''}
        <div class="p-3 rounded" style="background-color: var(--ink-50); border-left: 3px solid var(--brand-700);">
          <strong style="font-size: 0.85rem;">Razlog:</strong>
          <p class="mb-0 mt-1" style="font-size: 0.92rem;">${pobegniHtml(p.razlog)}</p>
        </div>
        ${akcije}
      </div>
    `;
  }).join('');

  prosnjeList.querySelectorAll('[data-akcija]').forEach(btn => {
    btn.addEventListener('click', obravnavajProsnjo);
  });
}

async function obravnavajProsnjo(e) {
  const btn = e.currentTarget;
  const id = btn.dataset.id;
  const akcija = btn.dataset.akcija;
  const status = akcija === 'odobri' ? 'odobrena' : 'zavrnjena';

  let opomba = null;
  if (akcija === 'zavrni') {
    const rezultat = await potrdiAkcijo({
      naslov: 'Zavrni prošnjo',
      sporocilo: 'Uporabnik bo obveščen o zavrnitvi. Razlog je neobvezen, vendar zaželen.',
      vnos: { label: 'Razlog zavrnitve (neobvezno)', placeholder: 'npr. Pomanjkljiv opis dejavnosti...' },
      gumbPotrdi: 'Zavrni prošnjo',
      tipGumba: 'btn-danger',
    });
    if (rezultat === null) return;
    opomba = rezultat.trim() || null;
  } else if (akcija === 'odobri') {
    const rezultat = await potrdiAkcijo({
      naslov: 'Odobri prošnjo',
      sporocilo: 'Uporabnik bo dobil vlogo <strong>organizator</strong> in bo lahko dodajal dogodke. Si prepričan?',
      gumbPotrdi: 'Odobri',
      tipGumba: 'btn-primary',
    });
    if (!rezultat) return;
  }

  const vsi = document.querySelectorAll(`[data-prosnja-row="${id}"] [data-akcija]`);
  vsi.forEach(b => b.disabled = true);

  try {
    const odgovor = await apiFetch(`/admin/prosnje/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status, opomba_admina: opomba }),
    });
    pokaziToast('success', odgovor.sporocilo);
    await naloziProsnje();
    await naloziUporabnike();
  } catch (err) {
    pokaziToast('danger', err instanceof ApiError ? err.message : 'Napaka pri obravnavi.');
    vsi.forEach(b => b.disabled = false);
  }
}

export async function naloziProsnje() {
  try {
    const { prosnje } = await apiFetch('/admin/prosnje');
    renderProsnje(prosnje);
  } catch (err) {
    if (prosnjeList) prosnjeList.innerHTML = `<div class="text-center text-danger py-3">Napaka pri nalaganju: ${err.message}</div>`;
  }
}
