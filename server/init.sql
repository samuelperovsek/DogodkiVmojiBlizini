SET NAMES utf8mb4;

CREATE TABLE Uporabnik (
    ID_uporabnik int(10) NOT NULL AUTO_INCREMENT, 
    ime varchar(50) NOT NULL, 
    priimek varchar(60) NOT NULL, 
    email varchar(255) NOT NULL UNIQUE, 
    geslo varchar(255) NOT NULL, 
    vloga ENUM('uporabnik', 'organizator', 'admin') NOT NULL DEFAULT 'uporabnik',
    naziv_podjetja varchar(255) DEFAULT NULL, 
    spletna_stran varchar(255) DEFAULT NULL,  
    telefon varchar(20) DEFAULT NULL,         
    datum_registracije timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, 
    PRIMARY KEY (ID_uporabnik)
);

CREATE TABLE Regija (
    ID_regija int(10) NOT NULL AUTO_INCREMENT, 
    ime_regije varchar(100) NOT NULL, 
    PRIMARY KEY (ID_regija)
);

CREATE TABLE Kraj (
    postna_stevilka int(10) NOT NULL,
    ime_kraja varchar(100) NOT NULL, 
    TK_regija int(10) NOT NULL, 
    PRIMARY KEY (postna_stevilka)
);

CREATE TABLE Kategorija (
    ID_kategorija int(10) NOT NULL AUTO_INCREMENT, 
    naziv varchar(50) NOT NULL, 
    PRIMARY KEY (ID_kategorija)
);

CREATE TABLE Dogodek (
    ID_dogodek int(10) NOT NULL AUTO_INCREMENT,
    TK_uporabnik_organizator int(10) NOT NULL,
    Naslov varchar(100) NOT NULL, 
    kratek_opis varchar(160) NOT NULL, 
    opis TEXT, 
    TK_kraj int(10) NOT NULL, 
    ulica varchar(255) NOT NULL, 
    ime_prizorisca varchar(255), 
    datum_zacetka timestamp NOT NULL, 
    datum_konca timestamp NULL, 
    vecdnevno boolean NOT NULL DEFAULT 0, 
    telefon varchar(20),
    email varchar(255),  
    spletna_stran varchar(255),
    slika varchar(255),
    st_sedezov int(10),
    st_prostih_sedezov int(10), 
    tip_cene ENUM('Plačljivo', 'Brezplačno') NOT NULL DEFAULT 'Plačljivo',
    cena decimal(10,2) DEFAULT 0.00,
    prijave_preko_platforme boolean NOT NULL DEFAULT 1,
    opomnik_24h boolean NOT NULL DEFAULT 1,
    status ENUM('v_pregledu', 'v_pripravi', 'aktiven', 'promoviran', 'zakljucen', 'odpovedan') NOT NULL DEFAULT 'v_pregledu',
    TK_kategorija int(10) NOT NULL,
    podkategorija varchar(50),
    lat decimal(10,8) DEFAULT NULL,
    lng decimal(11,8) DEFAULT NULL,
    PRIMARY KEY (ID_dogodek),
    FOREIGN KEY (TK_uporabnik_organizator) REFERENCES Uporabnik(ID_uporabnik),
    FOREIGN KEY (TK_kategorija) REFERENCES Kategorija(ID_kategorija),
    CHECK (datum_konca IS NULL OR datum_konca >= datum_zacetka),
    CHECK (st_prostih_sedezov IS NULL OR st_sedezov IS NULL OR st_prostih_sedezov <= st_sedezov),
    CHECK (cena IS NULL OR cena >= 0)
);

CREATE TABLE Prijava (
    ID_prijava int(10) NOT NULL AUTO_INCREMENT,
    datum_prijave timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    opomnik_poslan boolean NOT NULL DEFAULT 0,
    TK_uporabnik int(10) NOT NULL,
    TK_dogodek int(10) NOT NULL,
    PRIMARY KEY (ID_prijava),
    UNIQUE KEY uniq_prijava_uporabnik_dogodek (TK_uporabnik, TK_dogodek)
);

CREATE TABLE Ocena_komentar (
    ID_ocena int(10) NOT NULL AUTO_INCREMENT,
    ocena int(2) NOT NULL CHECK (ocena BETWEEN 1 AND 5),
    komentar TEXT,
    datum_objave timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    TK_uporabnik int(10) NOT NULL,
    TK_dogodek int(10) NOT NULL,
    PRIMARY KEY (ID_ocena),
    UNIQUE KEY uniq_ocena_uporabnik_dogodek (TK_uporabnik, TK_dogodek)
);

