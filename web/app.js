const $ = (id) => document.getElementById(id);
const pairing = $("pairing");
const remote = $("remote");
const message = $("message");
let session = localStorage.getItem("turntable-session");
let playback = null;
let state = null;
let currentView = "player";
let refreshTimer = null;
let devicesViewRefreshTimer = null;
let refreshInFlight = false;
let dialStart = null;
let commandPending = false;
let optimisticPlaybackPlaying = null;
let optimisticPlaybackUntil = 0;
const optimisticSettings = new Map();
let repeatOneArmedUri = null;
let repeatOneAutoOffPending = false;
let connectionState = { kind: "waiting", detail: "Waiting for the first playback update.", updatedAt: 0, cacheAge: null };
let diagnosticsRefreshTimer = null;
let artSwipe = null;
let lastFeedbackAt = 0;
let buttonHapticDispatchActive = false;
let barGesture = null;
let pairingInfo = null;
let playlistsLoaded = false;
let playlistsLoading = false;
let devicesLoaded = false;
let devicesLoading = false;
let devicesLastRefreshAt = 0;
let queueLoaded = false;
let queueLoading = false;
let queueRefreshPending = false;
let queueDrawerGesture = null;
let queuedPlayNextTarget = null;
let queuedPlayNextRunning = false;
let queuedPlayNextBoundaryTimer = null;
let observedPlaybackUri = null;
let artworkTransitionActive = false;
let dialVolumeHoldUntil = 0;
let dialTapCount = 0;
let dialTapTimer = null;
let activeBackground = 0;
let currentBackgroundUrl = "";
let backgroundTransitionToken = 0;
let statusRequestSequence = 0;
let renderedStatusSequence = 0;
const legacyTheme = localStorage.getItem("turntable-theme") || "design-1";
let albumStyle = localStorage.getItem("turntable-album-style") || (legacyTheme === "turntable" ? "vinyl" : "square");
let controlStyle = localStorage.getItem("turntable-control-style") || (legacyTheme === "turntable" ? "bar" : "dial");
let displayStyle = localStorage.getItem("turntable-display-style") || "info";
let lyricsBackground = localStorage.getItem("turntable-lyrics-background") || "transparent";
let playerBackgroundStyle = localStorage.getItem("turntable-player-background") || "artwork";
let backgroundColorMode = localStorage.getItem("turntable-background-color-mode") === "manual" ? "manual" : "auto";
let manualBackgroundColor = /^#[0-9a-f]{6}$/i.test(localStorage.getItem("turntable-manual-background-color") || "") ? localStorage.getItem("turntable-manual-background-color") : "#34261f";
let playbackBarStyle = localStorage.getItem("turntable-playback-bar-style") === "divider" ? "divider" : "default";
let guideText = localStorage.getItem("turntable-guide-text") === "hidden" ? "hidden" : "shown";
let controlBarBackground = ["opaque", "translucent", "transparent"].includes(localStorage.getItem("turntable-control-bar-background")) ? localStorage.getItem("turntable-control-bar-background") : "transparent";
let volumeWeight = ["light", "medium", "heavy"].includes(localStorage.getItem("turntable-volume-weight")) ? localStorage.getItem("turntable-volume-weight") : "heavy";
let layoutProfile = ["auto", "compact", "standard", "wide"].includes(localStorage.getItem("turntable-layout-profile")) ? localStorage.getItem("turntable-layout-profile") : "auto";
let uiFontScale = Math.max(85, Math.min(130, Number(localStorage.getItem("turntable-ui-font-scale")) || 100));
let displayedTrackUri = null;
let pendingArtworkUri = null;
let pendingArtworkDirection = null;
let artworkTransitionToken = 0;
let seekDragging = false;
let pendingSeek = null;
let progressFrame = null;
let progressClock = { uri: null, position: 0, duration: 0, startedAt: 0, playing: false, correction: 0, correctionStartedAt: 0, correctionDuration: 0 };
let turntableTrackUri = null;
let vinylSpinAnimation = null;
let vinylSpinRate = 0;
let vinylTargetRate = 0;
let vinylRateFrame = null;
let vinylRateResolver = null;
let vinylTransitionToken = 0;
let vinylTransitionPrepared = false;
let vinylTransitionDirection = "next";
let vinylIncomingSpinAnimation = null;
let requestedNextCover = "";
const queuedTrackCache = new Map();
const artworkPreloads = new Map();
const albumColorCache = new Map();
const lyricsResultCache = new Map();
let albumColorTrackUri = null;
let lyricsTrackUri = null;
let lyricsRequestToken = 0;
let lyricsLines = [];
let lyricsAvailability = "unknown";
let sideControlGesture = null;
let activeLyricIndex = -1;
let activeLyricWordIndex = -1;
let lyricStyle = localStorage.getItem("turntable-lyric-style") || "scroll";
const lyricStyleNames = { scroll: "Scroll", word: "Word", karaoke: "Karaoke", reveal: "Reveal", focus: "Focus" };
function readLyricFontSizes() {
  try {
    const saved = JSON.parse(localStorage.getItem("turntable-lyric-font-sizes") || "{}");
    return Object.fromEntries(Object.keys(lyricStyleNames).map((style) => [style, Math.max(100, Math.min(300, Math.round((Number(saved[style]) || 100) / 5) * 5))]));
  } catch { return Object.fromEntries(Object.keys(lyricStyleNames).map((style) => [style, 100])); }
}
let lyricFontSizes = readLyricFontSizes();
const storedLyricOffset = localStorage.getItem("turntable-lyric-offset");
const storedLyricOffsetNumber = Number(storedLyricOffset);
const migrateLegacyZeroOffset = localStorage.getItem("turntable-lyric-offset-default-v2") !== "applied" && storedLyricOffsetNumber === 0;
let lyricOffset = Math.max(-1.2, Math.min(-0.2, storedLyricOffset === null || !Number.isFinite(storedLyricOffsetNumber) || migrateLegacyZeroOffset ? -0.7 : storedLyricOffsetNumber));
localStorage.setItem("turntable-lyric-offset-default-v2", "applied");
const VOLUME_WEIGHT_SENSITIVITY = { light: .28, medium: .19, heavy: .12 };
const DIAL_MULTI_TAP_MS = 420;
const SIDE_CONTROL_HIDE_ZONE_START = 0.56;
const ACTIVE_STATUS_REFRESH_MS = 10_000;
const IDLE_STATUS_REFRESH_MS = 30_000;
const ENDING_STATUS_REFRESH_MS = 1_000;
const ENDING_STATUS_WINDOW_MS = 12_000;
const DEVICES_VIEW_REFRESH_MS = 30_000;
const SEEK_CONFIRM_GRACE_MS = 4_000;
const SEEK_CONFIRM_TOLERANCE_MS = 1_500;

const CLIENT_SNAPSHOT_KEY = "turntable-last-playback";
let spotifyPauseUntil = Number(sessionStorage.getItem("turntable-spotify-pause-until")) || 0;
let lastSnapshotSavedAt = 0;

async function api(path, options = {}) {
  const spotifyPath = /^\/api\/(status|devices|queue|playlists|player\/|settings)/.test(path);
  if (spotifyPath && Date.now() < spotifyPauseUntil) {
    const retryAfter = Math.max(1, Math.ceil((spotifyPauseUntil - Date.now()) / 1000));
    throw Object.assign(new Error(`Spotify is cooling down. Trying again in ${retryAfter} seconds.`), { status: 429, retryAfter, localCooldown: true });
  }
  let response;
  try {
    response = await fetch(path, {
      ...options,
      headers: { "Content-Type": "application/json", "x-remote-session": session, ...(options.headers || {}) }
    });
  } catch (error) {
    setConnectionState("offline", "Spotify is unreachable. Showing the last saved playback.");
    throw Object.assign(new Error("Spotify is unavailable. Check your internet connection and authorization."), { status: 503, cause: error });
  }  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    if (response.status === 401) {
      session = null;
      localStorage.removeItem("turntable-session");
      if (refreshTimer) clearTimeout(refreshTimer);
      refreshTimer = null;
      remote.hidden = true;
      pairing.hidden = false;
      $("pair-error").textContent = "Your Spotify authorization expired. Connect Spotify again.";
    }
    const retryAfter = Math.max(0, Number(body.retry_after || response.headers.get("retry-after")) || 0);
    if (response.status === 429 && retryAfter) {
      spotifyPauseUntil = Math.max(spotifyPauseUntil, Date.now() + retryAfter * 1000);
      sessionStorage.setItem("turntable-spotify-pause-until", String(spotifyPauseUntil));
    }
    throw Object.assign(new Error(body.error || "The PC remote did not respond."), { status: response.status, retryAfter });
  }
  return response.status === 204 ? null : response.json();
}

const formatTime = (ms = 0) => `${Math.floor(ms / 60000)}:${String(Math.floor(ms / 1000) % 60).padStart(2, "0")}`;
const artists = (track) => track?.artists?.map((artist) => artist.name).join(", ") || "Unknown artist";
const artwork = (track) => track?.album?.images?.[0]?.url || "";

function saveClientSnapshot(force = false) {
  if (!state?.playback || (!force && Date.now() - lastSnapshotSavedAt < 30_000)) return;
  lastSnapshotSavedAt = Date.now();
  try { localStorage.setItem(CLIENT_SNAPSHOT_KEY, JSON.stringify({ playback: state.playback, queue: state.queue || [], savedAt: Date.now() })); } catch { /* Storage can be unavailable in private mode. */ }
}
function hydrateClientSnapshot() {
  try {
    const cached = JSON.parse(localStorage.getItem(CLIENT_SNAPSHOT_KEY) || "null");
    if (!cached?.playback || Date.now() - cached.savedAt > 24 * 60 * 60 * 1000) return false;
    if (cached.playback.is_playing && Number.isFinite(cached.playback.progress_ms)) {
      cached.playback.progress_ms = Math.min(cached.playback.item?.duration_ms || Infinity, cached.playback.progress_ms + Math.max(0, Date.now() - cached.savedAt));
    }
    state = { playback: cached.playback, queue: Array.isArray(cached.queue) ? cached.queue : [] };
    render({ playback: state.playback, queue: state.queue, connection: { cached: true } });
    renderQueue(state.queue);
    queueLoaded = false; // Render cached queue now, then refresh it once in the background.
    setMessage("Connecting — showing the last known playback.");
    setConnectionState("cached", "Showing the saved playback while the first live update loads.", { updatedAt: cached.savedAt, cacheAge: Date.now() - cached.savedAt });
    return true;
  } catch { return false; }
}

function preloadArtwork(url) {
  if (!url) return Promise.resolve(false);
  if (artworkPreloads.has(url)) return artworkPreloads.get(url);
  const ready = new Promise((resolve) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => resolve(true);
    image.onerror = () => resolve(false);
    image.src = url;
  });
  artworkPreloads.set(url, ready);
  if (artworkPreloads.size > 18) artworkPreloads.delete(artworkPreloads.keys().next().value);
  return ready;
}
function cacheQueueTrack(track) {
  if (!track?.uri) return track || null;
  const cached = {
    ...track,
    artists: Array.isArray(track.artists) ? track.artists.map((artist) => ({ ...artist })) : [],
    album: track.album ? { ...track.album, images: Array.isArray(track.album.images) ? track.album.images.map((image) => ({ ...image })) : [] } : null
  };
  queuedTrackCache.set(track.uri, cached);
  if (queuedTrackCache.size > 30) queuedTrackCache.delete(queuedTrackCache.keys().next().value);
  void preloadArtwork(artwork(cached));
  return cached;
}
function cachedQueueTrack(track) {
  return queuedTrackCache.get(track?.uri) || cacheQueueTrack(track);
}
function primeQueuedTargetDisplay(target) {
  const track = target?.track || null;
  if (!track) return;
  const cover = target.cover || artwork(track);
  pendingArtworkUri = track.uri || null;
  pendingArtworkDirection = "next";
  updateTrackCopy(track, null, false);
  fadeBackground(cover);
  void showNextCover(cover);
  void preloadArtwork(cover).then((ready) => {
    if (!ready || queuedPlayNextTarget !== target) return;
    $("cover").src = cover;
    $("cover").style.display = "block";
    $("ambient").style.backgroundImage = `url(${JSON.stringify(cover)})`;
  });
}
async function showNextCover(url) {
  requestedNextCover = url || "";
  const nextCover = $("next-cover");
  if (!url) { nextCover.removeAttribute("src"); nextCover.style.display = "none"; return; }
  const loaded = await preloadArtwork(url);
  if (requestedNextCover !== url) return;
  nextCover.src = url;
  nextCover.style.display = loaded ? "block" : "none";
}
function createVinylSpinAnimation(element) {
  const animation = element.animate(
    [{ transform: "rotate(0deg)" }, { transform: "rotate(360deg)" }],
    { duration: 9000, iterations: Infinity, easing: "linear" }
  );
  animation.playbackRate = 0;
  return animation;
}
function ensureVinylSpin(reset = false) {
  if (!vinylSpinAnimation) vinylSpinAnimation = createVinylSpinAnimation($("cover"));
  if (reset) vinylSpinAnimation.currentTime = 0;
  return vinylSpinAnimation;
}
function updateVinylSpinEffect(rate = vinylSpinRate) {
  const speed = Math.max(0, Math.min(1, (Math.abs(rate) - 1) / 6));
  const strength = Math.pow(speed, 1.45);
  $("album-card").style.setProperty("--vinyl-speed-effect", (strength * .62).toFixed(3));
  $("album-card").style.setProperty("--vinyl-transition-softness", (strength * 1.2).toFixed(2) + "px");
}
function rampVinylSpin(targetRate, duration = 1100) {
  const animation = ensureVinylSpin();
  const currentTime = Number(animation.currentTime) || 0;
  if (targetRate < 0 && currentTime < 9000) animation.currentTime = currentTime + 9000;
  vinylTargetRate = targetRate;
  if (vinylRateFrame) cancelAnimationFrame(vinylRateFrame);
  if (vinylRateResolver) vinylRateResolver(false);
  if (Math.abs(vinylSpinRate - targetRate) < .01 || duration <= 0) {
    vinylSpinRate = targetRate;
    animation.playbackRate = targetRate;
    updateVinylSpinEffect(targetRate);
    return Promise.resolve(true);
  }
  const startingRate = vinylSpinRate;
  const startedAt = performance.now();
  return new Promise((resolve) => {
    vinylRateResolver = resolve;
    const step = (now) => {
      const progress = Math.min(1, (now - startedAt) / duration);
      const eased = progress * progress * (3 - 2 * progress);
      vinylSpinRate = startingRate + (targetRate - startingRate) * eased;
      animation.playbackRate = vinylSpinRate;
      updateVinylSpinEffect(vinylSpinRate);
      if (progress < 1) vinylRateFrame = requestAnimationFrame(step);
      else {
        vinylRateFrame = null;
        vinylRateResolver = null;
        vinylSpinRate = targetRate;
        animation.playbackRate = targetRate;
        updateVinylSpinEffect(targetRate);
        resolve(true);
      }
    };
    vinylRateFrame = requestAnimationFrame(step);
  });
}
function setVinylPlaybackState(playing) {
  if (albumStyle !== "vinyl" || artworkTransitionActive) return;
  const target = playing ? 1 : 0;
  if (target === vinylTargetRate) return;
  rampVinylSpin(target, playing ? 1250 : 1650);
}
function resetTurntableRotation(uri) {
  if (!uri || uri === turntableTrackUri) return;
  turntableTrackUri = uri;
  ensureVinylSpin(true);
  vinylSpinRate = 0;
  vinylTargetRate = 0;
  vinylSpinAnimation.playbackRate = 0;
  updateVinylSpinEffect(0);
  setVinylPlaybackState(!!playback?.is_playing);
}
function prepareVinylTransition(direction = "next") {
  if (albumStyle !== "vinyl") return;
  vinylTransitionDirection = direction === "previous" ? "previous" : "next";
  $("album-card").dataset.spinDirection = vinylTransitionDirection;
  const transitionRate = vinylTransitionDirection === "previous" ? -7 : 7;
  artworkTransitionActive = true;
  vinylTransitionPrepared = true;
  $("album-card").classList.add("vinyl-transitioning");
  rampVinylSpin(transitionRate, 380);
}
async function animateVinylAlbumChange(incomingCover, incomingUri) {
  if (albumStyle !== "vinyl" || !incomingCover || !incomingUri) return;
  const token = ++vinylTransitionToken;
  if (!vinylTransitionPrepared) prepareVinylTransition();
  const transitionRate = vinylTransitionDirection === "previous" ? -7 : 7;
  const [artworkReady] = await Promise.all([preloadArtwork(incomingCover), rampVinylSpin(transitionRate, Math.abs(vinylSpinRate) >= 6.5 ? 80 : 360)]);
  if (token !== vinylTransitionToken) return;
  if (!artworkReady) {
    cancelVinylTransition();
    return;
  }
  const cover = $("cover");
  const transitionCover = $("vinyl-transition-cover");
  transitionCover.src = incomingCover;
  transitionCover.style.display = "block";
  await transitionCover.decode().catch(() => {});
  if (token !== vinylTransitionToken) return;
  vinylIncomingSpinAnimation?.cancel();
  vinylIncomingSpinAnimation = createVinylSpinAnimation(transitionCover);
  vinylIncomingSpinAnimation.currentTime = vinylSpinAnimation?.currentTime || 0;
  vinylIncomingSpinAnimation.playbackRate = transitionRate;
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  $("album-card").classList.add("vinyl-cover-blending");
  await new Promise((resolve) => setTimeout(resolve, 440));
  if (token !== vinylTransitionToken) return;
  cover.src = incomingCover;
  cover.style.display = "block";
  await cover.decode().catch(() => {});
  $("album-card").classList.add("vinyl-blend-settled");
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  if (token !== vinylTransitionToken) return;
  vinylIncomingSpinAnimation?.cancel();
  vinylIncomingSpinAnimation = null;
  transitionCover.style.display = "none";
  transitionCover.removeAttribute("src");
  $("album-card").classList.remove("vinyl-transitioning", "vinyl-cover-blending", "vinyl-blend-settled", "swiping");
  vinylTransitionPrepared = false;
  vinylTransitionDirection = "next";
  artworkTransitionActive = false;
  turntableTrackUri = incomingUri;
  rampVinylSpin(playback?.is_playing ? 1 : 0, playback?.is_playing ? 1300 : 1650);
  showNextCover(artwork(state?.queue?.[0]));
}
function cancelVinylTransition(originalCover = "") {
  vinylTransitionToken += 1;
  vinylTransitionPrepared = false;
  vinylTransitionDirection = "next";
  artworkTransitionActive = false;
  vinylIncomingSpinAnimation?.cancel();
  vinylIncomingSpinAnimation = null;
  $("vinyl-transition-cover").style.display = "none";
  $("vinyl-transition-cover").removeAttribute("src");
  $("album-card").classList.remove("vinyl-transitioning", "vinyl-cover-blending", "vinyl-blend-settled", "swiping");
  $("cover").classList.remove("vinyl-cover-swap");
  if (originalCover) {
    $("cover").src = originalCover;
    $("cover").style.display = "block";
  }
  rampVinylSpin(playback?.is_playing ? 1 : 0, 900);
}

