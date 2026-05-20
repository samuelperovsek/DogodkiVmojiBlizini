import { apiFetch } from './auth.js';
import { inicializirajPriljubljene, osveziSrckeNaStrani } from './dogodki.js';

const API_BASE_URL = 'http://localhost:3001';

document.addEventListener('DOMContentLoaded', naloziPodrobnostiDogodka);

let trenutnaStran = 1;
const LIMIT_OCEN = 10;
let dogodekIdGlobalno = null;
let izbranaOcena = 0;

function pridobiPotSlike(slikaIzBaze, privzetaSlika) {
  if (!slikaIzBaze) return privzetaSlika;
  if (slikaIzBaze.startsWith('/public/')) return `${API_BASE_URL}${slikaIzBaze.replace('/public', '')}`;
  if (slikaIzBaze.startsWith('http://') || slikaIzBaze.startsWith('https://')) return slikaIzBaze;
  if (slikaIzBaze.startsWith('/uploads/')) return `${API_BASE_URL}${slikaIzBaze}`;
  return `${API_BASE_URL}/uploads/dogodkov/${slikaIzBaze}`;
}

function generirajZvezdice(ocena) {
  let zvezdiceHtml = '';
  for (let i = 1; i <= 5; i++) {
    if (i <= ocena) {
      zvezdiceHtml += '<i class="bi bi-star-fill text-warning me-0.5"></i>';
    } else {
      zvezdiceHtml += '<i class="bi bi-star text-muted me-0.5"></i>';
    }
  }
  return zvezdiceHtml;
}

function posodobiIzgledVnosaZvezdic(trenutnaOcena) {
  const zvezdice = document.querySelectorAll('.tekst-vnos-zvezda');
  zvezdice.forEach(zvezda => {
    const vrednost = parseInt(zvezda.getAttribute('data-vrednost'));
    if (vrednost <= trenutnaOcena) {
      zvezda.classList.remove('bi-star', 'text-muted');
      zvezda.classList.add('bi-star-fill', 'text-warning');
    } else {
      zvezda.classList.remove('bi-star-fill', 'text-warning');
      zvezda.classList.add('bi-star', 'text-muted');
    }
  });
}

