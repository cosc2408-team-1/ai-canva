# AI Provider Comparison

This project currently implements RMIT VAL and Ollama behind the same `POST /api/generate` contract.
The third row is a realistic future option, not an implemented provider.

| Provider | Setup and model | Limitations | Privacy and deployment | Expected cost |
| --- | --- | --- | --- | --- |
| **RMIT VAL** | Set `AI_PROVIDER=val`, `VAL_API_KEY`, and optionally `VAL_MODEL`; default model is `openai-gpt-4.1`. The server calls `POST https://val.rmit.edu.au/api/chat/completions`. | Requires an RMIT-issued key and service availability. Limits, quotas, retention, and approved data classifications were not supplied in this task, so confirm them with RMIT before sending sensitive project data. | Requests leave the application server for the RMIT VAL service. Keep the key server-side in `server/.env` or `functions/.env`; never place it in client code. | No published price or quota evidence was supplied with the course VAL setup. Treat cost as **to be confirmed with RMIT/course staff**. |
| **Ollama** | Set `AI_PROVIDER=ollama` (default) with `OLLAMA_HOST`, `OLLAMA_MODEL`, and an `OLLAMA_API_KEY` for Cloud. The current default model is `deepseek-v4-flash`. | Local models need compatible hardware and model downloads; cloud model availability can change. | A local daemon can keep prompts on the machine. Ollama Cloud is remote and needs an API key. [Ollama documents both cloud API access and local-only mode.](https://docs.ollama.com/cloud) | Local use has no per-token provider charge but consumes local hardware/electricity. Cloud pricing/plan limits should be confirmed before production use. |
| **OpenAI API (future option)** | Would need a separate provider adapter and server-only `OPENAI_API_KEY`; select a model appropriate to quality, latency, and budget. | Not implemented; introduces external account, rate-limit, and spend-management requirements. | Prompts leave the application server for OpenAI; review the selected API data controls and project privacy requirements before use. | Usage is billed by model/token and can change. Use the current [official API pricing](https://developers.openai.com/api/docs/pricing) when selecting a model and setting a budget. |

## Local VAL verification

1. Copy `server/.env.example` to `server/.env`.
2. Set `AI_PROVIDER=val` and add the RMIT-issued `VAL_API_KEY` without quotes or whitespace.
3. Run `npm run dev:server`.
4. In a second terminal, run:

```bash
curl -sS -X POST http://localhost:3001/api/generate \
  -H 'Content-Type: application/json' \
  -d '{"systemPrompt":"You are concise.","userPrompt":"Say pong."}'
```

A successful response contains `content`, `model`, and `usage`. The key is read only by the server;
do not include it in the curl request or in any source-controlled file.
