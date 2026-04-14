# Publish to Chrome Web Store

This guide is for publishing `browser-extension/` to the Chrome Web Store.

## 1. Prerequisites

1. Create a Chrome Web Store developer account (one-time registration fee).
2. Decide extension listing details:
   - Name
   - Short and full description
   - Category
   - Support email
3. Host a public Privacy Policy URL.

## 2. Production-Ready Checklist

1. Replace local API URL defaults in extension options with your production backend URL.
2. In backend production env, set:

```env
OAUTH2_ALLOWED_REDIRECT_URI_PATTERNS=https://your-frontend-domain/oauth/callback,chrome-extension://*/callback/index.html,edge-extension://*/callback/index.html
CORS_ALLOWED_ORIGIN_PATTERNS=chrome-extension://*
```

3. Add required icons to manifest (recommended: 16, 48, 128 PNG).
4. Prepare screenshots and promo assets for listing.
5. Verify extension permissions are minimal and justified.

## 3. Package Extension

From `browser-extension/`, create a zip containing manifest at root:

1. Include: `manifest.json`, `src/`, `popup/`, `options/`, `callback/`, icons.
2. Exclude: local notes, temporary files.

## 4. Upload and Configure Listing

1. Go to Chrome Web Store Developer Dashboard.
2. Click New Item.
3. Upload zip.
4. Fill listing metadata.
5. Add privacy policy link and data disclosure details.

## 5. Data Disclosure Guidance

For this extension, disclose that it:

1. Reads page metadata and playback context on supported sites.
2. Sends detected media/progress events to your Shelf backend only after user sign-in.
3. Stores auth token and settings in browser extension storage.

## 6. Final Review Tips

1. Ensure no piracy-specific site logic or claims are present.
2. Confirm OAuth works with production backend and callback.
3. Test on a clean Chrome profile before submission.
4. Validate extension behavior with denied permissions and signed-out state.

## 7. Submit for Review

1. Submit listing.
2. Respond to any policy feedback from reviewer.
3. After approval, publish and monitor install/runtime errors.
