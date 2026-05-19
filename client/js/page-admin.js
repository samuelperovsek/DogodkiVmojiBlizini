import { Auth, apiFetch, ApiError } from './auth.js';
import { pokaziToast, potrdiAkcijo } from './components.js';

const VLOGE = ['uporabnik', 'organizator', 'admin'];
const trenutni = Auth.getUporabnik();

if (!trenutni || trenutni.vloga !== 'admin') {
  window.location.href = 'index.html';
}

document.querySelectorAll('[data-user-name]').forEach(el => {
  el.textContent = trenutni?.ime || 'admin';
});

document.querySelectorAll('[data-logout]').forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    Auth.odjavi();
    window.location.href = 'prijava.html';
  });
});

(function nastaviAdminUro() {
  const el = document.getElementById('adminTime');
  if (!el) return;
  const tick = () => {
    const d = new Date();
    el.textContent = d.toLocaleString('sl-SI', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  };
  tick();
  setInterval(tick, 30000);
})();

const tbody = document.getElementById('usersTbody');
const counter = document.getElementById('userCount');

function pokaziSporocilo(tip, besedilo) {
  pokaziToast(tip, besedilo);
}

function vlogaBadge(vloga) {
  const map = {
    admin: 'status-rejected',
    organizator: 'status-promoted',
    uporabnik: 'status-approved',
  };
  return `<span class="status-badge ${map[vloga] || ''}">${vloga}</span>`;
}

function renderUporabniki(seznam) {
  counter.textContent = `${seznam.length} uporabnikov`;
  tbody.innerHTML = seznam.map(u => {
    const datum = new Date(u.datum_registracije).toLocaleDateString('sl-SI');
    const inicialke = ((u.ime?.[0] || '') + (u.priimek?.[0] || '')).toUpperCase();
    const jaz = u.id === trenutni?.id;
    const opcije = VLOGE.map(v =>
      `<option value="${v}" ${v === u.vloga ? 'selected' : ''}>${v}</option>`
    ).join('');
    return `
      <tr data-row-id="${u.id}">
        <td>
          <div class="d-flex align-items-center gap-2">
            <div class="profile-avatar" style="width:36px;height:36px;font-size:0.85rem;">${inicialke}</div>
            <div>
              <strong>${u.ime} ${u.priimek}</strong>
              ${jaz ? '<small class="text-muted d-block">vi</small>' : ''}
            </div>
          </div>
        </td>
        <td><small>${u.email}</small></td>
        <td><small>${datum}</small></td>
        <td>${vlogaBadge(u.vloga)}</td>
        <td class="text-end">
          <select class="form-select form-select-sm d-inline-block w-auto" data-spremeni-vlogo ${jaz ? 'disabled' : ''}>
            ${opcije}
          </select>
        </td>
      </tr>
    `;
  }).join('');

  tbody.querySelectorAll('[data-spremeni-vlogo]').forEach(sel => {
    sel.addEventListener('change', spremeniVlogo);
  });
}

async function spremeniVlogo(e) {
  const sel = e.target;
  const tr = sel.closest('tr');
  const id = Number(tr.dataset.rowId);
  const novaVloga = sel.value;
  const stara = sel.dataset.prev || sel.querySelector('option[selected]')?.value;

  sel.disabled = true;
  try {
    await apiFetch(`/admin/uporabniki/${id}/vloga`, {
      method: 'PATCH',
      body: JSON.stringify({ vloga: novaVloga }),
    });
    tr.querySelector('td:nth-child(4)').innerHTML = vlogaBadge(novaVloga);
    sel.dataset.prev = novaVloga;
    pokaziSporocilo('success', `Vloga uspešno spremenjena v "${novaVloga}".`);
  } catch (err) {
    sel.value = stara;
    pokaziSporocilo('danger', err instanceof ApiError ? err.message : 'Napaka pri komunikaciji.');
  } finally {
    sel.disabled = false;
  }
}

try {
  const { uporabniki } = await apiFetch('/admin/uporabniki');
  renderUporabniki(uporabniki);
} catch (err) {
  tbody.innerHTML = `<tr><td colspan="5" class="text-center text-danger py-4">Napaka pri nalaganju: ${err.message}</td></tr>`;
}

const prosnjeList = document.getElementById('prosnjeList');
const prosnjeCount = document.getElementById('prosnjeCount');
const sidebarBadge = document.getElementById('sidebarProsnjeBadge');

function pokaziProsnjeSporocilo(tip, besedilo) {
  pokaziToast(tip, besedilo);
}

function statusBadge(status) {
  const map = { cakajoca: 'status-pending', odobrena: 'status-approved', zavrnjena: 'status-rejected' };
  return `<span class="status-badge ${map[status] || ''}">${status}</span>`;
}

function renderProsnje(prosnje) {
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
        ${p.opomba_admina ? `<br><strong>Opomba:</strong> ${p.opomba_admina}` : ''}
      </div>
    `;

    return `
      <div class="card p-3 mb-3" data-prosnja-row="${p.id}">
        <div class="d-flex justify-content-between align-items-start gap-3 flex-wrap mb-2">
          <div>
            <h5 class="mb-1">${p.naziv_podjetja}</h5>
            <small class="text-muted">
              <i class="bi bi-person"></i> ${p.ime} ${p.priimek} (${p.email})
              <span class="ms-2"><i class="bi bi-calendar"></i> ${datum}</span>
            </small>
          </div>
          ${statusBadge(p.status)}
        </div>
        ${p.spletna_stran ? `<p class="mb-1"><i class="bi bi-globe text-primary"></i> <a href="${p.spletna_stran}" target="_blank">${p.spletna_stran}</a></p>` : ''}
        ${p.opis ? `<p class="text-muted mb-2" style="font-size: 0.92rem;">${p.opis}</p>` : ''}
        <div class="p-3 rounded" style="background-color: var(--ink-50); border-left: 3px solid var(--brand-700);">
          <strong style="font-size: 0.85rem;">Razlog:</strong>
          <p class="mb-0 mt-1" style="font-size: 0.92rem;">${p.razlog}</p>
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
    pokaziProsnjeSporocilo('success', odgovor.sporocilo);
    await naloziProsnje();
    const { uporabniki: posodobljeni } = await apiFetch('/admin/uporabniki');
    renderUporabniki(posodobljeni);
  } catch (err) {
    pokaziProsnjeSporocilo('danger', err instanceof ApiError ? err.message : 'Napaka pri obravnavi.');
    vsi.forEach(b => b.disabled = false);
  }
}

async function naloziProsnje() {
  try {
    const { prosnje } = await apiFetch('/admin/prosnje');
    renderProsnje(prosnje);
  } catch (err) {
    prosnjeList.innerHTML = `<div class="text-center text-danger py-3">Napaka pri nalaganju: ${err.message}</div>`;
  }
}

await naloziProsnje();
