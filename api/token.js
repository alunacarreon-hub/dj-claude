export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { code, code_verifier, redirect_uri } = req.body;
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: '70303639118c4043ade1fb10ace3d92a',
      grant_type: 'authorization_code',
      code,
      redirect_uri,
      code_verifier,
    }),
  });
  const data = await response.json();
  res.status(response.status).json(data);
}
