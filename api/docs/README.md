# Crossbill API — Docs & Postman

This folder holds the generated API contract. Regenerate any time with:

```bash
npm run export:openapi
```

It boots the app in **preview mode** (no DB/Redis needed) and writes:

| File | What it is |
| --- | --- |
| `openapi.json` | OpenAPI 3 spec (source of truth) |
| `crossbill.postman_collection.json` | Ready-to-import Postman collection (v2.1), grouped by tag |
| `crossbill.postman_environment.json` | Postman environment with `baseUrl` + `accessToken` |

## Swagger UI (interactive docs)

Start the API (`npm run start:dev`) and open:

- **UI:** http://localhost:4000/api/v1/docs
- **Raw spec:** http://localhost:4000/api/v1/docs-json

Click **Authorize**, paste the `accessToken` from `/auth/login`, and every protected
endpoint will send `Authorization: Bearer <token>` automatically.

The orange **⭢ Open in Postman** button in the top bar downloads the live Postman
collection (`/api/v1/docs-postman.json`) — drag the downloaded file into Postman to import everything.

## Open the whole collection in Postman

Pick whichever is easiest — both import the entire collection with nothing missing:

**Option A — Import the file (works offline, never breaks)**
1. Postman → **Import** → drag in `crossbill.postman_collection.json`
   (and `crossbill.postman_environment.json`).
2. Select the **Crossbill — Local** environment (top-right).
3. Call **Auth → Log in**, copy the returned `accessToken` into the environment's
   `accessToken` variable. Collection-level Bearer auth applies it everywhere.

**Option B — Import straight from the running server (always current)**
1. Start the API.
2. Postman → **Import** → **Link** → `http://localhost:4000/api/v1/docs-json` → **Continue**.
3. Postman builds the same collection from the live spec.

### Variables

| Variable | Default | Use |
| --- | --- | --- |
| `baseUrl` | `http://localhost:4000/api/v1` | Base URL for every request |
| `accessToken` | _(empty)_ | Bearer token from `/auth/login` |

Change `baseUrl` to point the collection at staging/production — no request edits needed.
