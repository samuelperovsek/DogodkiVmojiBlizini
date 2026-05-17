import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import adminRoutes from './routes/admin.js';
import dogodkiRoutes from './routes/dogodki.js';

const app = express();

const dovoljeniOrigini = (process.env.FRONTEND_ORIGIN || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (dovoljeniOrigini.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin "${origin}" ni dovoljen.`));
  },
  credentials: true,
}));

app.use(express.json());

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
  next();
});

app.get('/api/zdravje', (req, res) => {
  res.json({ status: 'OK', cas: new Date().toISOString() });
});

app.use('/api', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', dogodkiRoutes);

app.use('/api', (req, res) => {
  res.status(404).json({ napaka: 'Endpoint ne obstaja.' });
});

app.use((err, req, res, next) => {
  console.error('Nepričakovana napaka:', err);
  res.status(500).json({ napaka: 'Notranja napaka strežnika.' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✓ Strežnik teče na http://localhost:${PORT}`);
  console.log(`  - Zdravje:      GET  http://localhost:${PORT}/api/zdravje`);
  console.log(`  - Registracija: POST http://localhost:${PORT}/api/registracija`);
  console.log(`  - Prijava:      POST http://localhost:${PORT}/api/prijava`);
  console.log(`  - Moj profil:   GET  http://localhost:${PORT}/api/me (zahteva token)`);
});
