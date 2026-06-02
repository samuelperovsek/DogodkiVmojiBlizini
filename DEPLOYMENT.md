# Postavitev Eventli na produkcijski strežnik (DigitalOcean + Docker)

Ta vodič te po korakih pelje od praznega strežnika do delujoče spletne strani na `https://tvoja-domena`.

Arhitektura je **monolit v Dockerju** — vse na enem strežniku:

```
Internet
   │  (HTTPS, port 443)
   ▼
[ Caddy ]  ── samodejni HTTPS certifikat (Let's Encrypt)
   │  (notranje, port 3000)
   ▼
[ Node strežnik ]  ── serVira frontend (client/) + API (/api) + naložene slike (/uploads)
   │
   ▼
[ MySQL 8 ]  ── podatkovna baza
```

Tri trajne shrambe (volumes), ki preživijo restart in posodobitve:
- `eventli_db_data` — podatki v bazi
- `eventli_uploads` — naložene slike dogodkov
- `caddy_data` — HTTPS certifikati

---

## Kaj je že pripravljeno v kodi

Te spremembe so že narejene, da aplikacija deluje v produkciji:

- `client/js/auth.js` — `SERVER_URL` se samodejno preklopi: lokalno `http://localhost:3001`, na strežniku relativni URL-ji (isti origin)
- `server/server.js` — dodan `helmet` (varnostne glave), `express-rate-limit` na prijavnih endpointih (zaščita pred brute-force), `trust proxy` v produkciji
- `Dockerfile`, `docker-compose.prod.yml`, `Caddyfile` — postavitev
- `tailwind.css` se zdaj commita v git (prej je bil v `.gitignore`), da je frontend ostilan po `git clone`

> **Pomembno glede Tailwind:** če kdaj spremeniš Tailwind razrede v HTML, moraš lokalno znova prevesti `client/css/tailwind.css` in commitati spremembo, sicer se na strežniku ne bo poznala.

---

## Predpogoji (pred začetkom)

1. **GitHub repo** — projekt mora biti na GitHubu (lahko privaten). Strežnik ga bo prenesel z `git clone`.
2. **DigitalOcean račun** — z aktiviranim študentskim kreditom ($200).
3. **Domena** — npr. brezplačna `.me` iz GitHub Student Pack (Namecheap).
4. **Brevo račun** — brezplačen, za pošiljanje prave e-pošte (potrditve, opomniki). Registracija: `brevo.com`.

---

## Del A: Lokalni preizkus (priporočeno pred strežnikom)

Preizkusi produkcijsko postavitev na svojem računalniku, da veš, da deluje. Rabiš nameščen Docker Desktop.

1. V korenu projekta ustvari datoteko `.env` (kopiraj predlogo):
   ```bash
   cp .env.production.primer .env
   ```
2. Odpri `.env` in nastavi za lokalni test:
   ```
   DOMENA=localhost
   DB_PASSWORD=test1234
   JWT_SECRET=test_secret_dolg_niz
   FRONTEND_ORIGIN=http://localhost
   FRONTEND_URL=http://localhost
   ```
   (E-pošto lahko za zdaj pustiš prazno.)
3. Zaženi:
   ```bash
   docker compose -f docker-compose.prod.yml up --build
   ```
4. Odpri `http://localhost` v brskalniku.

> Na `localhost` Caddy ne dobi pravega HTTPS certifikata (uporabi lokalnega), brskalnik bo morda opozoril — to je pričakovano samo lokalno. Na pravi domeni bo certifikat veljaven.

Ko deluje, ustavi z `Ctrl+C` in `docker compose -f docker-compose.prod.yml down`.

---

## Del B: Ustvari strežnik (Droplet)

1. DigitalOcean → **Create → Droplets**
2. **Ubuntu 24.04 LTS**
3. Najmanjši plan (Basic, Regular, ~$6/mes — s kreditom več kot leto zastonj)
4. Regija: **Frankfurt** (najbližja Sloveniji)
5. Avtentikacija: **SSH ključ** (priporočeno). Če ga še nimaš:
   ```bash
   ssh-keygen -t ed25519
   ```
   in prilepi vsebino `~/.ssh/id_ed25519.pub` v DigitalOcean.
6. Ustvari droplet in si zapiši njegov **javni IP**.

Poveži se s strežnikom:
```bash
ssh root@TVOJ_IP
```

---

## Del C: Namesti Docker na strežnik

Na strežniku poženi:
```bash
apt update && apt upgrade -y
curl -fsSL https://get.docker.com | sh
```
Preveri:
```bash
docker --version
docker compose version
```

Vklopi požarni zid (pusti samo SSH + splet):
```bash
ufw allow OpenSSH
ufw allow 80
ufw allow 443
ufw --force enable
```

---

## Del D: Nastavi domeno (DNS)

Pri ponudniku domene (Namecheap) nastavi DNS zapisa, ki kažeta na IP strežnika:

| Tip | Host | Vrednost |
|-----|------|----------|
| A | @ | TVOJ_IP |
| A | www | TVOJ_IP |

Razširjanje DNS lahko traja od nekaj minut do nekaj ur. Preveriš z:
```bash
ping tvoja-domena
```
ko vrne tvoj IP, je DNS pripravljen (HTTPS certifikat brez tega ne bo deloval).

