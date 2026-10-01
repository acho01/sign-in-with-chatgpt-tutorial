// 04-agent.mjs — a loop: the model picks tools until the job is done.
import { ask } from './chatgpt.mjs';

const tickets = [];

// Our tools are plain functions.
const run = {
  get_order: ({ order_id }) =>
    ({ order_id, item: 'Studio headphones', price: 149, shipping: 12, delivered_days_ago: 9 }),
  get_refund_policy: ({ reason }) => reason === 'damaged'
    ? { refund: 'full price plus shipping', within_days: 30 }
    : { refund: 'price only', within_days: 14 },
  create_ticket: (ticket) => {
    tickets.push({ id: `TCK-${tickets.length + 1}`, ...ticket });
    return tickets.at(-1);
  },
};

// The descriptions that the model sees.
const tool = (name, description, properties) => ({
  type: 'function', name, description,
  parameters: { type: 'object', properties, required: Object.keys(properties), additionalProperties: false },
});
const tools = [
  tool('get_order', 'Look up an order by its ID.', { order_id: { type: 'string' } }),
  tool('get_refund_policy', 'Get the refund rule for a reason.', {
    reason: { type: 'string', enum: ['damaged', 'late', 'changed_mind'] },
  }),
  tool('create_ticket', 'Create a support ticket for a refund.', {
    order_id: { type: 'string' },
    refund_amount: { type: 'number' },
    summary: { type: 'string' },
  }),
];

const instructions = 'You are a support agent. Use the tools. Create a ticket, then tell the customer the result.';
const input = [{ role: 'user', content: 'My headphones from order ORD-1042 arrived broken. I want a refund.' }];
let tokens = 0;

for (let round = 1; round <= 6; round++) {
  const { text, items, usage } = await ask({ instructions, input, tools });
  tokens += usage.total_tokens;

  // No tool calls means the model is finished.
  const calls = items.filter(item => item.type === 'function_call');
  if (calls.length === 0) {
    console.log(`\nAnswer: ${text}`);
    break;
  }

  // Run every tool the model asked for. Add the results to the conversation.
  input.push(...items);
  for (const call of calls) {
    const result = run[call.name](JSON.parse(call.arguments));
    console.log(`Round ${round}: ${call.name}`, result);
    input.push({ type: 'function_call_output', call_id: call.call_id, output: JSON.stringify(result) });
  }
}

console.log(`\nThis whole job used ${tokens} tokens.`);
