import 'dotenv/config';
import pool from '../db.js';

const sql = `
CREATE TABLE IF NOT EXISTS Prosnja_organizator (
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
`;

try {
  await pool.query(sql);
  console.log('✓ Tabela Prosnja_organizator je pripravljena.');
} catch (err) {
  console.error('Napaka:', err.message);
  process.exit(1);
}
process.exit(0);