function clockPosition(now = performance.now()) {
  const elapsed = progressClock.playing ? now - progressClock.startedAt : 0;
  const correctionProgress = progressClock.correctionDuration
    ? Math.min(1, Math.max(0, (now - progressClock.correctionStartedAt) / progressClock.correctionDuration))
    : 1;
  const easedCorrection = correctionProgress * correctionProgress * (3 - 2 * correctionProgress);
  return Math.max(0, Math.min(progressClock.duration, progressClock.position + elapsed + progressClock.correction * easedCorrection));
}
function paintProgress(now = performance.now()) {
  if (seekDragging) return;
  const position = clockPosition(now);
  const seek = $("seek");
  seek.value = position;
  const percent = progressClock.duration ? position / progressClock.duration * 100 : 0;
  seek.style.setProperty("--seek-progress", `${Math.max(0, Math.min(100, percent))}%`);
  $("elapsed").textContent = formatTime(position);
  updateActiveLyrics(position);
}
function animateProgress(now) {
  progressFrame = null;
  paintProgress(now);
  if (progressClock.playing && clockPosition(now) < progressClock.duration) progressFrame = requestAnimationFrame(animateProgress);
}
function startProgressAnimation() {
  if (!progressFrame && progressClock.playing) progressFrame = requestAnimationFrame(animateProgress);
}
function syncProgressClock(player) {
  const now = performance.now();
  const uri = player?.item?.uri || null;
  const duration = player?.item?.duration_ms || 0;
  const serverPosition = Math.max(0, Math.min(duration, player?.progress_ms || 0));
  let confirmedPosition = serverPosition;
  let holdingPendingSeek = false;
  if (pendingSeek) {
    if (pendingSeek.uri !== uri || now >= pendingSeek.expiresAt) pendingSeek = null;
    else {
      const expectedPosition = Math.max(0, Math.min(duration, pendingSeek.position + (player?.is_playing ? now - pendingSeek.startedAt : 0)));
      if (Math.abs(serverPosition - expectedPosition) <= SEEK_CONFIRM_TOLERANCE_MS) pendingSeek = null;
      else {
        confirmedPosition = expectedPosition;
        holdingPendingSeek = true;
      }
    }
  }
  let position = confirmedPosition;
  let correction = 0;
  let correctionDuration = 0;
  if (!holdingPendingSeek && uri && uri === progressClock.uri && player?.is_playing && progressClock.playing) {
    const estimated = clockPosition(now);
    correction = confirmedPosition - estimated;
    position = estimated;
    correctionDuration = Math.max(350, Math.min(1200, Math.abs(correction) * .55));
  }
  progressClock = { uri, position, duration, startedAt: now, playing: !!player?.is_playing, correction, correctionStartedAt: now, correctionDuration };
  $("seek").max = duration || 100;
  $("duration").textContent = formatTime(duration);
  paintProgress(now);
  startProgressAnimation();
}
function fadeBackground(url, immediate = false) {
  if (!url || url === currentBackgroundUrl) return;
  const token = ++backgroundTransitionToken;
  currentBackgroundUrl = url;
  const layers = [$("background-a"), $("background-b")];
  if (immediate || !layers[activeBackground].style.backgroundImage) {
    layers[activeBackground].style.backgroundImage = `url(${JSON.stringify(url)})`;
    layers[activeBackground].classList.add("active");
    return;
  }
  const nextIndex = activeBackground === 0 ? 1 : 0;
  const incoming = layers[nextIndex]; const outgoing = layers[activeBackground];
  incoming.style.backgroundImage = `url(${JSON.stringify(url)})`;
  incoming.classList.remove("active");
  requestAnimationFrame(() => requestAnimationFrame(() => {
    if (token !== backgroundTransitionToken) return;
    incoming.classList.add("active"); outgoing.classList.remove("active"); activeBackground = nextIndex;
  }));
}

function parseSyncedLyrics(text = "") {
  const parsed = [];
  text.split(/\r?\n/).forEach((rawLine) => {
    const stamps = [...rawLine.matchAll(/\[(\d{1,2}):(\d{2}(?:\.\d{1,3})?)\]/g)];
    const words = rawLine.replace(/\[[^\]]+\]/g, "").trim() || "…";
    stamps.forEach((stamp) => parsed.push({ time: (Number(stamp[1]) * 60 + Number(stamp[2])) * 1000, text: words }));
  });
  return parsed.sort((a, b) => a.time - b.time);
}

function anchorArtworkToActivePanel() {
  const artStage = document.querySelector(".art-stage");
  const playerView = document.querySelector(".player-view");
  if (!artStage || !playerView) return;
  const landscapePlayer = remote.dataset.layoutResolved !== "portrait" && innerWidth >= innerHeight && remote.dataset.currentView === "player";
  if (!landscapePlayer) { artStage.style.removeProperty("--art-panel-offset"); return; }
  const anchor = remote.dataset.display === "lyrics" ? $("lyrics-panel") : playerView.querySelector(".track-copy");
  if (!anchor || anchor.getClientRects().length === 0) { artStage.style.removeProperty("--art-panel-offset"); return; }
  artStage.style.setProperty("--art-panel-offset", "0px");
  const artBounds = artStage.getBoundingClientRect();
  const anchorBounds = anchor.getBoundingClientRect();
  const offset = (anchorBounds.top + anchorBounds.height / 2) - (artBounds.top + artBounds.height / 2);
  artStage.style.setProperty("--art-panel-offset", `${Math.round(Math.max(-90, Math.min(90, offset)))}px`);
}
function syncDisplayPresentation() {
  // Keep the lyrics panel visible during loading or failure so people can see the real status.
  remote.dataset.display = displayStyle;
  remote.dataset.lyricsFallback = "false";
  requestAnimationFrame(anchorArtworkToActivePanel);
}
function setLyricsAvailability(nextAvailability) {
  lyricsAvailability = nextAvailability;
  syncDisplayPresentation();
}
function renderLyricsLayout() {
  const container = $("lyrics-lines");
  container.replaceChildren();
  container.className = "lyrics-lines";
  activeLyricIndex = -1;
  activeLyricWordIndex = -1;
  const synced = lyricsLines.length > 0 && lyricsLines[0].time != null;
  if (!synced || lyricStyle === "scroll") {
    container.classList.toggle("synced", synced);
    lyricsLines.forEach((row) => {
      const line = document.createElement("p");
      line.textContent = row.text;
      if (row.time == null) line.className = "plain";
      container.append(line);
    });
    return;
  }
  container.classList.add("lyric-stage-mode");
  const stage = document.createElement("p");
  stage.className = `lyric-stage lyric-stage-${lyricStyle}`;
  stage.setAttribute("aria-live", "off");
  container.append(stage);
}

function renderLyrics(result = {}) {
  const container = $("lyrics-lines");
  const status = $("lyrics-status");
  container.replaceChildren();
  container.className = "lyrics-lines";
  lyricsLines = [];
  activeLyricIndex = -1;
  activeLyricWordIndex = -1;
  if (result.instrumental) {
    setLyricsAvailability("unavailable");
    status.hidden = false;
    status.textContent = "Instrumental track";
    return;
  }
  const synced = parseSyncedLyrics(result.syncedLyrics);
  const plain = result.plainLyrics?.split(/\r?\n/).map((line) => line.trim()).filter(Boolean) || [];
  const rows = synced.length ? synced : plain.map((text) => ({ time: null, text }));
  if (!result.found || !rows.length) {
    setLyricsAvailability("unavailable");
    status.hidden = false;
    status.textContent = "Lyrics aren't available for this song.";
    return;
  }
  setLyricsAvailability("available");
  status.hidden = true;
  lyricsLines = rows;
  renderLyricsLayout();
  updateActiveLyrics(clockPosition());
}

function normalizeLyricsProviderResult(record) {
  return { found: !!record, instrumental: !!record?.instrumental, syncedLyrics: record?.syncedLyrics || null, plainLyrics: record?.plainLyrics || null };
}
async function fetchLyricsProviderResponse(url) {
  const nativeLyrics = window.Capacitor?.Plugins?.Lyrics;
  if (nativeLyrics?.request) {
    const response = await nativeLyrics.request({ url });
    return {
      ok: response.status >= 200 && response.status < 300,
      status: response.status,
      json: async () => JSON.parse(response.body || "null")
    };
  }
  return fetch(url);
}
async function fetchLyricsFromProvider(track, exactQuery) {
  const exactResponse = await fetchLyricsProviderResponse(`https://lrclib.net/api/get?${exactQuery}`);
  if (exactResponse.ok) return normalizeLyricsProviderResult(await exactResponse.json());
  if (exactResponse.status !== 404) throw new Error("Lyrics provider unavailable");
  const searchQuery = new URLSearchParams({
    track_name: track?.name || "",
    artist_name: artists(track),
    duration: String(track?.duration_ms || "")
  });
  const searchResponse = await fetchLyricsProviderResponse(`https://lrclib.net/api/search?${searchQuery}`);
  if (!searchResponse.ok) throw new Error("Lyrics provider unavailable");
  const matches = await searchResponse.json();
  const bestMatch = Array.isArray(matches) ? matches.find((item) => item?.syncedLyrics || item?.plainLyrics) : null;
  return normalizeLyricsProviderResult(bestMatch);
}
async function loadLyrics(track) {
  const token = ++lyricsRequestToken;
  lyricsTrackUri = track?.uri || null;
  activeLyricIndex = -1;
  activeLyricWordIndex = -1;
  lyricsLines = [];
  setLyricsAvailability(track ? "loading" : "unavailable");
  $("lyrics-lines").replaceChildren();
  $("lyrics-lines").className = "lyrics-lines";
  $("lyrics-status").hidden = false;
  $("lyrics-status").textContent = track ? "Finding lyrics…" : "Play a song to see lyrics.";
  if (!track) return;
  const query = new URLSearchParams({
    track_name: track.name || "",
    artist_name: artists(track),
    album_name: track.album?.name || "",
    duration: String(Math.round((track.duration_ms || 0) / 1000))
  });
  const cacheKey = query.toString();
  if (lyricsResultCache.has(cacheKey)) {
    if (token === lyricsRequestToken) renderLyrics(lyricsResultCache.get(cacheKey));
    return;
  }
  try {
    let result;
    try {
      result = await api(`/api/lyrics?${query}`);
    } catch {
      result = await fetchLyricsFromProvider(track, query);
    }
    lyricsResultCache.set(cacheKey, result);
    if (lyricsResultCache.size > 30) lyricsResultCache.delete(lyricsResultCache.keys().next().value);
    if (token === lyricsRequestToken && lyricsTrackUri === track.uri) renderLyrics(result);
  } catch {
    if (token === lyricsRequestToken) {
      setLyricsAvailability("unavailable");
      $("lyrics-lines").replaceChildren();
      $("lyrics-status").hidden = false;
      $("lyrics-status").textContent = "Lyrics could not be loaded.";
    }
  }
}

function lyricPosition(position) {
  position -= lyricOffset * 1000;
  let lineIndex = -1;
  for (let index = 0; index < lyricsLines.length && lyricsLines[index].time <= position + 100; index += 1) lineIndex = index;
  if (lineIndex < 0) return { lineIndex, wordIndex: -1, words: [] };
  const line = lyricsLines[lineIndex];
  const words = line.text.trim().split(/\s+/).filter(Boolean);
  const nextStart = lyricsLines[lineIndex + 1]?.time;
  const fallbackEnd = Math.min(progressClock.duration || line.time + 4200, line.time + 4200);
  const lineEnd = Math.max(line.time + 450, nextStart ?? fallbackEnd);
  const progress = Math.max(0, Math.min(.999, (position - line.time) / (lineEnd - line.time)));
  return { lineIndex, wordIndex: Math.min(words.length - 1, Math.floor(progress * words.length)), words };
}

