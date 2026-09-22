# RMIT VAL Demo Fallback Runbook

## Architecture

`Firebase Preview Hosting → VITE_AI_API_BASE_URL → Cloudflare Quick Tunnel → local Node/Express backend on Mac mini → RMIT VAL`

Firebase Auth and Firestore remain on Firebase. The tunnel only serves text generation
(`POST /api/generate`); it does not proxy authentication, boards, or Firestore. The tunnel URL is
public configuration embedded in the demo Preview build, never a place for `VAL_API_KEY`.

## Prerequisites

- Mac mini has Node dependencies installed and `cloudflared` available.
- `server/.env` is saved with `AI_PROVIDER=val`, `VAL_API_KEY`, and optionally
  `VAL_MODEL=openai-gpt-4.1`.
- Firebase CLI is installed and authenticated for the target project.
- Keep the VAL key backend-only. Do not put it in `VITE_*`, localStorage, browser code, screenshots,
  or team messages.

## Start the Demo Backend

In terminal 1, keep the Mac mini awake:

```bash
caffeinate -is
```

In terminal 2, from the repository root:

```bash
npm run dev:server
```

Confirm the server reports `http://localhost:3001`. If it selects another port, use that port in
the tunnel command below.

## Verify Locally

```bash
curl -sS -X POST http://localhost:3001/api/generate \
  -H 'Content-Type: application/json' \
  -d '{"systemPrompt":"You are concise.","userPrompt":"Say pong."}'
```

Expected: a JSON response with `content`, `model: "openai-gpt-4.1"`, and `usage`.

## Start and Verify the Quick Tunnel

In terminal 3:

```bash
cloudflared tunnel --url http://localhost:3001
```

Copy the generated `https://...trycloudflare.com` URL as `TUNNEL_URL`. Test both public endpoints:

```bash
curl -sS "$TUNNEL_URL/api/health"
curl -sS -X POST "$TUNNEL_URL/api/generate" \
  -H 'Content-Type: application/json' \
  -d '{"systemPrompt":"You are concise.","userPrompt":"Say pong."}'
```

The health response should show `aiProvider: "val"` and the generate request should return 200
with VAL content.

## Deploy Zero-configuration Firebase Preview

After the public tunnel tests pass, deploy a Preview that embeds the **public** tunnel URL:

```bash
DEMO_AI_API_BASE_URL="$TUNNEL_URL" bash scripts/deploy-demo-preview.sh
```

The script prints the Firebase Preview URL. Send that URL to teammates and iPad users. They do not
need to know the tunnel URL, open DevTools, or set localStorage.

## Verify the Firebase Preview Client

1. Open the Firebase Preview URL and sign in normally. Firebase Auth and Firestore continue to use
   Firebase.
2. Run a text box such as Research or NIST Gap Checker.
3. For operator verification, open DevTools Network and confirm the request uses the tunnel URL,
   shows an `OPTIONS` CORS preflight with `204`, then `POST /api/generate` with `200`.

## Remote Teammate Test

Send teammates only the Firebase Preview URL. They sign in, run a text box, confirm a successful
result, and report the browser, time, and generated box. They must not receive, request, enter, or
need the tunnel URL or `VAL_API_KEY`.

## Shutdown and Reset

1. Stop `cloudflared` with `Ctrl+C`; the Quick Tunnel URL immediately stops working.
2. Stop `npm run dev:server` with `Ctrl+C`.
3. Stop `caffeinate` with `Ctrl+C` when the demo is over.
4. The Preview build already routes text generation through its embedded public tunnel URL. To reset
   a browser that used the optional troubleshooting override, remove it:

```js
localStorage.removeItem("ai-canva.demoAiApiBaseUrl");
location.reload();
```

After removal, routing falls back to `VITE_AI_API_BASE_URL` when that Preview build configured one,
otherwise to the relative Firebase `/api/generate` route.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| Local generation fails | Confirm `server/.env` is saved, `AI_PROVIDER=val`, and the server was restarted after editing it. |
| Tunnel URL does not respond | Confirm the local smoke test passes, `cloudflared` is still running, and the tunnel port matches the server port. |
| Preview still calls Firebase `/api` | Confirm the Preview was deployed with `DEMO_AI_API_BASE_URL` set to the current tunnel root URL. Re-run the deploy script after a tunnel restart. |
| CORS failure | Confirm the Network panel shows the tunnel host and an `OPTIONS` response of `204`; restart the local server/tunnel if needed. |
| Tunnel changed after restart | Quick Tunnel hostnames are temporary. Re-run `DEMO_AI_API_BASE_URL="$TUNNEL_URL" bash scripts/deploy-demo-preview.sh` and share the new Preview URL. |
| One browser needs a temporary override | In DevTools only, run `localStorage.setItem("ai-canva.demoAiApiBaseUrl", "https://YOUR-TUNNEL.trycloudflare.com"); location.reload();`. Remove it after diagnosis to restore the build-time route. |

## Security and Verified Baseline

`VAL_API_KEY` must remain in `server/.env` or another backend-only secret store. Never put it in
client code, Firebase Preview configuration, localStorage, screenshots, or team messages.

Verified baseline: **313/313 client tests passed** and the **production build passed** before demo
use.
