# Eventli

Spletna platforma za odkrivanje in objavljanje dogodkov v tvoji okolici — koncerti, delavnice, šport in več. Uporabniki najdejo dogodke in se prijavijo nanje, sledijo organizatorjem ter ocenjujejo obiskane dogodke; organizatorji objavljajo in upravljajo svoje dogodke; administratorji moderirajo vsebino.

🌐 **V živo:** https://eventli.tech

## Funkcionalnosti
- Pregled, iskanje in filtriranje dogodkov (kategorija, polmer, kraj) + zemljevid
- Registracija in prijava (e-pošta + geslo ali **Google OAuth**)
- Pozabljeno geslo (ponastavitev prek e-pošte)
- Prijava na dogodke in upravljanje lastnih prijav
- Priljubljeni dogodki in sledenje organizatorjem
- Ocene in komentarji dogodkov
- Obvestila (zvonček) + e-poštni opomniki
- Novičnik
- Organizatorski profil z upravljanjem lastnih dogodkov
- Administratorski panel (moderacija prošenj, uporabnikov, dogodkov, komentarjev)
- Svetla/temna tema

## Tehnologije
**Backend:** Node.js, Express, MySQL 8 (mysql2), JWT, bcrypt, Passport (Google OAuth), Brevo (e-pošta), node-cron, helmet, express-rate-limit
**Frontend:** Vanilla JavaScript (ES moduli), Tailwind CSS, Bootstrap Icons, Leaflet (zemljevid)
**Infrastruktura:** Docker, docker-compose, Caddy (samodejni HTTPS)

## Arhitektura (produkcija)
```
Internet ──HTTPS(443)──> Caddy ──(3000)──> Node.js (Express) ──> MySQL 8
                         reverse proxy +    API + frontend +
                         samodejni HTTPS    naložene slike
```
Vse teče kot monolit v Dockerju na enem strežniku. Trajni podatki (baza, naložene slike, HTTPS certifikati) so shranjeni v Docker volumih.

## Struktura projekta
```
├── client/                 frontend (HTML, CSS, JS)
│   ├── js/                 ES moduli
│   ├── css/                tailwind.css (preveden) + style.css
│   └── *.html
├── server/                 backend
│   ├── routes/             Express routerji
│   ├── services/           e-pošta, obvestila, cron opomniki
│   ├── middleware/         avtentikacija
│   ├── init.sql            shema baze + začetni podatki
│   └── server.js
├── Dockerfile
├── docker-compose.prod.yml
├── Caddyfile
└── DEPLOYMENT.md           navodila za postavitev v produkcijo
```

## Lokalni razvoj
Predpogoji: **Node.js 22+** in **Docker**.

1. Baza (MySQL v Dockerju):
   ```
   cd server
   docker compose up -d
   ```
2. Backend:
   ```
   cd server
   cp .env.primer .env        # nato izpolni vrednosti
   npm install
   npm run dev                 # strežnik na http://localhost:3001
   ```
3. Frontend (prevod Tailwinda):
   ```
   cd client
   npm install
   npm run build:css
   ```

Aplikacija je nato dostopna na **http://localhost:3001** (Node strežnik servira tudi mapo `client`).

## Produkcija
Glej **[DEPLOYMENT.md](DEPLOYMENT.md)** za navodila po korakih (Docker + Caddy + DigitalOcean, domena, HTTPS, e-pošta).

## Avtorji
Študentski projekt (1. letnik informatike).
