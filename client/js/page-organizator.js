import { apiFetch, SERVER_URL, Auth } from './auth.js';
import { pobegniHtml } from './components.js';
import { inicializirajPriljubljene, osveziSrckeNaStrani } from './dogodki.js';

let vsiDogodki = [];
let prikazaniDogodkiCount = 0;
const KORAK_PAGINACIJE = 5;
let jeSledil = false;
let trenutniSledilciSt = 0;
let organizatorId = null;

function generirajKarticoOrganizatorja(dogodek, privzetaSlika) {
  const d = new Date(dogodek.datum_zacetka);
  const dan = String(d.getDate()).padStart(2, '0');
  const mesec = d.toLocaleString('sl-SI', { month: 'short' }).toUpperCase().replace('.', '').trim();
  const ura = d.toLocaleTimeString('sl-SI', { hour: '2-digit', minute: '2-digit' });

  let slikaUrl = privzetaSlika;
  if (dogodek.slika) {
    if (dogodek.slika.startsWith('http')) slikaUrl = dogodek.slika;
    else if (dogodek.slika.startsWith('/uploads/')) slikaUrl = `${SERVER_URL}${dogodek.slika}`;
    else slikaUrl = `${SERVER_URL}/uploads/dogodkov/${dogodek.slika}`;
  }

  const cena = parseFloat(dogodek.cena);
  const cenaHTML = cena > 0 ? `<span class="event-price">${cena.toFixed(0)} €</span>` : `<span class="event-price">Brezplačno</span>`;
  const polnaLokacija = dogodek.ulica ? `${dogodek.ulica}, ${dogodek.kraj || ''}` : (dogodek.kraj || 'Neznana lokacija');
  const kratekOpis = dogodek.kratek_opis || dogodek.opis || 'Brez opisa.';

  const stolpec = document.createElement('div');
  stolpec.className = 'col-md-6 col-lg-4 mb-4';

  stolpec.innerHTML = `
    <div class="event-card position-relative h-100 flex flex-col">
      <div class="event-card-img">
        <img src="${pobegniHtml(slikaUrl)}" alt="${pobegniHtml(dogodek.Naslov)}">
        <div class="event-date">
          <span class="day">${dan}</span>
          <span class="month">${mesec}</span>
        </div>
        <span class="event-cat-tag">${pobegniHtml(dogodek.kategorija || 'Dogodek')}</span>
      </div>
      <div class="event-card-body flex-grow d-flex flex-column justify-content-between">
        <div>
          <div class="event-meta">
            <i class="bi bi-geo-alt"></i> <span>${pobegniHtml(polnaLokacija)}</span>
            <span class="ms-2"><i class="bi bi-clock"></i> ${ura}</span>
          </div>
          <h5 class="mt-2"><a href="dogodek.html?id=${Number(dogodek.ID_dogodek)}">${pobegniHtml(dogodek.Naslov)}</a></h5>
          <p class="event-card-desc">${pobegniHtml(kratekOpis)}</p>
        </div>
        <div class="d-flex justify-content-between align-items-center mt-3">
          ${cenaHTML}
          <button class="event-fav" data-fav-id="${Number(dogodek.ID_dogodek)}" aria-label="Dodaj med priljubljene">
            <i class="bi bi-heart"></i>
          </button>
        </div>
      </div>
    </div>
  `;
  return stolpec;
}

document.addEventListener('DOMContentLoaded', async () => {
  try { await inicializirajPriljubljene(); } catch(e){}

  const urlParams = new URLSearchParams(window.location.search);
  organizatorId = urlParams.get('id');

  if (!organizatorId) {
    document.getElementById('orgDogodkiList').innerHTML = '<p class="text-center text-danger w-100">Manjka ID organizatorja.</p>';
    return;
  }

  await pridobiInPrikaziOrganizatorja(organizatorId);

  const gumbNaloziVec = document.getElementById('gumb-nalozi-vec-dogodkov');
  if (gumbNaloziVec) {
    gumbNaloziVec.addEventListener('click', prikaziNaslednjeDogodke);
  }

  const gumbSledi = document.getElementById('gumb-sledi-glavni');
  if (gumbSledi) {
    gumbSledi.addEventListener('click', preklopiSledenje);
  }
});

