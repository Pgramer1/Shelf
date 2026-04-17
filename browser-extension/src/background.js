import { addToShelf, createMedia, getShelf, searchMedia, updateShelfItem } from "./api.js";
import { CALLBACK_PATH, STORAGE_KEYS, SUPPORTED_ACTIVE_STATUS } from "./constants.js";
import {
  clearLastSyncError,
  clearAuth,
  getConsumptionMarkers,
  getAuth,
  getLastDetection,
  getLastSyncError,
  getPendingAdditions,
  getSettings,
  saveAuth,
  saveConsumptionMarkers,
  saveLastDetection,
  saveLastSyncError,
  savePendingAdditions
} from "./storage.js";

const MEDIA_TYPES = ["MOVIE", "TV_SERIES", "ANIME", "GAME", "BOOK"];
const ANIME_HINT_PATTERN = /\b(anime|sub|dub|ova|op\b|ed\b|\bep\b|episode)\b/i;
const animeDetectionCache = new Map();

function toLocalDateTime(date = new Date()) {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 19);
}

function normalizeTitle(value) {
  return (value || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[^a-z0-9 ]/g, "")
    .trim();
}

function isValidMediaType(type) {
  return MEDIA_TYPES.includes(type);
}

function defaultTotalUnitsForType(type, episodeHint) {
  if (type === "MOVIE") {
    return 1;
  }

  if (type === "TV_SERIES" || type === "ANIME") {
    return Math.max(12, Number(episodeHint) || 0);
  }

  return Math.max(1, Number(episodeHint) || 1);
}

function tokenizeTitle(value) {
  return normalizeTitle(value)
    .split(" ")
    .filter((part) => part.length > 1);
}

function canonicalKey(domain, title) {
  return `${domain}::${normalizeTitle(title)}`;
}

