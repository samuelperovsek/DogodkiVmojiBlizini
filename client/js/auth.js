export const SERVER_URL = 'http://localhost:3001';
const API_URL = `${SERVER_URL}/api`;

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

const METODE_S_SPREMEMBO = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);
const POTI_BREZ_DOGODKA = ['/obvestila', '/me'];

export async function apiFetch(pot, opcije = {}) {
  const jeFormData = opcije.body instanceof FormData;

  const headers = {
    ...(jeFormData ? {} : { 'Content-Type': 'application/json' }),
    ...opcije.headers,
  };

  const tokenPrePoslanja = Auth.getToken();
  if (tokenPrePoslanja) {
    headers.Authorization = `Bearer ${tokenPrePoslanja}`;
  }

  const metoda = (opcije.method || 'GET').toUpperCase();

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

  if (METODE_S_SPREMEMBO.has(metoda) && !POTI_BREZ_DOGODKA.some(p => pot.startsWith(p))) {
    document.dispatchEvent(new CustomEvent('app:akcija', {
      detail: { pot, metoda, odgovor: podatki },
    }));
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