function buildTimedLyricLine(stage, words, wordIndex) {
  stage.replaceChildren();
  if (lyricStyle === "focus") {
    [wordIndex - 1, wordIndex, wordIndex + 1].forEach((index) => {
      if (!words[index]) return;
      const span = document.createElement("span");
      span.textContent = words[index];
      span.className = index === wordIndex ? "current" : "neighbor";
      stage.append(span);
    });
    return;
  }
  words.forEach((word, index) => {
    const span = document.createElement("span");
    span.textContent = `${word}${index < words.length - 1 ? " " : ""}`;
    span.className = index < wordIndex ? "passed" : index === wordIndex ? "current" : "future";
    stage.append(span);
  });
}

function updateActiveLyrics(position) {
  if (displayStyle !== "lyrics" || !lyricsLines.length || lyricsLines[0].time == null) return;
  const { lineIndex, wordIndex, words } = lyricPosition(position);
  if (lyricStyle !== "scroll") {
    if (lineIndex < 0 || !words.length || (lineIndex === activeLyricIndex && wordIndex === activeLyricWordIndex)) return;
    const stage = $("lyrics-lines").querySelector(".lyric-stage");
    if (!stage) return;
    activeLyricIndex = lineIndex;
    activeLyricWordIndex = wordIndex;
    if (lyricStyle === "word") {
      stage.textContent = words[wordIndex] || "";
      stage.animate?.([{ opacity: 0, transform: "translateY(7px)" }, { opacity: 1, transform: "translateY(0)" }], { duration: 180, easing: "ease-out" });
    } else buildTimedLyricLine(stage, words, wordIndex);
    requestAnimationFrame(fitActiveLyricText);
    return;
  }
  if (lineIndex === activeLyricIndex) return;
  const elements = [...$("lyrics-lines").children];
  if (activeLyricIndex >= 0) elements[activeLyricIndex]?.classList.remove("active");
  activeLyricIndex = lineIndex;
  activeLyricWordIndex = -1;
  const active = elements[lineIndex];
  if (!active) return;
  active.classList.add("active");
  const container = $("lyrics-lines");
  const activeCenter = active.getBoundingClientRect().top - container.getBoundingClientRect().top + container.scrollTop + active.offsetHeight / 2;
  container.scrollTo({ top: Math.max(0, activeCenter - container.clientHeight * .46), behavior: "smooth" });
}

async function updateAlbumColor(url, uri) {
  if (!url || !uri) return;
  albumColorTrackUri = uri;
  if (albumColorCache.has(url)) {
    remote.style.setProperty("--album-color", albumColorCache.get(url));
    return;
  }
  const sampleColor = (image) => {
    const canvas = document.createElement("canvas");
    canvas.width = 24; canvas.height = 24;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    context.drawImage(image, 0, 0, 24, 24);
    const pixels = context.getImageData(0, 0, 24, 24).data;
    let red = 0; let green = 0; let blue = 0; let count = 0;
    for (let index = 0; index < pixels.length; index += 4) {
      if (pixels[index + 3] < 80) continue;
      red += pixels[index]; green += pixels[index + 1]; blue += pixels[index + 2]; count += 1;
    }
    return count ? `rgb(${Math.max(18, Math.round(red / count * .55))} ${Math.max(18, Math.round(green / count * .55))} ${Math.max(18, Math.round(blue / count * .55))})` : null;
  };
  try {
    let image = new Image();
    image.crossOrigin = "anonymous";
    image.src = url;
    let objectUrl = null;
    try { await image.decode(); sampleColor(image); }
    catch {
      const response = await fetch(`/api/artwork?url=${encodeURIComponent(url)}`, { headers: { "x-remote-session": session } });
      if (!response.ok) throw new Error("Artwork unavailable");
      objectUrl = URL.createObjectURL(await response.blob());
      image = new Image(); image.src = objectUrl; await image.decode();
    }
    const color = sampleColor(image);
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    if (!color) return;
    albumColorCache.set(url, color);
    if (albumColorTrackUri === uri) remote.style.setProperty("--album-color", color);
  } catch {
    if (albumColorTrackUri === uri) remote.style.setProperty("--album-color", "#34261f");
  }
}

function setMessage(text = "") { message.textContent = text; }
function connectionCopy(kind) {
  return {
    connected: ["Connected", "The phone, PC server, and Spotify playback are synchronized."],
    syncing: ["Syncing", "Applying the latest playback state from Spotify."],
    cached: ["Reconnecting", "Showing the last known playback while Spotify reconnects."],
    cooldown: ["Spotify cooldown", "Playback is cached until Spotify allows another request."],
    offline: ["PC unavailable", "The last saved playback remains visible while the LAN connection recovers."],
    waiting: ["Waiting for Spotify", "Start a song in Spotify to synchronize playback."]
  }[kind] || ["Checking connection", "Contacting the PC and Spotify..."];
}
function connectionAction(kind) {
  return {
    connected: "No action needed.",
    syncing: "Keep Spotify open on the PC and allow the update to finish.",
    cached: "Confirm the PC server is running and both devices are on the same Wi-Fi.",
    cooldown: "Wait for the automatic retry and avoid repeatedly pressing Refresh.",
    offline: "Open the Turntable Remote Dashboard, confirm the server says Running, and check that both devices use the same Wi-Fi.",
    waiting: "Play a song in the Spotify desktop app, then press Refresh once."
  }[kind] || "Wait for the current connection check to finish.";
}
function relativeSyncTime(timestamp) {
  if (!timestamp) return "—";
  const seconds = Math.max(0, Math.round((Date.now() - timestamp) / 1000));
  if (seconds < 2) return "now";
  if (seconds < 60) return `${seconds}s ago`;
  return `${Math.floor(seconds / 60)}m ago`;
}
function setConnectionState(kind, detail, options = {}) {
  const allowed = ["connected", "syncing", "cached", "cooldown", "offline", "waiting"];
  kind = allowed.includes(kind) ? kind : "waiting";
  const copy = connectionCopy(kind);
  connectionState = {
    kind,
    detail: detail || copy[1],
    updatedAt: options.updatedAt ?? connectionState.updatedAt,
    cacheAge: options.cacheAge ?? connectionState.cacheAge
  };
  const topDot = $("connection-dot");
  const cardDot = $("connection-status-dot");
  [topDot, cardDot].filter(Boolean).forEach((dot) => { dot.className = dot === topDot ? `connection-indicator ${kind}` : `connection-status-dot ${kind}`; });
  if (topDot) {
    topDot.title = `${copy[0]} — ${connectionState.detail}`;
    topDot.setAttribute("aria-label", `Connection status: ${copy[0]}`);
  }
  if ($("connection-status-title")) $("connection-status-title").textContent = copy[0];
  if ($("connection-status-detail")) $("connection-status-detail").textContent = connectionState.detail;
  if ($("connection-recommended-action")) $("connection-recommended-action").textContent = connectionAction(kind);
  if ($("connection-last-sync")) $("connection-last-sync").textContent = relativeSyncTime(connectionState.updatedAt);
  if ($("connection-cache-age")) $("connection-cache-age").textContent = Number.isFinite(connectionState.cacheAge) ? `${Math.max(0, Math.round(connectionState.cacheAge / 1000))}s` : "—";
}
function setOptimisticSetting(key, value, duration = 3_000) {
  optimisticSettings.set(key, { value, until: performance.now() + duration });
}
function optimisticSettingValue(key, serverValue) {
  const pending = optimisticSettings.get(key);
  if (!pending) return serverValue;
  if (pending.value === serverValue || performance.now() >= pending.until) {
    optimisticSettings.delete(key);
    return serverValue;
  }
  return pending.value;
}
function detectedDeviceClass() {
  const width = Math.max(1, innerWidth);
  const height = Math.max(1, innerHeight);
  if (height > width) return "portrait";
  const shortSide = Math.min(width, height);
  const longSide = Math.max(width, height);
  if (shortSide <= 430 || longSide <= 860) return "compact";
  if (shortSide >= 650 || longSide >= 1180) return "wide";
  return "standard";
}
function autoLandscapeProfileKey() {
  return `turntable-auto-landscape-profile:${screen.width}x${screen.height}`;
}
function resolvedLayoutProfile() {
  const detected = detectedDeviceClass();
  if (detected === "portrait") return "portrait";
  if (layoutProfile !== "auto") return layoutProfile;
  const stable = sessionStorage.getItem(autoLandscapeProfileKey());
  return ["compact", "standard", "wide"].includes(stable) ? stable : detected;
}
function applyLayoutProfile(next = layoutProfile) {
  layoutProfile = ["auto", "compact", "standard", "wide"].includes(next) ? next : "auto";
  const detected = detectedDeviceClass();
  if (layoutProfile === "auto" && detected !== "portrait") {
    const key = autoLandscapeProfileKey();
    if (!["compact", "standard", "wide"].includes(sessionStorage.getItem(key))) sessionStorage.setItem(key, detected);
  }
  localStorage.setItem("turntable-layout-profile", layoutProfile);
  remote.dataset.layoutProfile = layoutProfile;
  remote.dataset.deviceClass = detected;
  const resolved = resolvedLayoutProfile();
  remote.dataset.layoutResolved = resolved;
  document.querySelectorAll("[data-layout-profile-choice]").forEach((button) => {
    const active = button.dataset.layoutProfileChoice === layoutProfile;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
    button.setAttribute("aria-current", active ? "true" : "false");
  });
  const status = $("screen-fit-status");
  if (status) status.textContent = layoutProfile === "auto" ? `Auto → ${resolved[0].toUpperCase()}${resolved.slice(1)}` : `Active: ${resolved[0].toUpperCase()}${resolved.slice(1)}`;
  syncAppearanceSliders();
  requestAnimationFrame(anchorArtworkToActivePanel);
}
function applyUIFontScale(value = uiFontScale) {
  uiFontScale = Math.max(85, Math.min(130, Math.round(Number(value) / 5) * 5));
  localStorage.setItem("turntable-ui-font-scale", String(uiFontScale));
  document.documentElement.style.setProperty("--ui-font-scale", String(uiFontScale / 100));
  remote.style.setProperty("--ui-font-scale", String(uiFontScale / 100));
  if ($("ui-font-size")) $("ui-font-size").value = String(uiFontScale);
  if ($("ui-font-size-value")) $("ui-font-size-value").textContent = `${uiFontScale}%`;
  if ($("ui-font-size")) $("ui-font-size").setAttribute("aria-valuetext", `${uiFontScale} percent`);
}
async function loadDiagnostics() {
  try {
    const data = await api("/api/diagnostics");
    $("diag-minute").textContent = data.requests.last_minute;
    $("diag-hour").textContent = data.requests.last_hour;
    $("diag-cache-hits").textContent = data.requests.cache_hits_since_start;
    $("diag-server").textContent = data.connection.state.toUpperCase();
    $("diag-uptime").textContent = `${Math.floor(data.uptime_seconds / 60)} min uptime`;
    $("diag-connection").textContent = data.connection.cooldown_seconds
      ? `Spotify cooldown: ${data.connection.cooldown_seconds}s remaining.`
      : `Playback cache age: ${data.connection.playback_cache_age_seconds ?? "none"}s. Total calls since server start: ${data.requests.total_since_start}.`;
    const paths = $("diag-paths"); paths.replaceChildren();
    for (const item of data.requests.top_paths) {
      const row = document.createElement("li"); row.innerHTML = `<span>${item.path}</span><b>${item.count}</b>`; paths.append(row);
    }
  } catch (error) {
    $("diag-connection").textContent = error.message;
  }
}
function setUpdateLogTab(tab = "updates") {
  const diagnostics = tab === "diagnostics";
  $("updates-panel").hidden = diagnostics;
  $("diagnostics-panel").hidden = !diagnostics;
  $("updates-tab").classList.toggle("active", !diagnostics);
  $("diagnostics-tab").classList.toggle("active", diagnostics);
  $("updates-tab").setAttribute("aria-selected", String(!diagnostics));
  $("diagnostics-tab").setAttribute("aria-selected", String(diagnostics));
  $("update-log-title").textContent = diagnostics ? "Live diagnostics" : "Latest 10 updates";
  if (diagnostics) {
    void loadDiagnostics();
    if (diagnosticsRefreshTimer) clearInterval(diagnosticsRefreshTimer);
    diagnosticsRefreshTimer = setInterval(loadDiagnostics, 5_000);
  } else if (diagnosticsRefreshTimer) {
    clearInterval(diagnosticsRefreshTimer);
    diagnosticsRefreshTimer = null;
  }
}
function showError(error) { setMessage(error.message); }
function physicalFeedback(kind = "tick") {
  if (kind === "press" && buttonHapticDispatchActive) return;
  const now = performance.now();
  if (kind === "tick" && now - lastFeedbackAt < 28) return;
  lastFeedbackAt = now;
  const switchControl = $("haptic-switch");
  if (switchControl) switchControl.click();
  if (navigator.vibrate) navigator.vibrate(kind === "press" ? 18 : 7);
}
document.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button || button.disabled || button.id === "dial") return;
  physicalFeedback("press");
  buttonHapticDispatchActive = true;
  queueMicrotask(() => { buttonHapticDispatchActive = false; });
}, true);
function disallowed(action) { return playback?.actions?.disallows?.[action] === true; }
function activeDeviceId() { return playback?.device?.id || undefined; }
function setButtonAvailability(button, unavailable, reason) {
  button.disabled = unavailable;
  button.title = unavailable ? reason : "";
}

function switchView(view) {
  const returningToPlayer = view === "player" && currentView !== "player";
  if (view !== "player") setQueueDrawer(false);
  currentView = view;
  remote.dataset.currentView = view;
  document.querySelectorAll("[data-panel]").forEach((panel) => panel.classList.toggle("active", panel.dataset.panel === view));
  document.querySelectorAll("[data-view]").forEach((button) => button.classList.toggle("active", button.dataset.view === view));
  if (view === "playlists") loadPlaylists();
  if (view === "devices") {
    void refreshDevicesView();
    scheduleDevicesViewRefresh();
  } else scheduleDevicesViewRefresh();
  if (returningToPlayer) requestAnimationFrame(restoreNowPlayingMotion);
  if (session) scheduleStatusRefresh(view === "player" ? 0 : undefined);
}

async function restoreNowPlayingMotion() {
  if (albumStyle === "vinyl") {
    vinylTransitionToken += 1;
    if (vinylRateFrame) cancelAnimationFrame(vinylRateFrame);
    if (vinylRateResolver) vinylRateResolver(false);
    vinylRateFrame = null; vinylRateResolver = null;
    vinylSpinAnimation?.cancel(); vinylSpinAnimation = null;
    vinylIncomingSpinAnimation?.cancel(); vinylIncomingSpinAnimation = null;
    vinylSpinRate = 0; vinylTargetRate = 0;
    vinylTransitionPrepared = false; artworkTransitionActive = false;
    $("vinyl-transition-cover").style.display = "none";
    $("vinyl-transition-cover").removeAttribute("src");
    $("album-card").classList.remove("vinyl-transitioning", "vinyl-cover-blending", "vinyl-blend-settled", "swiping");
    const animation = ensureVinylSpin();
    animation.currentTime = clockPosition() % 9000;
    vinylSpinRate = playback?.is_playing ? 1 : 0;
    vinylTargetRate = vinylSpinRate;
    animation.playbackRate = vinylSpinRate;
    updateVinylSpinEffect(vinylSpinRate);
  }
  activeLyricIndex = -1;
  $("lyrics-lines").querySelectorAll(".active").forEach((line) => line.classList.remove("active"));
  updateActiveLyrics(clockPosition());
  await refresh();
  activeLyricIndex = -1;
  $("lyrics-lines").querySelectorAll(".active").forEach((line) => line.classList.remove("active"));
  updateActiveLyrics(clockPosition());
}

