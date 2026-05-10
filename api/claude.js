export const config = { api: { bodyParser: { sizeLimit: '1mb' } } };
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  const body = req.body;
  const messages = body?.messages;
  const system = body?.system || 'Eres un DJ experto. Devuelve SOLO JSON valido: {"playlist_name":"nombre","tracks":[{"title":"cancion","artist":"artista"}]}. Devuelve exactamente 30 canciones reales.';
  if (!messages) return res.status(400).json({ error: 'missing messages' });

  async function callClaude(extraInstruction) {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 4000, system, messages: [...messages, ...(extraInstruction ? [{role:'assistant',content:'{"playlist_name":'},{role:'user',content:extraInstruction}] : [])] }),
    });
    return r.json();
  }

  // First batch
  const data1 = await callClaude();
  const text1 = data1.content?.[0]?.text?.replace(/```json|```/g,'').trim() || '{"tracks":[]}';
  let tracks1 = [];
  try { tracks1 = JSON.parse(text1).tracks || []; } catch(e) {}

  // Second batch - ask for different songs
  const used = tracks1.map(t => t.title).join(', ');
  const data2 = await callClaude(`Dame otras 30 canciones DIFERENTES a estas que ya incluiste: ${used.substring(0,200)}`);
  const text2 = data2.content?.[0]?.text?.replace(/```json|```/g,'').trim() || '{"tracks":[]}';
  let tracks2 = [];
  try { tracks2 = JSON.parse(text2).tracks || []; } catch(e) {}

  const allTracks = [...tracks1, ...tracks2];
  const playlistName = JSON.parse(text1)?.playlist_name || 'DJ Claude Mix';

  res.status(200).json({
    content: [{ type: 'text', text: JSON.stringify({ playlist_name: playlistName, tracks: allTracks }) }]
  });
}