---

## Del E: Prenesi in nastavi projekt

Na strežniku:
```bash
cd /opt
git clone https://github.com/TVOJ_UPORABNIK/TVOJ_REPO.git eventli
cd eventli
```

Ustvari produkcijski `.env`:
```bash
cp .env.production.primer .env
nano .env
```

Nastavi prave vrednosti:
```
DOMENA=tvoja-domena
DB_NAME=dogodki
DB_PASSWORD=<dolgo nakljucno geslo>
JWT_SECRET=<dolgo nakljucno geslo>
JWT_EXPIRES_IN=7d
FRONTEND_ORIGIN=https://tvoja-domena
FRONTEND_URL=https://tvoja-domena
EMAIL_HOST=smtp-relay.brevo.com
EMAIL_PORT=587
EMAIL_USER=<iz Brevo SMTP>
EMAIL_PASS=<iz Brevo SMTP>
EMAIL_FROM=Eventli <info@tvoja-domena>
```

Za generiranje močnih nizov (poženi lokalno ali na strežniku):
```bash
openssl rand -hex 32
```

> `.env` je v `.gitignore` — skrivnosti se NIKOLI ne commitajo v git.

---

## Del F: Zaženi aplikacijo

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

Prvi zagon traja nekaj minut (build slike + MySQL inicializacija iz `init.sql`).

Preveri, da vse teče:
```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f app
```

Odpri `https://tvoja-domena` 🎉

---

## Del G: Po postavitvi

1. **Zamenjaj admin geslo** — `init.sql` ustvari admin računa s testnim geslom. Prijavi se in ga takoj spremeni (ali ga posodobi v bazi).
2. **Preizkusi e-pošto** — registriraj testni račun ali sproži "pozabljeno geslo" in preveri, da mail pride.
3. **Preizkusi nalaganje slike** — dodaj dogodek s sliko, nato restartaj app (`docker compose -f docker-compose.prod.yml restart app`) in preveri, da slika še obstaja (potrjuje, da volume deluje).

---

## Posodobitev aplikacije (kasneje)

Ko narediš spremembe in jih potisneš na GitHub:
```bash
cd /opt/eventli
git pull
docker compose -f docker-compose.prod.yml up -d --build
```
Podatki v bazi in naložene slike ostanejo (so v volumes).

---

## Brevo (e-pošta) — kako dobiti SMTP podatke

1. Registriraj se na `brevo.com` (brezplačno, 300 mailov/dan).
2. **Settings → SMTP & API → SMTP**.
3. Prepiši:
   - `EMAIL_HOST=smtp-relay.brevo.com`
   - `EMAIL_PORT=587`
   - `EMAIL_USER=` (prikazan login, ponavadi tvoj email)
   - `EMAIL_PASS=` (SMTP ključ, NE geslo računa)
4. Za boljšo dostavljivost lahko kasneje verificiraš domeno pošiljatelja v Brevo.

---

## Google prijava (OAuth) v produkciji

Projekt podpira prijavo z Googlom. Za produkcijo:

1. V **Google Cloud Console → APIs & Services → Credentials** odpri svoj OAuth 2.0 Client.
2. Pod **Authorized redirect URIs** dodaj produkcijski naslov:
   ```
   https://tvoja-domena/api/auth/google/callback
   ```
3. V `.env` na strežniku nastavi:
   ```
   GOOGLE_CLIENT_ID=<iz Google Console>
   GOOGLE_CLIENT_SECRET=<iz Google Console>
   GOOGLE_CALLBACK_URL=https://tvoja-domena/api/auth/google/callback
   ```

> Brez `GOOGLE_CLIENT_ID` in `GOOGLE_CLIENT_SECRET` se Google prijava ob zagonu ne inicializira pravilno — zato morata biti vedno nastavljena.

---

## Pogoste težave

| Težava | Rešitev |
|--------|---------|
| HTTPS ne deluje | DNS še ni razširjen ali porta 80/443 zaprta. Preveri `ufw status` in `ping domena`. |
| `app` se ne poveže z bazo | Prvi zagon — MySQL še inicializira. Počakaj, glej `logs db`. App počaka na `service_healthy`. |
| Slike izginejo po posodobitvi | Preveri, da je volume `eventli_uploads` priklopljen (`docker volume ls`). |
| Mail ne pride | Preveri Brevo SMTP podatke; preveri `logs app` za napake nodemailerja. |
| 502 / Bad Gateway | `app` container ne teče. Glej `docker compose ... logs app`. |
| Spremenil sem Tailwind, a stilov ni | Lokalno znova prevedi `tailwind.css`, commitaj, `git pull` + rebuild. |

---

## Uporabni ukazi

```bash
docker compose -f docker-compose.prod.yml ps          # stanje
docker compose -f docker-compose.prod.yml logs -f app  # logi aplikacije
docker compose -f docker-compose.prod.yml restart app  # restart aplikacije
docker compose -f docker-compose.prod.yml down          # ustavi vse
docker compose -f docker-compose.prod.yml down -v       # ustavi + IZBRIŠE podatke (pazljivo!)
```
