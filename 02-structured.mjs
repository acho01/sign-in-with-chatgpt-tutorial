// 02-structured.mjs — text in, a real object out.
import { ask } from './chatgpt.mjs';

const note = 'Met Maya Chen from Northstar Studio today. Her email is maya@example.com.';

const { text } = await ask({
  instructions: 'Extract the contact from the note.',
  input: [{ role: 'user', content: note }],
  text: {
    format: {
      type: 'json_schema',
      name: 'contact',
      strict: true,
      schema: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          email: { type: 'string' },
          company: { type: ['string', 'null'] },
        },
        required: ['name', 'email', 'company'],
        additionalProperties: false,
      },
    },
  },
});

const contact = JSON.parse(text);
console.log(contact);
console.log('Send the invite to:', contact.email);
