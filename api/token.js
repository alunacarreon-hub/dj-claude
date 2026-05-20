export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  const { code, code_verifier, redirect_uri } = req.body;
  const credentials = Buffer.from('4cdcc32bbbdb4f68baccd0f09ec5498c:d226da835c36416cb373cf7dfb752e75').toString('base64');
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${credentials}`
    },
    body: new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri, code_verifier }),
  });
  const data = await response.json();
  res.status(response.status).json(data);
}