function setTopBarHidden(hidden) {
  remote.classList.toggle("topbar-hidden", hidden);
  $("bar-handle").setAttribute("aria-label", hidden ? "Show quick views" : "Hide quick views");
  localStorage.setItem("turntable-topbar-hidden", String(hidden));
}

function setQueueDrawer(open) {
  remote.classList.toggle("queue-open", open);
  $("queue-toggle").setAttribute("aria-expanded", String(open));
  $("queue-toggle").setAttribute("aria-label", open ? "Close playback queue" : "Open playback queue");
  $("queue-drawer").setAttribute("aria-hidden", String(!open));
  if (open) setTimeout(() => $("queue-close").focus({ preventScroll: true }), 220);
  else if ($("queue-drawer").contains(document.activeElement)) $("queue-toggle").focus({ preventScroll: true });
}
function setUpdateLogOpen(open) {
  const modal = $("update-log-modal");
  modal.hidden = !open;
  if (open) {
    setQueueDrawer(false);
    setUpdateLogTab("updates");
    setTimeout(() => $("update-log-close").focus({ preventScroll: true }), 0);
  } else {
    if (diagnosticsRefreshTimer) clearInterval(diagnosticsRefreshTimer);
    diagnosticsRefreshTimer = null;
    if (modal.contains(document.activeElement)) $("version-indicator").focus({ preventScroll: true });
  }
}
function normalizedBackgroundColor(value) {
  return /^#[0-9a-f]{6}$/i.test(String(value || "")) ? String(value).toLowerCase() : "#34261f";
}
function backgroundOverlay(color) {
  const value = normalizedBackgroundColor(color);
  const red = parseInt(value.slice(1, 3), 16);
  const green = parseInt(value.slice(3, 5), 16);
  const blue = parseInt(value.slice(5, 7), 16);
  return `rgba(${red},${green},${blue},.62)`;
}
function applyBackgroundColorMode(nextMode = backgroundColorMode, nextColor = manualBackgroundColor) {
  backgroundColorMode = nextMode === "manual" ? "manual" : "auto";
  manualBackgroundColor = normalizedBackgroundColor(nextColor);
  remote.dataset.backgroundColorMode = backgroundColorMode;
  remote.style.setProperty("--manual-background-color", manualBackgroundColor);
  remote.style.setProperty("--manual-background-overlay", backgroundOverlay(manualBackgroundColor));
  localStorage.setItem("turntable-background-color-mode", backgroundColorMode);
  localStorage.setItem("turntable-manual-background-color", manualBackgroundColor);
  document.querySelectorAll("[data-background-color-mode]").forEach((button) => {
    const active = button.dataset.backgroundColorMode === backgroundColorMode;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  const picker = $("background-color-picker");
  if (picker) picker.value = manualBackgroundColor;
}
function syncLyricFontSizeControl() {
  const scale = lyricFontSizes[lyricStyle] || 100;
  const sizeInput = $("lyric-font-size");
  const sizeValue = $("lyric-font-size-value");
  const sizeLabel = $("lyric-font-size-label");
  const preview = $("lyric-font-preview");
  const previewText = $("lyric-font-preview-text");
  if (sizeInput) sizeInput.value = String(scale);
  if (sizeValue) sizeValue.textContent = `${scale}%`;
  if (sizeLabel) sizeLabel.textContent = `LYRIC SIZE · ${lyricStyleNames[lyricStyle] || "Scroll"}`;
  if (preview) { preview.dataset.style = lyricStyle; preview.style.setProperty("--preview-size", `${Math.round(13 * scale / 100)}px`); }
  const lyricContainer = $("lyrics-lines");
  if (previewText) previewText.textContent = lyricStyle === "word" ? "Current word" : lyricStyle === "focus" ? "Previous  Current  Next" : lyricStyle === "scroll" ? "Current lyric line" : "Current lyric phrase";
  const scaled = (value, style) => `${Math.round(value * (lyricFontSizes[style] || 100) / 100)}px`;
  const scaledVw = (value, style) => `${Number((value * (lyricFontSizes[style] || 100) / 100).toFixed(2))}vw`;
  remote.style.setProperty("--lyric-scroll-size", scaled(20, "scroll"));
  remote.style.setProperty("--lyric-word-min", scaled(34, "word")); remote.style.setProperty("--lyric-word-vw", scaledVw(6, "word")); remote.style.setProperty("--lyric-word-max", scaled(64, "word"));
  remote.style.setProperty("--lyric-karaoke-min", scaled(22, "karaoke")); remote.style.setProperty("--lyric-karaoke-vw", scaledVw(3.7, "karaoke")); remote.style.setProperty("--lyric-karaoke-max", scaled(39, "karaoke"));
  remote.style.setProperty("--lyric-reveal-min", scaled(22, "reveal")); remote.style.setProperty("--lyric-reveal-vw", scaledVw(3.7, "reveal")); remote.style.setProperty("--lyric-reveal-max", scaled(39, "reveal"));
  remote.style.setProperty("--lyric-focus-min", scaled(34, "focus")); remote.style.setProperty("--lyric-focus-vw", scaledVw(6, "focus")); remote.style.setProperty("--lyric-focus-max", scaled(64, "focus")); remote.style.setProperty("--lyric-focus-neighbor-min", scaled(15, "focus")); remote.style.setProperty("--lyric-focus-neighbor-vw", scaledVw(2, "focus")); remote.style.setProperty("--lyric-focus-neighbor-max", scaled(24, "focus"));
  remote.style.setProperty("--lyric-word-divider-min", scaled(42, "word")); remote.style.setProperty("--lyric-word-divider-vw", scaledVw(7, "word")); remote.style.setProperty("--lyric-word-divider-max", scaled(68, "word"));
  remote.style.setProperty("--lyric-karaoke-divider-min", scaled(27, "karaoke")); remote.style.setProperty("--lyric-karaoke-divider-vw", scaledVw(4.4, "karaoke")); remote.style.setProperty("--lyric-karaoke-divider-max", scaled(46, "karaoke"));
  remote.style.setProperty("--lyric-reveal-divider-min", scaled(27, "reveal")); remote.style.setProperty("--lyric-reveal-divider-vw", scaledVw(4.4, "reveal")); remote.style.setProperty("--lyric-reveal-divider-max", scaled(46, "reveal"));
  remote.style.setProperty("--lyric-focus-divider-min", scaled(42, "focus")); remote.style.setProperty("--lyric-focus-divider-vw", scaledVw(7, "focus")); remote.style.setProperty("--lyric-focus-divider-max", scaled(68, "focus")); remote.style.setProperty("--lyric-focus-neighbor-divider-min", scaled(18, "focus")); remote.style.setProperty("--lyric-focus-neighbor-divider-vw", scaledVw(2.5, "focus")); remote.style.setProperty("--lyric-focus-neighbor-divider-max", scaled(29, "focus"));
}
function fitActiveLyricText() {
  const container = $("lyrics-lines");
  const stage = container?.querySelector(".lyric-stage");
  if (!container || !stage) return;
  const targets = lyricStyle === "focus" ? [...stage.querySelectorAll(".current,.neighbor")] : [stage];
  targets.forEach((node) => node.style.removeProperty("font-size"));
  const maxHeight = Math.max(1, container.clientHeight - 2);
  let attempts = 0;
  while (attempts < 60 && (stage.scrollWidth > container.clientWidth + 1 || stage.scrollHeight > maxHeight + 1)) {
    targets.forEach((node) => {
      const currentSize = parseFloat(getComputedStyle(node).fontSize);
      node.style.setProperty("font-size", `${Math.max(12, currentSize * .95)}px`, "important");
    });
    attempts += 1;
  }
}
function applyLyricFontSize(value) {
  lyricFontSizes[lyricStyle] = Math.max(100, Math.min(300, Math.round(Number(value) / 5) * 5));
  localStorage.setItem("turntable-lyric-font-sizes", JSON.stringify(lyricFontSizes));
  syncLyricFontSizeControl();
  if (displayStyle === "lyrics" && lyricsLines.length) {
    renderLyricsLayout();
    updateActiveLyrics(clockPosition());
    // Re-run after the CSS custom properties paint. This is local-only and
    // never refreshes Spotify playback or makes a network request.
    requestAnimationFrame(() => {
      if (displayStyle !== "lyrics" || !lyricsLines.length) return;
      activeLyricIndex = -1;
      activeLyricWordIndex = -1;
      updateActiveLyrics(clockPosition());
      fitActiveLyricText();
    });
  }
  requestAnimationFrame(anchorArtworkToActivePanel);
}
function applyAppearance(nextAlbum = albumStyle, nextControl = controlStyle, nextDisplay = displayStyle, nextLyricsBackground = lyricsBackground, nextPlayerBackground = playerBackgroundStyle, nextLyricStyle = lyricStyle, nextPlaybackBarStyle = playbackBarStyle, nextGuideText = guideText, nextControlBarBackground = controlBarBackground) {
  const previousAlbum = albumStyle;
  const previousLyricStyle = lyricStyle;
  albumStyle = nextAlbum === "vinyl" ? "vinyl" : "square";
  controlStyle = nextControl === "bar" ? "bar" : "dial";
  displayStyle = nextDisplay === "lyrics" ? "lyrics" : "info";
  lyricsBackground = nextLyricsBackground === "solid" ? "solid" : "transparent";
  playerBackgroundStyle = nextPlayerBackground === "solid" ? "solid" : "artwork";
  lyricStyle = ["scroll", "word", "karaoke", "reveal", "focus"].includes(nextLyricStyle) ? nextLyricStyle : "scroll";
  playbackBarStyle = nextPlaybackBarStyle === "divider" ? "divider" : "default";
  guideText = nextGuideText === "hidden" ? "hidden" : "shown";
  controlBarBackground = ["opaque", "translucent", "transparent"].includes(nextControlBarBackground) ? nextControlBarBackground : "transparent";
  remote.dataset.album = albumStyle;
  remote.dataset.control = controlStyle;
  syncDisplayPresentation();
  remote.dataset.lyricsBackground = lyricsBackground;
  remote.dataset.playerBackground = playerBackgroundStyle;
  remote.dataset.lyricStyle = lyricStyle;
  syncLyricFontSizeControl();
  remote.dataset.playbackBar = playbackBarStyle;
  remote.dataset.guides = guideText;
  remote.dataset.controlBarBackground = controlBarBackground;
  localStorage.setItem("turntable-album-style", albumStyle);
  localStorage.setItem("turntable-control-style", controlStyle);
  localStorage.setItem("turntable-display-style", displayStyle);
  localStorage.setItem("turntable-lyrics-background", lyricsBackground);
  localStorage.setItem("turntable-player-background", playerBackgroundStyle);
  localStorage.setItem("turntable-lyric-style", lyricStyle);
  localStorage.setItem("turntable-playback-bar-style", playbackBarStyle);
  localStorage.setItem("turntable-guide-text", guideText);
  localStorage.setItem("turntable-control-bar-background", controlBarBackground);
  document.querySelectorAll("[data-album-choice]").forEach((button) => {
    const active = button.dataset.albumChoice === albumStyle;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  document.querySelectorAll("[data-control-choice]").forEach((button) => {
    const active = button.dataset.controlChoice === controlStyle;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  document.querySelectorAll("[data-display-choice]").forEach((button) => {
    const active = button.dataset.displayChoice === displayStyle;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  document.querySelectorAll("[data-lyrics-background-choice]").forEach((button) => {
    const active = button.dataset.lyricsBackgroundChoice === lyricsBackground;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  document.querySelectorAll("[data-player-background-choice]").forEach((button) => {
    const active = button.dataset.playerBackgroundChoice === playerBackgroundStyle;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  document.querySelectorAll("[data-lyric-style-choice]").forEach((button) => {
    const active = button.dataset.lyricStyleChoice === lyricStyle;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });  document.querySelectorAll("[data-playback-bar-choice]").forEach((button) => {
    const active = button.dataset.playbackBarChoice === playbackBarStyle;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  document.querySelectorAll("[data-guide-choice]").forEach((button) => {
    const active = button.dataset.guideChoice === guideText;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  document.querySelectorAll("[data-control-bar-background-choice]").forEach((button) => {
    const active = button.dataset.controlBarBackgroundChoice === controlBarBackground;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });

  if (albumStyle === "vinyl" && previousAlbum !== "vinyl") {
    turntableTrackUri = null;
    resetTurntableRotation(playback?.item?.uri);
  }
  if (albumStyle !== "vinyl" && previousAlbum === "vinyl") {
    vinylTransitionToken += 1;
    if (vinylRateFrame) cancelAnimationFrame(vinylRateFrame);
    if (vinylRateResolver) vinylRateResolver(false);
    vinylRateFrame = null; vinylRateResolver = null;
    vinylSpinAnimation?.cancel(); vinylSpinAnimation = null;
    vinylIncomingSpinAnimation?.cancel(); vinylIncomingSpinAnimation = null;
    vinylSpinRate = 0; vinylTargetRate = 0; vinylTransitionPrepared = false;
    artworkTransitionActive = false;
    $("vinyl-transition-cover").style.display = "none";
    $("vinyl-transition-cover").removeAttribute("src");
    $("album-card").classList.remove("vinyl-transitioning", "vinyl-cover-blending", "vinyl-blend-settled");
    $("cover").classList.remove("vinyl-cover-swap");
  }
  if (displayStyle === "lyrics") {
    if (lyricsTrackUri !== playback?.item?.uri) loadLyrics(playback?.item);
    else if (previousLyricStyle !== lyricStyle && lyricsLines.length) {
      renderLyricsLayout();
      updateActiveLyrics(clockPosition());
    }
  }
  if (displayStyle === "lyrics" || playerBackgroundStyle === "solid") updateAlbumColor(artwork(playback?.item), playback?.item?.uri);
  syncAppearanceSliders();
  requestAnimationFrame(anchorArtworkToActivePanel);
}

function applyVolumeWeight(nextWeight = volumeWeight) {
  volumeWeight = ["light", "medium", "heavy"].includes(nextWeight) ? nextWeight : "heavy";
  localStorage.setItem("turntable-volume-weight", volumeWeight);
  remote.dataset.volumeWeight = volumeWeight;
  document.querySelectorAll("[data-volume-weight-choice]").forEach((button) => {
    const active = button.dataset.volumeWeightChoice === volumeWeight;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  syncAppearanceSliders();
}

function syncAppearanceSliders() {
  document.querySelectorAll(".theme-options").forEach((group) => {
    const buttons = [...group.children].filter((element) => element.matches("button"));
    if (!buttons.length) return;
    const activeIndex = Math.max(0, buttons.findIndex((button) => button.classList.contains("active")));
    group.style.setProperty("--segment-width", `calc(${100 / buttons.length}% - ${6 / buttons.length}px)`);
    group.style.setProperty("--segment-shift", `${activeIndex * 100}%`);
  });
}

async function loadPairingInfo(force = false) {
  if (pairingInfo && !force) return;
  try {
    pairingInfo = await api("/api/pairing-info");
    $("settings-pin").textContent = pairingInfo.pin;
    $("pair-address").textContent = pairingInfo.urls?.[0] || location.origin;
  } catch (error) { showError(error); }
}

function clearQueuedPlayNextTarget() {
  queuedPlayNextTarget = null;
  if (queuedPlayNextBoundaryTimer) clearTimeout(queuedPlayNextBoundaryTimer);
  queuedPlayNextBoundaryTimer = null;
}

function scheduleQueuedPlayNextBoundaryCheck(delayOverride) {
  if (queuedPlayNextBoundaryTimer) clearTimeout(queuedPlayNextBoundaryTimer);
  queuedPlayNextBoundaryTimer = null;
  if (!queuedPlayNextTarget || queuedPlayNextRunning) return;
  const remaining = playback?.is_playing && progressClock.duration
    ? Math.max(0, progressClock.duration - clockPosition())
    : null;
  const delay = Number.isFinite(delayOverride)
    ? delayOverride
    : remaining === null ? 5_000 : Math.max(750, remaining + 500);
  queuedPlayNextBoundaryTimer = setTimeout(async () => {
    queuedPlayNextBoundaryTimer = null;
    if (!queuedPlayNextTarget || queuedPlayNextRunning) return;
    try {
      const snapshot = await requestStatus(true);
      renderStatusSnapshot(snapshot);
      if (queuedPlayNextTarget && !queuedPlayNextRunning) scheduleQueuedPlayNextBoundaryCheck(1_000);
    } catch {
      if (queuedPlayNextTarget && !queuedPlayNextRunning) scheduleQueuedPlayNextBoundaryCheck(5_000);
    }
  }, Math.max(250, delay));
}

function armQueuedPlayNext(track, index) {
  const selected = queuedPlayNextTarget?.index === index && queuedPlayNextTarget?.uri === track.uri;
  physicalFeedback("press");
  if (selected) {
    clearQueuedPlayNextTarget();
    setMessage("Play Next cancelled.");
  } else {
    const cachedTrack = cachedQueueTrack(track);
    queuedPlayNextTarget = {
      uri: cachedTrack.uri,
      name: cachedTrack.name || "selected song",
      track: cachedTrack,
      cover: artwork(cachedTrack),
      index,
      advances: index + 1,
      sourceUri: playback?.item?.uri || null,
      armedAt: Date.now()
    };
    void showNextCover(queuedPlayNextTarget.cover);
    scheduleQueuedPlayNextBoundaryCheck();
    setMessage((track.name || "Selected song") + " will play after " + (index + 1) + " queue advance" + (index ? "s." : "."));
  }
  renderQueue(state?.queue || []);
}

async function advanceToQueuedTarget(incomingUri) {
  if (!queuedPlayNextTarget || queuedPlayNextRunning) return;
  const target = queuedPlayNextTarget;
  queuedPlayNextRunning = true;
  if (queuedPlayNextBoundaryTimer) clearTimeout(queuedPlayNextBoundaryTimer);
  queuedPlayNextBoundaryTimer = null;
  commandPending = true;
  renderQueue(state?.queue || []);
  try {
    let currentUri = incomingUri;
    const remainingSkips = Math.max(0, target.advances - 1);
    if (currentUri !== target.uri && remainingSkips > 0) {
      primeQueuedTargetDisplay(target);
      setMessage("Skipping " + remainingSkips + " time" + (remainingSkips === 1 ? "" : "s") + " to " + target.name + "...");
      await api("/api/player/skip-count", {
        method: "PUT",
        body: JSON.stringify({ count: remainingSkips, device_id: activeDeviceId() })
      });
      const snapshot = await requestStatus(true);
      renderStatusSnapshot(snapshot);
      currentUri = snapshot.data.playback?.item?.uri || null;
    }
    const reachedTarget = currentUri === target.uri;
    clearQueuedPlayNextTarget();
    if (reachedTarget) {
      setQueueDrawer(false);
      setMessage("Now playing " + target.name + ".");
    } else setMessage("Finished the requested skips, but Spotify's queue no longer matches the saved lineup.");
  } catch (error) {
    clearQueuedPlayNextTarget();
    showError(error);
  } finally {
    queuedPlayNextRunning = false;
    commandPending = false;
    renderQueue(state?.queue || []);
    void loadQueue(true);
    scheduleStatusRefresh(ENDING_STATUS_REFRESH_MS);
  }
}
function renderQueue(queue = []) {
  const list = $("queue-list");
  list.replaceChildren();
  if (!queue.length) {
    const empty = document.createElement("p"); empty.className = "empty"; empty.textContent = "Your Spotify queue is empty."; list.append(empty); return;
  }
  queue.forEach((track, index) => {
    const cachedTrack = cachedQueueTrack(track);
    const row = document.createElement("div"); row.className = "queue-item";
    const image = document.createElement("img"); image.src = artwork(cachedTrack); image.alt = "";
    const copy = document.createElement("div");
    const title = document.createElement("b"); title.textContent = track.name;
    const artist = document.createElement("small"); artist.textContent = artists(track);
    const actions = document.createElement("div"); actions.className = "queue-actions";
    const number = document.createElement("span"); number.className = "queue-number"; number.textContent = String(index + 1).padStart(2, "0");
    const playNext = document.createElement("button"); playNext.type = "button"; playNext.className = "queue-play-next";
    const selected = queuedPlayNextTarget?.uri === cachedTrack.uri;
    playNext.textContent = selected ? "Cancel" : "Play next";
    playNext.classList.toggle("active", selected);
    playNext.setAttribute("aria-pressed", String(selected));
    playNext.disabled = queuedPlayNextRunning;
    playNext.onclick = () => armQueuedPlayNext(cachedTrack, index);
    actions.append(number, playNext);
    copy.append(title, artist); row.append(image, copy, actions); list.append(row);
  });
}

async function loadQueue(force = false) {
  if (queueLoading) {
    if (force) queueRefreshPending = true;
    return;
  }
  if (queueLoaded && !force) return;
  queueLoading = true;
  try {
    const result = await api("/api/queue" + (force ? "?force=1" : ""));
    const queue = result.items || [];
    state = { ...(state || {}), queue };
    if (queuedPlayNextTarget && !queuedPlayNextRunning) {
      const updatedIndex = queue.findIndex((track) => track.uri === queuedPlayNextTarget.uri);
      if (updatedIndex >= 0) {
        queuedPlayNextTarget.index = updatedIndex;
        queuedPlayNextTarget.advances = updatedIndex + 1;
      }
    }
    renderQueue(queue);
    queueLoaded = true;
    saveClientSnapshot(true);
    queue.slice(0, 4).forEach((track) => preloadArtwork(artwork(track)));
    showNextCover(artwork(queue[0]));
  } catch (error) { showError(error); }
  finally {
    queueLoading = false;
    if (queueRefreshPending) {
      queueRefreshPending = false;
      void loadQueue(true);
    }
  }
}
function renderPlaylists(playlists = []) {
  const grid = $("playlist-grid");
  grid.replaceChildren();
  grid.removeAttribute("aria-busy");
  if (!playlists.length) {
    const empty = document.createElement("p");
    empty.className = "empty";
    empty.textContent = "No Spotify playlists were found in your library.";
    grid.append(empty);
    return;
  }
  playlists.forEach((playlist) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "playlist-card";
    button.setAttribute("aria-label", `Play ${playlist.name}`);
    const cover = document.createElement("span");
    cover.className = "playlist-cover";
    const fallback = document.createElement("span");
    fallback.className = "playlist-fallback";
    fallback.textContent = playlist.name?.trim()?.[0]?.toUpperCase() || "♪";
    if (playlist.image) {
      const image = document.createElement("img");
      image.src = playlist.image;
      image.alt = "";
      image.loading = "lazy";
      fallback.hidden = true;
      image.addEventListener("error", () => { image.hidden = true; fallback.hidden = false; });
      cover.append(image, fallback);
    } else cover.append(fallback);
    const name = document.createElement("b");
    name.textContent = playlist.name;
    const detail = document.createElement("small");
    detail.textContent = Number.isFinite(playlist.tracks) ? `${playlist.tracks} tracks` : playlist.owner;
    button.append(cover, name, detail);
    button.onclick = () => playPlaylist(playlist, button);
    grid.append(button);
  });
}

async function loadPlaylists(force = false) {
  if (playlistsLoading || (playlistsLoaded && !force)) return;
  playlistsLoading = true;
  const grid = $("playlist-grid");
  grid.setAttribute("aria-busy", "true");
  if (!playlistsLoaded) {
    grid.replaceChildren();
    const loading = document.createElement("p");
    loading.className = "empty";
    loading.textContent = "Loading your Spotify playlists...";
    grid.append(loading);
  }
  try {
    const result = await api("/api/playlists");
    renderPlaylists(result.items || []);
    playlistsLoaded = true;
    setMessage();
  } catch (error) {
    grid.removeAttribute("aria-busy");
    grid.replaceChildren();
    const empty = document.createElement("p");
    empty.className = "empty";
    empty.textContent = error.message;
    grid.append(empty);
    showError(error);
  } finally { playlistsLoading = false; }
}

async function playPlaylist(playlist, button) {
  if (commandPending) return;
  commandPending = true;
  button.disabled = true;
  button.setAttribute("aria-busy", "true");
  physicalFeedback("press");
  setMessage(`Starting ${playlist.name}...`);
  try {
    await api("/api/player/playlist", {
      method: "PUT",
      body: JSON.stringify({ context_uri: playlist.uri, device_id: activeDeviceId() })
    });
    switchView("player");
    setTopBarHidden(true);
    setMessage();
    setTimeout(() => refresh(true), 650);
    setTimeout(() => loadQueue(true), 900);
  } catch (error) { showError(error); }
  finally {
    commandPending = false;
    button.disabled = false;
    button.removeAttribute("aria-busy");
  }
}

function renderDevices(devices = []) {
  const list = $("device-list"); list.replaceChildren();
  if (!devices.length) { const empty = document.createElement("p"); empty.className = "empty"; empty.textContent = "Open Spotify on your PC to make it appear here."; list.append(empty); return; }
  devices.forEach((device) => {
    const row = document.createElement("div"); row.className = `device-item${device.is_active ? " active" : ""}`;
    const icon = document.createElement("span"); icon.className = "device-icon"; icon.textContent = device.type === "Computer" ? "▣" : "◉";
    const copy = document.createElement("div");
    const name = document.createElement("b"); name.textContent = device.name;
    const detail = document.createElement("small"); detail.textContent = `${device.type} · ${device.volume_percent ?? 0}% volume`;
    const button = document.createElement("button"); button.textContent = device.is_active ? "Active" : "Connect"; button.disabled = device.is_active;
    button.onclick = async () => { await setting({ device_id: device.id }); await loadDevices(true); };
    copy.append(name, detail); row.append(icon, copy, button); list.append(row);
  });
}

function renderSpotifyConnection() {
  const connection = window.TurntableSpotify?.getConnection?.() || { clientId: "", name: "Spotify app", displayId: "No Client ID saved", connected: false };
  $("spotify-connection-title").textContent = connection.name || "Spotify app";
  $("spotify-client-id-display").textContent = connection.displayId;
  $("spotify-reconnect").disabled = !connection.clientId;
  $("spotify-disconnect").disabled = !connection.connected;
  $("spotify-connection-name").value = connection.name || "Spotify app";
  $("spotify-connection-client-id").value = connection.clientId || "";
}function refreshDevicesView() {
  renderSpotifyConnection();
const devicesStale = !devicesLastRefreshAt || Date.now() - devicesLastRefreshAt >= DEVICES_VIEW_REFRESH_MS;
  return loadDevices(devicesStale);
}
function scheduleDevicesViewRefresh(delay = DEVICES_VIEW_REFRESH_MS) {
  if (devicesViewRefreshTimer) clearTimeout(devicesViewRefreshTimer);
  devicesViewRefreshTimer = null;
  if (!session || document.hidden || currentView !== "devices") return;
  devicesViewRefreshTimer = setTimeout(async () => {
    devicesViewRefreshTimer = null;
    await refreshDevicesView();
    scheduleDevicesViewRefresh();
  }, Math.max(0, delay));
}

async function loadDevices(force = false) {
  if (devicesLoading || (devicesLoaded && !force)) return;
  devicesLoading = true;
  try {
    const result = await api(`/api/devices${force ? "?force=1" : ""}`);
    const devices = result.items || [];
    state = { ...(state || {}), devices };
    renderDevices(devices);
    devicesLoaded = true;
    devicesLastRefreshAt = Date.now();
    setConnectionState("connected", "The PC server and Spotify device list responded.", {
      updatedAt: devicesLastRefreshAt,
      cacheAge: connectionState.cacheAge,
    });
  } catch (error) {
    const cooldown = Number(error?.status) === 429;
    setConnectionState(
      cooldown ? "cooldown" : "offline",
      cooldown ? "Spotify is cooling down; cached device information remains available." : "Device refresh failed; cached information remains available.",
    );
    showError(error);
  }
  finally { devicesLoading = false; }
}

function updateVolume(value, send = false) {
  const volume = Math.max(0, Math.min(100, Math.round(value)));
  $("volume").value = volume; $("volume-value").textContent = `${volume}%`; $("dial-value").textContent = volume;
  $("dial").style.setProperty("--rotation", `${-180 + volume * 1.8}deg`);
  $("dial").style.setProperty("--volume", `${volume}%`);
  $("dial").setAttribute("aria-valuenow", volume);
  if (send) setting({ volume_percent: volume }, false);
}
function dialVolumeFromDrag(clientY, start) {
  const sensitivity = VOLUME_WEIGHT_SENSITIVITY[volumeWeight] || VOLUME_WEIGHT_SENSITIVITY.heavy;
  return Math.max(0, Math.min(100, start.volume + (start.y - clientY) * sensitivity));
}

const PLAY_ICON = '<svg class="transport-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m8 5 11 7-11 7z"/></svg>';
const PAUSE_ICON = '<svg class="transport-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h4v14H7zm6 0h4v14h-4z"/></svg>';
function paintPlaybackButton(playing) {
  $("play").innerHTML = playing ? PAUSE_ICON : PLAY_ICON;
  $("play").setAttribute("aria-label", playing ? "Pause" : "Play");
  $("dial").setAttribute("aria-label", (playing ? "Pause" : "Play") + "; swipe vertically for volume");
}
function paintRepeatButton(repeatState = "off") {
  const state = ["context", "track"].includes(repeatState) ? repeatState : "off";
  const button = $("repeat");
  button.dataset.repeatState = state;
  button.classList.toggle("active", state !== "off");
  button.setAttribute("aria-label", state === "track" ? "Repeat one enabled for one replay" : state === "context" ? "Repeat all enabled" : "Repeat off");
}
async function completeRepeatOneCycle(uri) {
  if (!uri || repeatOneAutoOffPending || repeatOneArmedUri !== uri) return;
  repeatOneAutoOffPending = true;
  repeatOneArmedUri = null;
  setOptimisticSetting("repeat", "off", 5_000);
  paintRepeatButton("off");
  const applied = await setting({ repeat: "off" });
  repeatOneAutoOffPending = false;
  if (applied) setMessage("Repeat One completed. Repeat is now off.");
}
function optimisticPlaybackDisplay(serverPlaying) {
  if (optimisticPlaybackPlaying === null) return serverPlaying;
  if (serverPlaying === optimisticPlaybackPlaying || performance.now() >= optimisticPlaybackUntil) {
    optimisticPlaybackPlaying = null;
    optimisticPlaybackUntil = 0;
    return serverPlaying;
  }
  return optimisticPlaybackPlaying;
}

function updateTrackCopy(track, context = playback?.context, updateContext = true) {
  $("title").textContent = track?.name || "Nothing playing";
  $("artist").textContent = track ? artists(track) : "Open Spotify on a device and start a song";
  if (updateContext) $("context").textContent = context?.type ? "PLAYING FROM " + context.type.toUpperCase() : "READY FOR SPOTIFY";
}

function previewQueuedTrack(track = state?.queue?.[0]) {
  if (!track) return false;
  pendingArtworkUri = track.uri || null;
  updateTrackCopy(track, null, false);
  return true;
}
function render(data) {
  const previousObservedUri = observedPlaybackUri;
  const previousRemaining = progressClock.duration ? Math.max(0, progressClock.duration - clockPosition()) : Infinity;
  state = { ...(state || {}), ...data }; playback = state.playback; const track = playback?.item;
  remote.classList.toggle("is-playing", !!playback?.is_playing);


  const cover = artwork(track);
  const incomingUri = track?.uri || null;
  const observedUriChanged = !!(previousObservedUri && incomingUri && previousObservedUri !== incomingUri);
  const repeatedTrackBoundary = !!(!pendingSeek && previousObservedUri && incomingUri === previousObservedUri && previousRemaining <= 6_000 && Number(playback?.progress_ms || 0) < 6_000);
  const playbackBoundary = observedUriChanged || repeatedTrackBoundary;
  const naturalPlaybackBoundary = playbackBoundary && previousRemaining <= 6_000;
  if (incomingUri) observedPlaybackUri = incomingUri;
  if (displayStyle === "lyrics" && lyricsTrackUri !== incomingUri) loadLyrics(track);
  if (displayStyle === "lyrics" || playerBackgroundStyle === "solid") updateAlbumColor(cover, incomingUri);
  const trackChanged = !!(displayedTrackUri && incomingUri && displayedTrackUri !== incomingUri);
  const transitionWasRequested = pendingArtworkUri === incomingUri;
  const staleDuringTransition = !!(!trackChanged && (artworkTransitionActive || (pendingArtworkUri && incomingUri && pendingArtworkUri !== incomingUri)));
  if (!staleDuringTransition) updateTrackCopy(track, playback?.context);
  if (trackChanged && albumStyle === "vinyl") {
    displayedTrackUri = incomingUri;
    animateVinylAlbumChange(cover, incomingUri);
  } else if (trackChanged && albumStyle === "square" && !artworkTransitionActive && !transitionWasRequested) {
    displayedTrackUri = incomingUri;
    animateProgrammaticAlbumChange(pendingArtworkDirection || "next", cover);
  } else {
    if (!artworkTransitionActive) {
      $("cover").src = cover;
      $("cover").style.display = cover ? "block" : "none";
    }
    if (incomingUri) displayedTrackUri = incomingUri;
    if (albumStyle === "vinyl" && !artworkTransitionActive) resetTurntableRotation(incomingUri);
  }
  if (transitionWasRequested || (trackChanged && pendingArtworkUri)) pendingArtworkUri = null;
  if (trackChanged) pendingArtworkDirection = null;
  if (!staleDuringTransition) {
    $("ambient").style.backgroundImage = cover ? `url(${JSON.stringify(cover)})` : "none";
    fadeBackground(cover, !currentBackgroundUrl);
  }
  if (!artworkTransitionActive) {
    state.queue?.slice(0, 4).forEach((queuedTrack) => preloadArtwork(artwork(queuedTrack)));
    showNextCover(artwork(state.queue?.[0]));
  }
  paintPlaybackButton(optimisticPlaybackDisplay(!!playback?.is_playing));
  syncProgressClock(playback);
  setVinylPlaybackState(!!playback?.is_playing);
  if (queuedPlayNextTarget && !queuedPlayNextRunning && playbackBoundary) {
    const expectedForwardUri = state?.queue?.[0]?.uri || null;
    const forwardQueueBoundary = !!(incomingUri && expectedForwardUri && incomingUri === expectedForwardUri);
    if (naturalPlaybackBoundary || forwardQueueBoundary) void advanceToQueuedTarget(incomingUri);
    else {
      clearQueuedPlayNextTarget();
      renderQueue(state?.queue || []);
      setMessage("Play Next cancelled because playback moved outside the saved queue.");
    }
  }
  if (queuedPlayNextTarget && !queuedPlayNextRunning && !playbackBoundary) scheduleQueuedPlayNextBoundaryCheck();
  if (trackChanged) void loadQueue(true);
  if (!dialStart && performance.now() > dialVolumeHoldUntil) updateVolume(playback?.device?.volume_percent ?? Number($("volume").value));
  const displayedShuffle = optimisticSettingValue("shuffle", !!playback?.shuffle_state);
  $("shuffle").classList.toggle("active", displayedShuffle);
  const displayedRepeat = optimisticSettingValue("repeat", playback?.repeat_state || "off");
  paintRepeatButton(displayedRepeat);
  if (displayedRepeat === "track" && incomingUri && !repeatOneAutoOffPending && repeatOneArmedUri !== incomingUri) repeatOneArmedUri = incomingUri;
  if (displayedRepeat !== "track" && !repeatOneAutoOffPending) repeatOneArmedUri = null;
  if (repeatedTrackBoundary && displayedRepeat === "track" && repeatOneArmedUri === incomingUri) void completeRepeatOneCycle(incomingUri);
  setButtonAvailability($("play"), playback?.is_playing ? disallowed("pausing") : disallowed("resuming"), "Spotify has disabled this action for the current item.");
  setButtonAvailability($("previous"), disallowed("skipping_prev"), "Previous is unavailable for this item.");
  setButtonAvailability($("next"), disallowed("skipping_next"), "Next is unavailable for this item.");
  setButtonAvailability($("seek"), disallowed("seeking"), "Seeking is unavailable for this item.");
  setButtonAvailability($("shuffle"), disallowed("toggling_shuffle"), "Shuffle is unavailable for this context.");

  setButtonAvailability($("repeat"), displayedRepeat === "off" ? disallowed("toggling_repeat_context") : displayedRepeat === "track" ? disallowed("toggling_repeat_track") : disallowed("toggling_repeat_context") && disallowed("toggling_repeat_track"), "Repeat is unavailable for the current context.");

  setButtonAvailability($("volume"), playback?.device?.supports_volume === false, "This Spotify device controls its own volume.");
  $("dial").disabled = playback?.device?.supports_volume === false;

}

async function requestStatus(force = false) {
  const sequence = ++statusRequestSequence;
  return { sequence, data: await api(`/api/status${force ? "?force=1" : ""}`) };
}

function renderStatusSnapshot(snapshot) {
  if (snapshot.sequence < renderedStatusSequence) return false;
  renderedStatusSequence = snapshot.sequence;
  render(snapshot.data);
  return true;
}

async function refresh(force = false) {
  if (!force && (document.hidden || currentView !== "player")) return;
  if (Date.now() < spotifyPauseUntil) {
    const seconds = Math.max(1, Math.ceil((spotifyPauseUntil - Date.now()) / 1000));
    setConnectionState("cooldown", `Spotify requested a pause. Retrying in ${seconds} seconds.`);
    setMessage(`Spotify cooldown active — retrying in ${seconds} seconds.`);
    return;
  }
  if (refreshInFlight) return;
  refreshInFlight = true;
  setConnectionState("syncing", "Checking the latest Spotify playback state.");
  try {
    const snapshot = await requestStatus(force);
    if (!renderStatusSnapshot(snapshot)) return;
    const data = snapshot.data;
    saveClientSnapshot();
    const updatedAt = Number(data.connection?.updated_at) || Date.now();
    const cacheAge = Math.max(0, Date.now() - updatedAt);
    if (data.connection?.retry_after > 0) {
      spotifyPauseUntil = Math.max(spotifyPauseUntil, Date.now() + data.connection.retry_after * 1000);
      sessionStorage.setItem("turntable-spotify-pause-until", String(spotifyPauseUntil));
      setConnectionState("cooldown", `Spotify requested a pause. Retrying in ${data.connection.retry_after} seconds.`, { updatedAt, cacheAge });
      setMessage(`Spotify cooldown active — retrying in ${data.connection.retry_after} seconds.`);
    } else if (data.connection?.cached) {
      setConnectionState("cached", data.connection?.last_error?.message || "Showing the last known playback while Spotify reconnects.", { updatedAt, cacheAge });
      setMessage("Spotify is reconnecting — showing the last known playback.");
    } else {
      setConnectionState(data.playback ? "connected" : "waiting", data.playback ? "Playback is synchronized with Spotify." : "Start a song in Spotify to synchronize playback.", { updatedAt, cacheAge });
      setMessage();
    }
  } catch (error) {
    if (error.status === 429) {
      const seconds = Math.max(1, error.retryAfter || Math.ceil((spotifyPauseUntil - Date.now()) / 1000));
      setConnectionState("cooldown", `Spotify requested a pause. Retrying in ${seconds} seconds.`);
      setMessage(`Spotify cooldown active — retrying in ${seconds} seconds.`);
    } else {
      setConnectionState("offline", "Spotify is unavailable. Showing the last saved playback.");
      setMessage("Reconnecting — the last known playback remains available.");
    }
  } finally { refreshInFlight = false; }
}function statusRefreshDelay() {
  const cooldown = spotifyPauseUntil - Date.now();
  if (cooldown > 0) return cooldown + 250;
  if (!playback?.is_playing) return IDLE_STATUS_REFRESH_MS;
  const remaining = Math.max(0, progressClock.duration - clockPosition());
  if (progressClock.duration && remaining <= ENDING_STATUS_WINDOW_MS) return ENDING_STATUS_REFRESH_MS;
  if (progressClock.duration) return Math.min(ACTIVE_STATUS_REFRESH_MS, Math.max(ENDING_STATUS_REFRESH_MS, remaining - ENDING_STATUS_WINDOW_MS));
  return ACTIVE_STATUS_REFRESH_MS;
}
function scheduleStatusRefresh(delay = statusRefreshDelay()) {
  if (refreshTimer) clearTimeout(refreshTimer);
  refreshTimer = null;
  if (!session || document.hidden || currentView !== "player") return;
  refreshTimer = setTimeout(async () => {
    refreshTimer = null;
    await refresh();
    scheduleStatusRefresh();
  }, Math.max(0, delay));
}
async function startStatusRefreshCycle() {
  await refresh();
  loadQueue();
  scheduleStatusRefresh();
}
async function playerAction(action, options = {}) {
  if (commandPending) {
    if (options.queueIfBusy) setTimeout(() => playerAction(action, options), 180);
    return;
  }
  commandPending = true; setMessage();
  const beforeTrack = playback?.item;
  const beforeContext = playback?.context;
  const beforeUri = beforeTrack?.uri;
  const beforeCover = artwork(beforeTrack);
  const beforePlaying = playback?.is_playing;
  if (action === "play" || action === "pause") {
    optimisticPlaybackPlaying = action === "play";
    optimisticPlaybackUntil = performance.now() + 2500;
    paintPlaybackButton(optimisticPlaybackPlaying);
  }
  try {
    if (["next", "previous"].includes(action) && albumStyle === "square") pendingArtworkDirection = action;
    if (["next", "previous"].includes(action) && albumStyle === "vinyl") prepareVinylTransition(action);
    if (action === "next") {
      const queuedTrack = state?.queue?.[0];
      const queuedCover = artwork(queuedTrack);
      previewQueuedTrack(queuedTrack);
      fadeBackground(queuedCover);
      if (albumStyle === "square" && queuedCover && !artworkTransitionActive) {
        animateProgrammaticAlbumChange("next", queuedCover);
      }
    }
    if (action === "previous" && options.forceTrackChange) {
      await api("/api/settings", { method: "PUT", body: JSON.stringify({ position_ms: 0, target_device_id: activeDeviceId() }) });
      await new Promise((resolve) => setTimeout(resolve, 100));
      await api("/api/player/previous", { method: "PUT", body: JSON.stringify({ device_id: activeDeviceId() }) });
    } else await api(`/api/player/${action}`, { method: "PUT", body: JSON.stringify({ device_id: activeDeviceId() }) });
    await new Promise((resolve) => setTimeout(resolve, 650));
    const statusSnapshot = await requestStatus(true);
    const nextState = statusSnapshot.data;
    renderStatusSnapshot(statusSnapshot);
    scheduleStatusRefresh();
    const trackChanged = nextState.playback?.item?.uri !== beforeUri;
    if (["next", "previous"].includes(action)) loadQueue(true);
    if (["next", "previous"].includes(action) && !trackChanged) {
      pendingArtworkUri = null;
      pendingArtworkDirection = null;
      updateTrackCopy(beforeTrack, beforeContext);
      if (albumStyle === "square") {
        artworkTransitionToken += 1;
        artworkTransitionActive = false;
        resetAlbumCard();
        $("cover").src = beforeCover;
        $("cover").style.display = beforeCover ? "block" : "none";
      }
      if (albumStyle === "vinyl") cancelVinylTransition(beforeCover);
      fadeBackground(beforeCover);
    }
  } catch (error) {
    if (action === "play" || action === "pause") {
      optimisticPlaybackPlaying = null;
      optimisticPlaybackUntil = 0;
      paintPlaybackButton(!!beforePlaying);
    }
    pendingArtworkUri = null;
    pendingArtworkDirection = null;
    updateTrackCopy(beforeTrack, beforeContext);
    if (["next", "previous"].includes(action) && albumStyle === "square") {
      artworkTransitionToken += 1;
      artworkTransitionActive = false;
      resetAlbumCard();
      $("cover").src = beforeCover;
      $("cover").style.display = beforeCover ? "block" : "none";
    }
    if (["next", "previous"].includes(action) && albumStyle === "vinyl") cancelVinylTransition(beforeCover);
    if (["next", "previous"].includes(action)) fadeBackground(beforeCover);
    showError(error); await refresh();
  }
  finally { commandPending = false; }
}
async function setting(body, refreshAfter = true) {
  if (commandPending) return false;
  commandPending = true; setMessage();
  try {
    await api("/api/settings", { method: "PUT", body: JSON.stringify({ ...body, target_device_id: body.device_id ? undefined : activeDeviceId() }) });
    if (refreshAfter) {
      const settleDelay = Number.isFinite(body.position_ms) ? 650 : 250;
      await new Promise((resolve) => setTimeout(resolve, settleDelay));
      await refresh();
    }
    return true;
  } catch (error) {
    if (Number.isFinite(body.position_ms)) pendingSeek = null;
    if (typeof body.shuffle === "boolean") optimisticSettings.delete("shuffle");
    if (typeof body.repeat === "string") optimisticSettings.delete("repeat");
    showError(error);
    await refresh();
    return false;
  } finally { commandPending = false; }
}
const fullscreenPrompt = $("fullscreen-prompt");
const fullscreenEnter = $("fullscreen-enter");
const fullscreenDismiss = $("fullscreen-dismiss");
let fullscreenPromptTimer = null;
let fullscreenRequestPending = false;
let fullscreenDismissed = sessionStorage.getItem("turntable-fullscreen-dismissed") === "true";

function appDisplayMode() {
  return navigator.standalone === true || matchMedia("(display-mode: fullscreen)").matches || matchMedia("(display-mode: standalone)").matches;
}
function fullscreenActive() {
  return appDisplayMode() || !!(document.fullscreenElement || document.webkitFullscreenElement);
}
function fullscreenRequestAvailable() {
  const target = document.documentElement;
  return typeof (target.requestFullscreen || target.webkitRequestFullscreen) === "function";
}
function hideFullscreenPrompt() {
  clearTimeout(fullscreenPromptTimer);
  fullscreenPrompt.hidden = true;
}
function configureFullscreenPrompt() {
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
  if (fullscreenRequestAvailable()) {
    $("fullscreen-title").textContent = "Use the complete display";
    $("fullscreen-copy").textContent = "Enter fullscreen to hide browser controls and prevent accidental page zoom.";
    fullscreenEnter.textContent = "Enter fullscreen";
    return "request";
  }
  $("fullscreen-title").textContent = ios ? "Add Turntable to Home Screen" : "Open Turntable as an app";
  $("fullscreen-copy").textContent = ios
    ? "Open the browser Share menu, choose Add to Home Screen, then launch Turntable from its icon."
    : "Use the browser menu and choose Install app or Add to Home screen for the cleanest fullscreen view.";
  fullscreenEnter.textContent = "Continue";
  return "instructions";
}
function showFullscreenPrompt() {
  if (remote.hidden || fullscreenActive() || fullscreenDismissed) return;
  configureFullscreenPrompt();
  fullscreenPrompt.hidden = false;
}
function scheduleFullscreenPrompt(delay = 900) {
  clearTimeout(fullscreenPromptTimer);
  if (remote.hidden || fullscreenActive() || fullscreenDismissed) return;
  fullscreenPromptTimer = setTimeout(showFullscreenPrompt, delay);
}
async function requestAppFullscreen(fromGesture = false) {
  if (fullscreenActive()) { hideFullscreenPrompt(); return true; }
  const target = document.documentElement;
  const request = target.requestFullscreen || target.webkitRequestFullscreen;
  if (typeof request !== "function") {
    if (!fromGesture) showFullscreenPrompt();
    else scheduleFullscreenPrompt(180);
    return false;
  }
  if (fullscreenRequestPending) return false;
  fullscreenRequestPending = true;
  try {
    await request.call(target);
    hideFullscreenPrompt();
    try { await screen.orientation?.lock?.("landscape"); } catch {}
    return true;
  } catch {
    $("fullscreen-copy").textContent = "The browser blocked automatic fullscreen. Press Enter fullscreen to continue.";
    fullscreenPrompt.hidden = false;
    return false;
  } finally {
    fullscreenRequestPending = false;
  }
}

fullscreenEnter.onclick = () => {
  if (configureFullscreenPrompt() === "request") requestAppFullscreen(false);
  else hideFullscreenPrompt();
};
fullscreenDismiss.onclick = () => {
  fullscreenDismissed = true;
  sessionStorage.setItem("turntable-fullscreen-dismissed", "true");
  hideFullscreenPrompt();
};
document.addEventListener("pointerup", (event) => {
  if (fullscreenDismissed || fullscreenActive() || remote.hidden || event.target.closest("#fullscreen-prompt")) return;
  requestAppFullscreen(true);
}, { capture: true });
document.addEventListener("fullscreenchange", () => fullscreenActive() ? hideFullscreenPrompt() : scheduleFullscreenPrompt(650));
document.addEventListener("webkitfullscreenchange", () => fullscreenActive() ? hideFullscreenPrompt() : scheduleFullscreenPrompt(650));
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    scheduleStatusRefresh();
    scheduleDevicesViewRefresh();
  } else {
    scheduleFullscreenPrompt(700);
    if (currentView === "player") refresh().then(() => scheduleStatusRefresh());
    if (currentView === "devices") {
      void refreshDevicesView();
      scheduleDevicesViewRefresh();
    }
  }
});
["gesturestart", "gesturechange", "gestureend"].forEach((name) => {
  document.addEventListener(name, (event) => event.preventDefault(), { passive: false });
});
document.addEventListener("touchmove", (event) => {
  if (event.touches?.length > 1) event.preventDefault();
}, { passive: false });
document.addEventListener("wheel", (event) => {
  if (event.ctrlKey) event.preventDefault();
}, { passive: false });
document.addEventListener("keydown", (event) => {
  if ((event.ctrlKey || event.metaKey) && ["+", "-", "=", "0"].includes(event.key)) event.preventDefault();
});
$("pair").onclick = async () => {
  requestAppFullscreen(true);
  const pairButton = $("pair");
  const originalLabel = pairButton.textContent;
  pairButton.disabled = true;
  pairButton.textContent = "Connecting...";
  $("pair-error").textContent = "Opening Spotify authorization...";
  try {
    const response = await fetch("/api/pair", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pin: $("pin").value }) });
    const data = await response.json(); if (!response.ok) throw new Error(data.error);
    // The browser approval has not returned yet. Starting playback polling here
    // would see the missing token as an expired session and cancel authorization.
    session = null;
    localStorage.removeItem("turntable-session");
    $("pair-error").textContent = "Finish Spotify approval in the browser. Turntable will reopen automatically.";
    scheduleSpotifyReturnHelp();
  } catch (error) {
    $("pair-error").textContent = error.message;
  } finally {
    pairButton.disabled = false;
    pairButton.textContent = originalLabel;
  }
};$("open-spotify-dashboard").onclick = async () => {
  try {
    await window.TurntableSpotify?.openDeveloperDashboard?.();
    $("pair-error").textContent = "Finish setup in the browser, then return here to paste your Client ID.";
  } catch (error) {
    $("pair-error").textContent = error.message || "Could not open the Spotify Developer Dashboard.";
  }
};
$("copy-spotify-redirect").onclick = async () => {
  const button = $("copy-spotify-redirect");
  try {
    await navigator.clipboard.writeText(window.TurntableSpotify?.redirectUri || "https://peekabu411.github.io/spotify/callback");
    button.textContent = "Redirect URI Copied";
    $("pair-error").textContent = "Paste that exact address into Spotify's Redirect URIs field, then save.";
  } catch (error) {
    $("pair-error").textContent = "Copy the Redirect URI shown above exactly, including https://.";
  }
  setTimeout(() => { button.textContent = "Copy Redirect URI"; }, 1800);
};
$("pin").addEventListener("keydown", (event) => { if (event.key === "Enter") $("pair").click(); });
document.querySelectorAll("[data-view]").forEach((button) => button.onclick = () => { switchView(button.dataset.view); setTopBarHidden(true); });
if ($("back")) $("back").onclick = () => { switchView("player"); setTopBarHidden(true); };
$("refresh").onclick = async () => {
  const button = $("refresh");
  if (button.classList.contains("refreshing")) return;
  physicalFeedback("press");
  button.classList.add("refreshing");
  button.setAttribute("aria-busy", "true");
  setMessage("Refreshing Now Playing...");
  try {
    if (!session) throw new Error("Connect Spotify first.");
    await refresh(true);
    await loadQueue(true);
    if (currentView === "devices") await refreshDevicesView();
    scheduleStatusRefresh();
    setMessage("Now Playing refreshed.");
  } catch (error) {
    showError(error);
  } finally {
    button.classList.remove("refreshing");
    button.setAttribute("aria-busy", "false");
  }
};
$("play").onclick = () => playerAction(playback?.is_playing ? "pause" : "play");
$("previous").onclick = () => playerAction("previous"); $("next").onclick = () => playerAction("next");
$("seek").onpointerdown = () => { seekDragging = true; };
$("seek").oninput = () => {
  seekDragging = true;
  const seek = $("seek");
  const position = Number(seek.value);
  const maximum = Number(seek.max) || 1;
  seek.style.setProperty("--seek-progress", `${Math.max(0, Math.min(100, position / maximum * 100))}%`);
  $("elapsed").textContent = formatTime(position);
};
function commitSeek() {
  if (!seekDragging) return;
  seekDragging = false;
  if (commandPending) {
    paintProgress();
    setMessage("Please wait for the current playback action to finish.");
    return;
  }
  const position = Number($("seek").value);
  const now = performance.now();
  pendingSeek = {
    uri: progressClock.uri,
    position,
    startedAt: now,
    expiresAt: now + SEEK_CONFIRM_GRACE_MS
  };
  progressClock = { ...progressClock, position, startedAt: now, correction: 0, correctionDuration: 0 };
  paintProgress(now);
  startProgressAnimation();
  void setting({ position_ms: position });
}$("seek").onchange = commitSeek;
$("seek").onpointerup = commitSeek;
$("seek").onpointercancel = () => { seekDragging = false; paintProgress(); };
$("volume").oninput = () => updateVolume(Number($("volume").value)); $("volume").onchange = () => setting({ volume_percent: Number($("volume").value) }, false);
$("shuffle").onclick = () => { const value = !optimisticSettingValue("shuffle", !!playback?.shuffle_state); setOptimisticSetting("shuffle", value); $("shuffle").classList.toggle("active", value); void setting({ shuffle: value }); };
$("repeat").onclick = () => { const current = optimisticSettingValue("repeat", playback?.repeat_state || "off"); const value = current === "off" ? "context" : current === "context" && !disallowed("toggling_repeat_track") ? "track" : "off"; repeatOneArmedUri = value === "track" ? playback?.item?.uri || null : null; repeatOneAutoOffPending = false; setOptimisticSetting("repeat", value); paintRepeatButton(value); void setting({ repeat: value }); };
document.querySelectorAll("[data-album-choice]").forEach((button) => {
  button.onclick = () => { physicalFeedback("press"); applyAppearance(button.dataset.albumChoice, controlStyle, displayStyle, lyricsBackground); };
});
document.querySelectorAll("[data-control-choice]").forEach((button) => {
  button.onclick = () => { physicalFeedback("press"); applyAppearance(albumStyle, button.dataset.controlChoice, displayStyle, lyricsBackground); };
});
document.querySelectorAll("[data-display-choice]").forEach((button) => {
  button.onclick = () => { physicalFeedback("press"); applyAppearance(albumStyle, controlStyle, button.dataset.displayChoice, lyricsBackground); };
});
document.querySelectorAll("[data-lyrics-background-choice]").forEach((button) => {
  button.onclick = () => { physicalFeedback("press"); applyAppearance(albumStyle, controlStyle, displayStyle, button.dataset.lyricsBackgroundChoice); };
});
document.querySelectorAll("[data-player-background-choice]").forEach((button) => {
  button.onclick = () => { physicalFeedback("press"); applyAppearance(albumStyle, controlStyle, displayStyle, lyricsBackground, button.dataset.playerBackgroundChoice); };
});
document.querySelectorAll("[data-background-color-mode]").forEach((button) => {
  button.onclick = () => { physicalFeedback("press"); applyBackgroundColorMode(button.dataset.backgroundColorMode, manualBackgroundColor); };
});
$("background-color-picker").oninput = (event) => applyBackgroundColorMode("manual", event.target.value);
document.querySelectorAll("[data-lyric-style-choice]").forEach((button) => {
  button.onclick = () => { physicalFeedback("press"); applyAppearance(albumStyle, controlStyle, displayStyle, lyricsBackground, playerBackgroundStyle, button.dataset.lyricStyleChoice); };
});$("lyric-font-size").oninput = (event) => applyLyricFontSize(event.target.value);
document.querySelectorAll("[data-playback-bar-choice]").forEach((button) => {
  button.onclick = () => { physicalFeedback("press"); applyAppearance(albumStyle, controlStyle, displayStyle, lyricsBackground, playerBackgroundStyle, lyricStyle, button.dataset.playbackBarChoice); };
});document.querySelectorAll("[data-guide-choice]").forEach((button) => {
  button.onclick = () => { physicalFeedback("press"); applyAppearance(albumStyle, controlStyle, displayStyle, lyricsBackground, playerBackgroundStyle, lyricStyle, playbackBarStyle, button.dataset.guideChoice); };
});document.querySelectorAll("[data-control-bar-background-choice]").forEach((button) => {
  button.onclick = () => { physicalFeedback("press"); applyAppearance(albumStyle, controlStyle, displayStyle, lyricsBackground, playerBackgroundStyle, lyricStyle, playbackBarStyle, guideText, button.dataset.controlBarBackgroundChoice); };
});document.querySelectorAll("[data-volume-weight-choice]").forEach((button) => {
  button.onclick = () => { physicalFeedback("press"); applyVolumeWeight(button.dataset.volumeWeightChoice); };
});document.querySelectorAll("[data-layout-profile-choice]").forEach((button) => {
  button.onclick = () => {
    physicalFeedback("press");
    applyLayoutProfile(button.dataset.layoutProfileChoice);
  };
});
$("ui-font-size").oninput = (event) => applyUIFontScale(event.target.value);
function lyricOffsetToSlider(value) {
  return Math.max(-1.2, Math.min(-0.2, Number(value)));
}
function lyricSliderToOffset(value) {
  return Math.max(-1.2, Math.min(-0.2, Number(value)));
}
function setLyricOffset(value, sliderPosition = lyricOffsetToSlider(value)) {
  lyricOffset = Math.max(-1.2, Math.min(-0.2, Math.round(Number(value) * 10) / 10));
  $("lyric-offset").value = String(Math.max(-1.2, Math.min(-0.2, sliderPosition)));
  const offsetText = `${lyricOffset > 0 ? "+" : ""}${lyricOffset.toFixed(1)}`;
  $("lyric-offset-value").textContent = `${offsetText}s`;
  $("lyric-offset").setAttribute("aria-valuetext", `${offsetText} seconds`);
  localStorage.setItem("turntable-lyric-offset", lyricOffset.toFixed(1));
  $("lyrics-lines").querySelectorAll(".active").forEach((line) => line.classList.remove("active"));
  activeLyricIndex = -1;
  activeLyricWordIndex = -1;
  updateActiveLyrics(clockPosition());
}
$("lyric-offset").oninput = (event) => setLyricOffset(lyricSliderToOffset(event.target.value), Number(event.target.value));

$("bar-handle").onclick = () => { physicalFeedback("press"); setTopBarHidden(!remote.classList.contains("topbar-hidden")); };
$("queue-toggle").onclick = () => { physicalFeedback("press"); const opening = !remote.classList.contains("queue-open"); setQueueDrawer(opening); if (opening) loadQueue(); };
$("queue-close").onclick = $("queue-backdrop").onclick = () => setQueueDrawer(false);
$("queue-drawer").addEventListener("pointerdown", (event) => { queueDrawerGesture = { x: event.clientX, y: event.clientY }; });
$("queue-drawer").addEventListener("pointerup", (event) => {
  if (!queueDrawerGesture) return;
  const dx = event.clientX - queueDrawerGesture.x;
  const dy = event.clientY - queueDrawerGesture.y;
  queueDrawerGesture = null;
  if (dx > 55 && Math.abs(dx) > Math.abs(dy)) setQueueDrawer(false);
});
$("queue-drawer").addEventListener("pointercancel", () => { queueDrawerGesture = null; });
document.addEventListener("keydown", (event) => { if (event.key === "Escape") setQueueDrawer(false); });
$("version-indicator").onclick = () => { physicalFeedback("press"); setUpdateLogOpen(true); };
$("updates-tab").onclick = () => setUpdateLogTab("updates");
$("diagnostics-tab").onclick = () => setUpdateLogTab("diagnostics");
$("diagnostics-refresh").onclick = () => void loadDiagnostics();
$("update-log-close").onclick = $("update-log-backdrop").onclick = () => setUpdateLogOpen(false);
document.addEventListener("keydown", (event) => { if (event.key === "Escape") setUpdateLogOpen(false); });

function setSideControlsHidden(hidden) {
  const shouldHide = !!hidden && remote.dataset.currentView === "player";
  remote.classList.toggle("side-controls-hidden", shouldHide);
  document.querySelector(".dial-rail").setAttribute("aria-hidden", String(shouldHide));
  if (shouldHide) physicalFeedback("press");
}
const sideControlReveal = $("side-control-reveal");
sideControlReveal.addEventListener("pointerdown", (event) => {
  if (!remote.classList.contains("side-controls-hidden")) return;
  sideControlGesture = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, mode: "show" };
}, true);
sideControlReveal.onclick = () => {
  physicalFeedback("press");
  setSideControlsHidden(false);
};

const dialRail = document.querySelector(".dial-rail");
dialRail.addEventListener("pointerdown", (event) => {
  if (remote.classList.contains("side-controls-hidden") || remote.dataset.currentView !== "player") return;
  sideControlGesture = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, mode: "hide" };
}, true);

dialRail.addEventListener("pointercancel", () => { if (sideControlGesture?.mode === "hide") sideControlGesture = null; }, true);

remote.addEventListener("pointerdown", (event) => {
  if (remote.dataset.currentView !== "player") return;
  const hidden = remote.classList.contains("side-controls-hidden");
  const bounds = remote.getBoundingClientRect();
  const startRatio = hidden ? (2 / 3) : SIDE_CONTROL_HIDE_ZONE_START;
  if (event.clientX < bounds.left + bounds.width * startRatio) return;
  if (!hidden && event.target.closest("button,input,.album-art,.transport,.dial-rail")) return;
  sideControlGesture = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, mode: hidden ? "show" : "hide" };
}, true);
function finishSideControlGesture(event) {
  if (!sideControlGesture || sideControlGesture.pointerId !== event.pointerId) return;
  const mode = sideControlGesture.mode;
  const dx = event.clientX - sideControlGesture.x;
  const dy = event.clientY - sideControlGesture.y;
  sideControlGesture = null;
  if (mode === "hide" && dx > 46 && Math.abs(dx) > Math.abs(dy) * 1.15) setSideControlsHidden(true);
  if (mode === "show" && dx < -46 && Math.abs(dx) > Math.abs(dy) * 1.15) {
    physicalFeedback("press");
    setSideControlsHidden(false);
  }
}
// The dial captures its own pointer while adjusting volume. Listen above it so
// a rightward swipe still reaches the hide gesture for either control style.
document.addEventListener("pointerup", finishSideControlGesture, true);
remote.addEventListener("pointercancel", () => { sideControlGesture = null; }, true);
function setSpotifyEditor(open) {
  $("spotify-client-editor").hidden = !open;
  if (open) $("spotify-connection-name").focus();
}
$("spotify-reconnect").onclick = async () => {
  try { physicalFeedback("press"); await window.TurntableSpotify?.reconnect?.(); setMessage("Opening Spotify authorization..."); }
  catch (error) { setMessage(error.message || "Could not reconnect Spotify."); }
};
$("spotify-change-client").onclick = () => { physicalFeedback("press"); setSpotifyEditor($("spotify-client-editor").hidden); };
$("spotify-save-client").onclick = () => {
  try {
    window.TurntableSpotify?.saveConnection?.({ clientId: $("spotify-connection-client-id").value, name: $("spotify-connection-name").value });
    setSpotifyEditor(false); renderSpotifyConnection(); setMessage("Spotify connection saved on this phone."); physicalFeedback("press");
  } catch (error) { setMessage(error.message || "Could not save the Spotify connection."); }
};
$("spotify-disconnect").onclick = () => {
  if (!confirm("Disconnect Spotify from this phone? Your saved Client ID will remain for quick reconnection.")) return;
  window.TurntableSpotify?.disconnect?.(); localStorage.removeItem("turntable-session"); location.reload();
};
$("spotify-forget").onclick = () => {
  if (!confirm("Forget this Spotify connection? This removes the saved Client ID and requires setup again.")) return;
  window.TurntableSpotify?.forget?.(); localStorage.removeItem("turntable-session"); location.reload();
};
renderSpotifyConnection();
if (!$("pin").value) $("pin").value = window.TurntableSpotify?.getConnection?.().clientId || "";
const screen = document.querySelector(".screen");
screen.addEventListener("pointerdown", (event) => {
  if (event.target.closest("button,input,.album-art,.dial")) return;
  if (sideControlGesture) return;
  if (remote.classList.contains("side-controls-hidden") && remote.dataset.currentView === "player" && event.clientX >= innerWidth * (2 / 3)) return;
  if (event.clientX <= innerWidth * .24 || event.clientX >= innerWidth * .76) return;
  screen.setPointerCapture(event.pointerId); barGesture = { y: event.clientY, dy: 0 };
});
screen.addEventListener("pointermove", (event) => { if (barGesture) barGesture.dy = event.clientY - barGesture.y; });
screen.addEventListener("pointerup", () => {
  if (!barGesture) return;
  if (barGesture.dy > 42) { physicalFeedback("press"); setTopBarHidden(false); }
  if (barGesture.dy < -42) { physicalFeedback("press"); setTopBarHidden(true); }
  barGesture = null;
});
screen.addEventListener("pointercancel", () => { barGesture = null; });

const dial = $("dial");
dial.addEventListener("pointerdown", (event) => {
  dial.setPointerCapture(event.pointerId);
  const rect = dial.getBoundingClientRect();
  const pressZone = controlStyle !== "bar" || event.clientY <= rect.top + 70;
  dial.classList.toggle("pressing-button", pressZone);
  dialStart = {
    x: event.clientX,
    y: event.clientY,
    volume: Number($("volume").value),
    moved: false,
    detent: Math.round(Number($("volume").value) / 2),
    rect,
    pressZone
  };
});
dial.addEventListener("pointermove", (event) => {
  if (!dialStart) return;
  const delta = dialStart.y - event.clientY;
  const horizontalDelta = event.clientX - dialStart.x;
  if (Math.abs(delta) > 3 || Math.abs(horizontalDelta) > 10) {
    dialStart.moved = true;
    dial.classList.remove("pressing-button");
    if (dialTapTimer) clearTimeout(dialTapTimer);
    dialTapTimer = null; dialTapCount = 0;
  }
  const nextVolume = dialVolumeFromDrag(event.clientY, dialStart);
  const detent = Math.round(nextVolume / 2);
  if (dialStart.moved && detent !== dialStart.detent) { dialStart.detent = detent; physicalFeedback("tick"); }
  updateVolume(nextVolume);
});
dial.addEventListener("pointerup", (event) => {
  if (!dialStart) return;
  dial.classList.remove("pressing-button");
  if (dialStart.moved) {
    updateVolume(dialVolumeFromDrag(event.clientY, dialStart));
    dialVolumeHoldUntil = performance.now() + 1800;
    setting({ volume_percent: Number($("volume").value) }, false);
  }
  else if (dialStart.pressZone) {
    physicalFeedback("tick"); dialTapCount += 1; dial.dataset.pendingTaps = String(dialTapCount);
    if (dialTapTimer) clearTimeout(dialTapTimer);
    dialTapTimer = setTimeout(() => {
      const taps = dialTapCount; dialTapCount = 0; dialTapTimer = null; dial.dataset.pendingTaps = "0";
      physicalFeedback("press");
      if (taps >= 3) playerAction("previous", { forceTrackChange: true, queueIfBusy: true });
      else if (taps === 2) playerAction("next", { queueIfBusy: true });
      else playerAction(playback?.is_playing ? "pause" : "play", { queueIfBusy: true });
    }, DIAL_MULTI_TAP_MS);
  }
  dialStart = null;
});
dial.addEventListener("pointercancel", () => { dial.classList.remove("pressing-button"); dialStart = null; });
dial.addEventListener("keydown", (event) => {
  if (!["ArrowUp", "ArrowRight", "ArrowDown", "ArrowLeft", " ", "Enter"].includes(event.key)) return;
  event.preventDefault(); physicalFeedback([" ", "Enter"].includes(event.key) ? "press" : "tick");
  if ([" ", "Enter"].includes(event.key)) return playerAction(playback?.is_playing ? "pause" : "play");
  const amount = ["ArrowUp", "ArrowRight"].includes(event.key) ? 5 : -5;
  updateVolume(Number($("volume").value) + amount); setting({ volume_percent: Number($("volume").value) }, false);
});

const albumCard = $("album-card");
const artStage = document.querySelector(".art-stage");
function setUpcomingCardProgress(progress) {
  const amount = Math.max(0, Math.min(1, progress));
  artStage.style.setProperty("--next-scale", String(.9 + amount * .1));
  artStage.style.setProperty("--next-opacity", String(.55 + amount * .45));
}
function resetAlbumCard() {
  albumCard.classList.add("swipe-reset");
  albumCard.classList.remove("swipe-commit-left", "swipe-commit-right", "swiping");
  albumCard.style.transform = ""; albumCard.style.opacity = "";
  artStage.classList.remove("promote-next"); setUpcomingCardProgress(0);
  requestAnimationFrame(() => requestAnimationFrame(() => albumCard.classList.remove("swipe-reset")));
}
async function animateProgrammaticAlbumChange(direction, incomingCover) {
  if (albumStyle !== "square" || !incomingCover || artworkTransitionActive) return;
  const token = ++artworkTransitionToken;
  artworkTransitionActive = true;
  $("next-cover").src = incomingCover;
  $("next-cover").style.display = "block";
  artStage.classList.add("promote-next");
  fadeBackground(incomingCover);
  requestAnimationFrame(() => {
    albumCard.classList.add(direction === "previous" ? "swipe-commit-right" : "swipe-commit-left");
  });
  await new Promise((resolve) => setTimeout(resolve, 300));
  if (token !== artworkTransitionToken) return;
  $("cover").src = incomingCover;
  $("cover").style.display = "block";
  albumCard.classList.add("swipe-reset");
  albumCard.classList.remove("swipe-commit-left", "swipe-commit-right");
  artStage.classList.remove("promote-next");
  setUpcomingCardProgress(0);
  await new Promise((resolve) => requestAnimationFrame(resolve));
  artworkTransitionActive = false;
  showNextCover(artwork(state?.queue?.[0]));
  requestAnimationFrame(() => albumCard.classList.remove("swipe-reset"));
}
albumCard.addEventListener("pointerdown", (event) => {
  if (commandPending || !playback?.item) return;
  albumCard.setPointerCapture(event.pointerId);
  artSwipe = { x: event.clientX, y: event.clientY, dx: 0, horizontal: false, detent: 0 };
  albumCard.classList.add("swiping");
});
albumCard.addEventListener("pointermove", (event) => {
  if (!artSwipe) return;
  const dx = event.clientX - artSwipe.x; const dy = event.clientY - artSwipe.y;
  if (!artSwipe.horizontal && Math.abs(dx) > 8) artSwipe.horizontal = Math.abs(dx) > Math.abs(dy);
  if (!artSwipe.horizontal) return;
  event.preventDefault(); artSwipe.dx = dx;
  const detent = Math.trunc(Math.abs(dx) / 34);
  if (detent !== artSwipe.detent) { artSwipe.detent = detent; physicalFeedback("tick"); }
  if (albumStyle === "vinyl") return;
  albumCard.style.transform = `translate3d(${dx}px,0,0) rotate(${dx * 0.018}deg)`;
  albumCard.style.opacity = String(Math.max(.45, 1 - Math.abs(dx) / 420));
  setUpcomingCardProgress(dx < 0 ? Math.abs(dx) / 120 : 0);
});
async function finishAlbumSwipe() {
  if (!artSwipe) return;
  const dx = artSwipe.dx; artSwipe = null;
  const action = dx < -58 ? "next" : dx > 58 ? "previous" : null;
  const blocked = action === "next" ? disallowed("skipping_next") : action === "previous" ? disallowed("skipping_prev") : false;
  albumCard.classList.remove("swiping");
  if (!action || blocked) { resetAlbumCard(); return; }
  physicalFeedback("press");
  if (action === "next") previewQueuedTrack();
  if (albumStyle === "vinyl") {
    albumCard.style.transform = ""; albumCard.style.opacity = "";
    await playerAction(action, { forceTrackChange: action === "previous" });
    return;
  }
  if (action === "next") { artworkTransitionActive = true; artStage.classList.add("promote-next"); fadeBackground($("next-cover").src); }
  requestAnimationFrame(() => {
    albumCard.classList.add(action === "next" ? "swipe-commit-left" : "swipe-commit-right");
    albumCard.style.transform = ""; albumCard.style.opacity = "";
  });
  await new Promise((resolve) => setTimeout(resolve, 290));
  await playerAction(action, { forceTrackChange: action === "previous" });
  const currentCover = artwork(state?.playback?.item);
  $("cover").src = currentCover;
  $("cover").style.display = currentCover ? "block" : "none";
  albumCard.classList.add("swipe-reset");
  albumCard.classList.remove("swipe-commit-left", "swipe-commit-right");
  albumCard.style.transform = ""; albumCard.style.opacity = "";
  await new Promise((resolve) => requestAnimationFrame(resolve));
  artworkTransitionActive = false; artStage.classList.remove("promote-next"); setUpcomingCardProgress(0);
  showNextCover(artwork(state?.queue?.[0]));
  requestAnimationFrame(() => albumCard.classList.remove("swipe-reset"));
}
albumCard.addEventListener("pointerup", finishAlbumSwipe);
albumCard.addEventListener("pointercancel", () => { artSwipe = null; resetAlbumCard(); });

applyAppearance(albumStyle, controlStyle, displayStyle, lyricsBackground);
applyBackgroundColorMode(backgroundColorMode, manualBackgroundColor);
applyVolumeWeight(volumeWeight);
applyLayoutProfile(layoutProfile);
applyUIFontScale(uiFontScale);
setLyricOffset(lyricOffset);
setTopBarHidden(localStorage.getItem("turntable-topbar-hidden") !== "false");
if (session) { pairing.hidden = true; remote.hidden = false; hydrateClientSnapshot(); void startStatusRefreshCycle(); scheduleFullscreenPrompt(); }
document.addEventListener("visibilitychange", () => { if (!document.hidden && sessionStorage.getItem(SPOTIFY_AUTH_PENDING_KEY) === "1") setTimeout(showSpotifyReturnHelp, 900); });
window.addEventListener("resize", () => { applyLayoutProfile(layoutProfile); requestAnimationFrame(anchorArtworkToActivePanel); });
if ("ResizeObserver" in window) {
  const artworkAnchorObserver = new ResizeObserver(() => requestAnimationFrame(anchorArtworkToActivePanel));
  artworkAnchorObserver.observe(document.querySelector(".track-copy"));
  artworkAnchorObserver.observe($("lyrics-panel"));
}
