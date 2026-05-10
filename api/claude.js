export const config = { api: { bodyParser: { sizeLimit: '1mb' } } };
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  const body = req.body;
  const prompt = body?.prompt;
  const messages = prompt
    ? [{ role: 'user', content: prompt }]
    : body?.messages;
  const system = prompt
    ? 'Eres un DJ experto. Devuelve SOLO JSON valido sin texto extra ni markdown: {"playlist_name":"nombre","tracks":[{"title":"cancion","artist":"artista"}]}. Entre 20 y 25 canciones reales.'
    : body?.system;
  if (!messages) return res.status(400).json({ error: 'missing messages or prompt' });
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 2000, system, messages }),
  });
  const data = await response.json();
  res.status(response.status).json(data);
}
