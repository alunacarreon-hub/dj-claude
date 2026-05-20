export const config = { api: { bodyParser: { sizeLimit: '1mb' } } };
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const body = req.body;
  const messages = body?.messages;

  const system = `Eres un DJ experto. Devuelve SOLO JSON válido sin texto extra ni markdown:
{"playlist_name":"nombre","seed_tracks":[{"title":"cancion","artist":"artista"}],"explicit":false}

Reglas ESTRICTAS:
- Devuelve exactamente 30 canciones.
- Si el usuario pide canciones de UN artista específico, devuelve SOLO canciones de ese artista. No incluyas otros artistas similares.
- Si el usuario pide un género o mood sin especificar artista, mezcla varios artistas representativos.
- Todas las canciones deben ser reales y existir en Spotify.
- El campo "explicit" debe ser true o false:
  * Si el prompt menciona: trabajo, restaurante, oficina, familia, niños, clean, sin groserías → explicit: false. Usa artistas con catálogo limpio (Ed Sheeran, Bruno Mars, Coldplay, Adele, The Beatles, Dua Lipa, Taylor Swift, Shakira, Luis Miguel, Alejandro Sanz, Maná, Juanes).
  * Si el prompt es casual sin restricciones → explicit: true.`;

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
      body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 1500, system, messages }),
    });
  } catch(e) {
    return res.status(500).json({ error: 'Error conectando con el DJ.' });
  }

  if (!r.ok) {
    if (r.status === 429) return res.status(429).json({ error: 'Demasiadas peticiones, espera unos segundos.' });
    return res.status(500).json({ error: 'Error del DJ. Intenta de nuevo.' });
  }

  const data = await r.json();
  res.status(200).json(data);
}
