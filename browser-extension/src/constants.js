export const STORAGE_KEYS = {
  SETTINGS: "shelf_extension_settings",
  AUTH: "shelf_extension_auth",
  LAST_DETECTION: "shelf_extension_last_detection",
  PENDING_ADDITIONS: "shelf_extension_pending_additions",
  LAST_SYNC_ERROR: "shelf_extension_last_sync_error",
  CONSUMPTION_MARKERS: "shelf_extension_consumption_markers"
};

export const DEFAULT_SETTINGS = {
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
};

export const SUPPORTED_ACTIVE_STATUS = {
  MOVIE: "WATCHING",
  TV_SERIES: "WATCHING",
  ANIME: "WATCHING",
  BOOK: "READING",
  GAME: "PLAYING"
};

export const CALLBACK_PATH = "callback/index.html";
