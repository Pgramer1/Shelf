(() => {
  const GLOBAL_STATE_KEY = "__shelfAutoSyncContentScriptState";
  const previousState = window[GLOBAL_STATE_KEY];
  if (previousState && typeof previousState.stop === "function") {
    try {
      previousState.stop("replaced-by-new-script");
    } catch {
      // Ignore errors from stale script instances.
    }
  }

  const SUPPORTED_HOSTS = ["netflix.com", "primevideo.com", "amazon.", "youtube.com", "youtu.be"];
  const SEND_INTERVAL_MS = 15000;
  const GENERIC_TITLES = new Set([
    "youtube",
    "netflix",
    "prime video",
    "amazon prime video",
    "home"
  ]);
  const PROVIDER_TITLE_SELECTORS = {
    netflix: [
      '[data-uia="video-title"]',
      'h4[data-uia="video-title"]',
      ".video-title",
      "h1"
    ],
    "prime-video": [
      '[data-automation-id="title"]',
      ".atvwebplayersdk-title-text",
      "h1"
    ],
    youtube: [
      "h1.ytd-watch-metadata yt-formatted-string",
      "h1.title yt-formatted-string",
      "h1"
    ],
    generic: ["h1"]
  };

  const state = {
    active: true,
    observer: null,
    intervals: [],
    runtimeId: null,
    stop: () => {}
  };
  window[GLOBAL_STATE_KEY] = state;

  let lastSignature = "";
  let lastSentAt = 0;

  function stopScript(reason) {
    if (!state.active) {
      return;
    }

    state.active = false;
    if (state.observer) {
      state.observer.disconnect();
      state.observer = null;
    }

    for (const handle of state.intervals) {
      clearInterval(handle);
    }
    state.intervals.length = 0;
    void reason;
  }

  state.stop = stopScript;

  function extensionContextAvailable() {
    try {
      const runtimeId = chrome?.runtime?.id;
      if (!runtimeId) {
        return false;
      }
      state.runtimeId = runtimeId;
      return true;
    } catch {
      return false;
    }
  }

  function safeSendMessage(message) {
    if (!state.active) {
      return;
    }

    if (!extensionContextAvailable()) {
      stopScript("runtime-unavailable");
      return;
    }

    try {
      chrome.runtime.sendMessage(message, () => {
        const lastError = chrome.runtime.lastError;
        if (!lastError) {
          return;
        }

        const errorText = lastError.message || "";
        if (/Extension context invalidated/i.test(errorText)) {
          stopScript("runtime-invalidated");
        }
      });
    } catch (error) {
      const errorText = error instanceof Error ? error.message : String(error);
      if (/Extension context invalidated/i.test(errorText)) {
        stopScript("runtime-invalidated");
      }
    }
  }

  function findPrimaryVideo() {
    const videos = Array.from(document.querySelectorAll("video"));
    if (!videos.length) {
      return null;
    }

    return videos
      .filter((video) => Number.isFinite(video.duration) && video.duration > 0)
      .sort((a, b) => (b.videoWidth * b.videoHeight) - (a.videoWidth * a.videoHeight))[0] || videos[0];
  }

  function getHostname() {
    return window.location.hostname.toLowerCase();
  }

  function detectPlatform(hostname) {
    if (hostname.includes("netflix.com")) return "netflix";
    if (hostname.includes("primevideo.com") || hostname.includes("amazon.")) return "prime-video";
    if (hostname.includes("youtube.com") || hostname.includes("youtu.be")) return "youtube";
    return "generic";
  }

  function isMeaningfulTitle(title) {
    const normalized = normalizeTitle(title || "");
    if (!normalized || normalized.length < 3) {
      return false;
    }

    return !GENERIC_TITLES.has(normalized);
  }

  function hasEmbeddedPlayerSignal() {
    const iframeSources = Array.from(document.querySelectorAll("iframe[src]"))
      .map((iframe) => iframe.getAttribute("src") || "")
      .map((src) => src.toLowerCase());

    const iframeLooksPlayable = iframeSources.some((src) =>
      /embed|player|stream|episode|watch|m3u8|mp4|play/.test(src)
    );
    if (iframeLooksPlayable) {
      return true;
    }

    return Boolean(
      document.querySelector("[id*='player' i], [class*='player' i], .jwplayer, .plyr, .video-js")
    );
  }

  function isWatchContext(hostname, platform) {
    const path = window.location.pathname.toLowerCase();
    const query = window.location.search.toLowerCase();

    if (platform === "youtube") {
      if (hostname.includes("youtu.be")) {
        return path.length > 1;
      }

      if (path.startsWith("/watch")) {
        return query.includes("v=");
      }

      return path.startsWith("/shorts/") || path.startsWith("/live/");
    }

    if (platform === "netflix") {
      return path.includes("/watch");
    }

    if (platform === "prime-video") {
      return path.includes("/detail") || path.includes("/watch") || path.includes("/gp/video");
    }

    const watchLikePath = /watch|episode|ep-|series|season|anime|movie|play|stream/.test(path);
    return watchLikePath || hasEmbeddedPlayerSignal();
  }

  function isPotentialOttHost(hostname) {
    if (SUPPORTED_HOSTS.some((item) => hostname.includes(item))) {
      return true;
    }

    const video = document.querySelector("video");
    return !!video || hasEmbeddedPlayerSignal();
  }

  function readMetaTitle() {
    const candidates = [
      document.querySelector('meta[property="og:title"]')?.getAttribute("content"),
      document.querySelector('meta[name="twitter:title"]')?.getAttribute("content"),
      document.title
    ];

    return candidates.find((value) => value && value.trim())?.trim() || "";
  }

  function readProviderTitle(hostname) {
    const platform = detectPlatform(hostname);
    const selectors = PROVIDER_TITLE_SELECTORS[platform] || PROVIDER_TITLE_SELECTORS.generic;

    for (const selector of selectors) {
      const value = document.querySelector(selector)?.textContent?.trim();
      if (value) {
        return value;
      }
    }

    if (platform === "youtube") {
      return "";
    }

    return readMetaTitle();
  }

  function parseSeasonNumber(text) {
    if (!text) {
      return null;
    }

    const match = String(text).match(/(?:season|s)\s*(\d{1,2})/i);
    return match ? Number(match[1]) : null;
  }

  function parseEpisodeNumber(text) {
    if (!text) {
      return null;
    }

    const patterns = [
      /(?:episode|ep)\s*(\d{1,4})/i,
      /\be\s*(\d{1,4})\b/i,
      /\b(\d{1,4})\s*(?:th|st|nd|rd)?\s*(?:episode|ep)\b/i
    ];

    for (const pattern of patterns) {
      const match = String(text).match(pattern);
      if (match) {
        return Number(match[1]);
      }
    }

    return null;
  }

  function parseEpisodeNumberFromUrl() {
    const target = `${window.location.pathname || ""}${window.location.search || ""}`;
    const patterns = [
      /(?:episode|ep|e)[-_/=](\d{1,4})/i,
      /[?&](?:episode|ep|e)=(\d{1,4})/i,
      /\/episode\/(\d{1,4})/i
    ];

    for (const pattern of patterns) {
      const match = target.match(pattern);
      if (match) {
        return Number(match[1]);
      }
    }

    return null;
  }

  function cleanSeriesTitle(value) {
    return normalizeTitle(value)
      .replace(/\bseason\s*\d{1,2}\b/gi, " ")
      .replace(/\bs\s*\d{1,2}\b/gi, " ")
      .replace(/\s{2,}/g, " ")
      .trim();
  }

  function readBreadcrumbParts() {
    const parts = [];
    const seen = new Set();

    const elementSelectors = [
      "[aria-label*='breadcrumb' i] a",
      "[aria-label*='breadcrumb' i] span",
      ".breadcrumb a",
      ".breadcrumb span",
      "[class*='breadcrumb' i] a",
      "[class*='breadcrumb' i] span",
      "[class*='crumb' i] a",
      "[class*='crumb' i] span",
      "nav a[rel='up']"
    ];

    for (const selector of elementSelectors) {
      const nodes = document.querySelectorAll(selector);
      for (const node of nodes) {
        const text = normalizeTitle(node.textContent || "");
        if (!text || !isMeaningfulTitle(text) || seen.has(text)) {
          continue;
        }

        seen.add(text);
        parts.push(text);
      }
    }

    const container = document.querySelector(
      "[aria-label*='breadcrumb' i], .breadcrumb, [class*='breadcrumb' i], [class*='crumb' i]"
    );
    const containerText = normalizeTitle(container?.textContent || "");
    if (containerText.includes(" > ")) {
      const splitParts = containerText.split(" > ").map((item) => item.trim()).filter(Boolean);
      for (const item of splitParts) {
        if (!isMeaningfulTitle(item) || seen.has(item)) {
          continue;
        }
        seen.add(item);
        parts.push(item);
      }
    }

    return parts.slice(0, 8);
  }

  function normalizeTitle(raw) {
    return (raw || "")
      .replace(/\s*[-|]\s*(Netflix|Amazon Prime Video|Prime Video|YouTube).*$/i, "")
      .replace(/\s*[-|]\s*Watch on YouTube$/i, "")
      .replace(/\s{2,}/g, " ")
      .trim();
  }

  function extractTitleDetails(rawTitle, platform) {
    let working = normalizeTitle(rawTitle);
    let seasonNumber = null;
    let episodeNumber = null;
    let releaseYear = null;

    const seasonEpisodePatterns = [
      /(?:season|s)\s*(\d{1,2})\s*(?:episode|ep|e)\s*(\d{1,3})/i,
      /s(\d{1,2})\s*e(\d{1,3})/i,
      /(?:episode|ep)\s*(\d{1,3})/i
    ];

    for (const pattern of seasonEpisodePatterns) {
      const match = working.match(pattern);
      if (!match) {
        continue;
      }

      if (match.length >= 3) {
        seasonNumber = Number(match[1]);
        episodeNumber = Number(match[2]);
      } else {
        episodeNumber = Number(match[1]);
      }

      working = working.replace(match[0], " ");
      break;
    }

    const yearMatch = working.match(/\b(19\d{2}|20\d{2})\b/);
    if (yearMatch && !episodeNumber) {
      releaseYear = Number(yearMatch[1]);
    }

    if (episodeNumber && working.includes(":")) {
      const prefix = working.split(":")[0].trim();
      if (prefix) {
        working = prefix;
      }
    }

    working = working
      .replace(/[|]\s*official.*$/i, "")
      .replace(/[\[\]()]/g, " ")
      .replace(/\s{2,}/g, " ")
      .trim();

    if (!working) {
      working = normalizeTitle(rawTitle);
    }

    let typeHint = "movie";
    if (seasonNumber || episodeNumber || /season\s+\d+|episode\s+\d+/i.test(rawTitle)) {
      typeHint = "series";
    }
    if (platform === "youtube" && !seasonNumber && !episodeNumber) {
      typeHint = "movie";
    }

    return {
      title: working,
      searchTitle: working,
      episodeTitle: null,
      seasonNumber,
      episodeNumber,
      releaseYear,
      typeHint
    };
  }

  function enrichDetailsWithPageContext(details, platform) {
    if (platform !== "generic") {
      return {
        ...details,
        episodeNumber: details.episodeNumber || parseEpisodeNumberFromUrl()
      };
    }

    const breadcrumbParts = readBreadcrumbParts();
    if (breadcrumbParts.length < 2) {
      return {
        ...details,
        episodeNumber: details.episodeNumber || parseEpisodeNumberFromUrl()
      };
    }

    const seriesPart = breadcrumbParts[0];
    const episodePart = breadcrumbParts[breadcrumbParts.length - 1];
    const cleanedSeries = cleanSeriesTitle(seriesPart) || details.title;
    const seasonNumber = details.seasonNumber || parseSeasonNumber(seriesPart);
    const episodeNumber = details.episodeNumber || parseEpisodeNumber(episodePart) || parseEpisodeNumberFromUrl();

    return {
      ...details,
      title: cleanedSeries,
      searchTitle: cleanedSeries,
      episodeTitle: episodePart,
      seasonNumber,
      episodeNumber,
      typeHint: "series"
    };
  }

  function detectImageUrl() {
    return document.querySelector('meta[property="og:image"]')?.getAttribute("content") || null;
  }

  function buildPayload(reason) {
    const hostname = getHostname();
    const platform = detectPlatform(hostname);
    if (!isWatchContext(hostname, platform)) {
      return null;
    }

    if (!isPotentialOttHost(hostname)) {
      return null;
    }

    const rawTitle = readProviderTitle(hostname);
    const details = enrichDetailsWithPageContext(extractTitleDetails(rawTitle, platform), platform);
    if (!details.title || !isMeaningfulTitle(details.title)) {
      return null;
    }

    const primaryVideo = findPrimaryVideo();
    const hasVideoPlayback = !!primaryVideo && Number.isFinite(primaryVideo.duration) && primaryVideo.duration > 0;
    const embeddedPlayer = hasEmbeddedPlayerSignal();
    const hasPlaybackSignal = hasVideoPlayback || embeddedPlayer;
    if (!hasPlaybackSignal) {
      return null;
    }

    if ((platform === "youtube" || platform === "netflix" || platform === "prime-video") && !hasVideoPlayback) {
      return null;
    }

    const progressPercent = hasVideoPlayback
      ? Math.max(0, Math.min(100, (primaryVideo.currentTime / primaryVideo.duration) * 100))
      : 0;

    return {
      reason,
      platform,
      hostname,
      title: details.title,
      searchTitle: details.searchTitle,
      episodeTitle: details.episodeTitle,
      rawTitle,
      url: window.location.href,
      imageUrl: detectImageUrl(),
      typeHint: details.typeHint,
      seasonNumber: details.seasonNumber,
      episodeNumber: details.episodeNumber,
      releaseYear: details.releaseYear,
      hasVideoPlayback,
      isPlaying: hasVideoPlayback ? !primaryVideo.paused && !primaryVideo.ended : false,
      progressPercent,
      currentTime: hasVideoPlayback ? Math.floor(primaryVideo.currentTime) : 0,
      duration: hasVideoPlayback ? Math.floor(primaryVideo.duration) : 0,
      observedAt: new Date().toISOString()
    };
  }

  function shouldSend(payload) {
    const now = Date.now();
    const roundedProgress = Math.floor(payload.progressPercent || 0);
    const episode = payload.episodeNumber || 0;
    const signature = `${payload.hostname}|${payload.title}|${episode}|${roundedProgress}|${payload.url}`;

    if (signature === lastSignature && now - lastSentAt < SEND_INTERVAL_MS) {
      return false;
    }

    lastSignature = signature;
    lastSentAt = now;
    return true;
  }

  function emit(reason) {
    if (!state.active) {
      return;
    }

    const payload = buildPayload(reason);
    if (!payload || !shouldSend(payload)) {
      return;
    }

    safeSendMessage({ type: "PLAYBACK_EVENT", payload });
  }

  function observeTitleMutations() {
    state.observer = new MutationObserver(() => emit("dom-mutation"));
    state.observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
  }

  function attachVideoEvents() {
    const wire = () => {
      const video = findPrimaryVideo();
      if (!video || video.dataset.shelfBound === "1") {
        return;
      }

      video.dataset.shelfBound = "1";
      ["play", "pause", "ended", "seeked"].forEach((eventName) => {
        video.addEventListener(eventName, () => emit(`video-${eventName}`), { passive: true });
      });
    };

    wire();
    const wireHandle = setInterval(wire, 3000);
    state.intervals.push(wireHandle);
  }

  if (!extensionContextAvailable()) {
    stopScript("runtime-unavailable-on-init");
    return;
  }

  emit("initial");
  observeTitleMutations();
  attachVideoEvents();
  const emitHandle = setInterval(() => emit("interval"), SEND_INTERVAL_MS);
  state.intervals.push(emitHandle);
})();
