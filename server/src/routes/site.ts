import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import express, { Router } from 'express';
import type { ServerConfig } from '../config/env.ts';

const builtClient = fileURLToPath(
  new URL('../../../client/dist/', import.meta.url),
);
const pages = [
  { route: '/', file: 'index.html' },
  { route: '/screenshot-scanner/', file: 'screenshot-scanner/index.html' },
  { route: '/privacy/', file: 'privacy/index.html' },
];
const privateRoutes = /^\/(?:login\/?|signup\/?|app(?:\/.*)?)$/i;

export function createSiteRouter(
  config: ServerConfig,
  clientDir = builtClient,
) {
  const router = Router();
  const origin = config.PUBLIC_SITE_URL;
  const publisher = origin ? config.ADSENSE_PUBLISHER_ID : undefined;
  const availablePages = pages.filter(({ file }) =>
    existsSync(join(clientDir, file)),
  );
  const escape = (value: string) =>
    value
      .replaceAll('&', '&amp;')
      .replaceAll('"', '&quot;')
      .replaceAll('<', '&lt;');

  router.get('/robots.txt', (_request, response) => {
    response
      .type('text/plain')
      .send(
        'User-agent: *\nAllow: /\n' +
          (origin ? 'Sitemap: ' + origin + '/sitemap.xml\n' : ''),
      );
  });
  router.get('/ads.txt', (_request, response) => {
    if (!publisher) {
      response.sendStatus(404);
      return;
    }
    response
      .type('text/plain')
      .send(
        'google.com, ' + publisher.slice(3) + ', DIRECT, f08c47fec0942fa0\n',
      );
  });
  router.get('/sitemap.xml', (_request, response) => {
    if (!origin || !existsSync(join(clientDir, 'index.html'))) {
      response.sendStatus(404);
      return;
    }
    const urls = availablePages.map(
      ({ route }) => '<url><loc>' + escape(origin + route) + '</loc></url>',
    );
    response
      .type('application/xml')
      .send(
        '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' +
          urls.join('') +
          '</urlset>',
      );
  });

  if (!existsSync(join(clientDir, 'index.html'))) return router;
  const html = new Map(
    availablePages.map(({ route, file }) => [
      route,
      readFileSync(join(clientDir, file), 'utf8'),
    ]),
  );
  for (const { route } of availablePages) {
    router.get(route, (request, response) => {
      const canonicalHost = origin && new URL(origin).hostname;
      const alternateHost =
        canonicalHost && request.hostname.toLowerCase() !== canonicalHost;
      if (request.path !== route || alternateHost) {
        const queryStart = request.originalUrl.indexOf('?');
        const query =
          queryStart < 0 ? '' : request.originalUrl.slice(queryStart);
        response.redirect(308, (alternateHost ? origin : '') + route + query);
        return;
      }
      const url = origin ? escape(origin + route) : undefined;
      const imageUrl = origin ? escape(origin + '/social-card.png') : undefined;
      const metadata = url
        ? [
            '<link rel="canonical" href="' + url + '">',
            '<meta property="og:url" content="' + url + '">',
            '<meta property="og:image" content="' + imageUrl + '">',
            '<meta property="og:image:alt" content="TrustShield AI scam and screenshot checker">',
            '<meta property="og:image:width" content="1200">',
            '<meta property="og:image:height" content="630">',
            '<meta name="twitter:image" content="' + imageUrl + '">',
            publisher
              ? '<meta name="google-adsense-account" content="' +
                publisher +
                '">'
              : '',
          ].join('')
        : '<meta name="robots" content="noindex">';
      const contact = config.SITE_CONTACT_EMAIL
        ? escape(config.SITE_CONTACT_EMAIL)
        : undefined;
      if (!url) response.set('X-Robots-Tag', 'noindex');
      response
        .set('Cache-Control', 'no-cache')
        .type('html')
        .send(
          html
            .get(route)
            ?.replace('</head>', metadata + '</head>')
            .replace(
              '<!-- site-contact -->',
              contact
                ? '<p><a href="mailto:' + contact + '">' + contact + '</a></p>'
                : '',
            ),
        );
    });
  }
  router.use(
    '/assets',
    express.static(join(clientDir, 'assets'), {
      immutable: true,
      maxAge: '1y',
      index: false,
      redirect: false,
    }),
  );
  router.get(
    ['/favicon.svg', '/guide.css', '/social-card.png'],
    (request, response, next) => {
      response.sendFile(
        request.path.slice(1),
        { root: clientDir, maxAge: '1h' },
        (error) => {
          if (error) next();
        },
      );
    },
  );

  router.get(privateRoutes, (_request, response) => {
    response
      .set({ 'X-Robots-Tag': 'noindex', 'Cache-Control': 'no-store' })
      .type('html')
      .send(
        html
          .get('/')
          ?.replace('</head>', '<meta name="robots" content="noindex"></head>'),
      );
  });
  return router;
}