async function naloziPodrobnostiDogodka() {
  const kontejner = document.getElementById('podrobnosti-dogodka-kontejner');
  const urlParams = new URLSearchParams(window.location.search);
  const dogodekId = urlParams.get('id');
  dogodekIdGlobalno = dogodekId;

  if (!dogodekId) {
    kontejner.innerHTML = '<div class="container mt-5"><p class="alert alert-danger">Manjka ID dogodka.</p></div>';
    return;
  }

  try {
    const dogodek = await apiFetch(`/dogodki/${dogodekId}`);

    const dZacetek = new Date(dogodek.datum_zacetka);
    const dan = dZacetek.getDate();
    const mesecKratica = dZacetek.toLocaleString('sl-SI', { month: 'short' }).toUpperCase().replace('.', '').trim();
    const leto = dZacetek.getFullYear();
    const mesecPolno = dZacetek.toLocaleString('sl-SI', { month: 'long' });
    const danVTednu = dZacetek.toLocaleString('sl-SI', { weekday: 'short' });
    const ura = dZacetek.toLocaleTimeString('sl-SI', { hour: '2-digit', minute: '2-digit' });

    const privzeta = 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=1200&q=80';
    const slikaUrl = pridobiPotSlike(dogodek.slika, privzeta);

    const cenaIzpis = parseFloat(dogodek.cena) > 0 ? `${parseFloat(dogodek.cena).toFixed(0)} €` : 'Brezplačno';
    const cenaRazred = parseFloat(dogodek.cena) > 0 ? '' : 'free';

    const orgIme = dogodek.organizator_ime ? `${dogodek.organizator_ime} ${dogodek.organizator_priimek}` : 'Neznan organizator';
    const orgIniciali = dogodek.organizator_ime ? `${dogodek.organizator_ime[0]}${dogodek.organizator_priimek[0]}`.toUpperCase() : 'ORG';

    const ulicaIzpis = dogodek.ulica || '';
    const krajIzpis = dogodek.kraj || 'Neznana lokacija';
    const polnaLokacija = ulicaIzpis ? `${ulicaIzpis}, ${krajIzpis}` : krajIzpis;

    const sedezevSkupaj = dogodek.st_sedezov || 'Ni omejitve';
    const sedezevProstih = dogodek.st_prostih_sedezov !== undefined && dogodek.st_prostih_sedezov !== null
      ? `${dogodek.st_prostih_sedezov} / ${sedezevSkupaj} prostih mest`
      : 'Razpoložljivo';

    const statusPrevod = {
      'v_pregledu': 'Čaka na potrditev',
      'odobreno': 'Aktiven',
      'promoviran': 'Izpostavljen',
      'zavrnjeno': 'Preklican'
    };
    const lepStatus = statusPrevod[dogodek.status] || dogodek.status || 'Aktiven';

    kontejner.innerHTML = `
      <header class="page-header">
        <div class="container">
          <nav aria-label="breadcrumb">
            <ol class="breadcrumb">
              <li class="breadcrumb-item"><a href="index.html">Domov</a></li>
              <li class="breadcrumb-item"><a href="dogodki.html">Dogodki</a></li>
              <li class="breadcrumb-item active" aria-current="page">${dogodek.Naslov}</li>
            </ol>
          </nav>
          <span class="inline-flex items-center gap-1 px-3 py-1 mb-2 rounded-full bg-yellow-400/90 text-yellow-900 text-xs font-bold uppercase tracking-wider">
            <i class="bi bi-tag-fill"></i> ${dogodek.kategorija || 'Dogodek'}
          </span>
          <h1>${dogodek.Naslov}</h1>
          <div class="flex flex-wrap items-center gap-x-4 gap-y-2 mt-2 text-white/90">
            <span class="inline-flex items-center gap-2"><i class="bi bi-calendar-event"></i> ${dan}. ${mesecPolno} ${leto}, ${ura}</span>
            <span class="inline-flex items-center gap-2"><i class="bi bi-geo-alt"></i> ${polnaLokacija}</span>
            <span class="inline-flex items-center gap-2"><i class="bi bi-star-fill text-yellow-300"></i> 4.8 <span class="text-white/70">(Priporočeno)</span></span>
          </div>
        </div>
      </header>

      <section class="section-padding">
        <div class="container">
          <div class="row g-4">
            <div class="col-lg-8">
              <img src="${slikaUrl}" alt="${dogodek.Naslov}" class="img-fluid rounded mb-4 w-100" style="max-height: 450px; object-fit: cover;">

              <h2>O dogodku</h2>
              <div class="lead text-muted mb-4">
                ${dogodek.kratek_opis || dogodek.Kratek_opis || 'Kratek povzetek dogodka ni na voljo.'}
              </div>
              <p style="white-space: pre-line;">
                ${dogodek.opis || dogodek.dolg_opis || dogodek.Dolg_opis || 'Podrobnejši opis za ta dogodek trenutno ni na voljo.'}
              </p>

              <h3 class="mt-4">Kaj pričakovati</h3>
              <ul>
                <li>Lokacija dogodka: <strong>${polnaLokacija}</strong></li>
                <li>Skupno število mest: <strong>${sedezevSkupaj}</strong></li>
                <li>Trenutni status dogodka: <span class="badge bg-light text-dark border">${lepStatus}</span></li>
                <li>Prizorišče je dostopno obiskovalcem</li>
              </ul>

              <h3 class="mt-4">Organizator</h3>
              <div class="card p-3 mb-4">
                <div class="d-flex align-items-center gap-3">
                  <div class="profile-avatar" style="width: 60px; height: 60px; font-size: 1.2rem; display: flex; align-items: center; justify-content: center; background-color: #0d6efd; color: white; border-radius: 50%;">
                    ${orgIniciali}
                  </div>
                  <div class="flex-grow-1">
                    <h5 class="mb-1">${orgIme}</h5>
                    <p class="mb-0 text-muted">
                      <i class="bi bi-patch-check-fill text-primary"></i> Preverjen organizator • 
                      Kontakt: ${dogodek.email || 'Ni na voljo'}
                    </p>
                  </div>
                  <button id="gumb-spremljaj" 
                          class="btn btn-outline-primary" 
                          data-org-id="${dogodek.TK_uporabnik_organizator}">
                    Spremljaj
                  </button>
                </div>
              </div>

              <div class="d-flex justify-content-between align-items-center mt-5 mb-3">
                <h3 class="mb-0">Ocene in komentarji</h3>
                <button id="gumb-odpri-oceno" class="btn btn-primary"><i class="bi bi-pencil"></i> Napiši oceno</button>
              </div>

              <div id="statistika-ocen-kontejner"></div>

              <div id="ocene-seznam-kontejner" class="d-flex flex-column gap-3 mb-3"></div>
              
              <div class="text-center my-4" id="nalozi-vec-kontejner">
                <button id="gumb-nalozi-vec" class="btn btn-outline-primary px-4">
                  Naloži več komentarjev
                </button>
              </div>
            </div>

            <aside class="col-lg-4">
              <div class="card p-4" style="position: sticky; top: 90px;">
                <div class="d-flex justify-content-between align-items-center mb-3">
                  <div>
                    <small class="text-muted">Cena</small>
                    <h2 class="event-price mb-0 ${cenaRazred}">${cenaIzpis}</h2>
                  </div>
                  <button class="event-fav" data-fav-id="${dogodek.ID_dogodek}" aria-label="Dodaj med priljubljene"><i class="bi bi-heart"></i></button>
                </div>

                <hr>

                <p class="mb-2"><i class="bi bi-calendar-event text-primary"></i> <strong>${danVTednu.toUpperCase()}, ${dan}. ${mesecKratica}. ${leto}</strong></p>
                <p class="mb-2"><i class="bi bi-clock text-primary"></i> Začetek ob ${ura}</p>
                <p class="mb-2"><i class="bi bi-geo-alt text-primary"></i> ${polnaLokacija}</p>
                <p class="mb-2"><i class="bi bi-people text-primary"></i> <span class="text-success">${sedezevProstih}</span></p>
                <p class="mb-3"><i class="bi bi-telephone text-primary"></i> ${dogodek.telefon || 'Ni kontakta'}</p>

                <button class="btn btn-primary btn-lg w-100 mb-2" data-id="${dogodek.ID_dogodek}">
                  <i class="bi bi-ticket-perforated"></i> Rezerviraj vstopnico
                </button>
                <button class="btn btn-outline-primary w-100">
                  <i class="bi bi-share"></i> Deli
                </button>

                <hr>
                <small class="text-muted">
                  <i class="bi bi-shield-check text-success"></i> Ob rezervaciji prejmete opomnik na e-naslov.
                </small>
              </div>
            </aside>
          </div>
        </div>
      </section>

      <div class="modal fade" id="modalOcena" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content border-0 shadow-lg" style="border-radius: 16px;">
            <div class="modal-header border-bottom-0 pb-0 pt-4 px-4">
              <h4 class="fw-bold text-dark mb-0">Napiši oceno</h4>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body p-4">
              <p class="text-muted small mb-4">Delite svojo izkušnjo z drugimi obiskovalci. Vaša ocena bo vidna takoj.</p>
              
              <form id="obrazec-ocena">
                <div class="mb-4 text-center p-3 bg-light rounded-3">
                  <label class="form-label d-block text-muted small fw-semibold uppercase mb-2">Vaša ocena</label>
                  <div class="vnos-zvezdic d-flex justify-content-center gap-2 fs-1">
                    <i class="bi bi-star tekst-vnos-zvezda text-muted" data-vrednost="1" style="cursor: pointer; transition: transform 0.2s, color 0.1s;"></i>
                    <i class="bi bi-star tekst-vnos-zvezda text-muted" data-vrednost="2" style="cursor: pointer; transition: transform 0.2s, color 0.1s;"></i>
                    <i class="bi bi-star tekst-vnos-zvezda text-muted" data-vrednost="3" style="cursor: pointer; transition: transform 0.2s, color 0.1s;"></i>
                    <i class="bi bi-star tekst-vnos-zvezda text-muted" data-vrednost="4" style="cursor: pointer; transition: transform 0.2s, color 0.1s;"></i>
                    <i class="bi bi-star tekst-vnos-zvezda text-muted" data-vrednost="5" style="cursor: pointer; transition: transform 0.2s, color 0.1s;"></i>
                  </div>
                </div>

                <div class="form-floating mb-4">
                  <textarea class="form-control" id="komentar-tekst" style="height: 120px; border-radius: 10px; resize: none;" placeholder="Napišite komentar..."></textarea>
                  <label for="komentar-tekst" class="text-muted">Vaše mnenje (neobvezno)</label>
                </div>

                <div class="d-flex gap-2 justify-content-end border-top-0 pt-2">
                  <button type="button" class="btn btn-light px-4 fw-semibold text-secondary" style="border-radius: 10px;" data-bs-dismiss="modal">Prekliči</button>
                  <button type="submit" class="btn btn-primary px-4 fw-semibold" style="border-radius: 10px;">Objavi oceno</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    `;

    const gumbSpremljaj = document.getElementById('gumb-spremljaj');
    const organizatorId = gumbSpremljaj.getAttribute('data-org-id');

    function osveziIzgledGumba(spremlja) {
      if (spremlja) {
        gumbSpremljaj.textContent = 'Spremljaš';
        gumbSpremljaj.className = 'btn btn-success';
      } else {
        gumbSpremljaj.textContent = 'Spremlaj';
        gumbSpremljaj.className = 'btn btn-outline-primary';
      }
    }

    if (organizatorId && organizatorId !== 'undefined' && organizatorId !== 'null') {
      try {
        const status = await apiFetch(`/organizatorji/${organizatorId}/spremlja`);
        osveziIzgledGumba(status.spremlja);
      } catch (err) {
        console.warn('Uporabnik verjetno ni prijavljen.');
      }

      gumbSpremljaj.addEventListener('click', async () => {
        try {
          const odgovor = await apiFetch(`/organizatorji/${organizatorId}/toggle-spremljaj`, { method: 'POST' });
          osveziIzgledGumba(odgovor.spremlja);
        } catch (err) {
          alert('Za spremljanje organizatorjev morate biti prijavljeni!');
        }
      });
    } else {
      gumbSpremljaj.style.display = 'none';
    }

    // --- LOGIKA ZA PRODUKTNI MODAL OCENJEVANJA ---
    const gumbNapisiOceno = document.getElementById('gumb-odpri-oceno');
    const bsModal = new bootstrap.Modal(document.getElementById('modalOcena'));

    if (gumbNapisiOceno) {
      gumbNapisiOceno.addEventListener('click', () => {
        izbranaOcena = 0;
        posodobiIzgledVnosaZvezdic(0);
        document.getElementById('obrazec-ocena').reset();
        bsModal.show();
      });
    }

    // Nastavitev interaktivnih dogodkov za zvezdice (Hover + Click)
    const zvezdiceZaKlik = document.querySelectorAll('.tekst-vnos-zvezda');
    zvezdiceZaKlik.forEach(zvezda => {
      // 1. KLIK: Trajno zaklene izbire
      zvezda.addEventListener('click', (e) => {
        izbranaOcena = parseInt(e.target.getAttribute('data-vrednost'));
        posodobiIzgledVnosaZvezdic(izbranaOcena);
      });

      // 2. HOVER (Mouseover): Začasno osvetli zvezdice in jih rahlo poveča
      zvezda.addEventListener('mouseover', (e) => {
        const zacasnaOcena = parseInt(e.target.getAttribute('data-vrednost'));
        posodobiIzgledVnosaZvezdic(zacasnaOcena);
        e.target.style.transform = 'scale(1.15)';
      });

      // Ko se miška umakne iz posamezne zvezdice, jo vrne v normalno velikost
      zvezda.addEventListener('mouseout', (e) => {
        e.target.style.transform = 'scale(1)';
      });
    });

    // 3. MOUSELEAVE (Celotni kontejner): Ko gre miška stran iz območja, vrnemo na zaklenjeno vrednost
    document.querySelector('.vnos-zvezdic').addEventListener('mouseleave', () => {
      posodobiIzgledVnosaZvezdic(izbranaOcena);
    });

    // Oddaja obrazca na strežnik
    const obrazec = document.getElementById('obrazec-ocena');
    obrazec.addEventListener('submit', async (e) => {
      e.preventDefault();

      if (izbranaOcena === 0) {
        alert('Prosimo, izberite oceno z zvezdicami (1-5).');
        return;
      }

      const komentar = document.getElementById('komentar-tekst').value;

      try {
        const odgovor = await apiFetch(`/dogodki/${dogodekIdGlobalno}/ocene`, {
          method: 'POST',
          body: JSON.stringify({
            ocena: izbranaOcena,
            komentar: komentar
          })
        });

        if (odgovor.uspeh) {
          bsModal.hide();
          window.location.reload();
        }
      } catch (err) {
        console.error('Napaka pri shranjevanju ocene:', err);
        alert('Za oddajo ocene morate biti prijavljeni!');
      }
    });

    await naloziOcene();

    document.getElementById('gumb-nalozi-vec').addEventListener('click', naloziOcene);

    await inicializirajPriljubljene();
    osveziSrckeNaStrani();

  } catch (err) {
    console.error('Napaka pri nalaganju podrobnosti:', err);
    kontejner.innerHTML = '<div class="container mt-5"><p class="alert alert-danger">Napaka pri nalaganju podatkov o dogodku.</p></div>';
  }
}

