# TrustShield AI

Stay One Step Ahead of Scams.

TrustShield AI reviews suspicious messages, links, recruitment offers, and PDF or image submissions. The authenticated workspace includes private reports, scan history, and profile management.

## Quick setup

1. Install the project dependencies with `npm.cmd ci`.
2. Copy `server/.env.example` to `server/.env` if it does not already exist. Set the Atlas `MONGODB_URI` and `SESSION_SECRET` using the instructions below. Sign-up creates user records, and the server initializes the required indexes. You do not need to seed MongoDB.
3. For live AI and document scans, set `OPENAI_API_KEY` in `server/.env`. The default model is `gpt-4.1-mini`; set `OPENAI_MODEL` only to use a different model from your API project that supports Responses, structured output, and vision. Configure API billing or available credits in that project. [OpenAI API keys](https://platform.openai.com/api-keys) · [OpenAI model documentation](https://developers.openai.com/api/docs/models/gpt-4.1-mini)
4. For optional malware URL reputation, create a URLhaus Auth-Key and set `URLHAUS_AUTH_KEY` in `server/.env`. [URLhaus lookup API](https://urlhaus-api.abuse.ch/#url)
5. Run `npm.cmd run dev` and open `http://localhost:5173`.

Keep provider keys server-side. With no provider keys configured, the message, link, and job scanners still produce rule-based reports. Each scanner shows which providers are available, and users opt in per submission. Screenshots and PDFs require AI and are limited to 5 MB. English, Bengali, and Hindi submissions can be analyzed by the AI; the workspace and rule-based reports use English.

For GitHub, Render, a custom domain, search metadata and AdSense setup, see [Deployment](DEPLOYMENT.md).

## Scanner behavior

- The URL scanner inspects the URL structure and can look up the submitted address with URLhaus after removing URL credentials, the query string, and the fragment. It never visits the submitted site or follows its redirects. It does not evaluate domain age or verify site ownership.
- The screenshot and photo scanner analyzes PNG and JPEG images up to 5 MB with OpenAI Vision. A report highlights visible link, impersonation, payment, credential or possible-edit indicators in red. A visual assessment cannot establish image authenticity. The scanner does not open visible URLs or decode QR codes.
- The document scanner checks the file signature and sends the file in the analysis request when the user opts in. Vision processes PNG and JPEG. The OpenAI file input handles PDF text and page images. The app serves no uploaded files.
- MongoDB stores the report category, time, warning signs, recommendations, risk rating, limits, and owner ID. The original submission and uploaded file are not saved by the application. AI-generated report text can reflect submission details, so redact sensitive information first. The provider request sets `store: false`; provider-side processing follows the provider's data policies.
- The backend returns the result synchronously. Provider calls and concurrent scans are bounded. If OpenAI fails, text, URL, and job scans return a labeled rule-based report. Document failures are shown as retryable errors. A reputation match reflects the scan time.
- History is paginated and supports deleting saved reports. All report operations are scoped to the signed-in owner. The app does not log submission bodies or provider errors containing request data.

## Scanner API

| Method and path                     | Behavior                                                                                                                            |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/scans/capabilities`       | Reports which optional analysis providers are configured                                                                            |
| `POST /api/scans`                   | Creates an assessment from `{ input, allowAI, allowReputation }`. Input kinds are `message`, `url`, `job`, `document`, and `image`. |
| `GET /api/scans?before=<report-id>` | Lists up to 20 reports for the signed-in owner. Omit the cursor for the first page.                                                 |
| `GET /api/scans/:id`                | Returns one report owned by the current user                                                                                        |
| `DELETE /api/scans/:id`             | Removes a report owned by the current user                                                                                          |

Scan requests reuse the account API's session, origin check, and CSRF protection. The scanner also limits analysis attempts per signed-in account.

## Configure MongoDB

### MongoDB Atlas

1. Create a cluster. In **Database & Network Access**, create a dedicated password-authenticated database user. Grant it `readWrite` on the `trustshield_ai` database only and restrict it to the intended cluster where available. [MongoDB Atlas database users](https://www.mongodb.com/docs/atlas/security-add-mongodb-users/)
2. Add your backend's outbound IP or narrow CIDR to the Atlas project IP access list. For local development, add your public IP. For a Render deployment, use the service's published outbound ranges or dedicated egress. [Atlas IP access list](https://www.mongodb.com/docs/atlas/security/ip-access-list/) · [Render outbound IPs](https://render.com/docs/outbound-ip-addresses)
3. From the cluster's **Connect** dialog, select **Drivers** and copy the `mongodb+srv://` connection string. Substitute the database user and password, percent-encode special characters in the credentials, and set the database path to `/trustshield_ai` before the query string. Store the result only in `server/.env` or the backend host's secret configuration.

The API initializes the Atlas collections and indexes for `users`, `sessions`, and `scans`. To verify an account in Atlas, open **Data Explorer → trustshield_ai → users → Documents** after sign-up. The email is in `users.email`. The `sessions` collection references accounts by ID, and `scans` stores reports by owner ID. Restart the backend after changing the URI or rotating the database password.

### Optional local-only development

1. Use your existing MongoDB service if it already has app data. For a separate local instance, run `npm.cmd run mongo:local` from the project root in a dedicated PowerShell window. It binds to `127.0.0.1:27017` and keeps data in the ignored `.mongo-data` directory. It uses an installed `mongod.exe` or an existing test binary. If neither is available, install MongoDB Community Server or set `MONGODB_BINARY` to the already-installed executable.
2. Set `MONGODB_URI=mongodb://127.0.0.1:27017/trustshield_ai_dev` in `server/.env`. Add credentials to the URI if the local server requires authentication.
3. The API initializes the user, session, and scan indexes before accepting account or scan requests.

For MongoDB Compass, connect to `mongodb://127.0.0.1:27017`, open the database named in `MONGODB_URI`, then open **users → Documents** and refresh after sign-up. The local development database is `trustshield_ai_dev`. Email is stored as `users.email`; the `sessions` collection references the account by user ID. Signing in reuses the existing account document.

## Environment and startup

Use Node.js 22.23+, 24.x, or 26.x with npm 10+. Run these commands from the project root in PowerShell.

```powershell
npm.cmd ci
if (!(Test-Path server/.env)) { Copy-Item server/.env.example server/.env }
node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"
```

Set the generated value as `SESSION_SECRET` and set `MONGODB_URI` in `server/.env`. Copy `client/.env.example` to `client/.env` if you need a frontend override.

| Workspace | Variable           | Value                                                                                                                                                            |
| --------- | ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Server    | `MONGODB_URI`      | Required. Local or Atlas connection URI with the database name.                                                                                                  |
| Server    | `SESSION_SECRET`   | Required. Use the generated random secret. The API requires at least 32 characters.                                                                              |
| Server    | `CLIENT_URL`       | Exact browser origin. Defaults to `http://localhost:5173`. In production use HTTPS.                                                                              |
| Server    | `NODE_ENV`         | Defaults to `development`. Set `production` when deployed.                                                                                                       |
| Server    | `PORT`             | Defaults to `3001`. A hosting provider may supply the port.                                                                                                      |
| Server    | `TRUST_PROXY`      | Optional comma-separated trusted proxy IPs or CIDRs. Unset for normal local development.                                                                         |
| Client    | `API_PROXY_TARGET` | Optional Vite development proxy override. By default Vite uses `127.0.0.1` and the backend `PORT` from the environment or `server/.env`, falling back to `3001`. |
| Client    | `VITE_API_ORIGIN`  | Optional public API origin for direct cross-origin requests. Leave unset to use relative `/api` URLs.                                                            |

```powershell
npm.cmd run dev
```

Open `http://localhost:5173`. Check the API at `http://127.0.0.1:3001/api/health` or through the Vite proxy at `http://localhost:5173/api/health`. Use the same hostname as `CLIENT_URL`. The API keeps its health endpoint available during a database outage and returns HTTP 503 on account routes. Watch for `account.database_ready` before trying account actions. Restart the development processes after changing either environment file.

To start the workspaces separately, run `npm.cmd run dev -w server` and `npm.cmd run dev -w client` in separate terminals. On macOS and Linux, replace `npm.cmd` with `npm`.

### If Vite reports ECONNREFUSED

Run `npm.cmd run dev -w server` separately and read the first startup message. A missing or invalid `SESSION_SECRET` prevents the server from binding. Generate the random secret using the command above, then restart the server. If the listener starts but authentication returns HTTP 503, check the database initialization message. It identifies whether the failure occurred during MongoDB connection, user index creation, or session-store initialization.

## Account API

| Method and path           | Behavior                                                                                            |
| ------------------------- | --------------------------------------------------------------------------------------------------- |
| `GET /api/health`         | Existing process health response                                                                    |
| `GET /api/auth/csrf`      | Obtains a CSRF token bound to the current session and creates an anonymous session if needed        |
| `POST /api/auth/register` | Creates a user from `fullName`, `email`, and `password`, issues a new session, and returns HTTP 201 |
| `POST /api/auth/login`    | Signs in using `email` and `password`, issues a new session, and returns HTTP 200                   |
| `GET /api/auth/me`        | Returns the authenticated user or HTTP 401                                                          |
| `PATCH /api/users/me`     | Accepts only `fullName` and returns the updated user                                                |
| `POST /api/auth/logout`   | Deletes the current session and expires its cookie                                                  |

Use JSON bodies and include the configured `Origin`, the session cookie, and the `X-CSRF-Token` header for mutations. Browser clients use `credentials: "include"`. Fetch a new token after sign-in or registration because those actions change the session ID and CSRF token. Account responses use `{ success, data }` or `{ success, error: { code, message } }`. Public user responses include ID, full name, email, role, and creation date.

## Session and request security

- A signed, opaque cookie identifies the session. MongoDB stores the user ID, expiration and CSRF state. The cookie is HttpOnly and SameSite=Lax. HTTPS production adds Secure and uses a host-only `__Host-trustshield.sid` cookie. Authenticated sessions expire seven days after sign-in or sign-up. Anonymous CSRF sessions expire after one day. Activity does not restart the authentication lifetime. A MongoDB TTL index removes expired records. Logout deletes the session before confirming success. [Express session middleware](https://expressjs.com/en/resources/middleware/session/) · [connect-mongo](https://github.com/jdesboeufs/connect-mongo)
- The API compares a random session-bound token in `X-CSRF-Token` and requires the configured origin for every mutation, including public sign-in and registration. CORS grants credentialed access only to that origin. [OWASP CSRF guidance](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- Argon2id uses 19 MiB of memory, two passes, and one lane. Registration accepts 12 to 128 Unicode characters, including spaces, and preserves the password exactly. MongoDB enforces normalized email uniqueness. Login returns the same error for an unknown email and an incorrect password. The required duplicate-registration HTTP 409 is distinguishable from successful signup. [OWASP password storage guidance](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
- Per 15-minute window there are 120 account requests per IP, 15 login attempts per IP, eight registration attempts per IP, and a separate 30-attempt limit per normalized email for unsuccessful logins. These counters are per process and reset on restart. Before scaling horizontally, use an express-rate-limit-compatible shared store such as Redis with separate keys for each policy. Sessions already persist in MongoDB. [express-rate-limit stores](https://express-rate-limit.mintlify.app/reference/stores)
- Only the opt-in **Remember my email on this device** preference writes to browser storage. The email is removed when the checkbox is cleared. Account requests and security event logs contain no request bodies, email addresses, passwords, hashes, tokens or session identifiers.

## Vercel and Render deployment

Serve `client/dist` with a fallback to `index.html` for React routes. Route `/api/*` to the backend ahead of that fallback if using a same-origin reverse proxy. Keep API responses uncached and forward the browser origin and cookies through the proxy. Alternatively use same-site HTTPS custom domains such as `app.example.com` and `api.example.com`, set `CLIENT_URL` to the frontend origin, and set `VITE_API_ORIGIN` to the API origin at build time. The default Vercel and Render hostnames are on different sites, so cookies on direct requests between them may be blocked. [Vercel rewrites](https://vercel.com/docs/rewrites)

For the backend use `npm.cmd run build -w server` and `npm.cmd start -w server`, or their `npm` equivalents on Render. The service binds to `0.0.0.0` in production. Set `TRUST_PROXY` only after confirming the ingress proxy IP or CIDR and that the trusted edge correctly sets or sanitizes `X-Forwarded-For`, `X-Forwarded-Host`, and `X-Forwarded-Proto`. The proxy's ingress addresses and the backend's outbound addresses used for Atlas are separate settings. Verify HTTPS cookie behavior and client IP handling on the deployed stack. [Render web services](https://render.com/docs/web-services) · [Express proxy trust](https://expressjs.com/en/guide/behind-proxies/)

## Automated checks

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run build
npm.cmd test
```

The frontend tests isolate React behavior from the network. The backend tests spawn a disposable MongoDB process on loopback, independent of the application's `MONGODB_URI`. If binary downloads are blocked, point `MONGOMS_SYSTEM_BINARY` to an installed `mongod` executable before running the tests.

```powershell
$env:MONGOMS_SYSTEM_BINARY = 'C:/Program Files/MongoDB/Server/9.0/bin/mongod.exe'
$env:MONGOMS_VERSION = '9.0.4'
npm.cmd test
```

## Manual smoke test

1. Open the landing page and choose **Get Started**. Register with a disposable email address and a password of at least 12 characters. Confirm that **My Workspace** greets you by first name.
2. In a local or dedicated test database, inspect the user document in MongoDB Compass or Atlas Data Explorer. Confirm the normalized email and that the credential field contains an Argon2id hash. Reload the workspace to verify session restoration.
3. Open **Profile**, change your full name, save, and reload. Confirm the saved name in both the profile and MongoDB.
4. While signed in, open your browser's developer console on the application origin. Run the following mutation without a CSRF header. Expect HTTP 403 and an unchanged profile.

   ```js
   await fetch('/api/users/me', {
     method: 'PATCH',
     credentials: 'include',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ fullName: 'CSRF check' }),
   }).then((response) => response.status);
   ```

5. Log out and open `/app` again. Confirm the sign-in redirect. Try an incorrect password and confirm the generic error, then sign back in with the correct password.
6. Repeat on a narrow viewport. Open the mobile menu, verify the landing anchors and account links, and check that forms fit and can be used with the keyboard.