function sanitizeDomain(domain) {
  return (domain || "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^\*\./, "")
    .replace(/\/.*$/, "");
}

function domainMatches(hostname, domain) {
  const host = (hostname || "").toLowerCase();
  const target = sanitizeDomain(domain);
  return !!host && !!target && (host === target || host.endsWith(`.${target}`));
}

function isKnownProviderDomain(hostname, settings) {
  const host = (hostname || "").toLowerCase();
  if (!host) {
    return false;
  }

  if (settings.providers.netflix && host.includes("netflix.com")) return true;
  if (settings.providers.primeVideo && (host.includes("primevideo.com") || host.includes("amazon."))) return true;
  if (settings.providers.youtube && (host.includes("youtube.com") || host.includes("youtu.be"))) return true;
  return false;
}

function findMatchingCustomDomain(hostname, settings) {
  if (!settings.providers.genericOtt) {
    return null;
  }

  const host = (hostname || "").toLowerCase();
  if (!host) {
    return null;
  }

  return settings.customDomains.find((domain) => domainMatches(host, domain)) || null;
}

function buildDomainPermissionOrigins(domain) {
  const clean = sanitizeDomain(domain);
  if (!clean) {
    return [];
  }

  return [
    `https://${clean}/*`,
    `https://*.${clean}/*`,
    `http://${clean}/*`,
    `http://*.${clean}/*`
  ];
}

async function hasHostPermissionForDomain(domain) {
  const origins = buildDomainPermissionOrigins(domain);
  for (const origin of origins) {
    const granted = await chrome.permissions.contains({ origins: [origin] });
    if (granted) {
      return true;
    }
  }
  return false;
}

async function isDomainAllowed(hostname, settings) {
  if (isKnownProviderDomain(hostname, settings)) {
    return true;
  }

  const customDomain = findMatchingCustomDomain(hostname, settings);
  if (!customDomain) {
    return false;
  }

  return hasHostPermissionForDomain(customDomain);
}

function inferMediaType(event) {
  if (isValidMediaType(event?.forcedMediaType)) {
    return event.forcedMediaType;
  }

  if (isValidMediaType(event?.detectedMediaType)) {
    return event.detectedMediaType;
  }

  if (event.typeHint === "series") {
    const hostHasAnimeHint = /anime|animetsu|aniwatch|anitv|animepahe/i.test(event.hostname || "");
    const titleHasAnimeHint = /anime|sub|dub|ova|op\b|ed\b/i.test(`${event.title || ""} ${event.rawTitle || ""}`);
    if (hostHasAnimeHint || titleHasAnimeHint) {
      return "ANIME";
    }

    if (event.platform === "youtube" && ANIME_HINT_PATTERN.test(event.rawTitle || event.title || "")) {
      return "ANIME";
    }
    return "TV_SERIES";
  }

  if (event.platform === "youtube") {
    return "MOVIE";
  }

  return "MOVIE";
}

function shouldProbeAnimeApi(event) {
  if (!event) {
    return false;
  }

  if (event.platform !== "youtube") {
    return false;
  }

  if (event.typeHint === "series") {
    return true;
  }

  return ANIME_HINT_PATTERN.test(event.rawTitle || event.title || "");
}

function titleSimilarityScore(left, right) {
  const l = new Set(tokenizeTitle(left));
  const r = new Set(tokenizeTitle(right));
  if (!l.size || !r.size) {
    return 0;
  }

  let overlap = 0;
  for (const token of l) {
    if (r.has(token)) {
      overlap += 1;
    }
  }

  return overlap / Math.max(l.size, r.size);
}

async function detectAnimeWithJikan(event) {
  const searchTitle = event.searchTitle || event.title;
  const normalizedKey = normalizeTitle(searchTitle);
  if (!normalizedKey) {
    return null;
  }

  if (animeDetectionCache.has(normalizedKey)) {
    return animeDetectionCache.get(normalizedKey);
  }

  try {
    const response = await fetch(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(searchTitle)}&limit=3&sfw=true`);
    if (!response.ok) {
      animeDetectionCache.set(normalizedKey, null);
      return null;
    }

    const data = await response.json();
    const candidates = Array.isArray(data?.data) ? data.data : [];
    const best = candidates
      .map((entry) => {
        const titles = [
          entry?.title,
          entry?.title_english,
          entry?.title_japanese,
          ...(Array.isArray(entry?.titles)
            ? entry.titles.map((item) => item?.title).filter(Boolean)
            : []),
          ...(Array.isArray(entry?.title_synonyms) ? entry.title_synonyms : [])
        ].filter(Boolean);

        const bestScore = titles.reduce((score, titleValue) => {
          return Math.max(score, titleSimilarityScore(searchTitle, titleValue));
        }, 0);

        return {
          entry,
          score: bestScore
        };
      })
      .sort((a, b) => b.score - a.score)[0];

    if (!best || best.score < 0.45) {
      animeDetectionCache.set(normalizedKey, null);
      return null;
    }

    const result = {
      mediaType: "ANIME",
      confidence: best.score,
      source: "jikan"
    };
    animeDetectionCache.set(normalizedKey, result);
    return result;
  } catch {
    animeDetectionCache.set(normalizedKey, null);
    return null;
  }
}

async function enrichEventWithMediaType(event) {
  if (!event) {
    return event;
  }

  if (isValidMediaType(event.forcedMediaType)) {
    return {
      ...event,
      detectedMediaType: event.forcedMediaType,
      mediaTypeSource: "manual"
    };
  }

  const heuristicType = inferMediaType(event);
  if (heuristicType === "ANIME") {
    return {
      ...event,
      detectedMediaType: "ANIME",
      mediaTypeSource: "heuristic"
    };
  }

  if (!shouldProbeAnimeApi(event)) {
    return {
      ...event,
      detectedMediaType: heuristicType,
      mediaTypeSource: "heuristic"
    };
  }

  const detectedAnime = await detectAnimeWithJikan(event);
  if (detectedAnime?.mediaType === "ANIME") {
    return {
      ...event,
      detectedMediaType: "ANIME",
      mediaTypeSource: detectedAnime.source,
      mediaTypeConfidence: detectedAnime.confidence
    };
  }

  return {
    ...event,
    detectedMediaType: heuristicType,
    mediaTypeSource: "heuristic"
  };
}

function computeProgress(event, totalUnits, currentProgress, mediaType) {
  if (!event.hasVideoPlayback) {
    return currentProgress;
  }

  const safeTotal = Math.max(1, totalUnits || 1);
  const percent = Math.max(0, Math.min(100, event.progressPercent || 0));

  const isSeries = mediaType === "TV_SERIES" || mediaType === "ANIME" || event.typeHint === "series";
  if (isSeries && Number.isInteger(event.episodeNumber) && event.episodeNumber > 0) {
    const candidateEpisode = percent >= 70 ? event.episodeNumber : event.episodeNumber - 1;
    const bounded = Math.max(0, Math.min(safeTotal, candidateEpisode));
    return Math.max(currentProgress, bounded);
  }

  if (isSeries) {
    return currentProgress;
  }

  if (safeTotal === 1) {
    if (percent >= 85) {
      return 1;
    }
    return currentProgress;
  }

  const estimated = Math.floor((percent / 100) * safeTotal);
  return Math.max(currentProgress, Math.min(safeTotal, estimated));
}

function computeTokenOverlap(leftText, rightText) {
  const left = new Set(tokenizeTitle(leftText));
  const right = new Set(tokenizeTitle(rightText));
  if (!left.size || !right.size) {
    return 0;
  }

  let overlap = 0;
  for (const token of left) {
    if (right.has(token)) {
      overlap += 1;
    }
  }
  return overlap / Math.max(left.size, right.size);
}

function scoreShelfEntryMatch(entry, event) {
  const title = entry?.media?.title || "";
  if (!title) {
    return -1;
  }

  const expectedType = inferMediaType(event);
  const entryType = entry?.media?.type;
  let score = 0;

  const normalizedEventTitle = normalizeTitle(event.title);
  const normalizedEntryTitle = normalizeTitle(title);

  if (normalizedEventTitle && normalizedEntryTitle && normalizedEventTitle === normalizedEntryTitle) {
    score += 1000;
  }

  if (normalizedEntryTitle.includes(normalizedEventTitle) || normalizedEventTitle.includes(normalizedEntryTitle)) {
    score += 240;
  }

  score += Math.round(computeTokenOverlap(event.title, title) * 400);

  if (entryType === expectedType) {
    score += 120;
  }

  if (event.episodeNumber && (entryType === "TV_SERIES" || entryType === "ANIME")) {
    score += 80;
  }

  return score;
}

function findExistingShelfEntryByTitle(shelf, event) {
  if (!Array.isArray(shelf) || shelf.length === 0) {
    return null;
  }

  const scored = shelf
    .map((entry) => ({ entry, score: scoreShelfEntryMatch(entry, event) }))
    .sort((a, b) => b.score - a.score);

  if (!scored.length || scored[0].score < 320) {
    return null;
  }

  return scored[0].entry;
}

function buildCompletionMarker(event) {
  const urlKey = event.url || "";
  const titleKey = normalizeTitle(event.title || "");
  const episodeKey = event.episodeNumber || 0;
  return `${titleKey}|${episodeKey}|${urlKey}`;
}

async function nextProgressForExistingEntry(existing, event) {
  const currentProgress = Math.max(0, existing.progress || 0);
  const totalUnits = Math.max(1, existing.media?.totalUnits || 1);
  const mediaType = existing.media?.type;

  const seriesType = mediaType === "TV_SERIES" || mediaType === "ANIME";
  if (!seriesType) {
    return computeProgress(event, totalUnits, currentProgress, mediaType);
  }

  if (Number.isInteger(event.episodeNumber) && event.episodeNumber > 0) {
    return computeProgress(event, totalUnits, currentProgress, mediaType);
  }

  if (!(event.platform === "youtube" && event.typeHint === "series")) {
    return currentProgress;
  }

  if ((event.progressPercent || 0) < 85) {
    return currentProgress;
  }

  const markers = await getConsumptionMarkers();
  const markerKey = String(existing.id);
  const markerValue = buildCompletionMarker(event);
  if (markers[markerKey] === markerValue) {
    return currentProgress;
  }

  markers[markerKey] = markerValue;
  await saveConsumptionMarkers(markers);
  return Math.min(totalUnits, currentProgress + 1);
}

function incrementRewatchCountInNotes(existingNotes) {
  const notes = existingNotes || "";
  const rewatchRegex = /Rewatch count:\s*(\d+)/i;
  const match = notes.match(rewatchRegex);
  if (!match) {
    return notes ? `${notes}\nRewatch count: 1` : "Rewatch count: 1";
  }

  const next = Number(match[1] || 0) + 1;
  return notes.replace(rewatchRegex, `Rewatch count: ${next}`);
}

function scoreMediaMatch(item, event) {
  const expectedType = inferMediaType(event);
  const detectedTitle = normalizeTitle(event.title);
  const candidateTitle = normalizeTitle(item.title);
  if (!candidateTitle) {
    return -1;
  }

  let score = 0;

  if (candidateTitle === detectedTitle) {
    score += 1000;
  }

  if (candidateTitle.includes(detectedTitle) || detectedTitle.includes(candidateTitle)) {
    score += 260;
  }

  const left = new Set(tokenizeTitle(candidateTitle));
  const right = new Set(tokenizeTitle(detectedTitle));
  let overlap = 0;
  for (const token of left) {
    if (right.has(token)) {
      overlap += 1;
    }
  }
  const total = new Set([...left, ...right]).size || 1;
  score += Math.round((overlap / total) * 300);

  if (item.type === expectedType) {
    score += 120;
  }

  if (event.episodeNumber && (item.type === "TV_SERIES" || item.type === "ANIME")) {
    score += 70;
  }

  if (event.releaseYear && item.releaseYear && Number(event.releaseYear) === Number(item.releaseYear)) {
    score += 70;
  }

  return score;
}

function pickBestMediaMatch(results, event) {
  if (!Array.isArray(results) || results.length === 0) {
    return null;
  }

  const expectedType = inferMediaType(event);
  const typedCandidates = results.filter((item) => item.type === expectedType);
  const pool = typedCandidates.length > 0 ? typedCandidates : results;

  const scored = pool
    .map((item) => ({ item, score: scoreMediaMatch(item, event) }))
    .sort((a, b) => b.score - a.score);

  if (!scored.length || scored[0].score < 120) {
    return null;
  }

  return scored[0].item;
}

async function resolveMedia(settings, auth, event) {
  const query = event.searchTitle || event.title;
  const searchResults = await searchMedia(settings.apiBaseUrl, auth.token, query);
  let media = pickBestMediaMatch(searchResults, event);

  if (!media && settings.autoCreateMedia) {
    const expectedType = inferMediaType(event);
    const guessedTotalUnits = defaultTotalUnitsForType(expectedType, event.episodeNumber);

    media = await createMedia(settings.apiBaseUrl, auth.token, {
      title: event.title,
      type: expectedType,
      totalUnits: guessedTotalUnits,
      imageUrl: event.imageUrl || null,
      description: `Imported from ${event.hostname}`,
      releaseYear: event.releaseYear || null
    });
  }

  return media;
}

async function queuePendingAddition(event, media) {
  const pending = await getPendingAdditions();
  const key = canonicalKey(event.hostname, event.title);
  const expectedType = media?.type || inferMediaType(event);
  const totalUnits = media?.totalUnits || defaultTotalUnitsForType(expectedType, event.episodeNumber);
  const suggestedProgress = computeProgress(
    event,
    totalUnits,
    0,
    expectedType
  );

  pending[key] = {
    key,
    title: event.title,
    searchTitle: event.searchTitle || event.title,
    hostname: event.hostname,
    url: event.url,
    mediaId: media?.id || null,
    mediaType: expectedType,
    imageUrl: media?.imageUrl || event.imageUrl || null,
    totalUnits,
    createdAt: toLocalDateTime(),
    progressPercent: event.progressPercent || 0,
    typeHint: event.typeHint || null,
    seasonNumber: event.seasonNumber || null,
    episodeNumber: event.episodeNumber || null,
    releaseYear: event.releaseYear || null,
    suggestedProgress
  };
  await savePendingAdditions(pending);
  await chrome.action.setBadgeText({ text: "!" });
  await chrome.action.setBadgeBackgroundColor({ color: "#ef4444" });
}

async function clearBadgeIfNeeded() {
  const pending = await getPendingAdditions();
  const hasAny = Object.keys(pending).length > 0;
  if (!hasAny) {
    await chrome.action.setBadgeText({ text: "" });
  }
}

async function syncPlaybackEvent(event) {
  const settings = await getSettings();
  if (!settings.syncEnabled || !(await isDomainAllowed(event.hostname, settings))) {
    return;
  }

  const enrichedEvent = await enrichEventWithMediaType(event);
  await saveLastDetection({ ...enrichedEvent, detectedAt: toLocalDateTime() });

  const auth = await getAuth();
  if (!auth?.token) {
    return;
  }

  try {
    const shelf = await getShelf(settings.apiBaseUrl, auth.token);
    let existing = findExistingShelfEntryByTitle(shelf, enrichedEvent);

    if (!existing) {
      const media = await resolveMedia(settings, auth, enrichedEvent);
      if (!media) {
        await queuePendingAddition(enrichedEvent, null);
        await clearLastSyncError();
        return;
      }

      existing = shelf.find((entry) => entry.media?.id === media.id);
      if (!existing) {
        await queuePendingAddition(enrichedEvent, media);
        await clearLastSyncError();
        return;
      }
    }

    const currentProgress = Math.max(0, existing.progress || 0);
    const nextProgress = await nextProgressForExistingEntry(existing, enrichedEvent);
    const minDeltaUnits = Math.max(1, Math.round((settings.minPercentDelta / 100) * Math.max(1, existing.media?.totalUnits || 1)));
    if (nextProgress - currentProgress < minDeltaUnits) {
      await clearLastSyncError();
      return;
    }

    const totalUnits = Math.max(1, existing.media?.totalUnits || 1);
    const isCompleted = nextProgress >= totalUnits;
    const nextStatus = isCompleted ? "COMPLETED" : (SUPPORTED_ACTIVE_STATUS[existing.media?.type] || "WATCHING");

    await updateShelfItem(settings.apiBaseUrl, auth.token, existing.id, {
      mediaId: existing.media.id,
      status: nextStatus,
      progress: nextProgress,
      rating: existing.rating,
      notes: existing.notes,
      isFavorite: !!existing.isFavorite,
      startedAt: existing.startedAt,
      completedAt: isCompleted ? toLocalDateTime() : existing.completedAt,
      activityAt: toLocalDateTime()
    });
    await clearLastSyncError();
  } catch (error) {
    const messageText = error instanceof Error ? error.message : "Sync failed";
    await saveLastSyncError(messageText);
    await queuePendingAddition(enrichedEvent, null);
  }
}

async function startOAuthFlow() {
  const settings = await getSettings();
  const callbackUrl = `chrome-extension://${chrome.runtime.id}/${CALLBACK_PATH}`;
  const loginUrl = `${settings.apiBaseUrl.replace(/\/$/, "")}/auth/oauth2/google?redirect_uri=${encodeURIComponent(callbackUrl)}`;
  await chrome.tabs.create({ url: loginUrl });
}

function extractAuthFromCallbackUrl(urlText) {
  if (!urlText) {
    return null;
  }

  try {
    const callbackUrl = new URL(urlText);
    if (callbackUrl.protocol !== "chrome-extension:") {
      return null;
    }

    if (callbackUrl.hostname !== chrome.runtime.id) {
      return null;
    }

    const normalizedPath = callbackUrl.pathname.replace(/^\//, "");
    if (normalizedPath !== CALLBACK_PATH) {
      return null;
    }

    const token = callbackUrl.searchParams.get("token");
    if (!token) {
      return null;
    }

    return {
      token,
      username: callbackUrl.searchParams.get("username"),
      email: callbackUrl.searchParams.get("email"),
      bio: callbackUrl.searchParams.get("bio"),
      avatarUrl: callbackUrl.searchParams.get("avatarUrl"),
      savedAt: new Date().toISOString()
    };
  } catch {
    return null;
  }
}

async function handleOAuthCallbackTab(tabId, urlText) {
  const auth = extractAuthFromCallbackUrl(urlText);
  if (!auth) {
    return false;
  }

  await saveAuth(auth);

  try {
    await chrome.tabs.remove(tabId);
  } catch {
    // Ignore if tab is already closed.
  }

  return true;
}

async function handleConfirmAddition(key) {
  const pending = await getPendingAdditions();
  const item = pending[key];
  if (!item) {
    return { ok: false, message: "Pending item not found." };
  }

  const settings = await getSettings();
  const auth = await getAuth();
  if (!auth?.token) {
    return { ok: false, message: "Not signed in." };
  }

  const currentShelf = await getShelf(settings.apiBaseUrl, auth.token);
  const existingByTitle = findExistingShelfEntryByTitle(currentShelf, {
    title: item.title,
    searchTitle: item.searchTitle || item.title,
    typeHint: item.typeHint,
    platform: "generic",
    forcedMediaType: item.mediaType,
    detectedMediaType: item.mediaType,
    episodeNumber: item.episodeNumber,
    releaseYear: item.releaseYear,
    url: item.url,
    progressPercent: item.progressPercent,
    hasVideoPlayback: true
  });

  if (existingByTitle) {
    const desiredProgress = Math.max(0, Math.min(
      Math.max(1, existingByTitle.media?.totalUnits || item.totalUnits || 1),
      Number(item.suggestedProgress) || 0
    ));

    const updatedNotes = (existingByTitle.status === "COMPLETED" && desiredProgress <= 1)
      ? incrementRewatchCountInNotes(existingByTitle.notes)
      : existingByTitle.notes;

    await updateShelfItem(settings.apiBaseUrl, auth.token, existingByTitle.id, {
      mediaId: existingByTitle.media.id,
      status: desiredProgress >= Math.max(1, existingByTitle.media?.totalUnits || 1)
        ? "COMPLETED"
        : (SUPPORTED_ACTIVE_STATUS[item.mediaType] || existingByTitle.status || "WATCHING"),
      progress: Math.max(existingByTitle.progress || 0, desiredProgress),
      rating: existingByTitle.rating,
      notes: updatedNotes,
      isFavorite: !!existingByTitle.isFavorite,
      startedAt: existingByTitle.startedAt || toLocalDateTime(),
      completedAt: desiredProgress >= Math.max(1, existingByTitle.media?.totalUnits || 1)
        ? toLocalDateTime()
        : existingByTitle.completedAt,
      activityAt: toLocalDateTime()
    });

    delete pending[key];
    await savePendingAdditions(pending);
    await clearBadgeIfNeeded();
    await clearLastSyncError();
    return { ok: true, message: "Matched existing shelf entry (no duplicate created)." };
  }

  let mediaId = item.mediaId;
  let mediaType = item.mediaType;
  let totalUnits = Math.max(1, Number(item.totalUnits) || 1);
  if (!mediaId) {
    const media = await resolveMedia(settings, auth, {
      title: item.title,
      searchTitle: item.searchTitle || item.title,
      hostname: item.hostname,
      imageUrl: item.imageUrl,
      typeHint: item.typeHint,
      forcedMediaType: item.mediaType,
      detectedMediaType: item.mediaType,
      seasonNumber: item.seasonNumber,
      episodeNumber: item.episodeNumber,
      releaseYear: item.releaseYear,
      platform: "generic"
    });
    mediaId = media?.id || null;
    mediaType = media?.type || mediaType;
    totalUnits = Math.max(1, Number(media?.totalUnits) || totalUnits);
  }

  if (!mediaId) {
    return { ok: false, message: "Unable to resolve media for this title." };
  }

  const initialProgress = Math.max(0, Math.min(totalUnits, Number(item.suggestedProgress) || 0));
  const initialStatus = initialProgress >= totalUnits
    ? "COMPLETED"
    : (SUPPORTED_ACTIVE_STATUS[mediaType] || "WATCHING");

  await addToShelf(settings.apiBaseUrl, auth.token, {
    mediaId,
    status: initialStatus,
    progress: initialProgress,
    isFavorite: false,
    startedAt: toLocalDateTime(),
    completedAt: initialStatus === "COMPLETED" ? toLocalDateTime() : null,
    activityAt: toLocalDateTime()
  });

  delete pending[key];
  await savePendingAdditions(pending);
  await clearBadgeIfNeeded();
  await clearLastSyncError();

  return { ok: true };
}

async function updatePendingMediaType(key, mediaType) {
  if (!isValidMediaType(mediaType)) {
    return { ok: false, message: "Invalid media type." };
  }

  const pending = await getPendingAdditions();
  const item = pending[key];
  if (!item) {
    return { ok: false, message: "Pending item not found." };
  }

  const totalUnits = defaultTotalUnitsForType(mediaType, item.episodeNumber);
  pending[key] = {
    ...item,
    mediaType,
    mediaId: null,
    totalUnits,
    suggestedProgress: Math.max(0, Math.min(totalUnits, Number(item.suggestedProgress) || 0))
  };

  await savePendingAdditions(pending);
  return { ok: true };
}

async function addLatestDetectionToPending() {
  const [latest, auth] = await Promise.all([getLastDetection(), getAuth()]);
  if (!latest) {
    return { ok: false, message: "No latest detection available yet." };
  }

  if (!auth?.token) {
    return { ok: false, message: "Sign in first, then retry." };
  }

  const settings = await getSettings();
  try {
    const enrichedLatest = await enrichEventWithMediaType(latest);
    const media = await resolveMedia(settings, auth, enrichedLatest);
    await queuePendingAddition(enrichedLatest, media);
    await clearLastSyncError();
    return { ok: true };
  } catch (error) {
    const enrichedLatest = await enrichEventWithMediaType(latest);
    await queuePendingAddition(enrichedLatest, null);
    const messageText = error instanceof Error ? error.message : "Unable to resolve media automatically.";
    await saveLastSyncError(messageText);
    return { ok: true, message: "Added latest detection to pending, but media lookup failed." };
  }
}

function isInjectableUrl(url) {
  return typeof url === "string" && (url.startsWith("https://") || url.startsWith("http://"));
}

async function maybeInjectContentScript(tabId, tabUrl) {
  if (!isInjectableUrl(tabUrl)) {
    return;
  }

  const settings = await getSettings();
  if (!settings.syncEnabled || !settings.providers.genericOtt) {
    return;
  }

  let hostname = "";
  try {
    hostname = new URL(tabUrl).hostname.toLowerCase();
  } catch {
    return;
  }

  if (isKnownProviderDomain(hostname, settings)) {
    return;
  }

  const customDomain = findMatchingCustomDomain(hostname, settings);
  if (!customDomain || !(await hasHostPermissionForDomain(customDomain))) {
    return;
  }

  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["src/content-script.js"]
    });
  } catch {
    // Injection can fail on restricted pages; ignore quietly.
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    try {
      if (message?.type === "PLAYBACK_EVENT") {
        await syncPlaybackEvent(message.payload);
        sendResponse({ ok: true });
        return;
      }

      if (message?.type === "START_OAUTH") {
        await startOAuthFlow();
        sendResponse({ ok: true });
        return;
      }

      if (message?.type === "SIGN_OUT") {
        await clearAuth();
        sendResponse({ ok: true });
        return;
      }

      if (message?.type === "GET_POPUP_STATE") {
        const [auth, settings, pending, lastDetection, lastSyncError] = await Promise.all([
          getAuth(),
          getSettings(),
          getPendingAdditions(),
          getLastDetection(),
          getLastSyncError()
        ]);
        sendResponse({
          ok: true,
          payload: {
            auth,
            settings,
            pending: Object.values(pending),
            lastDetection,
            lastSyncError
          }
        });
        return;
      }

      if (message?.type === "ADD_LATEST_TO_PENDING") {
        const result = await addLatestDetectionToPending();
        sendResponse(result);
        return;
      }

      if (message?.type === "UPDATE_PENDING_MEDIA_TYPE") {
        const result = await updatePendingMediaType(message.key, message.mediaType);
        sendResponse(result);
        return;
      }

      if (message?.type === "CONFIRM_ADD_PENDING") {
        const result = await handleConfirmAddition(message.key);
        sendResponse(result);
        return;
      }

      if (message?.type === "DISMISS_PENDING") {
        const pending = await getPendingAdditions();
        delete pending[message.key];
        await savePendingAdditions(pending);
        await clearBadgeIfNeeded();
        sendResponse({ ok: true });
        return;
      }

      sendResponse({ ok: false, message: "Unsupported message type." });
    } catch (error) {
      const messageText = error instanceof Error ? error.message : "Unknown error";
      sendResponse({ ok: false, message: messageText });
    }
  })();

  return true;
});

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(STORAGE_KEYS.SETTINGS).then((data) => {
    if (!data[STORAGE_KEYS.SETTINGS]) {
      chrome.storage.local.set({
        [STORAGE_KEYS.SETTINGS]: {
          apiBaseUrl: "https://shelf-uob1.onrender.com/api",
          syncEnabled: true,
          providers: {
            netflix: true,
            primeVideo: true,
            youtube: true,
            genericOtt: true
          },
          customDomains: [],
          minPercentDelta: 10,
          autoCreateMedia: true
        }
      });
    }
  });
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  const possibleUrl = changeInfo.url || tab.url;
  if (possibleUrl) {
    void handleOAuthCallbackTab(tabId, possibleUrl).then((handled) => {
      if (handled) {
        return;
      }

      if (changeInfo.status === "complete" && tab.url) {
        void maybeInjectContentScript(tabId, tab.url);
      }
    });
    return;
  }

  if (changeInfo.status === "complete" && tab.url) {
    void maybeInjectContentScript(tabId, tab.url);
  }
});
