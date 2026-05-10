export const config = { api: { bodyParser: { sizeLimit: '1mb' } } };
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const body = req.body;
  const messages = body?.messages;
  // Solo pedimos 5 canciones seed ahora
  const system = 'Eres un DJ experto. Devuelve SOLO JSON válido sin texto extra ni markdown: {"playlist_name":"nombre","seed_tracks":[{"title":"cancion","artist":"artista"}]}. Devuelve exactamente 5 canciones reales, conocidas y representativas del mood pedido. Estas canciones se usarán como semilla para generar una playlist completa.';
  if (!messages) return res.status(400).json({ error: 'missing messages' });

  let r;
  try {
    r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 500, system, messages }),
    });
  } catch(e) {
    return res.status(500).json({ error: 'Error conectando con el DJ.' });
  }

  if (!r.ok) {
    const text = await r.text();
    if (r.status === 429) return res.status(429).json({ error: 'Demasiadas peticiones, espera unos segundos.' });
    return res.status(500).json({ error: 'Error del DJ. Intenta de nuevo.' });
  }

  const data = await r.json();
  res.status(200).json(data);
}
