# RMIT VAL Demo Fallback Runbook

## Architecture

`Firebase Hosting → Cloudflare Quick Tunnel → local Node/Express backend on Mac mini → RMIT VAL`

Firebase Auth and Firestore remain on Firebase. The tunnel is only a demo override for text
generation (`/api/generate`); it does not proxy authentication, boards, or Firestore.

## Prerequisites

- Mac mini has Node dependencies installed and `cloudflared` available.
- `server/.env` is saved with `AI_PROVIDER=val`, `VAL_API_KEY`, and optionally
  `VAL_MODEL=openai-gpt-4.1`.
- Use the Firebase Preview URL for the deployed client. Keep the VAL key backend-only.

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

## Use the Firebase Preview Client

1. Open the Firebase Preview URL in the browser and sign in normally. Firebase Auth and Firestore
   continue to use Firebase.
2. Open DevTools Console and run, replacing the URL with the current Quick Tunnel URL:

```js
localStorage.setItem("ai-canva.demoAiApiBaseUrl", "https://YOUR-TUNNEL.trycloudflare.com");
location.reload();
```

3. Run a text box such as Research or NIST Gap Checker.
4. In DevTools Network, confirm the request is sent to the tunnel URL and shows an `OPTIONS`
   CORS preflight with `204`, followed by `POST /api/generate` with `200`.

## Remote Teammate Test

Send teammates the Firebase Preview URL and the current tunnel URL. They open the Preview URL,
sign in, then run the same localStorage command in their browser with the tunnel URL. They should
run a text box, confirm a successful result, and report the browser, time, generated box, and
Network status. They must not receive, request, or enter `VAL_API_KEY`.

## Shutdown and Reset

1. Stop `cloudflared` with `Ctrl+C`; the Quick Tunnel URL immediately stops working.
2. Stop `npm run dev:server` with `Ctrl+C`.
3. Stop `caffeinate` with `Ctrl+C` when the demo is over.
4. In every demo browser, reset to the normal Firebase `/api` route:

```js
localStorage.removeItem("ai-canva.demoAiApiBaseUrl");
location.reload();
```

## Troubleshooting

| Symptom | Check |
| --- | --- |
| Local generation fails | Confirm `server/.env` is saved, `AI_PROVIDER=val`, and the server was restarted after editing it. |
| Tunnel URL does not respond | Confirm the local smoke test passes, `cloudflared` is still running, and the tunnel port matches the server port. |
| Preview still calls Firebase `/api` | Check the exact localStorage key/value, use the tunnel root URL without `/api/generate`, then reload. |
| CORS failure | Confirm the Network panel shows the tunnel host and an `OPTIONS` response of `204`; restart the local server/tunnel if needed. |
| Tunnel changed after restart | Quick Tunnel hostnames are temporary. Copy the new URL and reset the localStorage value for every browser. |

## Security and Verified Baseline

`VAL_API_KEY` must remain in `server/.env` or another backend-only secret store. Never put it in
client code, Firebase Preview configuration, localStorage, screenshots, or team messages.

Verified baseline: **309/309 client tests passed** and the **production build passed** before demo
use.