CREATE TABLE Priljubljeni_dogodki (
    ID_priljubljeni_dogodki int(10) NOT NULL AUTO_INCREMENT,
    TK_uporabnik int(10) NOT NULL,
    TK_dogodek int(10) NOT NULL,
    datum_shranjevanja timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (ID_priljubljeni_dogodki),
    UNIQUE KEY uniq_priljubljeni_uporabnik_dogodek (TK_uporabnik, TK_dogodek)
);

CREATE TABLE Priljubljeni_organizatorji (
    ID_priljubljeni_organizatorji int(10) NOT NULL AUTO_INCREMENT,
    TK_uporabnik int(10) NOT NULL,
    TK_organizator int(10) NOT NULL,
    PRIMARY KEY (ID_priljubljeni_organizatorji),
    UNIQUE KEY uniq_priljubljeni_uporabnik_organizator (TK_uporabnik, TK_organizator)
);

CREATE TABLE Prosnja_organizator (
    ID_prosnja int(10) NOT NULL AUTO_INCREMENT,
    TK_uporabnik int(10) NOT NULL,
    naziv_podjetja varchar(255) NOT NULL,
    spletna_stran varchar(255),
    opis TEXT,
    razlog TEXT NOT NULL,
    status ENUM('cakajoca', 'odobrena', 'zavrnjena') NOT NULL DEFAULT 'cakajoca',
    datum_prosnje timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    datum_obravnave timestamp NULL,
    TK_odobril int(10) NULL,
    opomba_admina TEXT,
    PRIMARY KEY (ID_prosnja),
    FOREIGN KEY (TK_uporabnik) REFERENCES Uporabnik(ID_uporabnik),
    FOREIGN KEY (TK_odobril) REFERENCES Uporabnik(ID_uporabnik)
);
CREATE TABLE Obvestilo (
    ID_obvestilo int(10) NOT NULL AUTO_INCREMENT,
    TK_uporabnik int(10) NOT NULL,
    tip ENUM('prosnja_odobrena', 'prosnja_zavrnjena', 'dogodek_aktiven', 'dogodek_zavrnjen', 'dogodek_promoviran', 'nova_prijava', 'odpoved_prijave', 'prijava_potrjena', 'prijava_preklicana', 'dogodek_odpovedan_zame', 'dogodek_kmalu', 'geslo_spremenjeno', 'profil_posodobljen', 'splosno') NOT NULL,
    sporocilo varchar(500) NOT NULL,
    povezava varchar(255) DEFAULT NULL,
    prebrano boolean NOT NULL DEFAULT 0,
    datum_obvestila timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (ID_obvestilo),
    FOREIGN KEY (TK_uporabnik) REFERENCES Uporabnik(ID_uporabnik) ON DELETE CASCADE,
    INDEX idx_obvestilo_uporabnik_prebrano (TK_uporabnik, prebrano, datum_obvestila DESC)
);

ALTER TABLE Kraj ADD CONSTRAINT FKKraj_Regija FOREIGN KEY (TK_regija) REFERENCES Regija (ID_regija);

ALTER TABLE Dogodek ADD CONSTRAINT FKDogodek_Kraj FOREIGN KEY (TK_kraj) REFERENCES Kraj (postna_stevilka);
ALTER TABLE Dogodek ADD CONSTRAINT FKDogodek_Kategorija FOREIGN KEY (TK_kategorija) REFERENCES Kategorija (ID_kategorija);
ALTER TABLE Dogodek ADD CONSTRAINT FKDogodek_UporabnikOrg FOREIGN KEY (TK_uporabnik_organizator) REFERENCES Uporabnik (ID_uporabnik);

ALTER TABLE Prijava ADD CONSTRAINT FKPrijava_Uporabnik FOREIGN KEY (TK_uporabnik) REFERENCES Uporabnik (ID_uporabnik) ON DELETE CASCADE;
ALTER TABLE Prijava ADD CONSTRAINT FKPrijava_Dogodek FOREIGN KEY (TK_dogodek) REFERENCES Dogodek (ID_dogodek) ON DELETE CASCADE;

