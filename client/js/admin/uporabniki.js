import { Auth, apiFetch, ApiError } from '../auth.js';
import { pokaziToast, pobegniHtml } from '../components.js';

const VLOGE = ['uporabnik', 'organizator', 'admin'];
const trenutni = Auth.getUporabnik();

const usersTbody = document.getElementById('usersTbody');
const counter = document.getElementById('userCount');

export function vlogaBadge(vloga) {
  const map = {
    admin: 'status-rejected',
    organizator: 'status-promoted',
    uporabnik: 'status-approved',
  };
  return `<span class="status-badge ${map[vloga] || ''}">${vloga}</span>`;
}

export function renderUporabniki(seznam) {
  if (!usersTbody) return;
  counter.textContent = `${seznam.length} uporabnikov`;
  usersTbody.innerHTML = seznam.map(u => {
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
            <div class="profile-avatar" style="width:36px;height:36px;font-size:0.85rem;">${pobegniHtml(inicialke)}</div>
            <div>
              <strong>${pobegniHtml(u.ime)} ${pobegniHtml(u.priimek)}</strong>
              ${jaz ? '<small class="text-muted d-block">vi</small>' : ''}
            </div>
          </div>
        </td>
        <td><small>${pobegniHtml(u.email)}</small></td>
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

  usersTbody.querySelectorAll('[data-spremeni-vlogo]').forEach(sel => {
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
    pokaziToast('success', `Vloga uspešno spremenjena v "${novaVloga}".`);
  } catch (err) {
    sel.value = stara;
    pokaziToast('danger', err instanceof ApiError ? err.message : 'Napaka pri komunikaciji.');
  } finally {
    sel.disabled = false;
  }
}

export async function naloziUporabnike() {
  try {
    const { uporabniki } = await apiFetch('/admin/uporabniki');
    renderUporabniki(uporabniki);
  } catch (err) {
    if (usersTbody) usersTbody.innerHTML = `<tr><td colspan="5" class="text-center text-danger py-4">Napaka: ${pobegniHtml(err.message)}</td></tr>`;
  }
}
