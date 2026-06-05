const API_URL = 'https://api.brevo.com/v3/smtp/email';

export const FROM = process.env.EMAIL_FROM || 'Eventli <info@eventli.tech>';

function razclenitevPosiljatelja(from) {
  const ujem = (from || '').match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/);
  if (ujem) return { name: ujem[1].trim() || 'Eventli', email: ujem[2].trim() };
  return { name: 'Eventli', email: (from || '').trim() };
}

export const transporter = {
  async sendMail({ from, to, subject, html, text }) {
    const posiljatelj = razclenitevPosiljatelja(from || FROM);
    const prejemniki = (Array.isArray(to) ? to : [to]).map(naslov => ({ email: naslov }));

    const krmilnik = new AbortController();
    const casovnik = setTimeout(() => krmilnik.abort(), 15000);

    try {
      const odgovor = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'api-key': process.env.BREVO_API_KEY || '',
          'content-type': 'application/json',
          'accept': 'application/json',
        },
        body: JSON.stringify({
          sender: posiljatelj,
          to: prejemniki,
          subject,
          htmlContent: html,
          ...(text ? { textContent: text } : {}),
        }),
        signal: krmilnik.signal,
      });

      if (!odgovor.ok) {
        const besedilo = await odgovor.text().catch(() => '');
        throw new Error(`Brevo API ${odgovor.status}: ${besedilo}`);
      }

      return await odgovor.json().catch(() => ({}));
    } finally {
      clearTimeout(casovnik);
    }
  },

  async verify() {
    return true;
  },
};
