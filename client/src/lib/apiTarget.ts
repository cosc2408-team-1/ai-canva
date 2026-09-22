/**
 * Optional demo-only override for text generation.
 *
 * Normal production uses Firebase Hosting's /api rewrite.
 * For a classroom demo, only /api/generate can be redirected
 * through a Cloudflare Tunnel to the local Node backend.
 */
export const DEMO_AI_API_BASE_STORAGE_KEY =
  "ai-canva.demoAiApiBaseUrl";

export function normalizeExternalApiBase(
  value?: string | null
): string {
  const raw = value?.trim();
  if (!raw) return "";

  try {
    const url = new URL(raw);

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return "";
    }

    if (url.username || url.password) {
      return "";
    }

    url.search = "";
    url.hash = "";

    let path = url.pathname.replace(/\/+$/, "");

    // Accept either the tunnel root or a pasted ".../api".
    if (path === "/api") {
      path = "";
    }

    url.pathname = path || "/";

    return url.toString().replace(/\/$/, "");
  } catch {
    return "";
  }
}

export function buildGenerateUrl(
  externalBase?: string | null
): string {
  const base = normalizeExternalApiBase(externalBase);

  return base
    ? `${base}/api/generate`
    : "/api/generate";
}

/**
 * Runtime localStorage wins over the build-time Vite value.
 *
 * This is useful for Cloudflare Quick Tunnels because the hostname
 * can change whenever cloudflared is restarted.
 */
export function resolveGenerateUrl(): string {
  let runtimeOverride = "";

  if (typeof window !== "undefined") {
    try {
      runtimeOverride = normalizeExternalApiBase(
        window.localStorage.getItem(
          DEMO_AI_API_BASE_STORAGE_KEY
        )
      );
    } catch {
      // localStorage may be unavailable in restricted browsers.
    }
  }

  const buildOverride = normalizeExternalApiBase(
    import.meta.env.VITE_AI_API_BASE_URL
  );

  return buildGenerateUrl(
    runtimeOverride || buildOverride
  );
}
