import { apiFetch, ApiError } from '../auth.js';
import { pokaziToast, potrdiAkcijo } from '../components.js';

const oceneTbody = document.getElementById('oceneTbody');
const oceneCounter = document.getElementById('oceneCount');

function zvezdiceHtml(ocena) {
  const polne = '<i class="bi bi-star-fill text-warning"></i>'.repeat(ocena);
  const prazne = '<i class="bi bi-star text-muted"></i>'.repeat(5 - ocena);
  return polne + prazne;
}

function pobegniHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderOcene(ocene) {
  if (!oceneTbody) return;
  if (oceneCounter) oceneCounter.textContent = `${ocene.length} skupaj`;

  if (!ocene.length) {
    oceneTbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-4">Še ni nobenega komentarja.</td></tr>';
    return;
  }

  oceneTbody.innerHTML = ocene.map(o => {
    const datum = new Date(o.datum_objave).toLocaleString('sl-SI', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
    const inicialke = ((o.uporabnik_ime?.[0] || '') + (o.uporabnik_priimek?.[0] || '')).toUpperCase();
    const komentarVarno = pobegniHtml(o.komentar);
    const naslovVarno = pobegniHtml(o.dogodek_naslov);
    const imenovanje = `${pobegniHtml(o.uporabnik_ime)} ${pobegniHtml(o.uporabnik_priimek)}`;

    const komentarCelica = o.komentar
      ? `<div class="text-truncate" style="max-width: 320px;" title="${komentarVarno}">${komentarVarno}</div>`
      : '<em class="text-muted">Brez komentarja</em>';

    return `
      <tr data-ocena-row="${o.id}">
        <td>
          <div class="d-flex align-items-center gap-2">
            <div class="profile-avatar" style="width:36px;height:36px;font-size:0.85rem;">${inicialke}</div>
            <div>
              <strong>${imenovanje}</strong>
              <small class="text-muted d-block">${pobegniHtml(o.uporabnik_email)}</small>
            </div>
          </div>
        </td>
        <td><a href="dogodek.html?id=${o.dogodek_id}">${naslovVarno}</a></td>
        <td><span style="white-space: nowrap;">${zvezdiceHtml(o.ocena)}</span></td>
        <td>${komentarCelica}</td>
        <td><small>${datum}</small></td>
        <td class="text-end">
          <button class="btn btn-sm btn-outline-danger" data-akcija-ocena="brisi" data-id="${o.id}" title="Izbriši komentar">
            <i class="bi bi-trash"></i>
          </button>
        </td>
      </tr>
    `;
  }).join('');

  oceneTbody.querySelectorAll('[data-akcija-ocena="brisi"]').forEach(btn => {
    btn.addEventListener('click', izbrisiOceno);
  });
}

async function izbrisiOceno(e) {
  const btn = e.currentTarget;
  const id = btn.dataset.id;

  const potrjeno = await potrdiAkcijo({
    naslov: 'Izbriši komentar',
    sporocilo: 'Komentar bo trajno izbrisan. Tega dejanja ni mogoče razveljaviti.',
    gumbPotrdi: 'Izbriši',
    tipGumba: 'btn-danger',
  });
  if (!potrjeno) return;

  btn.disabled = true;
  try {
    await apiFetch(`/admin/ocene/${id}`, { method: 'DELETE' });
    pokaziToast('success', 'Komentar uspešno izbrisan.');
    await naloziOcene();
  } catch (err) {
    pokaziToast('danger', err instanceof ApiError ? err.message : 'Napaka pri brisanju.');
    btn.disabled = false;
  }
}

export async function naloziOcene() {
  if (!oceneTbody) return;
  try {
    const { ocene } = await apiFetch('/admin/ocene');
    renderOcene(ocene);
  } catch (err) {
    oceneTbody.innerHTML = `<tr><td colspan="6" class="text-center text-danger py-4">Napaka: ${err.message}</td></tr>`;
  }
}
