import { apiFetch } from './auth.js';

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('dogodki-kontejner')) {
    naloziVseDogodke();
  }
  
  if (document.getElementById('najboljši-dogodki-kontejner')) {
    naloziNajboljseDogodke();
  }
});

async function naloziVseDogodke() {
  const kontejner = document.getElementById('dogodki-kontejner');
  
  try {
    const dogodki = await apiFetch('/dogodki');
    
    if (dogodki.length === 0) {
      kontejner.innerHTML = '<p class="text-center w-100">Trenutno ni nobenih aktivnih dogodkov.</p>';
      return;
    }

    kontejner.innerHTML = '';

    dogodki.forEach(dogodek => {
      const d = new Date(dogodek.datum_zacetka);
      const dan = d.getDate();
      const mesec = d.toLocaleString('sl-SI', { month: 'short' }).toUpperCase().replace('.', '').trim();
      const ura = d.toLocaleTimeString('sl-SI', { hour: '2-digit', minute: '2-digit' });

      const slikaUrl = dogodek.slika || 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&q=80';
      const cenaIzpis = parseFloat(dogodek.cena) > 0 ? `${parseFloat(dogodek.cena).toFixed(0)} €` : 'Brezplačno';

      const stolpec = document.createElement('div');
      stolpec.className = 'col-md-6 mb-4'; // 2 kartici vzporedno
      
      stolpec.innerHTML = `
        <div class="event-card">
          <div class="event-card-img">
            <img src="${slikaUrl}" alt="${dogodek.Naslov}">
            <div class="event-date">
              <span class="day">${dan}</span>
              <span class="month">${mesec}</span>
            </div>
            <span class="event-cat-tag">${dogodek.kategorija || 'Dogodek'}</span>
          </div>
          <div class="event-card-body">
            <div class="event-meta">
              <i class="bi bi-geo-alt"></i>${dogodek.kraj || 'Neznano'}
              <span class="ms-2"><i class="bi bi-clock"></i>${ura}</span>
            </div>
            <h5><a href="dogodek.html?id=${dogodek.ID_dogodek}">${dogodek.Naslov}</a></h5>
            <p class="event-card-desc">${dogodek.opis || ''}</p>
            <div class="d-flex justify-content-between align-items-center mt-2">
              <span class="event-price">${cenaIzpis}</span>
              <button class="event-fav" data-id="${dogodek.ID_dogodek}"><i class="bi bi-heart"></i></button>
            </div>
          </div>
        </div>
      `;
      kontejner.appendChild(stolpec);
    });
  } catch (err) {
    console.error('Napaka pri prikazovanju vseh dogodkov:', err);
    kontejner.innerHTML = '<p class="text-center text-danger w-100">Ni bilo mogoče naložiti dogodkov.</p>';
  }
}

async function naloziNajboljseDogodke() {
  const kontejner = document.getElementById('najboljši-dogodki-kontejner');
  
  try {
    const dogodki = await apiFetch('/dogodki/najboljsi');
    
    if (dogodki.length === 0) {
      kontejner.innerHTML = '<p class="text-center w-100">Ta mesec ni izpostavljenih dogodkov.</p>';
      return;
    }

    kontejner.innerHTML = '';

    dogodki.forEach(dogodek => {
      const d = new Date(dogodek.datum_zacetka);
      const dan = String(d.getDate()).padStart(2, '0'); // Doda nulo spredaj (npr. 05)
      const mesec = d.toLocaleString('sl-SI', { month: 'short' }).toUpperCase().replace('.', '').trim();
      const ura = d.toLocaleTimeString('sl-SI', { hour: '2-digit', minute: '2-digit' });

      const slikaUrl = dogodek.slika || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&q=80';
      
      // Dinamična obdelava cene s klaso 'free', ki jo imaš v HTML predlogi
      const cenaHTML = parseFloat(dogodek.cena) > 0 
        ? `<span class="event-price">${parseFloat(dogodek.cena).toFixed(0)} €</span>`
        : `<span class="event-price free">Brezplačno</span>`;

      const stolpec = document.createElement('div');
      stolpec.className = 'col-md-6 col-lg-4'; // 3 kartice vzporedno
      
      stolpec.innerHTML = `
        <div class="event-card">
          <div class="event-card-img">
            <img src="${slikaUrl}" alt="${dogodek.Naslov}">
            <div class="event-date">
              <span class="day">${dan}</span>
              <span class="month">${mesec}</span>
            </div>
            <span class="event-cat-tag">${dogodek.kategorija || 'Dogodek'}</span>
          </div>
          <div class="event-card-body">
            <div class="event-meta">
              <i class="bi bi-geo-alt"></i>${dogodek.kraj || 'Neznano'}
              <span class="ms-2"><i class="bi bi-clock"></i>${ura}</span>
            </div>
            <h5><a href="dogodek.html?id=${dogodek.ID_dogodek}">${dogodek.Naslov}</a></h5>
            <p class="event-card-desc">${dogodek.opis || ''}</p>
            <div class="d-flex justify-content-between align-items-center mt-2">
              ${cenaHTML}
              <button class="event-fav" data-id="${dogodek.ID_dogodek}"><i class="bi bi-heart"></i></button>
            </div>
          </div>
        </div>
      `;
      kontejner.appendChild(stolpec);
    });
  } catch (err) {
    console.error('Napaka pri prikazovanju najboljših dogodkov:', err);
    kontejner.innerHTML = '<p class="text-center text-danger w-100">Ni bilo mogoče naložiti najboljših dogodkov.</p>';
  }
}