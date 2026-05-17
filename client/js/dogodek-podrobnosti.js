import { apiFetch } from './auth.js';

document.addEventListener('DOMContentLoaded', naloziPodrobnostiDogodka);

async function naloziPodrobnostiDogodka() {
  const kontejner = document.getElementById('podrobnosti-dogodka-kontejner');
  
  const urlParams = new URLSearchParams(window.location.search);
  const dogodekId = urlParams.get('id');

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

    const slikaUrl = dogodek.slika || 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=1200&q=80';
    const cenaIzpis = parseFloat(dogodek.cena) > 0 ? `${parseFloat(dogodek.cena).toFixed(0)} €` : 'Brezplačno';
    const cenaRazred = parseFloat(dogodek.cena) > 0 ? '' : 'free';

    // Ime organizatorja (če obstaja v bazi)
    const orgIme = dogodek.organizator_ime ? `${dogodek.organizator_ime} ${dogodek.organizator_priimek}` : 'Neznan organizator';
    const orgIniciali = dogodek.organizator_ime ? `${dogodek.organizator_ime[0]}${dogodek.organizator_priimek[0]}`.toUpperCase() : 'ORG';

    // 5. Generiranje celotne HTML strukture
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
            <span class="inline-flex items-center gap-2"><i class="bi bi-geo-alt"></i> ${dogodek.kraj || 'Neznano'}, ${dogodek.ulica || ''}</span>
            <span class="inline-flex items-center gap-2"><i class="bi bi-star-fill text-yellow-300"></i> 4.8 <span class="text-white/70">(Podatki baze)</span></span>
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
                ${dogodek.opis ? dogodek.opis.split('.')[0] + '.' : 'Ni opisa dogodka.'}
              </div>
              <p>
                ${dogodek.opis || ''}
              </p>

              <h3 class="mt-4">Kaj pričakovati</h3>
              <ul>
                <li>Lokacija dogodka poteka na naslovu: ${dogodek.ulica}, ${dogodek.kraj || ''}</li>
                <li>Število vseh sedežev/mest: ${dogodek.st_sedezov || 'Ni podatka'}</li>
                <li>Trenutno status dogodka: <strong>${dogodek.status}</strong></li>
                <li>Prizorišče je dostopno obiskovalcem</li>
              </ul>

              <h3 class="mt-4">Organizator</h3>
              <div class="card p-3 mb-4">
                <div class="d-flex align-items-center gap-3">
                  <div class="profile-avatar" style="width: 60px; height: 60px; font-size: 1.2rem; display: flex; align-items: center; justify-content: center; background-color: #0d6efd; color: white; rounded-circle: true; border-radius: 50%;">
                    ${orgIniciali}
                  </div>
                  <div class="flex-grow-1">
                    <h5 class="mb-1">${orgIme}</h5>
                    <p class="mb-0 text-muted">
                      <i class="bi bi-patch-check-fill text-primary"></i> Preverjen organizator • 
                      Kontakt: ${dogodek.email || 'Ni e-maila'}
                    </p>
                  </div>
                  <button class="btn btn-outline-primary">Spremljaj</button>
                </div>
              </div>

              <div class="d-flex justify-content-between align-items-center mt-5 mb-3">
                <h3 class="mb-0">Ocene in komentarji</h3>
                <button class="btn btn-primary"><i class="bi bi-pencil"></i> Napiši oceno</button>
              </div>

              <div class="card p-3 mb-4">
                <div class="row align-items-center">
                  <div class="col-md-4 text-center border-end">
                    <h1 class="mb-0">4.8</h1>
                    <div class="text-warning">
                      <i class="bi bi-star-fill"></i><i class="bi bi-star-fill"></i><i class="bi bi-star-fill"></i><i class="bi bi-star-fill"></i><i class="bi bi-star-half"></i>
                    </div>
                    <small class="text-muted">Ocene obiskovalcev</small>
                  </div>
                  <div class="col-md-8">
                    <div class="d-flex align-items-center mb-1"><span class="me-2">5</span><div class="progress flex-grow-1" style="height: 8px;"><div class="progress-bar bg-warning" style="width: 78%;"></div></div><small class="ms-2">78%</small></div>
                    <div class="d-flex align-items-center mb-1"><span class="me-2">4</span><div class="progress flex-grow-1" style="height: 8px;"><div class="progress-bar bg-warning" style="width: 15%;"></div></div><small class="ms-2">15%</small></div>
                  </div>
                </div>
              </div>
            </div>

            <aside class="col-lg-4">
              <div class="card p-4" style="position: sticky; top: 90px;">
                <div class="d-flex justify-content-between align-items-center mb-3">
                  <div>
                    <small class="text-muted">Cena</small>
                    <h2 class="event-price mb-0 ${cenaRazred}">${cenaIzpis}</h2>
                  </div>
                  <button class="btn btn-outline-primary"><i class="bi bi-heart"></i></button>
                </div>

                <hr>

                <p class="mb-2"><i class="bi bi-calendar-event text-primary"></i> <strong>${danVTednu.toUpperCase()}, ${dan}. ${mesecKratica}. ${leto}</strong></p>
                <p class="mb-2"><i class="bi bi-clock text-primary"></i> Začetek ob ${ura}</p>
                <p class="mb-2"><i class="bi bi-geo-alt text-primary"></i> ${dogodek.ulica}, ${dogodek.kraj || ''}</p>
                <p class="mb-2"><i class="bi bi-people text-primary"></i> <span class="text-success">${dogodek.st_prostih_sedezov} / ${dogodek.st_sedezov} prostih mest</span></p>
                <p class="mb-3"><i class="bi bi-telephone text-primary"></i> ${dogodek.telefon || 'Ni telefona'}</p>

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
    `;

  } catch (err) {
    console.error('Napaka pri nalaganju podrobnosti:', err);
    kontejner.innerHTML = '<div class="container mt-5"><p class="alert alert-danger">Napaka pri nalaganju podatkov o dogodku.</p></div>';
  }
}