const API_URL = 'http://localhost:3001/api';

export const Auth = {
  prijavi(token, uporabnik) {
    localStorage.setItem('token', token);
    localStorage.setItem('uporabnik', JSON.stringify(uporabnik));
  },

  odjavi() {
    localStorage.removeItem('token');
    localStorage.removeItem('uporabnik');
  },

  getToken() {
    return localStorage.getItem('token');
  },

  getUporabnik() {
    const raw = localStorage.getItem('uporabnik');
    return raw ? JSON.parse(raw) : null;
  },

  jePrijavljen() {
    return !!this.getToken();
  },
};

export async function apiFetch(pot, opcije = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...opcije.headers,
  };

  const token = Auth.getToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const odgovor = await fetch(`${API_URL}${pot}`, {
    ...opcije,
    headers,
  });

  const podatki = await odgovor.json().catch(() => ({}));

  if (!odgovor.ok) {
    const sporocilo = podatki.napaka || 'Napaka pri komunikaciji s strežnikom.';
    const podrobnosti = podatki.podrobnosti || [];
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
