node -e "
const fs = require('fs');
let code = fs.readFileSync('app.js', 'utf8');

const oldLogin = \`function login(){const url=\\\`https://accounts.spotify.com/authorize?client_id=\\\${CLIENT_ID}&response_type=token&redirect_uri=\\\${encodeURIComponent(REDIRECT_URI)}&scope=\\\${encodeURIComponent(SCOPES)}\\\`;window.location.href=url;}\`;

const newLogin = \`async function generateVerifier(){const arr=new Uint8Array(32);crypto.getRandomValues(arr);const v=Array.from(arr).map(b=>b.toString(16).padStart(2,'0')).join('');sessionStorage.setItem('pkce_verifier',v);return v;}
async function generateChallenge(v){const d=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(v));return btoa(String.fromCharCode(...new Uint8Array(d))).replace(/[+]/g,'-').replace(/\\//g,'_').replace(/=/g,'');}
async function login(){const v=await generateVerifier();const ch=await generateChallenge(v);const url=\\\`https://accounts.spotify.com/authorize?client_id=\\\${CLIENT_ID}&response_type=code&redirect_uri=\\\${encodeURIComponent(REDIRECT_URI)}&scope=\\\${encodeURIComponent(SCOPES)}&code_challenge_method=S256&code_challenge=\\\${ch}\\\`;window.location.href=url;}\`;

code = code.replace(oldLogin, newLogin);
fs.writeFileSync('app.js', code);
console.log('done');
"
