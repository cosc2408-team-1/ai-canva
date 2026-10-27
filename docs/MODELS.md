# Models — single source of truth

One page answering "which AI model handles which part of the app, how do I switch it, and what
has changed." If you change a model, **update the table and append to the change log below**.

---

## The model map (current)

| Concern | Used by | Provider | Model | Override | Defined in |
|---------|---------|----------|-------|----------|------------|
| **Text generation (current live demo)** | Security Assessment workers and other text boxes | RMIT VAL through the local backend and Cloudflare Tunnel | `openai-gpt-5.6-terra` *(local demo override)* | `AI_PROVIDER=val`, `VAL_MODEL` | `server/.env` (ignored); `server/src/val.ts` |
| **Text generation (Ollama option)** | Research, Summarize, PRD, Dev Plan, Slides, Code, UI Design, Agent, Chatbot, custom boxes, agent run-box calls | Ollama (Cloud **or** local daemon), selected when `AI_PROVIDER` is unset or `ollama` | `deepseek-v4.1-flash` *(provider default)* | `OLLAMA_MODEL` | `server/src/ollama.ts` + `functions/src/ollama.ts` |
| **UI screens** | Stitch UI box | Google Stitch (Gemini under the hood) | `GEMINI_3_FLASH` *(default)* | `STITCH_MODEL` — enum: `GEMINI_3_PRO` \| `GEMINI_3_FLASH` | `server/src/stitch.ts` + `functions/src/stitch.ts` |
| **Image, image→image** | Cartoon Profile box (when an Image box is connected) | fal.ai | `fal-ai/qwen-image-edit` | none — hardcoded | `server/src/fal.ts` + `functions/src/fal.ts` |
| **Image, text→image** | Cartoon Profile box (no Image box connected) | fal.ai | `fal-ai/flux/schnell` | none — hardcoded | `server/src/fal.ts` + `functions/src/fal.ts` |

The live demo calls the selected OpenAI model through RMIT VAL, using a backend-only VAL key.
The local demo override does not change the code defaults or the Firebase Functions configuration.

## Provider configuration

### RMIT VAL (current live demo)
- **Endpoint:** `POST https://val.rmit.edu.au/api/chat/completions`.
- **Configuration:** ignored `server/.env` uses `AI_PROVIDER=val`,
  `VAL_MODEL=openai-gpt-5.6-terra` and `VAL_TIMEOUT_MS=120000`.
- **Auth:** `VAL_API_KEY` remains backend-only. Never put it in client code or `VITE_*` variables.
- **Routing:** Firebase Hosting serves the frontend; the configured Cloudflare Tunnel forwards
  generation to the local Express backend. Auth, Firestore and Storage remain on Firebase.
- **Switching:** restart the local backend after changing `VAL_MODEL`. No frontend build is needed
  if the tunnel URL is unchanged. There is no automatic provider failover.
- **Automatic Hosting builds:** the optional repository Actions variable
  `VITE_AI_API_BASE_URL` supplies the public backend origin at build time. With this variable
  configured, the workflow checks backend health before building/deploying and preserves
  build-time routing precedence over stale localStorage. Update the variable if the demo tunnel
  hostname changes. An empty variable retains the same-origin `/api/generate` route. Never store
  provider credentials in this variable. Quick Tunnels remain demo-only.

