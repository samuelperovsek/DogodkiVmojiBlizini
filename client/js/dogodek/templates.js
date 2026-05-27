import { pobegniHtml } from '../components.js';

export function generirajPodrobnostiHtml(dogodek, p) {
  const naslov = pobegniHtml(dogodek.Naslov);
  const kategorija = pobegniHtml(dogodek.kategorija || 'Dogodek');
  const lokacija = pobegniHtml(p.polnaLokacija);
  const kratekOpis = pobegniHtml(dogodek.kratek_opis || dogodek.Kratek_opis || 'Kratek povzetek dogodka ni na voljo.');
  const dolgOpis = pobegniHtml(dogodek.opis || dogodek.dolg_opis || dogodek.Dolg_opis || 'Podrobnejši opis za ta dogodek trenutno ni na voljo.');
  const orgIme = pobegniHtml(p.orgIme);
  const orgIniciali = pobegniHtml(p.orgIniciali);
  const email = pobegniHtml(dogodek.email || 'Ni na voljo');
  const telefon = pobegniHtml(dogodek.telefon || 'Ni kontakta');
  const lepStatus = pobegniHtml(p.lepStatus);

  return `
    <header class="page-header">
      <div class="container">
        <nav aria-label="breadcrumb">
          <ol class="breadcrumb">
            <li class="breadcrumb-item"><a href="index.html">Domov</a></li>
            <li class="breadcrumb-item"><a href="dogodki.html">Dogodki</a></li>
            <li class="breadcrumb-item active" aria-current="page">${naslov}</li>
          </ol>
        </nav>
        <span class="inline-flex items-center gap-1 px-3 py-1 mb-2 rounded-full bg-yellow-400/90 text-yellow-900 text-xs font-bold uppercase tracking-wider">
          <i class="bi bi-tag-fill"></i> ${kategorija}
        </span>
        <h1>${naslov}</h1>
        <div class="flex flex-wrap items-center gap-x-4 gap-y-2 mt-2 text-white/90">
          <span class="inline-flex items-center gap-2"><i class="bi bi-calendar-event"></i> ${p.dan}. ${p.mesecPolno} ${p.leto}, ${p.ura}</span>
          <span class="inline-flex items-center gap-2"><i class="bi bi-geo-alt"></i> ${lokacija}</span>
          <span class="inline-flex items-center gap-2" id="dinamicna-ocena-header">
            <i class="bi bi-spinner spinner-border spinner-border-sm text-white/50"></i> 
            <span class="text-white/70">Nalagam oceno...</span>
          </span>
        </div>
      </div>
    </header>

    <section class="section-padding">
      <div class="container">
        <div class="row g-4">
          <div class="col-lg-8">
            <img src="${pobegniHtml(p.slikaUrl)}" alt="${naslov}" class="img-fluid rounded mb-4 w-100" style="max-height: 450px; object-fit: cover;">

            <h2>O dogodku</h2>
            <div class="lead text-muted mb-4">
              ${kratekOpis}
            </div>
            <p style="white-space: pre-line;">
              ${dolgOpis}
            </p>

            <h3 class="mt-4">Kaj pričakovati</h3>
            <ul>
              <li>Lokacija dogodka: <strong>${lokacija}</strong></li>
              <li>Skupno število mest: <strong>${p.sedezevSkupaj}</strong></li>
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
                    Kontakt: ${email}
                  </p>
                </div>
                <button id="gumb-spremljaj"
                        class="btn btn-outline-primary"
                        data-org-id="${Number(dogodek.TK_uporabnik_organizator) || ''}">
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
                  <h2 class="event-price mb-0 ${p.cenaRazred}">${p.cenaIzpis}</h2>
                </div>
                <button class="event-fav" data-fav-id="${Number(dogodek.ID_dogodek)}" aria-label="Dodaj med priljubljene"><i class="bi bi-heart"></i></button>
              </div>

              <hr>

              <p class="mb-2"><i class="bi bi-calendar-event text-primary"></i> <strong>${p.danVTednu.toUpperCase()}, ${p.dan}. ${p.mesecKratica}. ${p.leto}</strong></p>
              <p class="mb-2"><i class="bi bi-clock text-primary"></i> Začetek ob ${p.ura}</p>
              <p class="mb-2"><i class="bi bi-geo-alt text-primary"></i> ${lokacija}</p>
              <p class="mb-2"><i class="bi bi-people text-primary"></i> <span class="text-success">${pobegniHtml(p.sedezevProstih)}</span></p>
              <p class="mb-3"><i class="bi bi-telephone text-primary"></i> ${telefon}</p>

              <button id="gumb-rezervacija" class="btn btn-primary btn-lg w-100 mb-2" data-id="${Number(dogodek.ID_dogodek)}">
                <i class="bi bi-ticket-perforated"></i> Rezerviraj vstopnico
              </button>
              <button id="gumb-deli-dogodek" class="btn btn-outline-primary w-100" data-naslov="${naslov}">
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
}
