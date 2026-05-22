import { Auth } from './auth.js';
import { naloziUporabnike } from './admin/uporabniki.js';
import { naloziProsnje } from './admin/prosnje.js';
import { naloziDogodke, pripraviDogodkiHandlerje } from './admin/dogodki.js';
import { naloziOcene } from './admin/ocene.js';

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

(async function inicializirajAdminPanel() {
  await naloziUporabnike();
  await naloziProsnje();
  await naloziDogodke();
  await naloziOcene();
})();
