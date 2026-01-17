# healthQue Backend

Minimal Node/Express backend for development.

Start server:

```powershell
cd "D:\My Projects\healthQue\healthQue-backend"
npm install
npm start
```

Endpoints
- `POST /login` { email, password } -> { token, user }
- `GET /profile` (requires `Authorization: Bearer <token>`) -> profile JSON
- `POST /logout` (optional) invalidates token

API base path

All endpoints are mounted under `/api/v1` by default. Set `API_BASE` environment variable to change it.

New endpoints
- `GET /api/v1/doctors` — query params: `filter`, `sortBy` (id|name|specialty|location|email), `sortDir` (asc|desc), `page`, `limit`


This is a demo in-memory auth server. Replace with a real DB and secure token handling for production.

Project structure (MVC)

- `models/` — data access and in-memory store (`userModel.js`)
- `controllers/` — request handlers (`authController.js`, `profileController.js`)
- `routes/` — express routers mapping endpoints to controllers
- `index.js` — server bootstrap that mounts routers

Current endpoints (same as before):
- `POST /login` { email, password } -> { token, user }
- `GET /profile` (requires `Authorization: Bearer <token>`) -> profile JSON
- `POST /logout` (optional) invalidates token

This structure makes it easier to plug a database later: replace the logic inside `models/userModel.js` with DB queries.
