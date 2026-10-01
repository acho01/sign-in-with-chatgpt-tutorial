# Run your app on the user's ChatGPT plan

A small, step-by-step tutorial in plain JavaScript. No SDK and no packages: only Node.js 22 or newer.

**The idea.** Your user signs in with ChatGPT once. Your app receives an *access token* (a long text that works like a key). Every model call sends that token in one header, and the call then runs on the user's ChatGPT plan instead of on your API key.

This is the code from the video tutorial. Each file matches one step of the video.

## What you need

- Node.js 22 or newer
- A ChatGPT account with a paid plan (the calls run on that plan)

## Run it

```sh
node login.mjs          # step 1: prints a link. Open it, sign in, approve the app.
node 01-hello.mjs       # step 2: the first call, with nothing hidden
node 01-ask.mjs         # step 3: the same call through the small helper
node usage.mjs          # step 3: a table of every call made through the helper
node 02-structured.mjs  # step 4: structured output (text in, a real object out)
node 03-tool.mjs        # step 5: a tool (the model asks for a function, our code runs it)
node 04-agent.mjs       # step 6: an agent (a loop; the model picks tools until it is done)
```

`login.mjs` saves your tokens to `.tokens.json`. That file works like a password. It is listed in `.gitignore`; never commit it or share it.

## The files

| File | Step | What it shows |
| --- | --- | --- |
| `login.mjs` | 1 | Sign in with ChatGPT (OAuth with PKCE) and save the tokens. |
| `01-hello.mjs` | 2 | One request with one special header, then reading the answer as a stream of events. |
| `chatgpt.mjs` | 3 | The helper. One function, `ask()`. It renews the token when it is old, sends the request, reads the stream, and writes one line per call to `usage.jsonl`. |
| `01-ask.mjs` | 3 | The same question as step 2, in a few lines. |
| `usage.mjs` | 3 | Reads `usage.jsonl` and prints the token counts as a table. |
| `02-structured.mjs` | 4 | A JSON schema tells the model the exact shape of the answer. |
| `03-tool.mjs` | 5 | One tool call from start to end. |
| `04-agent.mjs` | 6 | An agent loop with three tools and a limit of six rounds. |

## Rules of this API

These are different from the normal OpenAI API. Each one is a real error you get if you forget it.

1. `store: false` is required. Error: `Store must be set to false`.
2. `stream: true` is required. Error: `Stream must be set to true`. The answer is a stream of events, not one JSON object.
3. `input` must be a list. Error: `Input must be a list`.
4. Some normal settings are refused, for example `temperature`. Error: `Unsupported parameter: temperature`.
5. The last event (`response.completed`) has an **empty** `output` list. Collect the output items from the `response.output_item.done` events while they arrive (see `chatgpt.mjs`).
6. OpenAI keeps nothing between calls. For tools, send the whole conversation again every time, including the model's own tool request. If you forget it: `No tool call found for function call output`.

## Usage and limits

You do not pay per token here, but every call counts against the limits of the user's plan. A Plus plan has a usage limit that is shared by every app that uses the plan. The user can see it in ChatGPT Settings → Usage. The API does not report how much is left, so `chatgpt.mjs` counts the tokens of every call itself.

## Good to know

- **Preview.** When this was written (October 2026), this way of using a ChatGPT plan was a preview for local and open-source apps. Hosted or paid apps need a separate approval from OpenAI. See the [OpenAI docs](https://developers.openai.com/siwc/token-sharing-open-source).
- **Model name.** The examples use `gpt-5.6-luna`. The models you may use depend on your account. To see yours, send a `GET` request to `https://api.openai.com/v1/models` with the same `Authorization` header.
- **Identity.** `login.mjs` does not check the identity token, because this tutorial never uses the user's identity. If your app shows "signed in as …", verify that token first.
- **Port.** `login.mjs` listens on `127.0.0.1:3211` for the sign-in to come back.

## License

MIT. See [LICENSE](LICENSE).
