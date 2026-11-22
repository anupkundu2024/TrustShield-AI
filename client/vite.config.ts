import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseEnv } from 'node:util';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

const clientRoot = fileURLToPath(new URL('.', import.meta.url));

function backendPort() {
  let port = process.env.PORT;
  if (port === undefined) {
    let file: string | undefined;
    try {
      file = readFileSync(new URL('../server/.env', import.meta.url), 'utf8');
    } catch (error) {
      if (!(
        error instanceof Error &&
        'code' in error &&
        error.code === 'ENOENT'
      )) {
        throw new Error('Could not read the API port from server/.env.', {
          cause: error,
        });
      }
    }
    if (file !== undefined) port = parseEnv(file).PORT;
  }
  port ??= '3001';
  if (!/^\d+$/.test(port) || Number(port) < 1 || Number(port) > 65535) {
    throw new Error(
      'PORT in server/.env or the process environment must be an integer between 1 and 65535.',
    );
  }
  return Number(port);
}

export default defineConfig(({ mode, command }) => {
  const env = loadEnv(mode, clientRoot, 'API_PROXY_');
  const proxyTarget =
    env.API_PROXY_TARGET ??
    'http://127.0.0.1:' + (command === 'serve' ? backendPort() : 3001);
  let target: URL;
  try {
    target = new URL(proxyTarget);
  } catch {
    throw new Error('API_PROXY_TARGET must be an HTTP or HTTPS origin.');
  }
  if (
    !['http:', 'https:'].includes(target.protocol) ||
    target.href !== target.origin + '/'
  ) {
    throw new Error('API_PROXY_TARGET must be an HTTP or HTTPS origin.');
  }
  return {
    root: clientRoot,
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'public-guide-routes',
        configureServer({ middlewares }) {
          middlewares.use((request, _response, next) => {
            if (request.method === 'GET' || request.method === 'HEAD') {
              request.url = request.url?.replace(
                /^\/(screenshot-scanner|privacy)\/?(?=\?|$)/,
                '/$1/index.html',
              );
            }
            next();
          });
        },
      },
    ],
    server: {
      host: '127.0.0.1',
      port: 5173,
      strictPort: true,
      proxy: { '/api': target.origin },
    },
  };
});
