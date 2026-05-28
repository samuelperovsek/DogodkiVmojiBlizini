import { apiFetch, ApiError } from '../auth.js';
import { pokaziToast, pobegniHtml } from '../components.js';

function zapriOverlay(overlay) {
  overlay.classList.remove('show');
  setTimeout(() => overlay.remove(), 250);
}

function ustvariOverlay() {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay show';
  overlay.style.zIndex = '99999';
  return overlay;
}

async function odpriPromoviraj() {
  const overlay = ustvariOverlay();
  overlay.innerHTML = `
    <div class="modal-dialog" style="max-width: 640px; position: relative; z-index: 100000; pointer-events: auto !important;">
      <div class="modal-content" style="pointer-events: auto !important;">
        <div class="modal-header">
          <h3><i class="bi bi-star-fill text-warning"></i> Promoviraj dogodek</h3>
          <button type="button" class="modal-close" data-close>&times;</button>
        </div>
        <div class="modal-body" style="max-height: 60vh; overflow-y: auto;">
          <p class="text-muted mb-3" style="font-size: 0.92rem;">
            Izberi dogodek s seznama, da ga označiš kot <strong>promoviran</strong>. Promovirani dogodki so izpostavljeni na vstopni strani.
          </p>
          <div class="mb-3">
            <input type="search" class="form-control" placeholder="Išči po naslovu…" data-promoviraj-iskanje>
          </div>
          <div data-promoviraj-seznam>
            <div class="text-center text-muted py-4">Nalaganje dogodkov…</div>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-outline-primary" data-close>Zapri</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  overlay.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => zapriOverlay(overlay)));
  overlay.addEventListener('click', (e) => { if (e.target === overlay) zapriOverlay(overlay); });

  const seznamEl = overlay.querySelector('[data-promoviraj-seznam]');
  const iskanjeEl = overlay.querySelector('[data-promoviraj-iskanje]');

  let dogodki = [];

  try {
    const podatki = await apiFetch('/admin/dogodki');
    dogodki = (Array.isArray(podatki) ? podatki : []).filter(d =>
      ['aktiven', 'v_pregledu', 'v_pripravi'].includes(d.status)
    );
    izrisi(dogodki);
  } catch (err) {
    seznamEl.innerHTML = `<div class="alert alert-danger">${pobegniHtml(err.message || 'Napaka pri nalaganju.')}</div>`;
    return;
  }

  iskanjeEl.addEventListener('input', () => {
    const q = iskanjeEl.value.trim().toLowerCase();
    const filtrirani = q
      ? dogodki.filter(d => (d.Naslov || '').toLowerCase().includes(q))
      : dogodki;
    izrisi(filtrirani);
  });

  function izrisi(seznam) {
    if (!seznam.length) {
      seznamEl.innerHTML = '<div class="text-center text-muted py-4">Ni najdenih dogodkov.</div>';
      return;
    }

    seznamEl.innerHTML = seznam.map(d => {
      const datum = d.datum_zacetka
        ? new Date(d.datum_zacetka.replace(' ', 'T')).toLocaleDateString('sl-SI', { day: 'numeric', month: 'short', year: 'numeric' })
        : '—';
      const organizator = d.org_podjetje || (d.org_ime ? `${d.org_ime} ${d.org_priimek}` : '—');
      const status = d.status === 'promoviran' ? 'Že promoviran' : 'Promoviraj';
      const disabled = d.status === 'promoviran' ? 'disabled' : '';
      return `
        <div class="d-flex justify-content-between align-items-center p-3 mb-2 rounded" style="border: 1px solid var(--ink-200);">
          <div class="flex-grow-1 me-3" style="min-width: 0;">
            <div class="fw-semibold text-truncate">${pobegniHtml(d.Naslov || 'Brez naslova')}</div>
            <small class="text-muted d-block">${pobegniHtml(organizator)} • ${pobegniHtml(d.kategorija_naziv || 'Brez kategorije')} • ${datum}</small>
          </div>
          <button class="btn btn-sm btn-warning flex-shrink-0" data-promoviraj-id="${Number(d.ID_dogodek)}" ${disabled}>
            <i class="bi bi-star-fill"></i> ${status}
          </button>
        </div>
      `;
    }).join('');

    seznamEl.querySelectorAll('[data-promoviraj-id]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = Number(btn.getAttribute('data-promoviraj-id'));
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Promoviram…';
        try {
          await apiFetch(`/admin/dogodki/${id}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status: 'promoviran' }),
          });
          pokaziToast('success', 'Dogodek je zdaj promoviran.', 'Uspešno');
          zapriOverlay(overlay);
        } catch (err) {
          btn.disabled = false;
          btn.innerHTML = '<i class="bi bi-star-fill"></i> Promoviraj';
          pokaziToast('danger', err instanceof ApiError ? err.message : 'Napaka pri promociji.', 'Napaka');
        }
      });
    });
  }
}

