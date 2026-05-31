import { apiFetch, Auth, ApiError, osveziNaAkcijo } from './auth.js';
import {
  napolniProfil,
  renderPrijave,
  renderPriljubljeni,
  renderOrganizatorji,
  renderOcene,
  nastaviStatistike,
} from './profil/dashboard.js';
import { initEditModal } from './profil/edit.js';
import { renderOrganizatorBox } from './profil/prosnja.js';

if (!Auth.jePrijavljen()) {
  window.location.href = 'prijava.html';
}

let trenutniUporabnik = null;

async function osveziPodatkeProfila() {
  try {
    const [{ uporabnik }, dashboard] = await Promise.all([
      apiFetch('/me'),
      apiFetch('/me/dashboard'),
    ]);
    trenutniUporabnik = uporabnik;
    napolniProfil(uporabnik);
    nastaviStatistike(dashboard.statistike);
    renderPrijave(dashboard.prijave);
    renderPriljubljeni(dashboard.priljubljeni);
    renderOcene(dashboard.ocene, osveziPodatkeProfila);
    renderOrganizatorji(dashboard.organizatorji, osveziPodatkeProfila);
    renderOrganizatorBox(uporabnik);
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      Auth.odjavi();
      window.location.href = 'prijava.html';
    } else {
      console.error('Napaka pri nalaganju dashboarda:', err);
    }
  }
}

initEditModal({
  getUporabnik: () => trenutniUporabnik,
  onUpdate: (uporabnik) => {
    trenutniUporabnik = uporabnik;
    napolniProfil(uporabnik);
  },
});

const lokalniUporabnik = Auth.getUporabnik();
if (lokalniUporabnik) {
  trenutniUporabnik = lokalniUporabnik;
  napolniProfil(lokalniUporabnik);
}

osveziPodatkeProfila();
osveziNaAkcijo(osveziPodatkeProfila);
