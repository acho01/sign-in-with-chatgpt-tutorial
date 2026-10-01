// usage.mjs — how much of the subscription did our app use?
import { readFileSync } from 'node:fs';

const calls = readFileSync(new URL('usage.jsonl', import.meta.url), 'utf8')
  .trim().split('\n').map(line => JSON.parse(line));

console.table(calls);

const total = calls.reduce((sum, call) => sum + call.total, 0);
console.log(`Model calls: ${calls.length}. Tokens in total: ${total}.`);
