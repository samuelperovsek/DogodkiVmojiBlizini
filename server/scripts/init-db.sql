CREATE DATABASE IF NOT EXISTS dogodki
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE dogodki;

CREATE TABLE Uporabnik (
    ID_uporabnik int(10) NOT NULL AUTO_INCREMENT, 
    ime varchar(50) NOT NULL, 
    priimek varchar(60) NOT NULL, 
    email varchar(255) NOT NULL UNIQUE, 
    geslo varchar(255) NOT NULL, 
    vloga varchar(20) NOT NULL, 
    datum_registracije timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, 
    PRIMARY KEY (ID_uporabnik)
);

CREATE TABLE Organizator (
    ID_organizator int(10) NOT NULL AUTO_INCREMENT, 
    naziv varchar(255) NOT NULL, 
    spletna_stran varchar(255), 
    PRIMARY KEY (ID_organizator)
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
    TK_organizator int(10) NOT NULL, 
    Naslov varchar(100) NOT NULL, 
    opis TEXT, -- Spremenjeno v TEXT
    TK_kraj int(10) NOT NULL, 
    ulica varchar(255) NOT NULL, 
    datum_zacetka timestamp NOT NULL, 
    datum_konca timestamp NOT NULL, 
    telefon varchar(20),
    email varchar(255), 
    slika varchar(255), 
    status varchar(30) NOT NULL, 
    TK_kategorija int(10) NOT NULL, 
    PRIMARY KEY (ID_dogodek)
);

CREATE TABLE Prijava (
    ID_prijava int(10) NOT NULL AUTO_INCREMENT, 
    datum_prijave timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, 
    opomnik_poslan boolean NOT NULL DEFAULT 0, 
    TK_uporabnik int(10) NOT NULL, 
    TK_dogodek int(10) NOT NULL, 
    PRIMARY KEY (ID_prijava)
);

CREATE TABLE Ocena_komentar (
    ID_ocena int(10) NOT NULL AUTO_INCREMENT, 
    ocena int(2) NOT NULL, 
    komentar TEXT, 
    datum_objave timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, 
    TK_uporabnik int(10) NOT NULL, 
    TK_dogodek int(10) NOT NULL, 
    PRIMARY KEY (ID_ocena)
);

CREATE TABLE Priljubljeni_dogodki (
    ID_priljubljeni_dogodki int(10) NOT NULL AUTO_INCREMENT, 
    TK_uporabnik int(10) NOT NULL,
    TK_dogodek int(10) NOT NULL, 
    datum_shranjevanja timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, 
    PRIMARY KEY (ID_priljubljeni_dogodki)
);

CREATE TABLE Priljubljeni_organizatorji (
    ID_priljubljeni_organizatorji int(10) NOT NULL AUTO_INCREMENT, 
    TK_uporabnik int(10) NOT NULL, 
    TK_organizator int(10) NOT NULL, 
    PRIMARY KEY (ID_priljubljeni_organizatorji)
);

ALTER TABLE Kraj ADD CONSTRAINT FKKraj_Regija FOREIGN KEY (TK_regija) REFERENCES Regija (ID_regija);
ALTER TABLE Dogodek ADD CONSTRAINT FKDogodek_Kraj FOREIGN KEY (TK_kraj) REFERENCES Kraj (postna_stevilka);
ALTER TABLE Dogodek ADD CONSTRAINT FKDogodek_Kategorija FOREIGN KEY (TK_kategorija) REFERENCES Kategorija (ID_kategorija);
ALTER TABLE Dogodek ADD CONSTRAINT FKDogodek_Organizator FOREIGN KEY (TK_organizator) REFERENCES Organizator (ID_organizator);
ALTER TABLE Prijava ADD CONSTRAINT FKPrijava_Uporabnik FOREIGN KEY (TK_uporabnik) REFERENCES Uporabnik (ID_uporabnik);
ALTER TABLE Prijava ADD CONSTRAINT FKPrijava_Dogodek FOREIGN KEY (TK_dogodek) REFERENCES Dogodek (ID_dogodek);
ALTER TABLE Ocena_komentar ADD CONSTRAINT FKOcena_Uporabnik FOREIGN KEY (TK_uporabnik) REFERENCES Uporabnik (ID_uporabnik);
ALTER TABLE Ocena_komentar ADD CONSTRAINT FKOcena_Dogodek FOREIGN KEY (TK_dogodek) REFERENCES Dogodek (ID_dogodek);
ALTER TABLE Priljubljeni_organizatorji ADD CONSTRAINT FKPriljOrg_Uporabnik FOREIGN KEY (TK_uporabnik) REFERENCES Uporabnik (ID_uporabnik);
ALTER TABLE Priljubljeni_organizatorji ADD CONSTRAINT FKPriljOrg_Org FOREIGN KEY (TK_organizator) REFERENCES Organizator (ID_organizator);
ALTER TABLE Priljubljeni_dogodki ADD CONSTRAINT FKPriljDog_Uporabnik FOREIGN KEY (TK_uporabnik) REFERENCES Uporabnik (ID_uporabnik);
ALTER TABLE Priljubljeni_dogodki ADD CONSTRAINT FKPriljDog_Dogodek FOREIGN KEY (TK_dogodek) REFERENCES Dogodek (ID_dogodek);