function odpriObvestiloVsem() {
  const overlay = ustvariOverlay();
  overlay.innerHTML = `
    <div class="modal-dialog" style="max-width: 540px; position: relative; z-index: 100000; pointer-events: auto !important;">
      <div class="modal-content" style="pointer-events: auto !important;">
        <div class="modal-header">
          <h3><i class="bi bi-megaphone text-primary"></i> Obvestilo vsem</h3>
          <button type="button" class="modal-close" data-close>&times;</button>
        </div>
        <div class="modal-body">
          <p class="text-muted mb-3" style="font-size: 0.92rem;">
            Sporočilo bo poslano kot obvestilo <strong>vsem uporabnikom platforme</strong>.
          </p>
          <label class="form-label" for="obvestilo-vsem-text">Sporočilo</label>
          <textarea
            id="obvestilo-vsem-text"
            class="form-control"
            rows="4"
            maxlength="500"
            placeholder="npr. Jutri od 14:00 do 16:00 bo platforma nedosegljiva zaradi vzdrževanja."
          ></textarea>
          <div class="d-flex justify-content-between align-items-center mt-2">
            <small class="text-muted">Največ 500 znakov.</small>
            <small class="text-muted"><span data-obvestilo-stevec>0</span>/500</small>
          </div>
          <div class="mt-3">
            <label class="form-label" for="obvestilo-vsem-povezava">Povezava (neobvezno)</label>
            <input
              type="text"
              id="obvestilo-vsem-povezava"
              class="form-control"
              maxlength="255"
              placeholder="npr. dogodki.html ali https://…"
            >
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-outline-primary" data-close>Prekliči</button>
          <button type="button" class="btn btn-primary" data-poslji>
            <i class="bi bi-send-fill"></i> Pošlji vsem
          </button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  overlay.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => zapriOverlay(overlay)));
  overlay.addEventListener('click', (e) => { if (e.target === overlay) zapriOverlay(overlay); });

  const textareaEl = overlay.querySelector('#obvestilo-vsem-text');
  const povezavaEl = overlay.querySelector('#obvestilo-vsem-povezava');
  const stevecEl = overlay.querySelector('[data-obvestilo-stevec]');
  const posljiEl = overlay.querySelector('[data-poslji]');

  textareaEl.addEventListener('input', () => {
    stevecEl.textContent = textareaEl.value.length;
  });
  textareaEl.focus();

  posljiEl.addEventListener('click', async () => {
    const sporocilo = textareaEl.value.trim();
    const povezava = povezavaEl.value.trim();

    if (!sporocilo) {
      pokaziToast('warning', 'Vnesi sporočilo.', 'Manjka vsebina');
      textareaEl.focus();
      return;
    }

    posljiEl.disabled = true;
    posljiEl.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Pošiljam…';

    try {
      const odgovor = await apiFetch('/admin/obvestilo-vsem', {
        method: 'POST',
        body: JSON.stringify({ sporocilo, povezava: povezava || undefined }),
      });
      pokaziToast('success', odgovor.sporocilo, 'Poslano');
      zapriOverlay(overlay);
    } catch (err) {
      posljiEl.disabled = false;
      posljiEl.innerHTML = '<i class="bi bi-send-fill"></i> Pošlji vsem';
      pokaziToast('danger', err instanceof ApiError ? err.message : 'Napaka pri pošiljanju.', 'Napaka');
    }
  });
}

export function pripraviHitraDejanjaHandlerje() {
  document.querySelector('[data-hitra-promoviraj]')?.addEventListener('click', odpriPromoviraj);
  document.querySelector('[data-hitra-obvestilo]')?.addEventListener('click', odpriObvestiloVsem);
}
