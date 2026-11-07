// Where the backend lives.
//  - ""  (default): same origin. Works locally with `node server.js`, which proxies /api to your backend.
//  - "https://your-backend.onrender.com": use this when the frontend is hosted separately (Netlify, Vercel, ...).
//    Your backend's CORS_ORIGIN env var must then be set to the frontend's URL (no trailing slash).
window.VIDLY_API ="https://backend-76hf.onrender.com";
