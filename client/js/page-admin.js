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

const usersTbody = document.getElementById('usersTbody');
const dogodkiTbody = document.getElementById('admin-dogodki-tbody');
const prosnjeList = document.getElementById('prosnjeList');
const oceneTbody = document.getElementById('oceneTbody');

const counter = document.getElementById('userCount');
const prosnjeCount = document.getElementById('prosnjeCount');
const sidebarBadge = document.getElementById('sidebarProsnjeBadge');
const oceneCounter = document.getElementById('oceneCount');


function vlogaBadge(vloga) {
  const map = {
    admin: 'status-rejected',
    organizator: 'status-promoted',
    uporabnik: 'status-approved',
  };
  return `<span class="status-badge ${map[vloga] || ''}">${vloga}</span>`;
}

function renderUporabniki(seznam) {
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
    pokaziToast('success', odgovor.sporocilo);
    await naloziProsnje();
    const { uporabniki: posodobljeni } = await apiFetch('/admin/uporabniki');
    renderUporabniki(posodobljeni);
  } catch (err) {
    pokaziToast('danger', err instanceof ApiError ? err.message : 'Napaka pri obravnavi.');
    vsi.forEach(b => b.disabled = false);
  }
}

async function naloziProsnje() {
  try {
    const { prosnje } = await apiFetch('/admin/prosnje');
    renderProsnje(prosnje);
  } catch (err) {
    if (prosnjeList) prosnjeList.innerHTML = `<div class="text-center text-danger py-3">Napaka pri nalaganju: ${err.message}</div>`;
  }
}


async function naloziDogodke() {
  if (!dogodkiTbody) return;
  const token = Auth.getToken();

  try {
    const odgovor = await fetch('http://localhost:3001/api/admin/dogodki', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!odgovor.ok) throw new Error('Napaka pri pridobivanju podatkov.');

    const dogodki = await odgovor.json();
    dogodkiTbody.innerHTML = '';

    dogodki.forEach(dogodek => {
      const tr = document.createElement('tr');

      const organizator = dogodek.org_podjetje || 
                          (dogodek.org_ime ? `${dogodek.org_ime} ${dogodek.org_priimek}` : 'Neznan organizator');

      const datum = new Date(dogodek.datum_zacetka).toLocaleDateString('sl-SI');
      
      const katNaziv = dogodek.kategorija_naziv || dogodek.podkategorija || 'Brez kategorije';
      const krajIme = dogodek.kraj_ime || 'Neznana lokacija';

      let statusBadgeHtml = '';
      let gumbiAkcij = '';

      const brisiGumb = `<button class="btn btn-sm btn-outline-danger akcija-brisi" data-id="${dogodek.ID_dogodek}" title="Briši"><i class="bi bi-trash"></i></button>`;

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

      dogodkiTbody.appendChild(tr);
    });

  } catch (err) {
    if (dogodkiTbody) dogodkiTbody.innerHTML = `<tr><td colspan="5" class="text-center text-danger">Napaka: ${err.message}</td></tr>`;
  }
}

async function posodobiStatusDogodka(id, novStatus) {
  const token = Auth.getToken();
  try {
    const odgovor = await fetch(`http://localhost:3001/api/admin/dogodki/${id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ status: novStatus })
    });

    if (odgovor.ok) {
      await naloziDogodke();
      pokaziToast('success', `Status dogodka uspešno spremenjen v: ${novStatus}`);
    } else {
      const napaka = await odgovor.json().catch(() => ({}));
      pokaziToast('danger', napaka.napaka || 'Napaka pri posodabljanju statusa.');
    }
  } catch (err) {
    console.error(err);
    pokaziToast('danger', 'Napaka pri komunikaciji s strežnikom.');
  }
}


if (dogodkiTbody) {
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
        tipGumba: 'btn-danger'
      });

      if (potrjeno) {
        await izbrisiDogodek(idDogodka);
      }
    }
  });
}

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
      hour: '2-digit', minute: '2-digit'
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

async function naloziOcene() {
  if (!oceneTbody) return;
  try {
    const { ocene } = await apiFetch('/admin/ocene');
    renderOcene(ocene);
  } catch (err) {
    oceneTbody.innerHTML = `<tr><td colspan="6" class="text-center text-danger py-4">Napaka: ${err.message}</td></tr>`;
  }
}

(async function inicializirajAdminPanel() {
  try {
    const { uporabniki } = await apiFetch('/admin/uporabniki');
    renderUporabniki(uporabniki);
  } catch (err) {
    if (usersTbody) usersTbody.innerHTML = `<tr><td colspan="5" class="text-center text-danger py-4">Napaka: ${err.message}</td></tr>`;
  }

  await naloziProsnje();

  await naloziDogodke();

  await naloziOcene();
})();

async function izbrisiDogodek(id) {
  const token = Auth.getToken();
  try {
    const odgovor = await fetch(`http://localhost:3001/api/admin/dogodki/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (odgovor.ok) {
      await naloziDogodke();
      pokaziToast('success', 'Dogodek uspešno izbrisan.');
    } else {
      const napaka = await odgovor.json();
      pokaziToast('danger', napaka.napaka || 'Napaka pri brisanju.');
    }
  } catch (err) {
    console.error(err);
    pokaziToast('danger', 'Napaka pri komunikaciji s strežnikom.');
  }
}