async function pridobiInPrikaziOrganizatorja(id) {
  const kontejnerDogodkov = document.getElementById('orgDogodkiList');

  try {
    const podatki = await apiFetch(`/organizator/${id}`);
    
    const profil = podatki.profil;
    vsiDogodki = podatki.dogodki || [];
    
    const prikazanoIme = profil.naziv_podjetja || `${profil.ime} ${profil.priimek}`.trim();
    document.getElementById('orgIme').textContent = prikazanoIme;
    document.getElementById('orgEmail').textContent = profil.email || "Kontakt ni na voljo";
    
    let avatarCrke = "";
    if (profil.naziv_podjetja) {
      avatarCrke = profil.naziv_podjetja.substring(0, 2).toUpperCase();
    } else {
      avatarCrke = profil.ime.charAt(0).toUpperCase() + (profil.priimek ? profil.priimek.charAt(0).toUpperCase() : '');
    }
    document.getElementById('orgAvatar').textContent = avatarCrke;

    document.getElementById('orgDogodkiCount').textContent = vsiDogodki.length;
    
    trenutniSledilciSt = parseInt(profil.sledilci_count || 0);
    document.getElementById('orgSledilciCount').textContent = trenutniSledilciSt;

    jeSledil = profil.je_sledil === true || profil.je_sledil === 1;
    osveziIzgledGumbaSledi();

    kontejnerDogodkov.innerHTML = '';
    prikazaniDogodkiCount = 0;

    if (vsiDogodki.length > 0) {
      prikaziNaslednjeDogodke();
    } else {
      document.getElementById('nalozi-vec-kontejner')?.classList.add('d-none');
      kontejnerDogodkov.innerHTML = '<p class="text-center w-100 p-4">Ta organizator trenutno nima razpisanih javnih dogodkov.</p>';
    }

  } catch (err) {
    console.error('Napaka pri nalaganju profila organizatorja:', err);
    kontejnerDogodkov.innerHTML = '<p class="text-center text-danger w-100">Ni bilo mogoče naložiti profila organizatorja.</p>';
  }
}

function prikaziNaslednjeDogodke() {
  const kontejnerDogodkov = document.getElementById('orgDogodkiList');
  const kontejnerGumba = document.getElementById('nalozi-vec-kontejner');
  const privzetaSlika = 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&q=80';

  const konec = Math.min(prikazaniDogodkiCount + KORAK_PAGINACIJE, vsiDogodki.length);

  for (let i = prikazaniDogodkiCount; i < konec; i++) {
    kontejnerDogodkov.appendChild(generirajKarticoOrganizatorja(vsiDogodki[i], privzetaSlika));
  }

  prikazaniDogodkiCount = konec;

  if (prikazaniDogodkiCount < vsiDogodki.length) {
    kontejnerGumba?.classList.remove('d-none');
  } else {
    kontejnerGumba?.classList.add('d-none');
  }

  try { osveziSrckeNaStrani(); } catch(e){}
}

function osveziIzgledGumbaSledi() {
  const gumb = document.getElementById('gumb-sledi-glavni');
  if (!gumb) return;

  gumb.className = "btn btn-sm font-semibold shadow-sm px-4 py-1.5";
  gumb.style.borderRadius = "20px";

  if (jeSledil) {
    gumb.style.background = "rgba(255, 255, 255, 0.18)";
    gumb.style.border = "1.5px solid rgba(255, 255, 255, 0.85)";
    gumb.style.color = "#ffffff";
    gumb.innerHTML = `<i class="bi bi-check-lg"></i> Sledim`;
  } else {
    gumb.style.background = "#ffffff";
    gumb.style.border = "1.5px solid #ffffff";
    gumb.style.color = "var(--brand-700)";
    gumb.innerHTML = `<i class="bi bi-plus-lg"></i> Sledi`;
  }
}

async function preklopiSledenje() {
  if (!Auth.jePrijavljen()) {
    if (window.pokaziToast) {
      window.pokaziToast('warning', 'Za sledenje organizatorjem se moraš prijaviti.', 'Prijava potrebna');
    } else {
      alert('Za sledenje se moraš prijaviti.');
    }
    setTimeout(() => location.href = 'prijava.html', 1000);
    return;
  }

  const gumb = document.getElementById('gumb-sledi-glavni');
  gumb.disabled = true;

  const url = `/organizatorji/${organizatorId}/toggle-spremljaj`;

  try {
    const odgovor = await apiFetch(url, { method: 'POST' });
    
    jeSledil = odgovor.spremlja;
    
    if (jeSledil) {
      trenutniSledilciSt++;
      if (window.pokaziToast) window.pokaziToast('success', odgovor.sporocilo || 'Uspešno slediš!');
    } else {
      trenutniSledilciSt = Math.max(0, trenutniSledilciSt - 1);
      if (window.pokaziToast) window.pokaziToast('info', odgovor.sporocilo || 'Ne spremljaš več.');
    }

    document.getElementById('orgSledilciCount').textContent = trenutniSledilciSt;
    osveziIzgledGumbaSledi();

  } catch (err) {
    console.error("Napaka pri spreminjanju sledenja:", err);
    if (window.pokaziToast) {
      window.pokaziToast('danger', 'Prišlo je do napake pri spreminjanju sledenja.');
    } else {
      alert('Prišlo je do napake.');
    }
  } finally {
    gumb.disabled = false;
  }
}