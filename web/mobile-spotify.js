(() => {
  "use strict";
  const REDIRECT_URI = "https://peekabu411.github.io/spotify/callback";
  const ACCOUNT_URL = "https://accounts.spotify.com";
  const API_URL = "https://api.spotify.com/v1";
  const CLIENT_ID_KEY = "turntable-spotify-client-id";
  const TOKEN_KEY = "turntable-spotify-tokens";
  const VERIFIER_KEY = "turntable-spotify-pkce-verifier";
  const STATE_KEY = "turntable-spotify-pkce-state";
  const SESSION_KEY = "turntable-session";
  const nativeFetch = window.fetch.bind(window);
  let refreshPromise = null;
  let requestCount = 0;
  let cacheHits = 0;
  let lastRequestAt = 0;

  const json = (data, status = 200) => new Response(status === 204 ? null : JSON.stringify(data), {
    status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }
  });
  const errorResponse = (message, status = 400, retryAfter = 0) => json({ error: message, retry_after: retryAfter || undefined }, status);
  const tokenData = () => {
    try { return JSON.parse(localStorage.getItem(TOKEN_KEY) || "null"); } catch { return null; }
  };
  const saveTokens = (tokens) => localStorage.setItem(TOKEN_KEY, JSON.stringify(tokens));
  const random = (length = 64) => {
    const bytes = new Uint8Array(length);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (value) => "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~"[value % 66]).join("");
  };
  const sha256 = async (value) => {
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
    return btoa(String.fromCharCode(...new Uint8Array(digest))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  };

  async function accessToken() {
    const tokens = tokenData();
    if (!tokens) throw Object.assign(new Error("Connect Spotify first."), { status: 401 });
    if (tokens.expires_at > Date.now() + 30_000) return tokens.access_token;
    if (!refreshPromise) refreshPromise = (async () => {
      const body = new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: tokens.refresh_token,
        client_id: localStorage.getItem(CLIENT_ID_KEY) || ""
      });
      const response = await nativeFetch(ACCOUNT_URL + "/api/token", {
        method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body
      });
      const next = await response.json().catch(() => ({}));
      if (!response.ok || !next.access_token) {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(SESSION_KEY);
        throw Object.assign(new Error(next.error_description || "Spotify authorization expired. Connect again."), { status: 401 });
      }
      const saved = { ...tokens, ...next, refresh_token: next.refresh_token || tokens.refresh_token, expires_at: Date.now() + Number(next.expires_in || 3600) * 1000 };
      saveTokens(saved);
      return saved.access_token;
    })().finally(() => { refreshPromise = null; });
    return refreshPromise;
  }

  async function spotify(path, options = {}) {
    requestCount += 1; lastRequestAt = Date.now();
    const response = await nativeFetch(API_URL + path, {
      ...options,
      headers: { Authorization: "Bearer " + await accessToken(), ...(options.headers || {}) }
    });
    const text = await response.text();
    let body = null;
    try { body = text ? JSON.parse(text) : null; } catch { body = text; }
    if (!response.ok) {
      const message = body?.error?.message || body?.error_description || text || "Spotify request failed (" + response.status + ").";
      const error = Object.assign(new Error(message), {
        status: response.status, retryAfter: Number(response.headers.get("retry-after")) || 0
      });
      throw error;
    }
    return body;
  }

  const browserPlugin = () => window.Capacitor?.Plugins?.Browser;

  async function openAuthorizationBrowser(url) {
    const spotifyAuth = window.Capacitor?.Plugins?.SpotifyAuth;
    if (spotifyAuth?.open) {
      await spotifyAuth.open({ url });
      return;
    }
    const browser = browserPlugin();
    if (browser?.open) {
      await browser.open({ url });
      return;
    }
    window.location.assign(url);
  }

  async function beginAuthorization(clientId) {
    if (!/^[A-Za-z0-9]{20,64}$/.test(clientId)) throw new Error("Enter the Client ID from your Spotify Developer Dashboard.");
    const verifier = random(96);
    const state = random(32);
    localStorage.setItem(CLIENT_ID_KEY, clientId);
    sessionStorage.setItem(VERIFIER_KEY, verifier);
    sessionStorage.setItem(STATE_KEY, state);
    const query = new URLSearchParams({
      client_id: clientId, response_type: "code", redirect_uri: REDIRECT_URI, state,
      code_challenge_method: "S256", code_challenge: await sha256(verifier),
      scope: "user-read-playback-state user-modify-playback-state user-read-currently-playing playlist-read-private playlist-read-collaborative"
    });
    await openAuthorizationBrowser(ACCOUNT_URL + "/authorize?" + query);
  }

  async function finishAuthorization(url) {
    const callback = new URL(url);
    const failure = callback.searchParams.get("error");
    if (failure) throw new Error("Spotify authorization was not completed: " + failure + ".");
    const code = callback.searchParams.get("code");
    const state = callback.searchParams.get("state");
    const verifier = sessionStorage.getItem(VERIFIER_KEY);
    if (!code || !verifier || state !== sessionStorage.getItem(STATE_KEY)) throw new Error("Spotify authorization could not be verified. Connect again.");
    const response = await nativeFetch(ACCOUNT_URL + "/api/token", {
      method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: localStorage.getItem(CLIENT_ID_KEY) || "", grant_type: "authorization_code",
        code, redirect_uri: REDIRECT_URI, code_verifier: verifier
      })
    });
    const tokens = await response.json().catch(() => ({}));
    if (!response.ok || !tokens.access_token) throw new Error(tokens.error_description || "Spotify did not return an access token.");
    saveTokens({ ...tokens, expires_at: Date.now() + Number(tokens.expires_in || 3600) * 1000 });
    localStorage.setItem(SESSION_KEY, "spotify-direct");
    sessionStorage.removeItem(VERIFIER_KEY); sessionStorage.removeItem(STATE_KEY);
  }

  function apiError(error) {
    return errorResponse(error.message || "Spotify request failed.", error.status || 503, error.retryAfter || 0);
  }
  const bodyOf = (init) => { try { return JSON.parse(init?.body || "{}"); } catch { return {}; } };
  const queryDevice = (path, id) => id ? path + (path.includes("?") ? "&" : "?") + "device_id=" + encodeURIComponent(id) : path;

  async function handle(path, init = {}) {
    const url = new URL(path, location.origin);
    const route = url.pathname;
    try {
      if (route === "/api/pair") {
        const clientId = String(bodyOf(init).pin || "").trim();
        setTimeout(() => beginAuthorization(clientId).catch((error) => {
          const node = document.getElementById("pair-error"); if (node) node.textContent = error.message;
        }), 0);
        return json({ session: "spotify-direct", snapshot: null });
      }
      if (route === "/api/pairing-info") return json({ pin: "Direct Spotify", urls: [REDIRECT_URI] });
      if (route === "/api/health") return json({ app: "turntable-android", version: "0.9.05", status: "running" });
      if (route === "/api/diagnostics") return json({
        version: "0.9.05", server_time: Date.now(), uptime_seconds: 0,
        requests: { last_minute: requestCount, last_hour: requestCount, total_since_start: requestCount, cache_hits_since_start: cacheHits, last_request_at: lastRequestAt, top_paths: [] },
        connection: { state: tokenData() ? "connected" : "waiting", cooldown_seconds: 0, last_playback_error: null, playback_cache_age_seconds: 0 },
        cache: { playback: false, devices: 0, queue: 0, resources: [] }
      });
      if (route === "/api/status") {
        const playback = await spotify("/me/player");
        return json({ playback, connection: { fresh: true, cached: false, shared: false, updated_at: Date.now(), retry_after: 0, last_error: null } });
      }
      if (route === "/api/devices") return json({ items: (await spotify("/me/player/devices")).devices || [] });
      if (route === "/api/queue") return json({ items: (await spotify("/me/player/queue")).queue || [] });
      if (route === "/api/playlists") {
        const data = await spotify("/me/playlists?limit=50");
        return json({ items: (data.items || []).map((item) => ({ uri: item.uri, name: item.name, image: item.images?.[0]?.url || "", tracks: item.tracks?.total, owner: item.owner?.display_name || "" })) });
      }
      if (route.startsWith("/api/player/")) {
        const action = route.slice("/api/player/".length);
        const body = bodyOf(init); const device = body.device_id;
        if (action === "playlist") await spotify(queryDevice("/me/player/play", device), { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ context_uri: body.context_uri }) });
        else if (action === "skip-count") for (let i = 0; i < Math.max(0, Number(body.count) || 0); i += 1) await spotify(queryDevice("/me/player/next", device), { method: "POST" });
        else {
          const endpoints = { play: ["/me/player/play", "PUT"], pause: ["/me/player/pause", "PUT"], next: ["/me/player/next", "POST"], previous: ["/me/player/previous", "POST"] };
          if (!endpoints[action]) return errorResponse("Unsupported playback action.", 400);
          await spotify(queryDevice(endpoints[action][0], device), { method: endpoints[action][1] });
        }
        return json(null, 204);
      }
      if (route === "/api/settings") {
        const body = bodyOf(init); const target = body.target_device_id || body.device_id;
        if (body.device_id && Object.keys(body).length === 1) await spotify("/me/player", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ device_ids: [body.device_id], play: false }) });
        if (Number.isFinite(body.volume_percent)) await spotify(queryDevice("/me/player/volume?volume_percent=" + Math.max(0, Math.min(100, Math.round(body.volume_percent))), target), { method: "PUT" });
        if (Number.isFinite(body.position_ms)) await spotify(queryDevice("/me/player/seek?position_ms=" + Math.max(0, Math.round(body.position_ms)), target), { method: "PUT" });
        if (typeof body.shuffle === "boolean") await spotify(queryDevice("/me/player/shuffle?state=" + body.shuffle, target), { method: "PUT" });
        if (typeof body.repeat === "string") await spotify(queryDevice("/me/player/repeat?state=" + encodeURIComponent(body.repeat), target), { method: "PUT" });
        return json(null, 204);
      }
      return errorResponse("Unknown standalone Spotify route.", 404);
    } catch (error) { return apiError(error); }
  }

  window.fetch = (input, init) => {
    const path = typeof input === "string" ? input : input?.url;
    if (typeof path === "string" && new URL(path, location.origin).pathname.startsWith("/api/")) return handle(path, init);
    return nativeFetch(input, init);
  };
  const completeRedirect = (url) => {
    Promise.resolve(browserPlugin()?.close?.()).catch(() => {}).finally(() => finishAuthorization(String(url)).then(() => location.reload()).catch((error) => {
      localStorage.removeItem(SESSION_KEY);
      location.replace("index.html?spotify_error=" + encodeURIComponent(error.message));
    }));
  };
  window.Capacitor?.Plugins?.App?.addListener?.("appUrlOpen", ({ url }) => {
    if (String(url).startsWith(REDIRECT_URI)) completeRedirect(url);
  });  window.addEventListener("turntable:spotify-redirect", (event) => {
    completeRedirect(event.detail);
  });
  if (tokenData() && !localStorage.getItem(SESSION_KEY)) localStorage.setItem(SESSION_KEY, "spotify-direct");
  window.TurntableSpotify = {
    disconnect() { localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(CLIENT_ID_KEY); localStorage.removeItem(SESSION_KEY); },
    redirectUri: REDIRECT_URI
  };
})();