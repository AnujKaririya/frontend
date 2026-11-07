# Vidly – frontend for your backend

Plain HTML/CSS/JS (ES modules). **No install, no build, no dependencies.**

## Run

1. Start your backend (the Postman collection uses port 3000).
2. In this folder:
   ```
   node server.js
   ```
   Open http://localhost:5173

`server.js` serves the app and proxies `/api/*` to the backend, so there are no CORS/cookie problems.
Different backend port/host: `BACKEND_URL=http://localhost:8000 node server.js` (change the port with `PORT=...`).

## What's covered (every route in your backend)

| Area | Screens |
|---|---|
| Users | Sign in / register (avatar + cover), channel page, account settings (name, email, avatar, cover, password), sign out |
| Videos | Home feed (latest / popular / oldest, infinite scroll), search, watch page, upload (with progress), edit, delete, publish toggle |
| Comments | List (paged), add, edit, delete, like |
| Likes | Like video, liked-videos page, like comments and posts |
| Subscriptions | Subscribe/unsubscribe, subscriber count, Subscriptions page, sidebar list |
| Playlists | Create, edit, delete, add/remove videos ("Save" on the watch page), playlist page |
| Tweets | Channel "Community" tab: post, edit, delete, like |
| Dashboard | Studio: stats + your videos; watch history + clear |
| Healthcheck | Banner if the backend is unreachable |

## Backend notes

**One fix is required for subscribing to work:** in `routes/subscription.routes.js`, `router.use(verifyJWT)` is commented out, so `toggleSubscription` crashes on `req.user._id`. Uncomment it.

The UI works around these API gaps, but they limit what can be shown. Each is a one-line backend fix if you want them:
- If videos return `owner` as a bare id, channel names show as "Channel" unless you subscribe to that channel. The app also accepts a populated owner: add `.populate("owner", "username fullName avatar")` in the video controller (and for playlist videos and liked videos) and names/avatars appear everywhere.
- Comments and posts are returned with `.select("content")` only (no author, no date), so Edit/Delete appear only on comments this browser posted.
- No like counts or "am I subscribed / did I like this" endpoints. Subscribed state is derived from the subscriber list; comment/post like state is remembered per browser.
- `GET /dashboards/videos` selects a non-existent `video` field, so it returns only ids; `GET /dashboards/watchHistory` also returns ids. The UI resolves them through the video list; unpublished videos not seen by this browser show as "details unavailable".
- Errors are sent as Express's HTML error page (no JSON error middleware). The UI extracts the message, which works in development but not with `NODE_ENV=production`.
- `getAllVideos` crashes if `query` is missing, so the UI always sends it.

## Making it public

1. Put MongoDB on MongoDB Atlas (free tier) and deploy the backend (Render, Railway, ...). Set its env vars (`MONGODB_URI`, `ACCESS_TOKEN_SECRET`, `CLOUDINARY_*`, etc.) and `CORS_ORIGIN=https://your-frontend-url`.
2. Deploy this folder as a static site (Netlify, Vercel, Cloudflare Pages, GitHub Pages; no build command, publish directory is the folder itself).
3. Edit `config.js`: `window.VIDLY_API = "https://your-backend-url";`