### Ollama (text)
- **Endpoint:** `POST {OLLAMA_HOST}/api/chat`, non-streaming.
- **Auth:** `Bearer OLLAMA_API_KEY` (cloud key from https://ollama.com/settings/keys). With
  `OLLAMA_HOST=http://localhost:11434` and no key, it talks to a local Ollama daemon instead.
- **Generation:** `options.num_predict: 8192`; system + user message per call.
- **Tokens:** read from the response's `prompt_eval_count` / `eval_count` and reported back as
  `usage` on `/api/generate`.
- **Env vars:** `OLLAMA_API_KEY`, `OLLAMA_HOST` (default `https://ollama.com`), `OLLAMA_MODEL`
  (default `deepseek-v4.1-flash`).

### Google Stitch (UI screens)
- **Auth:** `STITCH_API_KEY`.
- **Prompt is capped at 6000 chars** so real pipelines (whole Research boxes piped in) don't
  produce a written spec instead of a UI screen.
- **Async:** the endpoint returns a `jobId`; the client polls (in-memory job store locally,
  Firestore + Cloud Task worker in production).

### fal.ai (images)
- **Auth:** `FAL_KEY`. Uploaded data-URLs go to fal storage first (the edit model needs a real URL).
- Image-to-image: `num_inference_steps: 30`, `guidance_scale: 4`.

## How to switch a model

1. **Local dev** — set the env var in `server/.env` (gitignored), restart `npm run dev`:
   ```bash
   OLLAMA_MODEL=<model-id>
   ```
   Verify with any box run: `/api/generate` responses echo the `model` used, and the box footer
   shows the token counts for that call.
2. **Production** — set the same var in `functions/.env` (note: `scripts/deploy.sh` only copies
   `OLLAMA_API_KEY` from `server/.env` — anything else you must add yourself), then `npm run deploy`.
3. **Changing a hardcoded default** — the API logic is **intentionally duplicated** between
   `server/` and `functions/` (see `AGENTS.md`): a default change must be made in **both** copies
   (`server/src/ollama.ts` *and* `functions/src/ollama.ts`, same for `fal.ts`/`stitch.ts`). The fal
   model IDs have no env override — editing both files is the only way.

## Where model usage is recorded (runtime observability)

- `/api/generate` and `/api/generate-image` responses include the `model` that served the call.
- The client writes a `tokenUsage/{id}` Firestore doc per successful call storing
  `model`, `boxType`, and prompt/completion/total tokens — so "what did we actually run" is
  queryable per user/board/call.
- Per-box token badges and the Admin board's token aggregates build on those docs.

## Choosing models for a live demo (booth)

- Prefer a **fast** text model — booth visitors give you ~5 minutes; first-call latency matters.
  Override locally via `OLLAMA_MODEL` without touching code.
- Keep Stitch out of the critical path (40s+); cartoons via `flux/schnell` are the quick visual
  payoff.

## Change log

- **2026-10-27** — Back to `openai-gpt-5.6-terra` for the demo (`VAL_MODEL` in the demo backend's
  `server/.env`) and for the prompt evals' generator and judge (`evals/.env.example`,
  `evals/run.mjs`, previously `openai-gpt-4.1`). On VAL, `openai-gpt-6-sol` sometimes replied with
  `finish_reason: tool_calls` and no text (it called VAL's built-in `query_knowledge_files` tool,
  which the request does not offer), and its NIST output omitted `report_id` in the missing-context
  eval case. Terra returned text in the same test. If Sol is used again, send
  `tool_choice: "none"` from `server/src/val.ts`, `functions/src/val.ts` and `evals/val.mjs` first.
- **2026-10-22** — Updated the local VAL demo override from `openai-gpt-5.6-terra` to
  `openai-gpt-6-sol`. VAL's model-list endpoint returned this ID and a direct Chat Completions
  smoke test returned HTTP 200 with the same model field. Provider code defaults are unchanged.
- **2026-02-08** — Default text model changed `deepseek-v4-flash` → **`deepseek-v4.1-flash`**
  (hardcoded default in both `server/src/ollama.ts` and `functions/src/ollama.ts`; env templates
  and docs updated to match). **Deployed to `carbondocs` the same day — verified live:**
  `POST /api/generate` on https://carbondocs.web.app responds with
  `"model":"deepseek-v4.1-flash"`.
- **2026-02-08** — Documented the initial state: text = Ollama `deepseek-v4-flash` (default),
  Stitch = `GEMINI_3_FLASH`, fal.ai = `fal-ai/qwen-image-edit` / `fal-ai/flux/schnell`. No env
  overrides active. Removed the unused `ANTHROPIC_API_KEY` from `server/.env` / `functions/.env`.
