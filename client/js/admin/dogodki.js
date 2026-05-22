import { apiFetch, ApiError } from '../auth.js';
import { pokaziToast, potrdiAkcijo } from '../components.js';

const dogodkiTbody = document.getElementById('admin-dogodki-tbody');

function renderVrstico(dogodek) {
  const organizator = dogodek.org_podjetje ||
                      (dogodek.org_ime ? `${dogodek.org_ime} ${dogodek.org_priimek}` : 'Neznan organizator');
  const datum = new Date(dogodek.datum_zacetka).toLocaleDateString('sl-SI');
  const katNaziv = dogodek.kategorija_naziv || dogodek.podkategorija || 'Brez kategorije';
  const krajIme = dogodek.kraj_ime || 'Neznana lokacija';

  const brisiGumb = `<button class="btn btn-sm btn-outline-danger akcija-brisi" data-id="${dogodek.ID_dogodek}" title="Briši"><i class="bi bi-trash"></i></button>`;

  let statusBadgeHtml = '';
  let gumbiAkcij = '';

  if (dogodek.status === 'v_pregledu') {
    statusBadgeHtml = `<span class="status-badge status-pending">Čaka</span>`;
    gumbiAkcij = `
      <button class="btn btn-sm btn-success akcija-odobri" data-id="${dogodek.ID_dogodek}" title="Odobri"><i class="bi bi-check-lg"></i></button>
      <button class="btn btn-sm btn-warning akcija-promoviraj" data-id="${dogodek.ID_dogodek}" title="Promoviraj"><i class="bi bi-star-fill"></i></button>
      <button class="btn btn-sm btn-danger akcija-zavrni" data-id="${dogodek.ID_dogodek}" title="Zavrni"><i class="bi bi-x-lg"></i></button>
    `;
  } else if (dogodek.status === 'aktiven') {
    statusBadgeHtml = `<span class="status-badge status-approved">Aktiven</span>`;
    gumbiAkcij = `
      <button class="btn btn-sm btn-warning akcija-promoviraj" data-id="${dogodek.ID_dogodek}" title="Promoviraj"><i class="bi bi-star-fill"></i></button>
      ${brisiGumb}
    `;
  } else if (dogodek.status === 'promoviran') {
    statusBadgeHtml = `<span class="status-badge status-promoted"><i class="bi bi-star-fill"></i> Promoviran</span>`;
    gumbiAkcij = `
      <button class="btn btn-sm btn-outline-secondary akcija-odstrani-promocijo" data-id="${dogodek.ID_dogodek}" title="Odstrani promocijo"><i class="bi bi-star"></i></button>
      ${brisiGumb}
    `;
  } else if (dogodek.status === 'v_pripravi') {
    statusBadgeHtml = `<span class="status-badge">V pripravi</span>`;
    gumbiAkcij = brisiGumb;
  } else if (dogodek.status === 'zakljucen') {
    statusBadgeHtml = `<span class="status-badge">Zaključen</span>`;
    gumbiAkcij = brisiGumb;
  } else if (dogodek.status === 'odpovedan') {
    statusBadgeHtml = `<span class="status-badge status-rejected">Odpovedan</span>`;
    gumbiAkcij = brisiGumb;
  } else {
    statusBadgeHtml = `<span class="status-badge">${dogodek.status || '—'}</span>`;
    gumbiAkcij = brisiGumb;
  }

  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td>
      <strong>${dogodek.Naslov || 'Brez naslova'}</strong><br>
      <small class="text-muted">${katNaziv} • ${krajIme}</small>
    </td>
    <td>${organizator}</td>
    <td><small>${datum}</small></td>
    <td>${statusBadgeHtml}</td>
    <td>${gumbiAkcij}</td>
  `;
  return tr;
}

export async function naloziDogodke() {
  if (!dogodkiTbody) return;

  try {
    const dogodki = await apiFetch('/admin/dogodki');
    dogodkiTbody.innerHTML = '';
    dogodki.forEach(d => dogodkiTbody.appendChild(renderVrstico(d)));
  } catch (err) {
    if (dogodkiTbody) dogodkiTbody.innerHTML = `<tr><td colspan="5" class="text-center text-danger">Napaka: ${err.message}</td></tr>`;
  }
}

async function posodobiStatusDogodka(id, novStatus) {
  try {
    await apiFetch(`/admin/dogodki/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: novStatus }),
    });
    await naloziDogodke();
    pokaziToast('success', `Status dogodka uspešno spremenjen v: ${novStatus}`);
  } catch (err) {
    console.error(err);
    pokaziToast('danger', err instanceof ApiError ? err.message : 'Napaka pri komunikaciji s strežnikom.');
  }
}

async function izbrisiDogodek(id) {
  try {
    await apiFetch(`/admin/dogodki/${id}`, { method: 'DELETE' });
    await naloziDogodke();
    pokaziToast('success', 'Dogodek uspešno izbrisan.');
  } catch (err) {
    console.error(err);
    pokaziToast('danger', err instanceof ApiError ? err.message : 'Napaka pri komunikaciji s strežnikom.');
  }
}

export function pripraviDogodkiHandlerje() {
  if (!dogodkiTbody) return;

  dogodkiTbody.addEventListener('click', async (e) => {
    const gumb = e.target.closest('button');
    if (!gumb) return;
    const idDogodka = gumb.dataset.id;

    if (gumb.classList.contains('akcija-odobri')) {
      await posodobiStatusDogodka(idDogodka, 'aktiven');
    } else if (gumb.classList.contains('akcija-zavrni')) {
      await posodobiStatusDogodka(idDogodka, 'odpovedan');
    } else if (gumb.classList.contains('akcija-promoviraj')) {
      await posodobiStatusDogodka(idDogodka, 'promoviran');
    } else if (gumb.classList.contains('akcija-odstrani-promocijo')) {
      await posodobiStatusDogodka(idDogodka, 'aktiven');
    } else if (gumb.classList.contains('akcija-brisi')) {
      const potrjeno = await potrdiAkcijo({
        naslov: 'Izbriši dogodek',
        sporocilo: 'Ali ste prepričani, da želite trajno izbrisati ta dogodek? Tega dejanja ni mogoče razveljaviti.',
        gumbPotrdi: 'Izbriši',
        tipGumba: 'btn-danger',
      });
      if (potrjeno) await izbrisiDogodek(idDogodka);
    }
  });
}
