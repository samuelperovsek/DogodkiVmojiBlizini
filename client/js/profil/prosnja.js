import { apiFetch } from '../auth.js';
import { pobegniHtml } from '../components.js';

const organizatorBox = document.getElementById('organizatorBox');
const organizatorContent = document.getElementById('organizatorContent');

export async function renderOrganizatorBox(uporabnik) {
  if (uporabnik.vloga === 'admin') {
    organizatorBox.classList.add('d-none');
    return;
  }
  organizatorBox.classList.remove('d-none');

  if (uporabnik.vloga === 'organizator') {
    organizatorContent.innerHTML = `
      <div class="d-flex align-items-center gap-3">
        <i class="bi bi-patch-check-fill" style="font-size: 2rem;"></i>
        <div>
          <h3 class="text-white mb-1">Si potrjen organizator</h3>
          <p class="text-white/85 mb-0">Lahko dodajaš dogodke in jih upravljaš.</p>
        </div>
        <a href="dodaj-dogodek.html" class="btn bg-white text-brand-700 hover:bg-brand-50 hover:text-brand-800 ms-auto">
          <i class="bi bi-plus-circle"></i> Nov dogodek
        </a>
      </div>
    `;
    return;
  }

  const { prosnja } = await apiFetch('/me/prosnja-organizator');

  if (!prosnja) {
    renderProsnjaForm();
  } else if (prosnja.status === 'cakajoca') {
    renderProsnjaCakajoca(prosnja);
  } else if (prosnja.status === 'zavrnjena') {
    renderProsnjaZavrnjena(prosnja);
  }
}

function renderProsnjaForm() {
  organizatorContent.innerHTML = `
    <div id="prosnjaCTA" class="d-flex align-items-center gap-3 flex-wrap">
      <i class="bi bi-building" style="font-size: 2rem;"></i>
      <div class="flex-grow-1">
        <h3 class="text-white mb-1">Ste podjetje ali organizator?</h3>
        <p class="text-white/85 mb-0">Zaprosi za status organizatorja in začni dodajati dogodke.</p>
      </div>
      <button id="odpriProsnjoBtn" class="btn bg-white text-brand-700 hover:bg-brand-50 hover:text-brand-800">
        <i class="bi bi-rocket-takeoff"></i> Postani organizator
      </button>
    </div>

    <form id="prosnjaForm" class="d-none mt-3">
      <div id="prosnjaError" class="alert alert-danger d-none mb-3"></div>

      <div class="row g-3">
        <div class="col-md-6">
          <label class="form-label text-white">Naziv podjetja / organizacije *</label>
          <input type="text" name="naziv_podjetja" class="form-control" required maxlength="255" placeholder="npr. Kavarna Slon">
        </div>
        <div class="col-md-6">
          <label class="form-label text-white">Spletna stran (neobvezno)</label>
          <input type="url" name="spletna_stran" class="form-control" placeholder="https://...">
        </div>
        <div class="col-12">
          <label class="form-label text-white">Kratek opis (neobvezno)</label>
          <input type="text" name="opis" class="form-control" maxlength="1000" placeholder="npr. Lokalna kavarna v centru Ljubljane">
        </div>
        <div class="col-12">
          <label class="form-label text-white">Zakaj želiš postati organizator? *</label>
          <textarea name="razlog" class="form-control" rows="3" required minlength="20" maxlength="1000" placeholder="Opiši, kakšne dogodke nameravaš organizirati (najmanj 20 znakov)..."></textarea>
          <small class="text-white/70">Admin bo prošnjo pregledal v 24 urah.</small>
        </div>
      </div>

      <div class="d-flex gap-2 mt-3">
        <button type="submit" class="btn bg-white text-brand-700 hover:bg-brand-50 hover:text-brand-800" id="prosnjaSubmit">
          <i class="bi bi-send"></i> Pošlji prošnjo
        </button>
        <button type="button" id="prekliciProsnjoBtn" class="btn text-white border border-white/30 hover:bg-white/10 hover:text-white">
          Prekliči
        </button>
      </div>
    </form>
  `;

  document.getElementById('odpriProsnjoBtn').addEventListener('click', () => {
    document.getElementById('prosnjaCTA').classList.add('d-none');
    document.getElementById('prosnjaForm').classList.remove('d-none');
  });
  document.getElementById('prekliciProsnjoBtn').addEventListener('click', () => {
    document.getElementById('prosnjaCTA').classList.remove('d-none');
    document.getElementById('prosnjaForm').classList.add('d-none');
  });
  document.getElementById('prosnjaForm').addEventListener('submit', oddajProsnjo);
}

function renderProsnjaCakajoca(p) {
  const datum = new Date(p.datum_prosnje).toLocaleDateString('sl-SI');
  organizatorContent.innerHTML = `
    <div class="d-flex align-items-center gap-3 flex-wrap">
      <i class="bi bi-hourglass-split" style="font-size: 2rem;"></i>
      <div class="flex-grow-1">
        <h3 class="text-white mb-1">Prošnja v obdelavi</h3>
        <p class="text-white/85 mb-0">
          Tvojo prošnjo za <strong>${pobegniHtml(p.naziv_podjetja)}</strong> obravnavamo. Oddana ${datum}.
        </p>
      </div>
    </div>
  `;
}

function renderProsnjaZavrnjena(p) {
  const datum = new Date(p.datum_obravnave).toLocaleDateString('sl-SI');
  organizatorContent.innerHTML = `
    <div class="d-flex align-items-start gap-3 flex-wrap mb-3">
      <i class="bi bi-x-circle" style="font-size: 2rem;"></i>
      <div class="flex-grow-1">
        <h3 class="text-white mb-1">Prošnja zavrnjena</h3>
        <p class="text-white/85 mb-1">Prošnja za <strong>${pobegniHtml(p.naziv_podjetja)}</strong> je bila zavrnjena (${datum}).</p>
        ${p.opomba_admina ? `<p class="text-white/85 mb-0"><strong>Razlog:</strong> ${pobegniHtml(p.opomba_admina)}</p>` : ''}
      </div>
      <button id="novaProsnjaBtn" class="btn bg-white text-brand-700 hover:bg-brand-50">Oddaj novo prošnjo</button>
    </div>
  `;
  document.getElementById('novaProsnjaBtn').addEventListener('click', renderProsnjaForm);
}

async function oddajProsnjo(e) {
  e.preventDefault();
  const napaka = document.getElementById('prosnjaError');
  napaka.classList.add('d-none');

  const podatki = {
    naziv_podjetja: e.target.naziv_podjetja.value.trim(),
    spletna_stran: e.target.spletna_stran.value.trim(),
    opis: e.target.opis.value.trim(),
    razlog: e.target.razlog.value.trim(),
  };

  const gumb = document.getElementById('prosnjaSubmit');
  gumb.disabled = true;
  gumb.textContent = 'Pošiljam...';

  try {
    await apiFetch('/me/prosnja-organizator', {
      method: 'POST',
      body: JSON.stringify(podatki),
    });
    const { prosnja } = await apiFetch('/me/prosnja-organizator');
    renderProsnjaCakajoca(prosnja);
  } catch (err) {
    const podrobnosti = err.podrobnosti?.length ? `<ul class="mb-0 mt-1">${err.podrobnosti.map(p => `<li>${pobegniHtml(p)}</li>`).join('')}</ul>` : '';
    napaka.innerHTML = `<strong>${pobegniHtml(err.message)}</strong>${podrobnosti}`;
    napaka.classList.remove('d-none');
    gumb.disabled = false;
    gumb.innerHTML = '<i class="bi bi-send"></i> Pošlji prošnjo';
  }
}
