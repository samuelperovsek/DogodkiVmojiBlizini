import { apiFetch, ApiError } from './auth.js';
import { pobegniHtml, varnoUrl } from './components.js';

const INTERVAL_OSVEZITVE_MS = 60_000;
let casovnik = null;

function relativnoCas(datumStr) {
  if (!datumStr) return '';
  const d = new Date(datumStr.replace(' ', 'T'));
  if (Number.isNaN(d.getTime())) return '';
  const sekunde = Math.floor((Date.now() - d.getTime()) / 1000);
  if (sekunde < 60) return 'pravkar';
  const minute = Math.floor(sekunde / 60);
  if (minute < 60) return `pred ${minute} min`;
  const ure = Math.floor(minute / 60);
  if (ure < 24) return `pred ${ure} ${ure === 1 ? 'uro' : ure < 5 ? 'urami' : 'urami'}`;
  const dnevi = Math.floor(ure / 24);
  if (dnevi < 7) return `pred ${dnevi} ${dnevi === 1 ? 'dnevom' : 'dnevi'}`;
  return d.toLocaleDateString('sl-SI', { day: 'numeric', month: 'short' });
}

const IKONE = {
  prosnja_odobrena:        { ikona: 'bi-check-circle-fill',    barva: 'text-success' },
  prosnja_zavrnjena:       { ikona: 'bi-x-circle-fill',         barva: 'text-danger'  },
  dogodek_aktiven:         { ikona: 'bi-calendar-check-fill',   barva: 'text-success' },
  dogodek_zavrnjen:        { ikona: 'bi-calendar-x-fill',       barva: 'text-danger'  },
  dogodek_promoviran:      { ikona: 'bi-star-fill',             barva: 'text-warning' },
  nova_prijava:            { ikona: 'bi-person-plus-fill',      barva: 'text-info'    },
  odpoved_prijave:         { ikona: 'bi-person-dash-fill',      barva: 'text-warning' },
  prijava_potrjena:        { ikona: 'bi-ticket-perforated-fill', barva: 'text-success' },
  prijava_preklicana:      { ikona: 'bi-ticket-fill',           barva: 'text-warning' },
  dogodek_odpovedan_zame:  { ikona: 'bi-calendar-x-fill',       barva: 'text-danger'  },
  dogodek_kmalu:           { ikona: 'bi-alarm-fill',            barva: 'text-info'    },
  geslo_spremenjeno:       { ikona: 'bi-shield-lock-fill',      barva: 'text-warning' },
  profil_posodobljen:      { ikona: 'bi-person-gear',           barva: 'text-info'    },
  splosno:                 { ikona: 'bi-info-circle-fill',      barva: 'text-info'    },
};

function pridobiBellEl() {
  return document.querySelector('[data-bell]');
}

function nastaviStevec(neprebrano) {
  const el = document.querySelector('[data-bell-counter]');
  if (!el) return;
  if (!neprebrano || neprebrano <= 0) {
    el.classList.add('d-none');
    el.textContent = '0';
  } else {
    el.classList.remove('d-none');
    el.textContent = neprebrano > 99 ? '99+' : String(neprebrano);
  }
}

function izrisiSeznam(obvestila) {
  const seznam = document.querySelector('[data-bell-list]');
  if (!seznam) return;

  if (!obvestila || obvestila.length === 0) {
    seznam.innerHTML = `
      <div class="bell-empty">
        <i class="bi bi-bell-slash"></i>
        <p>Nimaš obvestil.</p>
      </div>
    `;
    return;
  }

  seznam.innerHTML = obvestila.map((o) => {
    const meta = IKONE[o.tip] || IKONE.splosno;
    const klasaPrebrano = o.prebrano ? 'bell-item--prebrano' : '';
    const sporociloVarno = pobegniHtml(o.sporocilo);
    const casVarno = pobegniHtml(relativnoCas(o.datum_obvestila));
    const povezavaVarna = o.povezava ? varnoUrl(o.povezava) : '';
    const tag = o.povezava ? 'a' : 'div';
    const hrefAttr = o.povezava ? `href="${povezavaVarna}"` : '';
    return `
      <${tag} class="bell-item ${klasaPrebrano}" ${hrefAttr} data-obvestilo-id="${Number(o.id)}">
        <span class="bell-item__icon ${meta.barva}"><i class="bi ${meta.ikona}"></i></span>
        <div class="bell-item__body">
          <div class="bell-item__text">${sporociloVarno}</div>
          <div class="bell-item__meta">${casVarno}</div>
        </div>
        <button type="button" class="bell-item__close" data-obvestilo-delete aria-label="Izbriši obvestilo">
          <i class="bi bi-x"></i>
        </button>
      </${tag}>
    `;
  }).join('');
}

