// 01-hello.mjs — the first call, with nothing hidden.
import { readFileSync } from 'node:fs';

const file = new URL('.tokens.json', import.meta.url);
const { access_token } = JSON.parse(readFileSync(file, 'utf8'));

const res = await fetch('https://api.openai.com/v1/responses', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${access_token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'gpt-5.6-luna',
    input: [{ role: 'user', content: 'Why is the sky blue? One sentence.' }],
    store: false,
    stream: true,
  }),
});

let buffer = '';
for await (const chunk of res.body.pipeThrough(new TextDecoderStream())) {
  buffer += chunk;
  const lines = buffer.split('\n');
  buffer = lines.pop();
  for (const line of lines) {
    if (!line.startsWith('data: ')) continue;
    const event = JSON.parse(line.slice(6));
    if (event.type === 'response.output_text.delta') process.stdout.write(event.delta);
    if (event.type === 'response.completed') {
      const { input_tokens, output_tokens, total_tokens } = event.response.usage;
      console.log('\n\nusage:', { input_tokens, output_tokens, total_tokens });
    }
  }
}
