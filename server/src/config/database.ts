import mongoose from 'mongoose';
import type { ServerConfig } from './env.ts';
import { createSessions } from './session.ts';
import { createUserModel } from '../models/User.ts';
import { createAccountRoutes } from '../routes/accounts.ts';
import { createScanRoutes } from '../routes/scans.ts';
import { createRateLimits } from '../middleware/rateLimits.ts';

function initializationHint(error: unknown, stage: string) {
  if (error instanceof mongoose.mongo.MongoParseError) {
    return 'Check MONGODB_URI syntax and percent-encode special characters in credentials.';
  }
  if (error instanceof mongoose.mongo.MongoServerError) {
    if (error.code === 18)
      return 'MongoDB rejected the credentials. Check the database user, password and authSource.';
    if (error.code === 13)
      return 'MongoDB denied access. Check the database user permissions for this database.';
  }
  if (stage === 'MongoDB connection') {
    return 'Check that MongoDB is running and reachable. For Atlas, check cluster status, DNS and the IP access list.';
  }
  return 'Check database permissions and the existing indexes. Account routes will return HTTP 503 until initialization succeeds.';
}

export function createDatabase(config: ServerConfig) {
  const connection = mongoose.createConnection();
  const User = createUserModel(connection);
  const limits = createRateLimits();
  type Accounts = {
    sessions: Awaited<ReturnType<typeof createSessions>>;
    router: Awaited<ReturnType<typeof createAccountRoutes>>;
  };
  let accounts: Accounts | undefined;
  let opening: Promise<void> | undefined;
  let retry: NodeJS.Timeout | undefined;
  let closing = false;

  connection.on('error', () => console.warn('account.database_error'));
  connection.on('disconnected', () =>
    console.warn('account.database_disconnected'),
  );

  function connect() {
    if (opening || closing || accounts) return opening;
    opening = (async () => {
      let stage = 'MongoDB connection';
      try {
        await connection.openUri(config.MONGODB_URI, {
          serverSelectionTimeoutMS: 4000,
          waitQueueTimeoutMS: 4000,
          socketTimeoutMS: 8000,
          maxPoolSize: 20,
          autoIndex: false,
          autoCreate: false,
        });
        stage = 'user index initialization';
        await User.createIndexes();
        stage = 'MongoDB session store initialization';
        const sessions = await createSessions(config, connection);
        stage = 'scan index initialization';
        const scanRoutes = await createScanRoutes(config, connection);
        stage = 'account route initialization';
        const router = await createAccountRoutes(
          User,
          sessions,
          limits,
          scanRoutes,
        );
        accounts = { sessions, router };
        console.info(
          'account.database_ready — TrustShield AI authentication is ready.',
          { database: connection.name },
        );
      } catch (error) {
        console.warn(
          'account.database_initialization_failed — ' +
            stage +
            '. ' +
            initializationHint(error, stage) +
            ' Retrying in 10 seconds.',
        );
        await connection
          .close()
          .catch(() => console.warn('account.database_close_failed'));
        if (!closing) {
          retry = setTimeout(() => void connect(), 10_000);
          retry.unref();
        }
      } finally {
        opening = undefined;
      }
    })();
    return opening;
  }

  return {
    connection,
    limitRequests: limits.all,
    connect,
    readyAccounts: () => (connection.readyState === 1 ? accounts : undefined),
    async close() {
      closing = true;
      clearTimeout(retry);
      await opening;
      await connection.close();
    },
  };
}
