const STORAGE_KEY = "shelf_extension_settings";

const fields = {
  apiBaseUrl: document.getElementById("api-base-url"),
  syncEnabled: document.getElementById("sync-enabled"),
  minPercentDelta: document.getElementById("min-percent-delta"),
  autoCreateMedia: document.getElementById("auto-create-media"),
  providerNetflix: document.getElementById("provider-netflix"),
  providerPrime: document.getElementById("provider-prime"),
  providerYoutube: document.getElementById("provider-youtube"),
  providerGeneric: document.getElementById("provider-generic"),
  customDomains: document.getElementById("custom-domains")
};

const status = document.getElementById("status");

const defaults = {
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

function parseDomains(value) {
  return value
    .split(",")
    .map((part) => part.trim().toLowerCase())
    .map((part) => part.replace(/^https?:\/\//, "").replace(/^\*\./, "").replace(/\/.*$/, ""))
    .filter(Boolean);
}

function buildPermissionOrigins(domains) {
  const origins = new Set();
  for (const domain of domains) {
    if (!domain) {
      continue;
    }

    origins.add(`https://${domain}/*`);
    origins.add(`https://*.${domain}/*`);
    origins.add(`http://${domain}/*`);
    origins.add(`http://*.${domain}/*`);
  }
  return Array.from(origins);
}

async function loadSettings() {
  const data = await chrome.storage.local.get(STORAGE_KEY);
  const settings = {
    ...defaults,
    ...(data[STORAGE_KEY] || {}),
    providers: {
      ...defaults.providers,
      ...((data[STORAGE_KEY] || {}).providers || {})
    }
  };

  fields.apiBaseUrl.value = settings.apiBaseUrl;
  fields.syncEnabled.checked = settings.syncEnabled;
  fields.minPercentDelta.value = settings.minPercentDelta;
  fields.autoCreateMedia.checked = settings.autoCreateMedia;
  fields.providerNetflix.checked = settings.providers.netflix;
  fields.providerPrime.checked = settings.providers.primeVideo;
  fields.providerYoutube.checked = settings.providers.youtube;
  fields.providerGeneric.checked = settings.providers.genericOtt;
  fields.customDomains.value = settings.customDomains.join(", ");
}

async function saveSettings() {
  const customDomains = parseDomains(fields.customDomains.value);
  const permissionOrigins = buildPermissionOrigins(customDomains);

  if (fields.providerGeneric.checked && permissionOrigins.length > 0) {
    const permissionGranted = await chrome.permissions.request({ origins: permissionOrigins });
    if (!permissionGranted) {
      status.textContent = "Domain permission denied. Custom-domain sync will stay disabled for those domains.";
    }
  }

  const settings = {
    apiBaseUrl: fields.apiBaseUrl.value.trim(),
    syncEnabled: fields.syncEnabled.checked,
    minPercentDelta: Number(fields.minPercentDelta.value) || 10,
    autoCreateMedia: fields.autoCreateMedia.checked,
    providers: {
      netflix: fields.providerNetflix.checked,
      primeVideo: fields.providerPrime.checked,
      youtube: fields.providerYoutube.checked,
      genericOtt: fields.providerGeneric.checked
    },
    customDomains
  };

  await chrome.storage.local.set({ [STORAGE_KEY]: settings });
  if (!status.textContent) {
    status.textContent = "Saved.";
  }
  setTimeout(() => {
    status.textContent = "";
  }, 1500);
}

document.getElementById("save").addEventListener("click", () => {
  saveSettings().catch((error) => {
    status.textContent = error instanceof Error ? error.message : "Save failed.";
  });
});

loadSettings().catch((error) => {
  status.textContent = error instanceof Error ? error.message : "Unable to load settings.";
});
