import { Auth } from './auth.js';
import { pokaziToast } from './components.js';

const PRIVZETO = {
  tema: 'auto',
  opomnik: true,
  novicnik: false,
  prosnjaUpdate: true,
  radius: 25,
  jezik: 'sl',
};

const STORAGE_KEY = 'nastavitve';

function preberiNastavitve() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return { ...PRIVZETO, ...JSON.parse(raw || '{}') };
  } catch {
    return { ...PRIVZETO };
  }
}

function shraniNastavitve(n) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(n));
}

function napolniForm(n) {
  document.querySelectorAll('.tema-izbira').forEach(btn => {
    btn.classList.toggle('izbrano', btn.dataset.tema === n.tema);
  });
  document.getElementById('pref-opomnik').checked = !!n.opomnik;
  document.getElementById('pref-novicnik').checked = !!n.novicnik;
  document.getElementById('pref-prosnja-update').checked = !!n.prosnjaUpdate;
  document.getElementById('pref-radius').value = n.radius;
  document.getElementById('pref-radius-izpis').textContent = `${n.radius} km`;
  document.getElementById('pref-jezik').value = n.jezik;
}

function preberiFormVNastavitve() {
  const izbranaTema = document.querySelector('.tema-izbira.izbrano')?.dataset.tema || 'auto';
  return {
    tema: izbranaTema,
    opomnik: document.getElementById('pref-opomnik').checked,
    novicnik: document.getElementById('pref-novicnik').checked,
    prosnjaUpdate: document.getElementById('pref-prosnja-update').checked,
    radius: parseInt(document.getElementById('pref-radius').value, 10),
    jezik: document.getElementById('pref-jezik').value,
  };
}

const mediaDark = window.matchMedia('(prefers-color-scheme: dark)');

export function uveljaviTemo(tema) {
  const html = document.documentElement;
  if (tema === 'auto') {
    html.setAttribute('data-tema', mediaDark.matches ? 'dark' : 'light');
    html.setAttribute('data-tema-nastavitev', 'auto');
  } else {
    html.setAttribute('data-tema', tema);
    html.setAttribute('data-tema-nastavitev', tema);
  }
}

mediaDark.addEventListener('change', () => {
  const n = preberiNastavitve();
  if (n.tema === 'auto') uveljaviTemo('auto');
});

if (!Auth.jePrijavljen()) {
  window.location.href = 'prijava.html';
}

const nastavitve = preberiNastavitve();
napolniForm(nastavitve);
uveljaviTemo(nastavitve.tema);

document.querySelectorAll('.tema-izbira').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tema-izbira').forEach(b => b.classList.remove('izbrano'));
    btn.classList.add('izbrano');
    uveljaviTemo(btn.dataset.tema);
  });
});

document.getElementById('pref-radius').addEventListener('input', (e) => {
  document.getElementById('pref-radius-izpis').textContent = `${e.target.value} km`;
});

document.getElementById('gumb-shrani').addEventListener('click', () => {
  const nove = preberiFormVNastavitve();
  shraniNastavitve(nove);
  uveljaviTemo(nove.tema);
  pokaziToast('success', 'Nastavitve shranjene.', 'Shranjeno');
});

document.getElementById('gumb-ponastavi').addEventListener('click', () => {
  shraniNastavitve(PRIVZETO);
  napolniForm(PRIVZETO);
  uveljaviTemo(PRIVZETO.tema);
  pokaziToast('info', 'Nastavitve vrnjene na privzete vrednosti.');
});

document.querySelectorAll('[data-logout]').forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    Auth.odjavi();
    window.location.href = 'prijava.html';
  });
});
