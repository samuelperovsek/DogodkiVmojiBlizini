import 'dotenv/config';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import passport from 'passport';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
import authRoutes from './routes/auth.js';
import pozabljenoGesloRoutes from './routes/pozabljeno_geslo.js';
import profilRoutes from './routes/profil.js';
import prosnjaRoutes from './routes/prosnja.js';
import adminRoutes from './routes/admin.js';
import dogodkiRoutes from './routes/dogodki.js';
import dodajDogodekRoutes from './routes/dodaj_dogodek.js';
import adminDogodkiRoutes from './routes/admin_dogodki.js';
import adminOceneRoutes from './routes/admin_ocene.js';
import organizatorjiRuter from './routes/organizatorji.js';
import organizatorRoutes from './routes/organizator.js';
import oceneRouter from './routes/ocene.js';
import priljubljeniRouter from './routes/priljubljeni.js';
import statistikaRouter from './routes/statistika.js';
import obvestilaRoutes from './routes/obvestila.js';
import novicnikRoutes from './routes/novicnik.js';
import './services/opomnik.js';

const app = express();

if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

const PORT = process.env.PORT || 3000;
const dovoljeniOrigini = (process.env.FRONTEND_ORIGIN || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

dovoljeniOrigini.push(`http://localhost:${PORT}`, `http://127.0.0.1:${PORT}`);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (dovoljeniOrigini.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin "${origin}" ni dovoljen.`));
  },
  credentials: true,
}));

app.use(express.json());
app.use(express.static('public'));
app.use(express.static(path.join(__dirname, '..', 'client')));

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
  next();
});

app.get('/api/zdravje', (req, res) => {
  res.json({ status: 'OK', cas: new Date().toISOString() });
});

const obcutljiviLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { napaka: 'Preveč poskusov. Poskusi znova čez nekaj minut.' },
});

app.use(['/api/prijava', '/api/registracija', '/api/pozabljeno-geslo', '/api/reset-geslo'], obcutljiviLimit);

app.use('/api', authRoutes);
app.use('/api', pozabljenoGesloRoutes);
app.use('/api', profilRoutes);
app.use('/api', prosnjaRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', dogodkiRoutes);
app.use('/api', dodajDogodekRoutes);
app.use('/api/admin', adminDogodkiRoutes);
app.use('/api/admin', adminOceneRoutes);
app.use('/api/organizatorji', organizatorjiRuter);
app.use('/api/organizator', organizatorRoutes);
app.use('/api', oceneRouter);
app.use('/api', priljubljeniRouter);
app.use('/api', statistikaRouter);
app.use('/api', obvestilaRoutes);
app.use('/api', novicnikRoutes);

app.use('/api', (req, res) => {
  res.status(404).json({ napaka: 'Endpoint ne obstaja.' });
});

app.use((err, req, res, next) => {
  console.error('Nepričakovana napaka:', err);
  res.status(500).json({ napaka: 'Notranja napaka strežnika.' });
});

app.listen(PORT, () => {
  console.log(`✓ Strežnik teče na http://localhost:${PORT}`);
  console.log(`  - Zdravje:      GET  http://localhost:${PORT}/api/zdravje`);
  console.log(`  - Registracija: POST http://localhost:${PORT}/api/registracija`);
  console.log(`  - Prijava:      POST http://localhost:${PORT}/api/prijava`);
  console.log(`  - Moj profil:   GET  http://localhost:${PORT}/api/me (zahteva token)`);
});