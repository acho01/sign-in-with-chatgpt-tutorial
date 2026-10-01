// 03-tool.mjs — the model asks for a function, our code runs it.
import { ask } from './chatgpt.mjs';

// 1. Describe the tool. The model sees only this description.
const tools = [{
  type: 'function',
  name: 'get_order',
  description: 'Look up an order by its ID.',
  parameters: {
    type: 'object',
    properties: { order_id: { type: 'string' } },
    required: ['order_id'],
    additionalProperties: false,
  },
}];

// 2. The real function. It runs here, in our code.
function get_order({ order_id }) {
  return { order_id, item: 'Studio headphones', status: 'delivered', total: 161 };
}

const input = [{ role: 'user', content: 'Where is my order ORD-1042?' }];

// 3. First call: the model answers "please run get_order".
const first = await ask({ input, tools });
const call = first.items.find(item => item.type === 'function_call');
console.log('The model wants:', call.name, call.arguments);

// 4. Run it, then send the result back with the same call_id.
const result = get_order(JSON.parse(call.arguments));
input.push(...first.items);
input.push({ type: 'function_call_output', call_id: call.call_id, output: JSON.stringify(result) });

const second = await ask({ input, tools });
console.log(second.text);