--inserti

INSERT INTO Regija (ime_regije) VALUES 
('Osrednjeslovenska'), 
('Obalno-kraška'), 
('Štajerska'),
('Gorenjska'), 
('Dolenjska');

INSERT INTO Kraj (postna_stevilka, ime_kraja, TK_regija) VALUES 
(1000, 'Ljubljana', 1), 
(6000, 'Koper', 2), 
(2000, 'Maribor', 3),
(4000, 'Kranj', 4),
(8000, 'Novo mesto', 5);

INSERT INTO Kategorija (naziv) VALUES 
('Koncert'), 
('Šport'), 
('Delavnica'), 
('Kultura'),
('Izobraževanje'), 
('Zabava');

INSERT INTO Uporabnik (ime, priimek, email, geslo, vloga) VALUES 
('Janez', 'Novak', 'janez@email.si', 'geslo123', 'uporabnik'),
('klemen', 'Admin', 'admin@dogodki.si', 'varnoGeslo!', 'admin'),
('Maja', 'Kovač', 'maja.kovac@email.si', 'skritoGeslo1', 'uporabnik'),
('Luka', 'Zupan', 'luka.zupan@email.si', 'superVarno!', 'uporabnik');

INSERT INTO Organizator (naziv, spletna_stran) VALUES 
('Kulturno društvo radlje', 'https://www.kdradlje.si'),
('Športni center pokljuka', 'https://www.center-pokljuka.si/en/home/'),
('Kino Šiška', 'https://www.kinosiska.si'),
('Študentska organizacija', 'https://www.sou.si');

INSERT INTO Dogodek (TK_organizator, Naslov, opis, TK_kraj, ulica, datum_zacetka, datum_konca, telefon, email, status, TK_kategorija) VALUES 
(1, 'Koncert pod zvezdami', 'Nepozaben večer slovenske popevke na prostem.', 1000, 'Prešernov trg 1', '2026-06-15 20:00:00', '2026-06-15 23:00:00', '040 741 242', 'tajnistvo@kdradlje.si', 'promoviran', 1),
(2, 'Lokalni maraton', 'Tek po Pokljuki za vse generacije.', 6000, 'Pristaniška ulica 2', '2026-07-10 09:00:00', '2026-07-10 13:00:00', '056667788', 'maraton@koper.si', 'aktiven', 2),
(3, 'Indie Rock Večer', 'Nastop treh neuveljavljenih slovenskih indie skupin.', 1000, 'Trg prekomorskih brigad 3', '2026-08-20 20:00:00', '2026-08-20 23:59:00', '01 500 30 00', 'info@kinosiska.si', 'aktiven', 1),
(4, 'Teden programiranja', 'Sklop delavnic za začetnike v Pythonu in JavaScriptu.', 2000, 'Gosposvetska cesta 83', '2026-09-01 16:00:00', '2026-09-05 20:00:00', '031 222 333', 'info@sou.si', 'v_pripravi', 3),
(1, 'Lutkovna predstava za otroke', 'Tradicionalna slovenska pravljica v obliki lutkovne predstave za najmlajše.', 4000, 'Glavni trg 2', '2026-10-15 10:00:00', '2026-10-15 11:30:00', '040 741 242', 'tajnistvo@kdradlje.si', 'aktiven', 4);

INSERT INTO Prijava (TK_uporabnik, TK_dogodek, opomnik_poslan) VALUES 
(1, 1, 0),
(3, 3, 0),
(4, 4, 1),
(1, 4, 0);

INSERT INTO Priljubljeni_dogodki (TK_uporabnik, TK_dogodek) VALUES 
(1, 2),
(3, 4),
(4, 3),
(4, 5);

INSERT INTO Ocena_komentar (ocena, komentar, TK_uporabnik, TK_dogodek) VALUES 
(5, 'Odličen koncert, komaj čakam naslednjega!', 1, 1),
(4, 'Zelo poučno, vendar je bilo premalo časa za vsa vprašanja.', 4, 4),
(5, 'Odličen izbor glasbenih skupin!', 3, 3);

INSERT INTO Priljubljeni_organizatorji (TK_uporabnik, TK_organizator) VALUES 
(1, 3),
(3, 1),
(4, 4);
