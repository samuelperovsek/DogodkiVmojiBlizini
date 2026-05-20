CREATE TABLE Uporabnik (
    ID_uporabnik int(10) NOT NULL AUTO_INCREMENT, 
    ime varchar(50) NOT NULL, 
    priimek varchar(60) NOT NULL, 
    email varchar(255) NOT NULL UNIQUE, 
    geslo varchar(255) NOT NULL, 
    vloga varchar(20) NOT NULL, 
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
    tip_cene varchar(30) NOT NULL DEFAULT 'Plačljivo',
    cena decimal(10,2) DEFAULT 0.00, 
    prijave_preko_platforme boolean NOT NULL DEFAULT 1, 
    opomnik_24h boolean NOT NULL DEFAULT 1, 
    status varchar(30) NOT NULL DEFAULT 'v_pregledu',
    TK_kategorija int(10) NOT NULL, 
    podkategorija varchar(50), 
    PRIMARY KEY (ID_dogodek),
    FOREIGN KEY (TK_uporabnik_organizator) REFERENCES Uporabnik(ID_uporabnik),
    FOREIGN KEY (TK_kategorija) REFERENCES Kategorija(ID_kategorija)
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
    PRIMARY KEY (ID_priljubljeni_organizatorji),
    FOREIGN KEY (TK_uporabnik) REFERENCES Uporabnik(ID_uporabnik),
    FOREIGN KEY (TK_organizator) REFERENCES Uporabnik(ID_uporabnik)
);

CREATE TABLE Prosnja_organizator (
    ID_prosnja int(10) NOT NULL AUTO_INCREMENT,
    TK_uporabnik int(10) NOT NULL,
    naziv_podjetja varchar(255) NOT NULL,
    spletna_stran varchar(255),
    opis TEXT,
    razlog TEXT NOT NULL,
    status varchar(20) NOT NULL DEFAULT 'cakajoca',
    datum_prosnje timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    datum_obravnave timestamp NULL,
    TK_odobril int(10) NULL,
    opomba_admina TEXT,
    PRIMARY KEY (ID_prosnja),
    FOREIGN KEY (TK_uporabnik) REFERENCES Uporabnik(ID_uporabnik),
    FOREIGN KEY (TK_odobril) REFERENCES Uporabnik(ID_uporabnik)
);
-- Tuji ključi
ALTER TABLE Kraj ADD CONSTRAINT FKKraj_Regija FOREIGN KEY (TK_regija) REFERENCES Regija (ID_regija);

ALTER TABLE Dogodek ADD CONSTRAINT FKDogodek_Kraj FOREIGN KEY (TK_kraj) REFERENCES Kraj (postna_stevilka);
ALTER TABLE Dogodek ADD CONSTRAINT FKDogodek_Kategorija FOREIGN KEY (TK_kategorija) REFERENCES Kategorija (ID_kategorija);
ALTER TABLE Dogodek ADD CONSTRAINT FKDogodek_UporabnikOrg FOREIGN KEY (TK_uporabnik_organizator) REFERENCES Uporabnik (ID_uporabnik);

ALTER TABLE Prijava ADD CONSTRAINT FKPrijava_Uporabnik FOREIGN KEY (TK_uporabnik) REFERENCES Uporabnik (ID_uporabnik);
ALTER TABLE Prijava ADD CONSTRAINT FKPrijava_Dogodek FOREIGN KEY (TK_dogodek) REFERENCES Dogodek (ID_dogodek);

ALTER TABLE Ocena_komentar ADD CONSTRAINT FKOcena_Uporabnik FOREIGN KEY (TK_uporabnik) REFERENCES Uporabnik (ID_uporabnik);
ALTER TABLE Ocena_komentar ADD CONSTRAINT FKOcena_Dogodek FOREIGN KEY (TK_dogodek) REFERENCES Dogodek (ID_dogodek);

ALTER TABLE Priljubljeni_dogodki ADD CONSTRAINT FKPriljDog_Uporabnik FOREIGN KEY (TK_uporabnik) REFERENCES Uporabnik (ID_uporabnik);
ALTER TABLE Priljubljeni_dogodki ADD CONSTRAINT FKPriljDog_Dogodek FOREIGN KEY (TK_dogodek) REFERENCES Dogodek (ID_dogodek);

ALTER TABLE Priljubljeni_organizatorji ADD CONSTRAINT FKPriljOrg_Uporabnik FOREIGN KEY (TK_uporabnik) REFERENCES Uporabnik (ID_uporabnik);

ALTER TABLE Priljubljeni_organizatorji ADD CONSTRAINT FKPriljOrg_Organizator FOREIGN KEY (TK_organizator) REFERENCES Uporabnik (ID_uporabnik);
-- INSERTI 

INSERT INTO Regija (ime_regije) VALUES 
('Osrednjeslovenska'), ('Obalno-kraška'), ('Štajerska'), ('Gorenjska'), ('Dolenjska');

INSERT INTO Kraj (postna_stevilka, ime_kraja, TK_regija) VALUES 
(1000, 'Ljubljana', 1), (6000, 'Koper', 2), (2000, 'Maribor', 3), (4000, 'Kranj', 4), (8000, 'Novo mesto', 5);

