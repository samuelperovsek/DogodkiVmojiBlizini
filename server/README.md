# Backend — Dogodki v moji bližini

Node.js + Express + MySQL.

## Setup od nič

### 1. Predpogoji
- Node.js 18+
- MySQL (XAMPP, MAMP ali Docker container z imenom `mysql_dogodki`)

### 2. Ustvari bazo

V MySQL ustvari prazno bazo (ime po želji, npr. `dogodki_db`), nato uvozi celotno shemo iz (../docs/dogodki_v_moji_blizini.sql). SQL datoteka vsebuje:
- vse tabele (Uporabnik, Dogodek, Organizator, Prijava, Ocena_komentar, Priljubljeni_*, Prosnja_organizator, ...)
- foreign key constrainte
- začetne podatke (regije, kraji, kategorije, test uporabnike, demo dogodke)

```bash
mysql -u root -p tvoja_baza < ../docs/dogodki_v_moji_blizini.sql
```

### 3. Konfiguracija

```bash
cd server
cp .env.primer .env
```

V `.env` nastavi:
```
PORT=3001
DB_HOST=localhost
DB_USER=tvoj_user
DB_PASSWORD=tvoj_geslo
DB_NAME=ime_baze_iz_2_koraka
JWT_SECRET=<generiraj z: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))">
FRONTEND_ORIGIN=http://localhost:5500,http://127.0.0.1:5500
```

### 4. Namestitev knjižnic in zagon

```bash
npm install
npm run dev
```

Strežnik teče na `http://localhost:3001`.

### 5. Enkratno: hashiraj test gesla

Če dodamo novega uporabnika direktno v bazo in ne prek registracijske forme na spletni strani, moramo njegovo geslo najprej hashirati za varnost. Da se lahko prijavijo preko API-ja, jih moramo enkrat hashirati v bcrypt:

```bash
node scripts/hash-existing-passwords.js
```

## Test uporabniki (po hashiranju)

| Email | Geslo | Vloga |
| `admin@dogodki.si` | `varnoGeslo!` | admin |
| `janez@email.si` | `geslo123` | uporabnik |
| `maja.kovac@email.si` | `skritoGeslo1` | uporabnik |
| `luka.zupan@email.si` | `superVarno!` | uporabnik |

## API endpointi

### Avtentikacija
- `POST /api/registracija` — { ime, priimek, email, geslo } → { token, uporabnik }
- `POST /api/prijava` — { email, geslo } → { token, uporabnik }
- `GET /api/me` — vrne podatke trenutnega uporabnika (potreben token)

### Profil
- `PATCH /api/me` — { ime?, priimek?, email? }
- `POST /api/me/spremeni-geslo` — { staro_geslo, novo_geslo }
- `GET /api/me/dashboard` — prijave, priljubljeni, ocene, organizatorji
- `GET /api/me/prosnja-organizator` — moja prošnja
- `POST /api/me/prosnja-organizator` — odda prošnjo { naziv_podjetja, spletna_stran?, opis?, razlog }

### Admin (samo vloga `admin`)
- `GET /api/admin/uporabniki` — seznam vseh
- `PATCH /api/admin/uporabniki/:id/vloga` — { vloga }
- `GET /api/admin/prosnje` — vse prošnje (urejene: čakajoče prve)
- `PATCH /api/admin/prosnje/:id` — { status, opomba_admina? }

Vsi endpointi pod `/api/me/*` in `/api/admin/*` zahtevajo `Authorization: Bearer <token>`.

## HTTP status kode

| Koda | Pomen |
|---|---|
| 200 | OK |
| 201 | Ustvarjeno |
| 400 | Neveljavni podatki (validacija) |
| 401 | Manjka/neveljaven token ali napačno geslo |
| 403 | Premalo pravic (npr. ni admin) |
| 404 | Endpoint/zapis ne obstaja |
| 409 | Konflikt (npr. email že obstaja) |
| 500 | Napaka strežnika |

## Frontend

Frontend je v `client/`. Odpri `client/index.html` v VS Code z **Live Server** (port 5500). Ne odpiraj kot `file://` — CORS bo blokiral API klice.
