// chatgpt.mjs — our whole "SDK". One function: ask().
import { readFileSync, writeFileSync, appendFileSync } from 'node:fs';
import { basename } from 'node:path';

const FILE = new URL('.tokens.json', import.meta.url);
const USAGE = new URL('usage.jsonl', import.meta.url);

// The access token lives for one hour. When it is old, get a new one.
async function getToken() {
  const saved = JSON.parse(readFileSync(FILE, 'utf8'));
  if (Date.now() < saved.expires_at - 60_000) return saved.access_token;

  const reply = await fetch('https://auth.openai.com/api/accounts/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: saved.client_id,
      refresh_token: saved.refresh_token,
      resource: 'https://api.openai.com/v1',
    }),
  });
  const fresh = await reply.json();
  if (!reply.ok) throw new Error('Could not renew the token. Run login.mjs again.');
  saved.access_token = fresh.access_token;
  saved.refresh_token = fresh.refresh_token;
  saved.expires_at = Date.now() + fresh.expires_in * 1000;
  writeFileSync(FILE, JSON.stringify(saved, null, 2), { mode: 0o600 });
  return saved.access_token;
}

// One model call. Returns the text, the output items, and the usage.
export async function ask(body) {
  const res = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${await getToken()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model: 'gpt-5.6-luna', store: false, stream: true, ...body }),
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);

  let text = '', usage, buffer = '';
  const items = [];
  for await (const chunk of res.body.pipeThrough(new TextDecoderStream())) {
    buffer += chunk;
    const lines = buffer.split('\n');
    buffer = lines.pop();
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const event = JSON.parse(line.slice(6));
      if (event.type === 'response.output_text.delta') text += event.delta;
      if (event.type === 'response.output_item.done') items.push(event.item);
      if (event.type === 'response.completed') usage = event.response.usage;
      if (event.type === 'response.failed') throw new Error(event.response.error.message);
    }
  }

  // Write one line per call, so we can count our usage later.
  appendFileSync(USAGE, JSON.stringify({
    script: basename(process.argv[1]),
    input: usage.input_tokens,
    output: usage.output_tokens,
    total: usage.total_tokens,
  }) + '\n');

  return { text, items, usage };
}