ALTER TABLE Ocena_komentar ADD CONSTRAINT FKOcena_Uporabnik FOREIGN KEY (TK_uporabnik) REFERENCES Uporabnik (ID_uporabnik) ON DELETE CASCADE;
ALTER TABLE Ocena_komentar ADD CONSTRAINT FKOcena_Dogodek FOREIGN KEY (TK_dogodek) REFERENCES Dogodek (ID_dogodek) ON DELETE CASCADE;

ALTER TABLE Priljubljeni_dogodki ADD CONSTRAINT FKPriljDog_Uporabnik FOREIGN KEY (TK_uporabnik) REFERENCES Uporabnik (ID_uporabnik) ON DELETE CASCADE;
ALTER TABLE Priljubljeni_dogodki ADD CONSTRAINT FKPriljDog_Dogodek FOREIGN KEY (TK_dogodek) REFERENCES Dogodek (ID_dogodek) ON DELETE CASCADE;

ALTER TABLE Priljubljeni_organizatorji ADD CONSTRAINT FKPriljOrg_Uporabnik FOREIGN KEY (TK_uporabnik) REFERENCES Uporabnik (ID_uporabnik) ON DELETE CASCADE;
ALTER TABLE Priljubljeni_organizatorji ADD CONSTRAINT FKPriljOrg_Organizator FOREIGN KEY (TK_organizator) REFERENCES Uporabnik (ID_uporabnik) ON DELETE CASCADE;

CREATE INDEX idx_dogodek_status_datum ON Dogodek (status, datum_zacetka);
CREATE INDEX idx_dogodek_kategorija    ON Dogodek (TK_kategorija);
CREATE INDEX idx_dogodek_kraj          ON Dogodek (TK_kraj);
CREATE INDEX idx_ocena_dogodek         ON Ocena_komentar (TK_dogodek);
CREATE INDEX idx_prijava_dogodek       ON Prijava (TK_dogodek);
CREATE INDEX idx_prosnja_status        ON Prosnja_organizator (status, datum_prosnje);

INSERT INTO Regija (ime_regije) VALUES
('Osrednjeslovenska'), ('Obalno-kraška'), ('Štajerska'), ('Gorenjska'), ('Dolenjska');

INSERT INTO Kraj (postna_stevilka, ime_kraja, TK_regija) VALUES 
(1000, 'Ljubljana', 1), (6000, 'Koper', 2), (2000, 'Maribor', 3), (4000, 'Kranj', 4), (8000, 'Novo mesto', 5);

INSERT INTO Kategorija (naziv) VALUES
('Koncerti'), ('Šport'), ('Delavnice'), ('Kultura'), ('Izobraževanja'), ('Zabave'), ('Sejmi'), ('Družinski'), ('Drugo');

INSERT INTO Uporabnik (ime, priimek, email, geslo, vloga, naziv_podjetja, spletna_stran, telefon) VALUES
('Janez', 'Novak', 'janez@email.si', 'geslo123', 'organizator', 'Glasbeni klub Bunker', 'https://www.bunker.si', '041 555 100'),
('Samuel', 'Admin', 'admin@eventli.si', 'varnoGeslo!', 'admin', NULL, NULL, NULL),
('Maja', 'Kovač', 'maja.kovac@email.si', 'skritoGeslo1', 'uporabnik', NULL, NULL, NULL),
('Luka', 'Zupan', 'luka.zupan@email.si', 'superVarno!', 'uporabnik', NULL, NULL, NULL),
('Ana', 'Bizjak', 'ana.bizjak@kinosiska.si', 'organVarno!', 'organizator', 'Kino Šiška', 'https://www.kinosiska.si', '01 500 30 00');

