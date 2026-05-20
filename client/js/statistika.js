import { apiFetch } from './auth.js';

const IKONE_KATEGORIJ = {
  'Koncerti':     { ikona: 'bi-music-note-beamed', slug: 'koncerti',      barva: '#6d28d9' },
  'Šport':        { ikona: 'bi-trophy-fill',       slug: 'sport',         barva: '#10b981' },
  'Delavnice':    { ikona: 'bi-tools',             slug: 'delavnice',     barva: '#06b6d4' },
  'Kultura':      { ikona: 'bi-palette-fill',      slug: 'kultura',       barva: '#db2777' },
  'Izobraževanja':{ ikona: 'bi-mortarboard-fill',  slug: 'izobrazevanja', barva: '#3b82f6' },
  'Zabave':       { ikona: 'bi-stars',             slug: 'zabave',        barva: '#f59e0b' },
};
const PRIVZETA_IKONA = 'bi-tag-fill';
const PRIVZETA_BARVA = '#6d28d9';

const formatStevila = new Intl.NumberFormat('sl-SI');

function nastaviStevilo(klic, vrednost) {
  document.querySelectorAll(`[data-stat="${klic}"]`).forEach(el => {
    el.textContent = formatStevila.format(vrednost);
    if (el.hasAttribute('data-stat-hide-when-zero')) {
      el.classList.toggle('d-none', vrednost === 0);
    }
  });
}

function ustvariSlug(naziv) {
  return naziv
    .toLowerCase()
    .replace(/š/g, 's').replace(/č/g, 'c').replace(/ž/g, 'z')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function renderirajKategorije(kategorije) {
  const grid = document.getElementById('kategorije-grid');
  if (!grid) return;

  if (!kategorije.length) {
    grid.innerHTML = '<p class="text-center text-muted">Trenutno ni kategorij.</p>';
    return;
  }

  grid.innerHTML = kategorije.map(k => {
    const mapping = IKONE_KATEGORIJ[k.naziv] || {};
    const ikona = mapping.ikona || PRIVZETA_IKONA;
    const slug = mapping.slug || ustvariSlug(k.naziv);
    const stStr = formatStevila.format(k.stevilo);
    return `
      <a href="dogodki.html?cat=${slug}" class="category-card-mini">
        <div class="cat-icon-mini"><i class="bi ${ikona}"></i></div>
        <div class="relative z-10">
          <div class="font-semibold text-ink-900">${k.naziv}</div>
          <div class="text-xs text-ink-500">${stStr} ${k.stevilo === 1 ? 'dogodek' : (k.stevilo === 2 ? 'dogodka' : (k.stevilo < 5 ? 'dogodki' : 'dogodkov'))}</div>
        </div>
      </a>
    `;
  }).join('');
}

function renderirajTopKategorije(kategorije) {
  const el = document.getElementById('topKategorije');
  if (!el) return;

  const top = [...kategorije]
    .sort((a, b) => b.stevilo - a.stevilo)
    .slice(0, 5);

  if (!top.length || top[0].stevilo === 0) {
    el.innerHTML = '<div class="text-center text-muted py-2" style="font-size:0.9rem;">Še ni dogodkov v kategorijah.</div>';
    return;
  }

  const najvec = top[0].stevilo;

  el.innerHTML = top.map((k, i) => {
    const mapping = IKONE_KATEGORIJ[k.naziv] || {};
    const ikona = mapping.ikona || PRIVZETA_IKONA;
    const barva = mapping.barva || PRIVZETA_BARVA;
    const odstotek = Math.max(5, Math.round((k.stevilo / najvec) * 100));
    const razmik = i === top.length - 1 ? '' : 'mb-2';
    return `
      <div class="${razmik}">
        <div class="d-flex justify-content-between mb-1">
          <span><i class="bi ${ikona}" style="color: ${barva};"></i> ${k.naziv}</span>
          <strong>${formatStevila.format(k.stevilo)}</strong>
        </div>
        <div class="progress" style="height: 6px;">
          <div class="progress-bar" style="width: ${odstotek}%; background-color: ${barva};"></div>
        </div>
      </div>
    `;
  }).join('');
}

function nastaviTedenskiBadge(novi) {
  const badge = document.querySelector('[data-stat-badge="tedensko"]');
  if (!badge) return;
  if (novi <= 0) {
    badge.classList.add('d-none');
    return;
  }
  const stevec = badge.querySelector('[data-stat="novi-teden"]');
  if (stevec) stevec.textContent = formatStevila.format(novi);
  const oznaka = badge.querySelector('[data-stat-label="novi-teden"]');
  if (oznaka) {
    oznaka.textContent = novi === 1 ? 'nov dogodek' : (novi === 2 ? 'nova dogodka' : (novi < 5 ? 'novi dogodki' : 'novih dogodkov'));
  }
}

async function naloziStatistiko() {
  try {
    const s = await apiFetch('/statistika');
    nastaviStevilo('dogodki',             s.dogodki);
    nastaviStevilo('dogodki-vse',         s.dogodki_vse);
    nastaviStevilo('organizatorji',       s.organizatorji);
    nastaviStevilo('uporabniki',          s.uporabniki);
    nastaviStevilo('kraji',               s.kraji);
    nastaviStevilo('kategorij-stevilo',   s.kategorije.length);
    nastaviStevilo('dogodki-v-pregledu',  s.dogodki_v_pregledu);
    nastaviStevilo('ocene-skupaj',        s.ocene_skupaj);
    nastaviTedenskiBadge(s.novi_dogodki_teden);
    renderirajKategorije(s.kategorije);
    renderirajTopKategorije(s.kategorije);
  } catch (err) {
    console.error('Napaka pri nalaganju statistike:', err);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', naloziStatistiko);
} else {
  naloziStatistiko();
}
