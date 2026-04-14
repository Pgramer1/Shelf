const authStatus = document.getElementById("auth-status");
const signInButton = document.getElementById("sign-in");
const signOutButton = document.getElementById("sign-out");
const pendingList = document.getElementById("pending-list");
const pendingEmpty = document.getElementById("pending-empty");
const lastDetection = document.getElementById("last-detection");
const addLatestButton = document.getElementById("add-latest");
const flash = document.getElementById("flash");
const syncError = document.getElementById("sync-error");
const openOptions = document.getElementById("open-options");
const MEDIA_TYPE_OPTIONS = ["MOVIE", "TV_SERIES", "ANIME", "GAME", "BOOK"];

function mediaTypeLabel(value) {
  if (value === "TV_SERIES") return "TV Series";
  return (value || "").replace(/_/g, " ");
}

function sendMessage(message) {
  return chrome.runtime.sendMessage(message);
}

async function safeSendMessage(message) {
  try {
    return await sendMessage(message);
  } catch {
    return { ok: false, message: "Extension was reloaded. Reopen popup after refreshing the page." };
  }
}

function setFlash(text) {
  flash.textContent = text || "";
}

function renderPending(items) {
  pendingList.innerHTML = "";
  if (!items.length) {
    pendingEmpty.style.display = "block";
    return;
  }

  pendingEmpty.style.display = "none";

  for (const item of items) {
    const options = MEDIA_TYPE_OPTIONS
      .map((type) => `<option value="${type}" ${type === item.mediaType ? "selected" : ""}>${mediaTypeLabel(type)}</option>`)
      .join("");

    const li = document.createElement("li");
    li.innerHTML = `
      <div class="title">${item.title}</div>
      <div class="muted">${item.hostname}</div>
      <div class="row" style="margin-top:8px;">
        <label class="muted" for="type-${item.key}">Type</label>
        <select id="type-${item.key}" data-action="set-type" data-key="${item.key}">
          ${options}
        </select>
      </div>
      <div class="row" style="margin-top:8px;">
        <button class="small primary" data-action="confirm" data-key="${item.key}">Add to Shelf</button>
        <button class="small ghost" data-action="dismiss" data-key="${item.key}">Dismiss</button>
      </div>
    `;
    pendingList.appendChild(li);
  }
}

function renderLastDetection(value) {
  if (!value) {
    lastDetection.textContent = "No activity detected yet.";
    addLatestButton.disabled = true;
    return;
  }

  addLatestButton.disabled = false;

  const progress = Math.floor(value.progressPercent || 0);
  const mediaType = mediaTypeLabel(value.detectedMediaType || value.mediaType || value.typeHint || "unknown");
  const source = value.mediaTypeSource ? ` (${value.mediaTypeSource})` : "";
  lastDetection.innerHTML = `
    <div class="title">${value.title}</div>
    <div class="muted">${value.hostname}</div>
    <div class="muted">${mediaType}${source}</div>
    <div class="muted">${progress}% watched</div>
  `;
}

function renderSyncError(errorText) {
  if (!errorText) {
    syncError.textContent = "No sync errors.";
    return;
  }

  syncError.textContent = errorText;
}

async function refresh() {
  const response = await safeSendMessage({ type: "GET_POPUP_STATE" });
  if (!response?.ok) {
    const fallback = await chrome.storage.local.get([
      "shelf_extension_auth",
      "shelf_extension_last_detection",
      "shelf_extension_pending_additions"
    ]);

    const auth = fallback.shelf_extension_auth || null;
    const pending = Object.values(fallback.shelf_extension_pending_additions || {});
    const latest = fallback.shelf_extension_last_detection || null;
    const latestSyncError = fallback.shelf_extension_last_sync_error || null;

    if (auth?.token) {
      authStatus.textContent = `Signed in as ${auth.username || auth.email || "user"}`;
      signInButton.style.display = "none";
      signOutButton.style.display = "inline-block";
    } else {
      authStatus.textContent = "Not signed in.";
      signInButton.style.display = "inline-block";
      signOutButton.style.display = "none";
    }

    renderPending(pending);
    renderLastDetection(latest);
    renderSyncError(latestSyncError);
    setFlash(response?.message || "Unable to fetch live state.");
    return;
  }

  const {
    auth,
    pending,
    lastDetection: latest,
    lastSyncError
  } = response.payload;
  if (auth?.token) {
    authStatus.textContent = `Signed in as ${auth.username || auth.email || "user"}`;
    signInButton.style.display = "none";
    signOutButton.style.display = "inline-block";
  } else {
    authStatus.textContent = "Not signed in.";
    signInButton.style.display = "inline-block";
    signOutButton.style.display = "none";
  }

  renderPending(pending || []);
  renderLastDetection(latest);
  renderSyncError(lastSyncError);
}

pendingList.addEventListener("click", async (event) => {
  const target = event.target;
  if (!(target instanceof HTMLButtonElement)) {
    return;
  }

  const key = target.dataset.key;
  const action = target.dataset.action;
  if (!key || !action) {
    return;
  }

  if (action === "confirm") {
    const response = await safeSendMessage({ type: "CONFIRM_ADD_PENDING", key });
    if (!response?.ok) {
      setFlash(response?.message || "Unable to add this title.");
    } else if (response?.message) {
      setFlash(response.message);
    }
    await refresh();
    return;
  }

  if (action === "dismiss") {
    await safeSendMessage({ type: "DISMISS_PENDING", key });
    await refresh();
  }
});

pendingList.addEventListener("change", async (event) => {
  const target = event.target;
  if (!(target instanceof HTMLSelectElement)) {
    return;
  }

  if (target.dataset.action !== "set-type") {
    return;
  }

  const key = target.dataset.key;
  const mediaType = target.value;
  if (!key || !mediaType) {
    return;
  }

  const response = await safeSendMessage({ type: "UPDATE_PENDING_MEDIA_TYPE", key, mediaType });
  if (!response?.ok) {
    setFlash(response?.message || "Could not update media type.");
    return;
  }

  await refresh();
});

signInButton.addEventListener("click", async () => {
  const response = await safeSendMessage({ type: "START_OAUTH" });
  if (!response?.ok) {
    setFlash(response?.message || "Unable to start OAuth flow.");
    return;
  }

  setFlash("OAuth tab opened. Complete sign-in and reopen this popup.");
});

signOutButton.addEventListener("click", async () => {
  await safeSendMessage({ type: "SIGN_OUT" });
  await refresh();
});

addLatestButton.addEventListener("click", async () => {
  const response = await safeSendMessage({ type: "ADD_LATEST_TO_PENDING" });
  if (!response?.ok) {
    setFlash(response?.message || "Could not add latest detection to pending.");
    return;
  }

  if (response?.message) {
    setFlash(response.message);
  }
  await refresh();
});

openOptions.addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});

refresh().catch((error) => {
  setFlash(error instanceof Error ? error.message : "Unknown popup error.");
});