async function naloziOcene() {
  const kontejnerOcen = document.getElementById('ocene-seznam-kontejner');
  const gumbNaloziVec = document.getElementById('gumb-nalozi-vec');
  const kontejnerStatistike = document.getElementById('statistika-ocen-kontejner');

  try {
    const podaci = await apiFetch(`/dogodki/${dogodekIdGlobalno}/ocene?page=${trenutnaStran}&limit=${LIMIT_OCEN}`);
    
    const ocene = podaci.ocene || [];
    const imaSeOcen = podaci.imaSe;
    const stat = podaci.statistika; 

    if (trenutnaStran === 1 && stat) {
      if (stat.skupnoOcen === 0) {
        kontejnerStatistike.innerHTML = ''; 
      } else {
        const zvezdiceHtml = generirajZvezdice(Math.round(stat.povprecje));
        
        const besedaOcena = stat.skupnoOcen === 1 ? 'ocena' : stat.skupnoOcen === 2 ? 'oceni' : stat.skupnoOcen < 5 ? 'ocene' : 'ocen';

        kontejnerStatistike.innerHTML = `
          <div class="card p-3 mb-4">
            <div class="row align-items-center">
              <div class="col-md-4 text-center border-end">
                <h1 class="mb-0">${stat.povprecje}</h1>
                <div class="text-warning mb-1">
                  ${zvezdiceHtml}
                </div>
                <small class="text-muted">${stat.skupnoOcen} ${besedaOcena}</small>
              </div>
              <div class="col-md-8">
                ${[5, 4, 3, 2, 1].map(zvezda => `
                  <div class="d-flex align-items-center mb-1">
                    <span class="me-2" style="width: 15px;">${zvezda}</span>
                    <div class="progress flex-grow-1" style="height: 8px;">
                      <div class="progress-bar bg-warning" role="progressbar" style="width: ${stat.procenti[zvezda]}%;" aria-valuenow="${stat.procenti[zvezda]}" aria-valuemin="0" aria-valuemax="100"></div>
                    </div>
                    <small class="ms-2" style="width: 45px; text-align: right;">${stat.procenti[zvezda]}%</small>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>
        `;
      }
    }

    if (ocene.length === 0 && trenutnaStran === 1) {
      kontejnerOcen.innerHTML = '<p class="text-muted text-center my-3">Ta dogodek še nima ocen. Bodi prvi!</p>';
      document.getElementById('nalozi-vec-kontejner').style.display = 'none';
      return;
    }

    ocene.forEach(o => {
      const datumO = new Date(o.datum_objave || o.datum).toLocaleDateString('sl-SI');
      const uporabnikIme = o.ime_uporabnika ? `${o.ime.trim()} ${o.priimek[0]}.` : (o.ime || 'Obiskovalec');
      const komentarTekst = o.komentar ? o.komentar.trim() : '<em class="text-muted">Uporabnik ni dodal komentarja.</em>';

      const ocenaCard = document.createElement('div');
      ocenaCard.className = 'card p-3 border-light shadow-sm mb-3';
      ocenaCard.innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-2">
          <div class="d-flex align-items-center gap-2">
            <strong class="text-dark">${uporabnikIme}</strong>
            <span class="text-xs text-muted">• ${datumO}</span>
          </div>
          <div class="text-sm">
            ${generirajZvezdice(o.ocena)}
          </div>
        </div>
        <p class="mb-0 text-secondary" style="font-size: 0.95rem;">${komentarTekst}</p>
      `;
      kontejnerOcen.appendChild(ocenaCard);
    });

    if (!imaSeOcen || ocene.length < LIMIT_OCEN) {
      document.getElementById('nalozi-vec-kontejner').style.display = 'none';
    } else {
      trenutnaStran++; 
    }

  } catch (err) {
    console.error('Napaka pri pridobivanju ocen:', err);
    if (trenutnaStran === 1) {
       kontejnerOcen.innerHTML = '<p class="text-danger text-center">Ni bilo mogoče naložiti komentarjev.</p>';
    }
  }
}