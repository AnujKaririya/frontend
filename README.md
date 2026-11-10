# Vidly – a YouTube-style video platform

A full-stack video sharing app: upload and watch videos, comment, like, subscribe, build playlists and manage your channel from a creator dashboard.

**Live demo:** <https://frontend-7l86.onrender.com>


<!-- Add 2–3 screenshots here, e.g. ![Home](docs/home.png) -->

## Features

- **Authentication:** register with avatar and cover image, log in with username or email, JWT access and refresh tokens, bcrypt-hashed passwords, change password
- **Videos:** upload video and thumbnail (Cloudinary), watch, edit, delete, publish/unpublish, search, sort by latest / popular / oldest
- **Comments:** add, edit, delete, paginated list, like comments
- **Likes:** like videos, comments and community posts, liked-videos page
- **Subscriptions:** subscribe/unsubscribe, subscriber list, subscribed channels feed
- **Playlists:** create, edit, delete, add and remove videos
- **Community posts:** create, edit, delete and like posts on a channel
- **Channel pages:** profile with avatar, cover image and subscriber count
- **Creator dashboard:** total views, subscribers, videos and likes, and a table of your videos
- **Watch history:** view and clear
- **Account settings:** update name, email, avatar and cover image

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | JavaScript (ES modules), HTML, CSS, no framework |
| Backend | Node.js, Express 5 |
| Database | MongoDB with Mongoose (aggregation pipelines) |
| Auth | JSON Web Tokens, bcrypt, cookie-parser |
| Media | Multer (uploads), Cloudinary (storage) |
| Hosting | Render (backend), MongoDB Atlas (database), Vercel / Render Static (frontend) |

## Project structure

```
backend/
  src/
    controllers/   request handlers
    models/        Mongoose schemas (User, Video, Comment, Like, Playlist, Subscription, Tweet)
    routes/        Express routers
    middlewares/   auth (JWT) and multer
    utils/         ApiError, ApiResponse, asyncHandler, Cloudinary helper
    app.js, index.js
frontend/
  index.html, config.js, server.js
  css/, js/        pages and components
```

## Getting started

**Prerequisites:** Node.js 18+, a MongoDB database (local or Atlas), a Cloudinary account.

### 1. Backend

```bash
cd backend
npm install
mkdir -p public/temp
```

Create a `.env` file:

```env
PORT=3000
MONGODB_URI=<your mongodb connection string>
CORS_ORIGIN=http://localhost:5173
ACCESS_TOKEN_SECRET=<long random string>
ACCESS_TOKEN_EXPIRY=1d
REFRESH_TOKEN_SECRET=<another long random string>
REFRESH_TOKEN_EXPIRY=10d
CLOUDINARY_CLOUD_NAME=<name>
CLOUDINARY_API_KEY=<key>
CLOUDINARY_API_SECRET=<secret>
```

```bash
npm run dev
```

### 2. Frontend

```bash
cd frontend
node server.js
```

Open http://localhost:5173. The dev server serves the app and proxies `/api` to `http://localhost:3000`.
Use `BACKEND_URL=http://localhost:8000 node server.js` if your backend runs elsewhere.

## Deployment

1. Create a free cluster on **MongoDB Atlas** and copy the connection string.
2. Deploy the backend to **Render** as a Web Service (`npm install` / `npm start`) and add the environment variables above. Don't set `PORT`, as Render provides it.
3. Set `window.VIDLY_API = "https://<your-backend>.onrender.com"` in `frontend/config.js`, then deploy the frontend to **Vercel** or a **Render Static Site** (no build command).
4. Set `CORS_ORIGIN` on the backend to your frontend URL (no trailing slash) and redeploy.

## API overview

Base path: `/api/v1`. All routes except register, login and healthcheck require a JWT (`Authorization: Bearer <token>` or the `accessToken` cookie).

| Resource | Endpoints |
|---|---|
| Users | `POST /users/register`, `POST /users/loginUser`, `POST /users/logoutUser`, `POST /users/changeCurrentPassword`, `PATCH /users/update-account`, `PATCH /users/avatar`, `PATCH /users/coverImage`, `POST /users/getUserChannelProfile` |
| Videos | `GET /videos`, `POST /videos`, `GET/PATCH/DELETE /videos/:videoId`, `PATCH /videos/toggle/publish/:videoId` |
| Comments | `GET/POST /comments/:videoId`, `PATCH/DELETE /comments/c/:commentId` |
| Likes | `POST /likes/toggle/v/:videoId`, `/toggle/c/:commentId`, `/toggle/t/:tweetId`, `GET /likes/videos` |
| Playlists | `POST /playlists`, `GET/PATCH/DELETE /playlists/:playlistId`, `GET /playlists/user/:userId`, `PATCH /playlists/add/:videoId/:playlistId`, `PATCH /playlists/remove/:videoId/:playlistId` |
| Subscriptions | `POST /subscriptions/c/:channelId`, `GET /subscriptions/c/:subscriberId`, `GET /subscriptions/u/:channelId` |
| Tweets | `POST /tweets`, `GET /tweets/user/:userId`, `PATCH/DELETE /tweets/:tweetId` |
| Dashboard | `GET /dashboards/stats`, `/dashboards/videos`, `/dashboards/watchHistory`, `/dashboards/clearWatchHistory` |
| Health | `GET /healthchecks` |

## What I learned

- Designing a REST API with several related resources
- JWT authentication and protected routes
- File uploads with Multer and cloud storage with Cloudinary
- MongoDB aggregation pipelines
- Deploying a separately hosted frontend and backend, including CORS and environment configuration

## Roadmap

- Populate video owners so channel names appear in the feed
- Refresh-token endpoint and global error-handling middleware
- Input validation, rate limiting and automated tests
- React frontend

## Acknowledgements

The backend structure is based on the Chai aur Code backend series. The frontend, deployment and later changes are my own work.

## License

ISC
