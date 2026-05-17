# Backend — Dogodki v moji bližini

Node.js + Express + MySQL.
Pred zagonom

1. Namesti Node.js
2. Zaženi MySQL (XAMPP ali Docker)
3. Ustvari bazo `dogodki` in v njej shemo iz [docs/dogodki_v_moji_blizini.sql]
4. Kopiraj nastavitve:
   cp .env.example .env
   
   Nato uredi `.env` — vpiši svoje MySQL geslo.

bash
cd server
npm install
npm run dev
# ali
npm start

Strežnik teče na `http://localhost:3000`.

Originalni SQL ima uporabnike z navadnimi gesli (`geslo123`, ...).
Da se lahko prijavijo, jih moramo enkrat hashirati:

bash
node scripts/hash-existing-passwords.js

Po tem se test uporabniki lahko prijavijo z originalnimi gesli (npr. `janez@email.si` / `geslo123`).


`POST /api/registracija`
Body:
json
{
  "ime": "Samuel",
  "priimek": "Perovšek",
  "email": "samuel@email.si",
  "geslo": "MojeGeslo1"
}

Odgovor (201):
json
{
  "sporocilo": "Račun uspešno ustvarjen.",
  "token": "eyJhbGc...",
  "uporabnik": { "id": 5, "ime": "Samuel", ... }
}

### `POST /api/prijava`
Body:
json
{
  "email": "samuel@email.si",
  "geslo": "MojeGeslo1"
}
Odgovor (200):enak kot pri registraciji.

`GET /api/me`
Zahteva `Authorization: Bearer <token>` header.

Odgovor (200):
json
{
  "uporabnik": {
    "id": 5,
    "ime": "Samuel",
    "priimek": "Perovšek",
    "email": "samuel@email.si",
    "vloga": "uporabnik",
    "datum_registracije": "2026-05-16T..."
  }
}

HTTP status kode:

| Koda | Pomen |
| 200 | OK |
| 201 | Ustvarjeno |
| 400 | Neveljavni podatki (validacija) |
| 401 | Manjka/neveljaven token, napačno geslo |
| 403 | Premalo pravic (npr. ni admin) |
| 404 | Endpoint ne obstaja |
| 409 | Konflikt (npr. email že obstaja) |
| 500 | Napaka strežnika |
