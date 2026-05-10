export const config = { api: { bodyParser: { sizeLimit: '1mb' } } };
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const body = req.body;
  const messages = body?.messages;
  const system = body?.system || 'Eres un DJ experto. Devuelve SOLO JSON valido sin texto extra ni markdown: {"playlist_name":"nombre","tracks":[{"title":"cancion","artist":"artista"}]}. Devuelve exactamente 30 canciones reales y conocidas.';
  if (!messages) return res.status(400).json({ error: 'missing messages' });

  async function callClaude(msgs) {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 4000, system, messages: msgs }),
    });

    // Handle non-OK responses before trying to parse JSON
    if (!r.ok) {
      const text = await r.text();
      if (r.status === 429) throw new Error('rate_limit');
      throw new Error(`API error ${r.status}: ${text.slice(0, 100)}`);
    }

    return r.json();
  }

  // First batch - 30 songs
  let data1;
  try {
    data1 = await callClaude(messages);
  } catch (e) {
    const msg = e.message === 'rate_limit'
      ? 'Demasiadas peticiones, espera unos segundos e intenta de nuevo.'
      : 'Error conectando con el DJ. Intenta de nuevo.';
    return res.status(429).json({ error: msg });
  }

  let text1 = data1.content?.[0]?.text?.replace(/```json|```/g, '').trim() || '{"tracks":[]}';
  let tracks1 = [], playlistName = 'DJ Claude Mix';
  try { const p = JSON.parse(text1); tracks1 = p.tracks || []; playlistName = p.playlist_name || playlistName; } catch(e) {}

  // Second batch - 30 different songs (best effort, skip if rate limited)
  let tracks2 = [];
  try {
    const used = tracks1.slice(0, 10).map(t => t.title).join(', ');
    const msgs2 = [...messages, { role: 'user', content: 'Dame otras 30 canciones DIFERENTES, no incluyas estas: ' + used }];
    const data2 = await callClaude(msgs2);
    let text2 = data2.content?.[0]?.text?.replace(/```json|```/g, '').trim() || '{"tracks":[]}';
    tracks2 = JSON.parse(text2).tracks || [];
  } catch(e) {
    // If second call fails (rate limit, etc.), just use first batch
    console.warn('Second Claude call failed, using first batch only:', e.message);
  }

  const allTracks = [...tracks1, ...tracks2];
  res.status(200).json({
    content: [{ type: 'text', text: JSON.stringify({ playlist_name: playlistName, tracks: allTracks }) }]
  });
}
