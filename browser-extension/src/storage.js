import { DEFAULT_SETTINGS, STORAGE_KEYS } from "./constants.js";

const RENDER_API_BASE_URL = "https://shelf-uob1.onrender.com/api";
const LEGACY_BACKEND_BASE_URLS = new Set([
  "https://shelf-uob1.onrender.com"
]);

function normalizeApiBaseUrl(value) {
  const trimmed = (value || "").trim().replace(/\/+$/, "");
  if (!trimmed) {
    return DEFAULT_SETTINGS.apiBaseUrl;
  }

  if (LEGACY_BACKEND_BASE_URLS.has(trimmed)) {
    return RENDER_API_BASE_URL;
  }

  return trimmed;
}

function getLocal(keys) {
  return chrome.storage.local.get(keys);
}

function setLocal(values) {
  return chrome.storage.local.set(values);
}

export async function getSettings() {
  const data = await getLocal(STORAGE_KEYS.SETTINGS);
  const settings = {
    ...DEFAULT_SETTINGS,
    ...(data[STORAGE_KEYS.SETTINGS] || {}),
    providers: {
      ...DEFAULT_SETTINGS.providers,
      ...((data[STORAGE_KEYS.SETTINGS] || {}).providers || {})
    }
  };

  return {
    ...settings,
    apiBaseUrl: normalizeApiBaseUrl(settings.apiBaseUrl)
  };
}

export async function saveSettings(settings) {
  await setLocal({ [STORAGE_KEYS.SETTINGS]: settings });
}

export async function getAuth() {
  const data = await getLocal(STORAGE_KEYS.AUTH);
  return data[STORAGE_KEYS.AUTH] || null;
}

export async function saveAuth(auth) {
  await setLocal({ [STORAGE_KEYS.AUTH]: auth });
}

export async function clearAuth() {
  await chrome.storage.local.remove(STORAGE_KEYS.AUTH);
}

export async function getPendingAdditions() {
  const data = await getLocal(STORAGE_KEYS.PENDING_ADDITIONS);
  return data[STORAGE_KEYS.PENDING_ADDITIONS] || {};
}

export async function savePendingAdditions(pending) {
  await setLocal({ [STORAGE_KEYS.PENDING_ADDITIONS]: pending });
}

export async function getLastDetection() {
  const data = await getLocal(STORAGE_KEYS.LAST_DETECTION);
  return data[STORAGE_KEYS.LAST_DETECTION] || null;
}

export async function saveLastDetection(detection) {
  await setLocal({ [STORAGE_KEYS.LAST_DETECTION]: detection });
}

export async function getLastSyncError() {
  const data = await getLocal(STORAGE_KEYS.LAST_SYNC_ERROR);
  return data[STORAGE_KEYS.LAST_SYNC_ERROR] || null;
}

export async function saveLastSyncError(errorMessage) {
  await setLocal({ [STORAGE_KEYS.LAST_SYNC_ERROR]: errorMessage });
}

export async function clearLastSyncError() {
  await chrome.storage.local.remove(STORAGE_KEYS.LAST_SYNC_ERROR);
}

export async function getConsumptionMarkers() {
  const data = await getLocal(STORAGE_KEYS.CONSUMPTION_MARKERS);
  return data[STORAGE_KEYS.CONSUMPTION_MARKERS] || {};
}

export async function saveConsumptionMarkers(markers) {
  await setLocal({ [STORAGE_KEYS.CONSUMPTION_MARKERS]: markers });
}
