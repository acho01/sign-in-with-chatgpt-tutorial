// login.mjs — sign in with ChatGPT and save the tokens.
import { createServer } from 'node:http';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const FILE = new URL('.tokens.json', import.meta.url);
const saved = existsSync(FILE) ? JSON.parse(readFileSync(FILE, 'utf8')) : {};
const REDIRECT = 'http://127.0.0.1:3211/auth/callback';

// PKCE: a random secret, and the hash of that secret.
const verifier = randomBytes(32).toString('base64url');
const challenge = createHash('sha256').update(verifier).digest('base64url');
const state = randomBytes(16).toString('base64url');
const hostId = saved.host_id ?? `urn:uuid:${randomUUID()}`;

// 1. Send the user to OpenAI. We send only the hash, never the secret.
const params = new URLSearchParams({
  client_id: saved.client_id ?? 'dynamic_agent_client',
  ext_agent_host_id: hostId,
  redirect_uri: REDIRECT,
  response_type: 'code',
  scope: 'openid profile email offline_access resource.invoke chatgpt.tokens.use.direct',
  resource: 'https://api.openai.com/v1',
  state,
  code_challenge: challenge,
  code_challenge_method: 'S256',
});
if (!saved.client_id) params.set('agent_name_hint', 'ChatGPT Tutorial');
console.log('Open this link to sign in:\n');
console.log('https://auth.openai.com/api/accounts/authorize?' + params + '\n');

// 2. After sign-in, OpenAI sends the browser back here with a one-time code.
createServer(async (req, res) => {
  const back = new URL(req.url, REDIRECT);
  if (back.pathname !== '/auth/callback') return res.end();
  if (back.searchParams.get('state') !== state) return res.end('Wrong state.');
  const clientId = back.searchParams.get('client_id') ?? saved.client_id;

  // 3. Trade the code and the secret for tokens.
  const reply = await fetch('https://auth.openai.com/api/accounts/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: clientId,
      code: back.searchParams.get('code'),
      code_verifier: verifier,
      redirect_uri: REDIRECT,
      resource: 'https://api.openai.com/v1',
    }),
  });
  const tokens = await reply.json();
  if (!reply.ok) {
    console.log('Sign-in failed:', tokens);
    res.end('Sign-in failed. Look at the terminal.');
    process.exit(1);
  }

  // 4. Save the tokens. This file works like a password: never commit it.
  writeFileSync(FILE, JSON.stringify({
    client_id: clientId,
    host_id: hostId,
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: Date.now() + tokens.expires_in * 1000,
  }, null, 2), { mode: 0o600 });

  res.setHeader('Content-Type', 'text/html');
  res.end('<body style="font: 28px system-ui; text-align: center; margin-top: 30vh">'
    + 'Signed in &#10003;<br><small>You can close this tab.</small></body>');
  console.log('Signed in!');
  console.log('Allowed:', tokens.scope);
  console.log('The access token is valid for', tokens.expires_in / 60, 'minutes.');
  process.exit(0);
}).listen(3211, '127.0.0.1');