INSERT INTO Dogodek (TK_uporabnik_organizator, Naslov, kratek_opis, opis, TK_kraj, ulica, ime_prizorisca, datum_zacetka, datum_konca, vecdnevno, telefon, email, spletna_stran, slika, st_sedezov, st_prostih_sedezov, tip_cene, cena, status, TK_kategorija, lat, lng) VALUES
(1, 'Koncert pod zvezdami', 'Nepozaben večer slovenske popevke.', 'Nepozaben večer slovenske popevke na prostem s krasnim ambientom.', 1000, 'Prešernov trg 1', 'Prešernov trg', '2026-06-15 20:00:00', '2026-06-15 23:00:00', 0, '041 555 100', 'info@bunker.si', 'https://www.bunker.si', 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&q=80', 1500, 1262, 'Plačljivo', 22.00, 'aktiven', 1, 46.0569, 14.5058),
(5, 'Lokalni maraton', 'Tek po Pokljuki za vse generacije.', 'Tek po Pokljuki za vse generacije in stopnje pripravljenosti.', 6000, 'Pristaniška ulica 2', 'Pristanišče Koper', '2026-07-10 09:00:00', '2026-07-10 13:00:00', 0, '056667788', 'maraton@koper.si', NULL, 'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=800&q=80', 500, 312, 'Plačljivo', 45.00, 'aktiven', 2, 45.5481, 13.7302),
(1, 'Indie Rock Večer', 'Nastop treh neuveljavljenih slovenskih indie skupin.', 'Nastop treh neuveljavljenih slovenskih indie skupin v dvorani Komuna.', 1000, 'Vodnikova cesta 8', 'Klub Bunker', '2026-08-20 20:00:00', '2026-08-20 23:59:00', 0, '041 555 100', 'rock@bunker.si', 'https://www.bunker.si', 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&q=80', 300, 145, 'Plačljivo', 15.00, 'aktiven', 1, 46.0569, 14.5058),
(5, 'Teden programiranja', 'Sklop delavnic za začetnike v Pythonu in JavaScriptu.', 'Večdnevni intenzivni tečaj programiranja, namenjen popolnim začetnikom.', 2000, 'Gosposvetska cesta 83', 'ŠOUM', '2026-09-01 16:00:00', '2026-09-05 20:00:00', 1, '031 222 333', 'info@sou.si', NULL, 'https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=800&q=80', 80, 12, 'Plačljivo', 68.00, 'v_pripravi', 3, 46.5547, 15.6459),
(5, 'Lutkovna predstava za otroke', 'Tradicionalna slovenska pravljica v obliki lutkovne predstave.', 'Tradicionalna slovenska pravljica v obliki lutkovne predstave za najmlajše.', 4000, 'Glavni trg 2', 'Mestno gledališče', '2026-10-15 10:00:00', '2026-10-15 11:30:00', 0, '040 741 242', 'lutke@kinosiska.si', NULL, 'https://images.unsplash.com/photo-1466637574441-749b8f19452f?w=800&q=80', 120, 80, 'Brezplačno', 0.00, 'aktiven', 4, 46.2389, 14.3556);

INSERT INTO Prijava (TK_uporabnik, TK_dogodek, opomnik_poslan) VALUES
(1, 1, 0), (3, 3, 0), (4, 4, 1), (1, 4, 0);

INSERT INTO Priljubljeni_dogodki (TK_uporabnik, TK_dogodek) VALUES
(1, 2), (3, 4), (4, 3), (4, 5);

INSERT INTO Ocena_komentar (ocena, komentar, TK_uporabnik, TK_dogodek) VALUES
(5, 'Odličen koncert, komaj čakam naslednjega!', 1, 1),
(4, 'Zelo poučno, vendar je bilo premalo časa za vsa vprašanja.', 4, 4),
(5, 'Odličen izbor glasbenih skupin!', 3, 3);

INSERT INTO Priljubljeni_organizatorji (TK_uporabnik, TK_organizator) VALUES
(1, 5), (3, 5), (4, 5);

INSERT INTO Prosnja_organizator (TK_uporabnik, naziv_podjetja, spletna_stran, opis, razlog, status, datum_obravnave, TK_odobril, opomba_admina) VALUES
(5, 'Kino Šiška', 'https://www.kinosiska.si', 'Kulturno-glasbeni center v Ljubljani.', 'Že vrsto let prirejamo koncerte in želimo dogodke objavljati na vaši platformi za lokalno publiko.', 'odobrena', '2026-04-10 14:32:00', 2, 'Pozdravljena Ana, vse zapisano se ujema z javnimi viri. Veselimo se sodelovanja.'),
(1, 'Glasbeni klub Bunker', 'https://www.bunker.si', 'Mali klub za alternativno glasbo v Ljubljani.', 'Organiziram lokalne koncerte in želim, da nas najdejo novi obiskovalci.', 'odobrena', '2026-04-15 11:20:00', 2, 'Pozdravljen Janez, klub je preverjen. Veseli smo te v ekipi.'),
(3, 'Maja Workshops', NULL, 'Samostojna podjetnica za umetniške delavnice.', 'Vodim mesečne delavnice keramike in želim pridobivati prijave preko vaše platforme namesto Facebooka.', 'cakajoca', NULL, NULL, NULL),
(4, 'Nočna družba Zupan', NULL, NULL, 'Hocem objavljati zabave v lokalu, ki še nima dovoljenja občine.', 'zavrnjena', '2026-04-22 09:15:00', 2, 'Prošnjo zavrnjeno: manjkajo podatki o podjetju in lokal nima ustreznih dovoljenj. Po pridobitvi dovoljenja lahko oddaš novo prošnjo.');


INSERT INTO Dogodek (TK_uporabnik_organizator, Naslov, kratek_opis, opis, TK_kraj, ulica, ime_prizorisca, datum_zacetka, datum_konca, vecdnevno, telefon, email, spletna_stran, slika, st_sedezov, st_prostih_sedezov, tip_cene, cena, status, TK_kategorija, lat, lng) VALUES
(1, 'Jazz pod zvezdami', 'Večer vrhunskega jazza v starem mestnem jedru.', 'Tradicionalni poletni večer, kjer bodo nastopili domači in tuji jazz virtuozi.', 1000, 'Gornji trg 4', 'Stari trg', '2026-06-20 21:00:00', '2026-06-21 00:30:00', 0, '041 555 100', 'jazz@bunker.si', 'https://www.bunker.si', 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&q=80', 200, 45, 'Plačljivo', 12.00, 'aktiven', 1, 46.0498, 14.5068),
(1, 'Metal Open Air', 'Glasni kitarski rifi na prostem.', 'Enodnevni mini festival za vse ljubitelje trših ritmov in dobre družbe.', 2000, 'Koroška cesta 12', 'Mestni park Maribor', '2026-06-28 17:00:00', '2026-06-28 23:55:00', 0, '041 555 100', 'metal@bunker.si', 'https://www.bunker.si', 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&q=80', 800, 540, 'Plačljivo', 25.00, 'aktiven', 1, 46.5624, 15.6455),
(5, 'Letni kino: Klasike', 'Ogled kultnega filma pod milim nebom.', 'Brezplačen ogled filmske klasike z brezplačnimi pokovkami za prve obiskovalce.', 4000, 'Koroška cesta 1', 'Grajsko dvorišče Kranj', '2026-07-02 21:15:00', '2026-07-02 23:15:00', 0, '040 123 456', 'info@kranj.si', NULL, 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&q=80', 150, 150, 'Brezplačno', 0.00, 'aktiven', 4, 46.2420, 14.3542),
(5, 'Nočni tek mesta', 'Tek po osvetljenih ulicah za pokal mesta.', 'Preizkusi svojo pripravljenost na 5 ali 10 kilometrov pod uličnimi svetilkami.', 1000, 'Slovenska cesta 15', 'Center mesta', '2026-07-15 21:00:00', '2026-07-15 23:00:00', 0, '031 999 888', 'tek@ljubljana.si', 'https://www.nocnitek.si', 'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=800&q=80', 1000, 850, 'Plačljivo', 18.00, 'aktiven', 2, 46.0522, 14.5042),
(5, 'Kolesarski vzpon', 'Tradicionalno kolesarjenje na lokalni vrh.', 'Začetek v dolini, cilj na vrhu hriba z golažem za vse udeležence.', 2000, 'Koroška cesta 5', 'Mestna vrata Maribor', '2026-07-22 10:00:00', '2026-07-22 14:00:00', 0, '03 757 00 00', 'vzpon@maribor.si', NULL, 'https://images.unsplash.com/photo-1541614101331-1a5a3a194e92?w=800&q=80', 300, 112, 'Plačljivo', 10.00, 'aktiven', 2, 46.5547, 15.6459),
(5, 'Turnir v ulični košarki', '3 na 3 turnir za prehodni pokal.', 'Zberi ekipo in pokaži svoje znanje na zunanjem igrišču. Bogate nagrade!', 2000, 'Gosposvetska cesta 20', 'Športni park Tabor', '2026-08-05 15:00:00', '2026-08-05 21:00:00', 0, '041 555 444', 'basket@maribor.si', NULL, 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800&q=80', 50, 22, 'Brezplačno', 0.00, 'aktiven', 2, 46.5512, 15.6321),
(1, 'Uvod v UI in ChatGPT', 'Kratka delavnica o uporabi umetne inteligence.', 'Naučite se, kako učinkovito pisati ukaze (prompte) in si olajšati vsakdanje delo.', 1000, 'Dunajska cesta 56', 'Tehnološki park', '2026-08-12 18:00:00', '2026-08-12 20:30:00', 0, '041 555 100', 'ai@bunker.si', 'https://www.bunker.si', 'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=800&q=80', 60, 4, 'Plačljivo', 35.00, 'aktiven', 3, 46.0722, 14.5102),
(5, 'Kulinarični tečaj: Suši', 'Naučite se pripraviti popoln suši doma.', 'Delavnica pod vodstvom profesionalnega kuharja. Vse sestavine so vštete v ceno.', 6000, 'Ferrarska ulica 8', 'Kuharski studio Koper', '2026-08-25 17:00:00', '2026-08-25 21:00:00', 0, '05 611 22 33', 'sushi@koper.si', NULL, 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=800&q=80', 15, 0, 'Plačljivo', 55.00, 'aktiven', 3, 45.5462, 13.7345),
(1, 'Fotografija za začetnike', 'Spoznajte nastavitve svojega DSLR fotoaparata.', 'Praktična delavnica na terenu, kjer se bomo naučili osnov kompozicije in svetlobe.', 4000, 'Maistrova ulica 5', 'Kulturni dom Kranj', '2026-09-05 09:00:00', '2026-09-05 14:00:00', 0, '041 555 100', 'foto@bunker.si', 'https://www.bunker.si', 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&q=80', 25, 14, 'Plačljivo', 40.00, 'aktiven', 3, 46.2415, 14.3599),
(5, 'Festival ulične hrane', 'Najboljši slovenski food trucki na enem mestu.', 'Okusite burgerje, taccose, šmorn in ostale dobrote s cele Slovenije.', 2000, 'Trg svobode 1', 'Trg svobode Maribor', '2026-09-12 11:00:00', '2026-09-12 22:00:00', 0, '02 333 44 55', 'food@maribor.si', NULL, 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&q=80', 2000, 2000, 'Brezplačno', 0.00, 'aktiven', 4, 46.5599, 15.6489),
(1, 'Stand Up Večer smeha', 'Nastop štirih znanih domačih komikov.', 'Pridite na porcijo smeha v dvorano kulturnega doma. Smeh do solz zagotovljen!', 4000, 'Koroška ulica 10', 'Kulturni center Kranj', '2026-09-18 20:00:00', '2026-09-18 22:00:00', 0, '041 555 100', 'smeh@bunker.si', 'https://www.bunker.si', 'https://images.unsplash.com/photo-1585699324551-f6c309eed262?w=800&q=80', 250, 89, 'Plačljivo', 15.00, 'aktiven', 4, 46.2420, 14.3542),
(1, 'Komedija: Popolna zmeda', 'Gledališka uspešnica v izvedbi lokalnega društva.', 'Zabavna dvoranska predstava o dveh sosedih, ki si nenehno nagajata.', 4000, 'Glavni trg 12', 'Mestno gledališče Kranj', '2026-10-02 19:30:00', '2026-10-02 21:30:00', 0, '041 555 100', 'gledalisce@bunker.si', 'https://www.bunker.si', 'https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=800&q=80', 400, 310, 'Plačljivo', 12.00, 'aktiven', 4, 46.2395, 14.3562),
(1, 'Veliki koncert: Siddharta', 'Ekskluzivni stadionski spektakel ob obletnici.', 'Skupina Siddharta se vrača na domači oder z vsemi največjimi uspešnicami.', 1000, 'Vojkova cesta 100', 'Stadion Stožice', '2026-06-18 21:00:00', '2026-06-18 23:55:00', 0, '041 555 100', 'karte@bunker.si', 'https://www.bunker.si', 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&q=80', 10000, 4320, 'Plačljivo', 35.00, 'promoviran', 1, 46.0804, 14.5245),
(5, 'Vinski sejem Primorske', 'Degustacija najboljših vin in lokalnih sirov.', 'Spoznajte primorske vinarje in poskusite vrhunske avtohtone sorte.', 6000, 'Ukmarjev trg 2', 'Ukmarjev trg Koper', '2026-06-25 14:00:00', '2026-06-25 21:00:00', 0, '05 666 99 00', 'vino@koper.si', NULL, 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=800&q=80', 500, 210, 'Plačljivo', 20.00, 'promoviran', 4, 45.5488, 13.7261);