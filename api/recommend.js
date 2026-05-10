export const config = { api: { bodyParser: { sizeLimit: '1mb' } } };
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  const { prompt, token } = req.body;
  if (!prompt || !token) return res.status(400).json({ error: 'missing prompt or token' });
  const p = prompt.toLowerCase();
  const genreMap = {'rock':'rock','pop':'pop','house':'house','reggaeton':'reggaeton','latin':'latin','jazz':'jazz','blues':'blues','metal':'metal','hip hop':'hip-hop','rap':'hip-hop','electronic':'electronic','dance':'dance','classical':'classical','country':'country','r&b':'r-n-b','soul':'soul','funk':'funk','disco':'disco','salsa':'salsa','cumbia':'cumbia','lo-fi':'chill','lofi':'chill','ambient':'ambient','indie':'indie','alternativo':'alternative','alternative':'alternative','español':'latin','mexicano':'latin'};
  const audioFeatures = {};
  if(p.includes('bailar')||p.includes('baile')||p.includes('dance')||p.includes('fiesta')||p.includes('party')){audioFeatures.target_danceability=0.85;audioFeatures.target_energy=0.8;}
  if(p.includes('trabajar')||p.includes('estudiar')||p.includes('focus')||p.includes('concentrar')){audioFeatures.target_energy=0.5;audioFeatures.target_instrumentalness=0.3;}
  if(p.includes('romántic')||p.includes('romantica')||p.includes('amor')||p.includes('love')||p.includes('cenar')){audioFeatures.target_valence=0.6;audioFeatures.target_energy=0.4;}
  if(p.includes('triste')||p.includes('sad')||p.includes('llorar')){audioFeatures.target_valence=0.2;audioFeatures.target_energy=0.3;}
  if(p.includes('gym')||p.includes('ejercicio')||p.includes('correr')||p.includes('entrenar')){audioFeatures.target_energy=0.95;audioFeatures.target_tempo=140;}
  if(p.includes('relax')||p.includes('dormir')||p.includes('calma')||p.includes('tranquil')){audioFeatures.target_energy=0.2;audioFeatures.target_tempo=80;}
  const seedGenres = [];
  for(const[key,val]of Object.entries(genreMap)){if(p.includes(key)&&seedGenres.length<2)seedGenres.push(val);}
  const seedArtists = [];
  const knownArtists=['luis miguel','mana','maná','cafe tacuba','shakira','bad bunny','j balvin','ozuna','maluma','nirvana','metallica','radiohead','coldplay','the beatles','michael jackson','madonna','drake','taylor swift','beyonce','rihanna','the weeknd','ed sheeran','adele','eminem'];
  let artistQuery = null;
  for(const artist of knownArtists){if(p.includes(artist)){artistQuery=artist;break;}}
  if(!artistQuery){const kws=['de ','estilo ','similar a ','como '];for(const kw of kws){const idx=p.indexOf(kw);if(idx!==-1){artistQuery=p.substring(idx+kw.length,idx+kw.length+25).trim();break;}}}
  if(artistQuery){const sr=await fetch('https://api.spotify.com/v1/search?q='+encodeURIComponent(artistQuery)+'&type=artist&limit=1',{headers:{Authorization:'Bearer '+token}});const sd=await sr.json();if(sd.artists?.items?.[0]){seedArtists.push(sd.artists.items[0].id);if(!seedGenres.length&&sd.artists.items[0].genres?.[0])seedGenres.push(sd.artists.items[0].genres[0].replace(/ /g,'-').substring(0,20));}}
  if(!seedGenres.length&&!seedArtists.length)seedGenres.push('pop');
  const yearMatch=p.match(/\b(19|20)\d{2}\b/);if(yearMatch){const yr=parseInt(yearMatch[0]);if(yr<2000)audioFeatures.target_acousticness=0.4;}
  const params=new URLSearchParams({limit:100,...audioFeatures,...(seedGenres.length?{seed_genres:seedGenres.slice(0,2).join(',')}:{}),...(seedArtists.length?{seed_artists:seedArtists.slice(0,2).join(',')}:{})});
  const rr=await fetch('https://api.spotify.com/v1/recommendations?'+params,{headers:{Authorization:'Bearer '+token}});
  const rd=await rr.json();
  if(!rd.tracks?.length)return res.status(200).json({tracks:[],playlist_name:prompt});
  const tracks=rd.tracks.map(t=>({uri:t.uri,title:t.name,artist:t.artists.map(a=>a.name).join(', '),duration:Math.floor(t.duration_ms/60000)+':'+String(Math.floor((t.duration_ms%60000)/1000)).padStart(2,'0'),art:t.album?.images?.[1]?.url||t.album?.images?.[0]?.url}));
  res.status(200).json({tracks,playlist_name:prompt});
}