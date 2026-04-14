# Browser Extension Smoke Test

Use this checklist to validate OAuth, detection, pending confirmation, and auto-sync.

## Preconditions

1. Backend is running on `http://localhost:8080`.
2. Backend env includes:

```env
OAUTH2_ALLOWED_REDIRECT_URI_PATTERNS=http://localhost:3000/oauth/callback,chrome-extension://*/callback/index.html,edge-extension://*/callback/index.html
CORS_ALLOWED_ORIGIN_PATTERNS=chrome-extension://*,edge-extension://*
```

3. Extension loaded from `browser-extension/` via `chrome://extensions`.
4. You are logged into a Google account with OAuth consent available.

## Test 1: OAuth Sign-In

1. Open extension popup.
2. Click Sign in with Google.
3. Complete OAuth.
4. Reopen popup and verify account state shows signed in.

Expected:
- Callback tab closes automatically.
- Popup shows signed-in user.

## Test 2: Known Provider Detection (YouTube)

1. Open a YouTube video and play for at least 30 seconds.
2. Open extension popup.

Expected:
- Latest Detection shows video title and progress percent.
- If title is not already in shelf, a pending item appears under Pending Confirmations.

## Test 3: First Add Confirmation

1. In popup, click Add to Shelf for a pending title.
2. Open your Shelf web app and check the item is present.

Expected:
- Item appears in your shelf.
- Pending entry disappears from popup.

## Test 4: Auto Progress Update

1. Keep playing the same title and cross your configured minimum delta.
2. Refresh shelf item details in web app.

Expected:
- Progress increases automatically.
- Status changes to COMPLETED when progress reaches total units.

## Test 5: Custom Domain Permission Flow

1. Open extension Options.
2. Enable Generic OTT.
3. Add a custom domain such as `example-ott.com` and save.
4. Accept host permission prompt.

Expected:
- Permission prompt appears.
- After grant, detection starts on that domain when a video is present.

## Test 6: Permission Denial Handling

1. Add another custom domain.
2. Deny permission prompt.

Expected:
- Save still succeeds.
- Options status shows permission-denied warning.
- No detection or sync on denied domain.

## Test 7: Sign-Out Safety

1. Click Sign out in popup.
2. Play content again on a supported site.

Expected:
- Detection can still appear as latest activity.
- No shelf write occurs until sign-in is restored.

## Quick API Verification (Optional)

After a sync action, verify backend rows changed:
- `GET /api/shelf` includes updated progress.
- `GET /api/shelf/activity/heatmap` reflects activity increments.
