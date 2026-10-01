// 01-ask.mjs — the same question, now with the helper.
import { ask } from './chatgpt.mjs';

const { text } = await ask({
  input: [{ role: 'user', content: 'Why is the sky blue? One sentence.' }],
});
console.log(text);
