import { Auth, osveziNaAkcijo } from './auth.js';
import { naloziUporabnike } from './admin/uporabniki.js';
import { naloziProsnje } from './admin/prosnje.js';
import { naloziDogodke, pripraviDogodkiHandlerje } from './admin/dogodki.js';
import { naloziOcene } from './admin/ocene.js';
import { pripraviHitraDejanjaHandlerje } from './admin/hitra-dejanja.js';

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

pripraviDogodkiHandlerje();
pripraviHitraDejanjaHandlerje();
pripraviZlozljive();

function pripraviZlozljive() {
  document.querySelectorAll('[data-zlozljiv]').forEach(sec => {
    const glava = sec.querySelector('.zlozljiv__glava');
    if (!glava) return;
    glava.addEventListener('click', () => {
      const odprt = sec.getAttribute('aria-expanded') === 'true';
      sec.setAttribute('aria-expanded', odprt ? 'false' : 'true');
    });
  });

  function razsiri(id) {
    if (!id) return;
    const cilj = document.getElementById(id);
    if (!cilj) return;
    const sec = cilj.closest('[data-zlozljiv]') || (cilj.matches('[data-zlozljiv]') ? cilj : null);
    if (sec) sec.setAttribute('aria-expanded', 'true');
  }

  document.querySelectorAll('.admin-sidebar a[href^="#"]').forEach(a => {
    a.addEventListener('click', () => {
      razsiri(a.getAttribute('href').slice(1));
    });
  });

  if (location.hash) razsiri(location.hash.slice(1));
  window.addEventListener('hashchange', () => razsiri(location.hash.slice(1)));
}

async function osveziAdminPodatke() {
  await Promise.all([
    naloziUporabnike(),
    naloziProsnje(),
    naloziDogodke(),
    naloziOcene(),
  ]);
}

osveziAdminPodatke();
osveziNaAkcijo(osveziAdminPodatke);
