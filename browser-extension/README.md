# Shelf Browser Extension (Auto Sync)

This extension captures playback activity on supported OTT sites and syncs progress to Shelf.

## Current Scope (v1)

- Supported providers: Netflix, Amazon Prime Video, YouTube
- Generic OTT support via custom domains in extension options
- Sign-in: Google OAuth via backend
- Sync behavior: hybrid
  - First-time title detection requires confirmation in popup (Add to Shelf)
  - Existing shelf entries are updated automatically
- Not supported: piracy-site integrations
- Permission model:
  - Built-in providers use fixed host permissions
  - Custom domains use optional host permissions requested on save
  - Custom domain format: enter hostnames like `example-ott.com` (URLs are normalized automatically)

## Local Setup

1. Configure backend env in `backend/.env.local`:

```
OAUTH2_REDIRECT_URI=http://localhost:3000/oauth/callback
OAUTH2_ALLOWED_REDIRECT_URI_PATTERNS=http://localhost:3000/oauth/callback,chrome-extension://*/callback/index.html,edge-extension://*/callback/index.html
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
CORS_ALLOWED_ORIGIN_PATTERNS=chrome-extension://*,edge-extension://*
```

2. Start backend (`backend/run.cmd`) and frontend (`frontend/npm run dev`) as usual.

3. Load extension in Chrome:

- Open `chrome://extensions`
- Enable Developer mode
- Click Load unpacked
- Select `browser-extension`

4. Open extension popup and click Sign in with Google.

## Notes

- Extension callback URL is `chrome-extension://<extension-id>/callback/index.html`
- If OAuth fails with `Invalid redirect_uri`, ensure pattern is present in `OAUTH2_ALLOWED_REDIRECT_URI_PATTERNS`.
- If API calls fail with CORS errors, include extension origin patterns in `CORS_ALLOWED_ORIGIN_PATTERNS`.

## Validation and Publishing

- Run the checklist in `SMOKE_TEST.md` to validate local behavior.
- Use `PUBLISH_CHROME_WEB_STORE.md` for store packaging and submission steps.