INSERT INTO Kategorija (naziv) VALUES 
('Koncerti'), ('Šport'), ('Delavnice'), ('Kultura'), ('Izobraževanja'), ('Zabave');

INSERT INTO Uporabnik (ime, priimek, email, geslo, vloga, naziv_podjetja, spletna_stran, telefon) VALUES
('Janez', 'Novak', 'janez@email.si', 'geslo123', 'uporabnik', NULL, NULL, NULL),
('Samuel', 'Admin', 'admin@dogodki.si', 'varnoGeslo!', 'admin', NULL, NULL, NULL),
('Maja', 'Kovač', 'maja.kovac@email.si', 'skritoGeslo1', 'uporabnik', NULL, NULL, NULL),
('Luka', 'Zupan', 'luka.zupan@email.si', 'superVarno!', 'uporabnik', NULL, NULL, NULL),
('Ana', 'Bizjak', 'ana.bizjak@kinosiska.si', 'organVarno!', 'organizator', 'Kino Šiška', 'https://www.kinosiska.si', '01 500 30 00');

INSERT INTO Dogodek (TK_uporabnik_organizator, Naslov, kratek_opis, opis, TK_kraj, ulica, ime_prizorisca, datum_zacetka, datum_konca, vecdnevno, telefon, email, spletna_stran, slika, st_sedezov, st_prostih_sedezov, tip_cene, cena, status, TK_kategorija) VALUES
(5, 'Koncert pod zvezdami', 'Nepozaben večer slovenske popevke.', 'Nepozaben večer slovenske popevke na prostem s krasnim ambientom.', 1000, 'Prešernov trg 1', 'Prešernov trg', '2026-06-15 20:00:00', '2026-06-15 23:00:00', 0, '040 741 242', 'tajnistvo@kdradlje.si', NULL, 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&q=80', 1500, 1262, 'Plačljivo', 22.00, 'aktiven', 1),
(5, 'Lokalni maraton', 'Tek po Pokljuki za vse generacije.', 'Tek po Pokljuki za vse generacije in stopnje pripravljenosti.', 6000, 'Pristaniška ulica 2', 'Pristanišče Koper', '2026-07-10 09:00:00', '2026-07-10 13:00:00', 0, '056667788', 'maraton@koper.si', NULL, 'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=800&q=80', 500, 312, 'Plačljivo', 45.00, 'aktiven', 2),
(5, 'Indie Rock Večer', 'Nastop treh neuveljavljenih slovenskih indie skupin.', 'Nastop treh neuveljavljenih slovenskih indie skupin v dvorani Komuna.', 1000, 'Trg prekomorskih brigad 3', 'Kino Šiška', '2026-08-20 20:00:00', '2026-08-20 23:59:00', 0, '01 500 30 00', 'info@kinosiska.si', 'https://www.kinosiska.si', 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&q=80', 300, 145, 'Plačljivo', 15.00, 'aktiven', 1),
(5, 'Teden programiranja', 'Sklop delavnic za začetnike v Pythonu in JavaScriptu.', 'Večdnevni intenzivni tečaj programiranja, namenjen popolnim začetnikom.', 2000, 'Gosposvetska cesta 83', 'ŠOUM', '2026-09-01 16:00:00', '2026-09-05 20:00:00', 1, '031 222 333', 'info@sou.si', NULL, 'https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=800&q=80', 80, 12, 'Plačljivo', 68.00, 'v_pripravi', 3),
(5, 'Lutkovna predstava za otroke', 'Tradicionalna slovenska pravljica v obliki lutkovne predstave.', 'Tradicionalna slovenska pravljica v obliki lutkovne predstave za najmlajše.', 4000, 'Glavni trg 2', 'Mestno gledališče', '2026-10-15 10:00:00', '2026-10-15 11:30:00', 0, '040 741 242', 'lutke@kinosiska.si', NULL, 'https://images.unsplash.com/photo-1466637574441-749b8f19452f?w=800&q=80', 120, 80, 'Brezplačno', 0.00, 'aktiven', 4);

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
(1, 'Glasbeni klub Bunker', 'https://bunker.example.si', 'Mali klub za alternativno glasbo.', 'Organiziram lokalne koncerte in želim, da nas najdejo novi obiskovalci.', 'cakajoca', NULL, NULL, NULL),
(3, 'Maja Workshops', NULL, 'Samostojna podjetnica za umetniške delavnice.', 'Vodim mesečne delavnice keramike in želim pridobivati prijave preko vaše platforme namesto Facebooka.', 'cakajoca', NULL, NULL, NULL),
(4, 'Nočna družba Zupan', NULL, NULL, 'Hocem objavljati zabave v lokalu, ki še nima dovoljenja občine.', 'zavrnjena', '2026-04-22 09:15:00', 2, 'Prošnjo zavrnjeno: manjkajo podatki o podjetju in lokal nima ustreznih dovoljenj. Po pridobitvi dovoljenja lahko oddaš novo prošnjo.');