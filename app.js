const CLIENT_ID='70303639118c4043ade1fb10ace3d92a';
const REDIRECT_URI='https://dj-claude-teal.vercel.app/callback';
const SCOPES='user-read-playback-state user-modify-playback-state user-read-currently-playing playlist-modify-public playlist-modify-private user-library-modify streaming user-read-email user-read-private';
const EXAMPLES=['"éxitos de Luis Miguel"','"música para trabajar bailando en español"','"rock en español de los 90s"','"canciones románticas para cenar"','"lo-fi para estudiar de noche"'];
let accessToken=null,deviceId=null,currentTracks=[],currentIdx=0,isPlaying=false,waveInterval=null,exampleInterval=null,exampleIdx=0,recognition=null,likedTracks=new Set(),playlistOpen=false,spotifyPlayer=null;
async function generateVerifier(){const arr=new Uint8Array(32);crypto.getRandomValues(arr);const v=Array.from(arr).map(b=>b.toString(16).padStart(2,'0')).join('');sessionStorage.setItem('pkce_verifier',v);return v;}
async function generateChallenge(v){const d=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(v));return btoa(String.fromCharCode(...new Uint8Array(d))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=/g,'');}
async function login(){const v=await generateVerifier();const ch=await generateChallenge(v);window.location.href=`https://accounts.spotify.com/authorize?client_id=${CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=${encodeURIComponent(SCOPES)}&code_challenge_method=S256&code_challenge=${ch}`;}
function logout(){sessionStorage.removeItem('spotify_token');accessToken=null;if(spotifyPlayer)spotifyPlayer.disconnect();showAuth();}
async function handleCallback(){const params=new URLSearchParams(window.location.search);const code=params.get('code');if(!code)return false;const verifier=sessionStorage.getItem('pkce_verifier');const res=await fetch('/api/token',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code,code_verifier:verifier,redirect_uri:REDIRECT_URI})});const data=await res.json();if(data.access_token){accessToken=data.access_token;sessionStorage.setItem('spotify_token',data.access_token);window.history.replaceState({},'','/');return true;}console.error('Token error:',data);return false;}
window.addEventListener('load',async()=>{
const params=new URLSearchParams(window.location.search);
if(params.get('code')){const ok=await handleCallback();if(ok){showMain();bindEvents();setupWaveform();rotateExamples();return;}}
const saved=sessionStorage.getItem('spotify_token');
if(saved){accessToken=saved;showMain();}else{showAuth();}
bindEvents();setupWaveform();rotateExamples();
});
function showAuth(){document.getElementById('screen-auth').classList.add('active');document.getElementById('screen-main').classList.remove('active');}
function showMain(){document.getElementById('screen-auth').classList.remove('active');document.getElementById('screen-main').classList.add('active');setPhase('idle');initSpotifyPlayer();}
function initSpotifyPlayer(){if(!window.Spotify){const s=document.createElement('script');s.src='https://sdk.scdn.co/spotify-player.js';document.head.appendChild(s);}
window.onSpotifyWebPlaybackSDKReady=()=>{spotifyPlayer=new Spotify.Player({name:'DJ Claude',getOAuthToken:cb=>cb(accessToken),volume:0.8});
spotifyPlayer.addListener('ready',({device_id})=>{deviceId=device_id;});
spotifyPlayer.addListener('player_state_changed',state=>{if(!state)return;isPlaying=!state.paused;updatePlayButton();if(state.track_window?.current_track)updateNowPlayingFromSDK(state.track_window.current_track,state);});
spotifyPlayer.connect();};}
function updateNowPlayingFromSDK(track,state){document.getElementById('track-title').textContent=track.name;document.getElementById('track-artist').textContent=track.artists.map(a=>a.name).join(', ');const art=document.getElementById('track-art');if(track.album?.images?.[0]?.url)art.innerHTML=`<img src="${track.album.images[0].url}"/>`;document.getElementById('time-total').textContent=msToTime(track.duration_ms);document.getElementById('time-current').textContent=msToTime(state.position);document.getElementById('progress-fill').style.width=`${(state.position/track.duration_ms)*100}%`;}
function setPhase(phase){['idle','listening','thinking','result'].forEach(p=>{const el=document.getElementById(`phase-${p}`);if(el)el.classList.remove('active');});const el=document.getElementById(`phase-${phase}`);if(el)el.classList.add('active');const glow=document.getElementById('ambient-glow');glow.className='ambient-glow '+(phase!=='idle'?phase:'');if(phase==='idle')startExampleRotation();else stopExampleRotation();if(phase==='listening')startWave();else stopWave();}
function rotateExamples(){document.getElementById('example-text').textContent=EXAMPLES[exampleIdx];}
function startExampleRotation(){exampleInterval=setInterval(()=>{exampleIdx=(exampleIdx+1)%EXAMPLES.length;const el=document.getElementById('example-text');el.style.opacity=0;setTimeout(()=>{el.textContent=EXAMPLES[exampleIdx];el.style.opacity=1;},300);},3000);}
function stopExampleRotation(){clearInterval(exampleInterval);}
function setupWaveform(){const wf=document.getElementById('waveform');for(let i=0;i<36;i++){const b=document.createElement('div');b.className='wave-bar';b.style.height='4px';wf.appendChild(b);}}
function startWave(){const bars=document.querySelectorAll('.wave-bar');waveInterval=setInterval(()=>{bars.forEach((bar,i)=>{const h=Math.max(4,Math.sin(Date.now()/200+i*0.5)*12+14+Math.random()*10);bar.style.height=h+'px';});},60);}
function stopWave(){clearInterval(waveInterval);document.querySelectorAll('.wave-bar').forEach(b=>b.style.height='4px');}
function startListening(){const SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR){alert('Usa Chrome para reconocimiento de voz.');return;}setPhase('listening');recognition=new SR();recognition.lang='es-MX';recognition.continuous=false;recognition.interimResults=false;recognition.onresult=(e)=>{processPrompt(e.results[0][0].transcript);};recognition.onerror=()=>{setPhase('idle');};recognition.onend=()=>{if(document.getElementById('phase-listening').classList.contains('active'))setPhase('idle');};recognition.start();}
function stopListening(){if(recognition){recognition.stop();recognition=null;}}
async function callClaude(prompt){const res=await fetch('/api/claude',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model:'claude-sonnet-4-20250514',max_tokens:1000,system:'Eres un DJ experto. Devuelve SOLO JSON válido sin texto extra ni markdown con este formato exacto: {"playlist_name":"nombre","tracks":[{"title":"cancion","artist":"artista"}]}. Entre 8 y 15 canciones reales y conocidas.',messages:[{role:'user',content:prompt}]})});const data=await res.json();return JSON.parse(data.content[0].text.replace(/```json|```/g,'').trim());}
async function spotifySearch(title,artist){const q=encodeURIComponent(`track:${title} artist:${artist}`);const res=await fetch(`https://api.spotify.com/v1/search?q=${q}&type=track&limit=1`,{headers:{Authorization:`Bearer ${accessToken}`}});const data=await res.json();return data.tracks?.items?.[0]||null;}
async function getMyId(){const res=await fetch('https://api.spotify.com/v1/me',{headers:{Authorization:`Bearer ${accessToken}`}});const data=await res.json();return data.id;}
async function createPlaylist(userId,name){const res=await fetch(`https://api.spotify.com/v1/users/${userId}/playlists`,{method:'POST',headers:{Authorization:`Bearer ${accessToken}`,'Content-Type':'application/json'},body:JSON.stringify({name,description:'Creada por DJ Claude',public:false})});const data=await res.json();return data.id;}
async function addTracksToPlaylist(pid,uris){await fetch(`https://api.spotify.com/v1/playlists/${pid}/tracks`,{method:'POST',headers:{Authorization:`Bearer ${accessToken}`,'Content-Type':'application/json'},body:JSON.stringify({uris})});}
async function playTracks(uris){if(!deviceId)return;await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`,{method:'PUT',headers:{Authorization:`Bearer ${accessToken}`,'Content-Type':'application/json'},body:JSON.stringify({uris})});}
async function togglePlayPause(){if(spotifyPlayer)await spotifyPlayer.togglePlay();}
async function processPrompt(prompt){
setPhase('thinking');
const display=document.getElementById('prompt-display');
display.innerHTML='"<span id="typed"></span><span class="cursor-blink"></span>"';
const typed=document.getElementById('typed');
for(let i=0;i<=prompt.length;i++){typed.textContent=prompt.slice(0,i);await sleep(35);}
try{
const result=await callClaude(prompt);
const found=[];
for(const t of result.tracks){const track=await spotifySearch(t.title,t.artist);if(track)found.push({uri:track.uri,title:track.name,artist:track.artists.map(a=>a.name).join(', '),duration:msToTime(track.duration_ms),art:track.album?.images?.[1]?.url||track.album?.images?.[0]?.url});}
if(!found.length){alert('No encontré canciones. Intenta de nuevo.');setPhase('idle');return;}
currentTracks=found;currentIdx=0;
const userId=await getMyId();
const pid=await createPlaylist(userId,result.playlist_name||'DJ Claude Mix');
await addTracksToPlaylist(pid,found.map(t=>t.uri));
await playTracks(found.map(t=>t.uri));
isPlaying=true;
document.getElementById('prompt-recap').textContent=`"${prompt}"`;
renderNowPlaying(0);renderPlaylist();setPhase('result');
}catch(err){console.error(err);if(String(err).includes('401')){sessionStorage.removeItem('spotify_token');alert('Sesión expirada.');showAuth();}else{alert('Algo falló. Intenta de nuevo.');setPhase('idle');}}}
function renderNowPlaying(idx){const t=currentTracks[idx];if(!t)return;document.getElementById('track-title').textContent=t.title;document.getElementById('track-artist').textContent=t.artist;document.getElementById('time-total').textContent=t.duration;const art=document.getElementById('track-art');art.innerHTML=t.art?`<img src="${t.art}"/>`:'🎵';document.getElementById('btn-like').textContent=likedTracks.has(idx)?'💚':'🤍';updatePlayButton();}
function renderPlaylist(){const el=document.getElementById('playlist');el.innerHTML='';document.getElementById('playlist-count').textContent=`Playlist · ${currentTracks.length} canciones`;currentTracks.forEach((t,i)=>{const item=document.createElement('div');item.className='playlist-item'+(i===currentIdx?' active':'');item.innerHTML=`<div class="playlist-num">${i===currentIdx&&isPlaying?'♪':i+1}</div><div class="playlist-info"><div class="playlist-title">${t.title}</div><div class="playlist-artist">${t.artist}</div></div><div class="playlist-dur">${t.duration}</div>`;item.querySelector('.playlist-info').onclick=()=>jumpToTrack(i);el.appendChild(item);});}
function jumpToTrack(idx){currentIdx=idx;renderNowPlaying(idx);renderPlaylist();playTracks(currentTracks.slice(idx).map(t=>t.uri));isPlaying=true;updatePlayButton();}
function toggleLike(idx){likedTracks.has(idx)?likedTracks.delete(idx):likedTracks.add(idx);document.getElementById('btn-like').textContent=likedTracks.has(currentIdx)?'💚':'🤍';}
function updatePlayButton(){document.getElementById('btn-play').textContent=isPlaying?'⏸':'▶';}
function msToTime(ms){const s=Math.floor(ms/1000),m=Math.floor(s/60);return`${m}:${String(s%60).padStart(2,'0')}`;}
function sleep(ms){return new Promise(r=>setTimeout(r,ms));}
function bindEvents(){
document.getElementById('btn-login').addEventListener('click',login);
document.getElementById('btn-logout').addEventListener('click',logout);
document.getElementById('btn-mic-idle').addEventListener('click',startListening);
document.getElementById('btn-mic-listening').addEventListener('click',()=>{stopListening();setPhase('idle');});
document.getElementById('btn-play').addEventListener('click',togglePlayPause);
document.getElementById('btn-next').addEventListener('click',()=>{if(spotifyPlayer)spotifyPlayer.nextTrack();});
document.getElementById('btn-prev').addEventListener('click',()=>{if(spotifyPlayer)spotifyPlayer.previousTrack();});
document.getElementById('btn-like').addEventListener('click',()=>toggleLike(currentIdx));
document.getElementById('btn-playlist-toggle').addEventListener('click',()=>{playlistOpen=!playlistOpen;document.getElementById('playlist').style.display=playlistOpen?'flex':'none';document.getElementById('playlist-chevron').textContent=playlistOpen?'▲':'▼';});
document.getElementById('btn-new-prompt').addEventListener('click',()=>{likedTracks.clear();currentTracks=[];setPhase('idle');});}
// v2 PKCE
