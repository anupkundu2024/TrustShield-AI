# Publish TrustShield AI

## GitHub

Create a repository and push the project source. Keep `server/.env`, any MongoDB URI containing credentials, provider keys, and local MongoDB data out of Git. The repository ignores environment files and `.mongo-data`. Check your staged files with `git diff --cached --name-only` before the first push. Rotate any credentials that have been shared publicly or committed.

## Render preview

1. In Render, create a Blueprint from the GitHub repository. It starts with Render's free preview plan, which can sleep between visits. The included `render.yaml` builds both workspaces and starts Express. The same HTTPS site serves the frontend and `/api`, so secure account cookies work on the same origin.
2. Set `MONGODB_URI` to the Atlas connection string with the `/trustshield_ai` database path, or use a separate Atlas database such as `trustshield_ai_preview` for staging. Add the Render service outbound addresses to the Atlas IP access list. The Blueprint generates `SESSION_SECRET`. [Render Blueprints](https://render.com/docs/blueprint-spec) · [Render outbound IPs](https://render.com/docs/outbound-ip-addresses) · [Atlas IP access list](https://www.mongodb.com/docs/atlas/security/ip-access-list/)
3. Set `OPENAI_API_KEY` to enable photo and document scans. Set `URLHAUS_AUTH_KEY` for optional URL reputation lookups. These belong in Render's server-side environment. Use a vision-capable Responses API model with structured output if overriding `OPENAI_MODEL`.
4. Render supplies the initial HTTPS origin through `RENDER_EXTERNAL_URL`. Leave `PUBLIC_SITE_URL` unset on the preview. Public HTML then sends `noindex`. The Blueprint trusts Render's single front proxy for forwarded HTTPS. For another host, configure the specific trusted proxy IPs/CIDRs in `TRUST_PROXY` or use `TRUST_PROXY_HOPS=1` only when the app is reachable through one trusted ingress and that ingress overwrites incoming forwarded headers. [Render environment variables](https://render.com/docs/environment-variables) · [Express proxy configuration](https://expressjs.com/en/guide/behind-proxies.html)
5. Open the preview and test sign-up, login, an image scan, and a saved report. Confirm a production session cookie uses `Secure` and `HttpOnly`, and that direct navigation to the scanner and report routes works. Render liveness at `/api/health` can pass during a database outage. Confirm the server logs `account.database_ready` before testing accounts.

## Custom domain and search

1. Add your chosen `.com` or `.in` in Render under Custom Domains and apply the DNS records Render shows you. Verify the domain and HTTPS. [Render custom domains](https://render.com/docs/custom-domains)
2. Set both `CLIENT_URL` and `PUBLIC_SITE_URL` to the final origin, for example `https://example.com`, and redeploy. Use the same canonical host in Search Console. If you serve both the apex and `www`, select one and redirect the other. The public pages then emit canonical URLs and social previews. The server can also redirect duplicate deployment hosts to the canonical origin.
3. Verify a Search Console property and submit `/sitemap.xml`. The sitemap includes only public pages, while login, dashboard, reports and profile send `noindex`. Public URLs are:

   | Page                   | Search intent                                                                            |
   | ---------------------- | ---------------------------------------------------------------------------------------- |
   | `/`                    | scam checker, phishing link checker, suspicious message checker, job offer scam checker  |
   | `/screenshot-scanner/` | screenshot scam scanner, photo scam checker, suspicious screenshot, possible image edits |
   | `/privacy/`            | what TrustShield AI stores and how image analysis works                                  |

   These phrases inform titles, descriptions and visible page content. Google Search ignores the legacy meta-keywords tag. [Google supported meta tags](https://developers.google.com/search/docs/crawling-indexing/special-tags) · [Google sitemap setup](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap)

4. Run PageSpeed Insights on the deployed home page and screenshot guide. Account, scanner and history bundles load on demand, fingerprinted Vite assets support one-year caching, and the public guide and privacy page work without JavaScript. [PageSpeed Insights](https://pagespeed.web.dev/)

## AdSense

Set `SITE_CONTACT_EMAIL` to the privacy contact you want to display. Before applying, review the live privacy page and current Google Publisher Policies. Google reviews site ownership, original content and policy compliance. The public screenshot guide provides crawlable content, and you can expand the site with original guides for your readers. [AdSense site readiness](https://support.google.com/adsense/answer/7299563) · [Google Publisher Policies](https://support.google.com/publisherpolicies/answer/10502938)

When AdSense gives you a publisher ID, set `ADSENSE_PUBLISHER_ID` to your `ca-pub-` ID in Render. The production site then publishes the ownership meta tag and `/ads.txt`. After the site is approved, choose public ad placements and add Google's approved scripts and any required consent management. Keep scan uploads, authentication pages and private reports free of third-party advertising scripts. Approval and revenue depend on Google and actual traffic. [AdSense site review](https://support.google.com/adsense/answer/12131223) · [Google ads.txt guide](https://support.google.com/adsense/answer/12171612)