async function nalozi() {
  try {
    const podatki = await apiFetch('/obvestila');
    nastaviStevec(podatki.neprebrano);
    izrisiSeznam(podatki.obvestila || []);
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) return;
    console.error('Napaka pri nalaganju obvestil:', err);
  }
}

async function oznaciKotPrebrano(id) {
  try {
    await apiFetch(`/obvestila/${id}`, { method: 'PATCH' });
  } catch (err) {
    console.error('Napaka pri označevanju obvestila:', err);
  }
}

async function izbrisi(id) {
  try {
    await apiFetch(`/obvestila/${id}`, { method: 'DELETE' });
  } catch (err) {
    console.error('Napaka pri brisanju obvestila:', err);
  }
}

async function oznaciVsePrebrano() {
  try {
    await apiFetch('/obvestila/oznaci-vse-prebrano', { method: 'POST' });
    await nalozi();
  } catch (err) {
    console.error('Napaka pri označevanju vseh obvestil:', err);
  }
}

function priklopiPoslusalce() {
  const bell = pridobiBellEl();
  if (!bell || bell.dataset.bellInit === '1') return;
  bell.dataset.bellInit = '1';

  const gumbVsi = bell.querySelector('[data-bell-mark-all]');
  if (gumbVsi) gumbVsi.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    oznaciVsePrebrano();
  });

  const seznam = bell.querySelector('[data-bell-list]');
  if (!seznam) return;

  seznam.addEventListener('click', async (e) => {
    const gumbBrisi = e.target.closest('[data-obvestilo-delete]');
    const item = e.target.closest('[data-obvestilo-id]');
    if (!item) return;
    const id = Number(item.dataset.obvestiloId);
    if (!id) return;

    if (gumbBrisi) {
      e.preventDefault();
      e.stopPropagation();
      item.remove();
      await izbrisi(id);
      const stevecEl = bell.querySelector('[data-bell-counter]');
      if (stevecEl && !item.classList.contains('bell-item--prebrano')) {
        const trenutno = parseInt(stevecEl.textContent, 10) || 0;
        nastaviStevec(Math.max(0, trenutno - 1));
      }
      const preostali = seznam.querySelectorAll('.bell-item').length;
      if (preostali === 0) izrisiSeznam([]);
      return;
    }

    if (!item.classList.contains('bell-item--prebrano')) {
      item.classList.add('bell-item--prebrano');
      oznaciKotPrebrano(id);
      const stevecEl = bell.querySelector('[data-bell-counter]');
      const trenutno = parseInt(stevecEl?.textContent, 10) || 0;
      nastaviStevec(Math.max(0, trenutno - 1));
    }
  });
}

let osvezitevTimeout = null;
function osveziSPlanom() {
  if (osvezitevTimeout) clearTimeout(osvezitevTimeout);
  osvezitevTimeout = setTimeout(() => {
    osvezitevTimeout = null;
    nalozi();
  }, 250);
}

let prijavljenNaDogodke = false;
function prijaviPoslusalcaDogodkov() {
  if (prijavljenNaDogodke) return;
  prijavljenNaDogodke = true;

  document.addEventListener('app:akcija', osveziSPlanom);

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') nalozi();
  });
}

export const ObvestilaBell = {
  inicializiraj() {
    const bell = pridobiBellEl();
    if (!bell) return;
    bell.classList.remove('d-none');
    priklopiPoslusalce();
    nalozi();

    if (casovnik) clearInterval(casovnik);
    casovnik = setInterval(nalozi, INTERVAL_OSVEZITVE_MS);

    prijaviPoslusalcaDogodkov();
  },

  skrij() {
    const bell = pridobiBellEl();
    if (bell) bell.classList.add('d-none');
    if (casovnik) {
      clearInterval(casovnik);
      casovnik = null;
    }
  },

  osvezi: nalozi,
};

window.ObvestilaBell = ObvestilaBell;
