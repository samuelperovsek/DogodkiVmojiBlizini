const API_URL = 'http://localhost:3001/api';

export const Auth = {
  prijavi(token, uporabnik, zapomni = true) {
    const store = zapomni ? localStorage : sessionStorage;
    const drugi = zapomni ? sessionStorage : localStorage;

    drugi.removeItem('token');
    drugi.removeItem('uporabnik');

    store.setItem('token', token);
    store.setItem('uporabnik', JSON.stringify(uporabnik));
  },

  odjavi() {
    localStorage.removeItem('token');
    localStorage.removeItem('uporabnik');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('uporabnik');
  },

  osveziUporabnika(uporabnik) {
    const store = sessionStorage.getItem('token') ? sessionStorage : localStorage;
    store.setItem('uporabnik', JSON.stringify(uporabnik));
  },

  getToken() {
    return sessionStorage.getItem('token') || localStorage.getItem('token');
  },

  getUporabnik() {
    const raw = sessionStorage.getItem('uporabnik') || localStorage.getItem('uporabnik');
    return raw ? JSON.parse(raw) : null;
  },

  jePrijavljen() {
    return !!this.getToken();
  },
};

const POTI_BREZ_REDIRECT = ['/me', '/prijava', '/registracija'];

export async function apiFetch(pot, opcije = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...opcije.headers,
  };

  const tokenPrePoslanja = Auth.getToken();
  if (tokenPrePoslanja) {
    headers.Authorization = `Bearer ${tokenPrePoslanja}`;
  }

  const odgovor = await fetch(`${API_URL}${pot}`, {
    ...opcije,
    headers,
  });

  const podatki = await odgovor.json().catch(() => ({}));

  if (!odgovor.ok) {
    const sporocilo = podatki.napaka || 'Napaka pri komunikaciji s strežnikom.';
    const podrobnosti = podatki.podrobnosti || [];

    if (odgovor.status === 401 && tokenPrePoslanja && !POTI_BREZ_REDIRECT.includes(pot)) {
      Auth.odjavi();
      const trenutna = location.pathname.split('/').pop() || 'index.html';
      if (window.pokaziToast) {
        window.pokaziToast('warning', 'Tvoja seja je potekla. Prijavi se znova.', 'Avtomatska odjava', 2200);
      }
      setTimeout(() => {
        location.replace(`prijava.html?razlog=potrebna-prijava&povratek=${encodeURIComponent(trenutna)}`);
      }, 1200);
    }

    throw new ApiError(sporocilo, odgovor.status, podrobnosti);
  }

  return podatki;
}

export class ApiError extends Error {
  constructor(sporocilo, status, podrobnosti = []) {
    super(sporocilo);
    this.status = status;
    this.podrobnosti = podrobnosti;
  }
}
