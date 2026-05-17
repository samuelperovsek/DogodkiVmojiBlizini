import jwt from 'jsonwebtoken';

export function zahtevajPrijavo(req, res, next) {
  const auth = req.headers.authorization;

  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ napaka: 'Manjka avtorizacijski token.' });
  }

  const token = auth.slice(7);

  try {
    const podatki = jwt.verify(token, process.env.JWT_SECRET);
    req.uporabnik = podatki;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ napaka: 'Token je potekel. Prosim, prijavite se znova.' });
    }
    return res.status(401).json({ napaka: 'Neveljaven token.' });
  }
}

export function zahtevajAdmina(req, res, next) {
  if (req.uporabnik?.vloga !== 'admin') {
    return res.status(403).json({ napaka: 'Dostop dovoljen samo administratorjem.' });
  }
  next();
}
