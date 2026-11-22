import { once } from 'node:events';
import { createApp } from './app.ts';
import { createDatabase } from './config/database.ts';
import { ConfigurationError, readConfig } from './config/env.ts';

async function start() {
  const config = readConfig();
  const database = createDatabase(config);
  const app = createApp(config, database);
  const host = config.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1';
  const server = app.listen(config.PORT, host);
  try {
    await once(server, 'listening');
  } catch (error) {
    const inUse =
      error instanceof Error && 'code' in error && error.code === 'EADDRINUSE';
    throw new ConfigurationError(
      inUse
        ? 'API port ' +
            config.PORT +
            ' is already in use. Stop the other process or change PORT in server/.env.'
        : 'Could not bind the API to ' +
            host +
            ':' +
            config.PORT +
            '. Check the port and listening permissions.',
    );
  }

  function shutdown() {
    server.close((error) => {
      if (error) {
        console.error('Could not close the API listener cleanly.');
        process.exitCode = 1;
      }
      database.close().catch(() => {
        console.error('Could not close MongoDB cleanly.');
        process.exitCode = 1;
      });
    });
  }

  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);
  console.info(
    'TrustShield AI API listening on ' +
      host +
      ':' +
      config.PORT +
      ' — initializing MongoDB.',
  );
  void database.connect();
}

start().catch((error: unknown) => {
  console.error(
    error instanceof ConfigurationError
      ? error.message
      : 'TrustShield AI API could not start.',
  );
  process.exitCode = 1;
});
