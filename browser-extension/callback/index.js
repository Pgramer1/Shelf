(async () => {
  const status = document.getElementById("status");
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token");
  const username = params.get("username");
  const email = params.get("email");
  const oauthError = params.get("oauth_error");

  if (oauthError) {
    status.textContent = `Sign-in failed: ${oauthError}`;
    return;
  }

  if (!token) {
    status.textContent = "No token found in callback URL.";
    return;
  }

  await chrome.storage.local.set({
    shelf_extension_auth: {
      token,
      username,
      email,
      savedAt: new Date().toISOString()
    }
  });

  status.textContent = "Sign-in complete. You can close this tab.";

  setTimeout(async () => {
    const tab = await chrome.tabs.getCurrent();
    if (tab?.id) {
      chrome.tabs.remove(tab.id);
    }
  }, 900);
})();
