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
import { inicializirajMojeDogodke } from './profil/moji-dogodki.js';

if (!Auth.jePrijavljen()) {
  window.location.replace('prijava.html?razlog=potrebna-prijava');
}

let trenutniUporabnik = null;
let mojiDogodkiInicializirani = false;

async function osveziPodatkeProfila() {
  try {
    const [odgovorMe, dashboard] = await Promise.all([
      apiFetch('/me'),
      apiFetch('/me/dashboard'),
    ]);

    const uporabnik = odgovorMe.uporabnik || odgovorMe;

    trenutniUporabnik = uporabnik;
    
    Auth.osveziUporabnika(uporabnik);

    napolniProfil(uporabnik);
    nastaviStatistike(dashboard.statistike);
    renderPrijave(dashboard.prijave);
    renderPriljubljeni(dashboard.priljubljeni);
    renderOcene(dashboard.ocene, osveziPodatkeProfila);
    renderOrganizatorji(dashboard.organizatorji, osveziPodatkeProfila);
    renderOrganizatorBox(uporabnik);

    if (uporabnik.vloga === 'organizator' && !mojiDogodkiInicializirani) {
      mojiDogodkiInicializirani = true;
      inicializirajMojeDogodke();
    }
  } catch (err) {
    console.error('Kritična napaka pri nalaganju podatkov profila:', err);

    if (err instanceof ApiError && err.status === 401) {
      Auth.odjavi();
      window.location.replace('prijava.html?razlog=potrebna-prijava');
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