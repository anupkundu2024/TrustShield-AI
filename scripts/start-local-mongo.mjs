import { spawn } from 'node:child_process';
import console from 'node:console';
import process from 'node:process';
import { existsSync, mkdirSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { delimiter, join } from 'node:path';
import { fileURLToPath, URL } from 'node:url';

function directoryEntries(path) {
  return existsSync(path) ? readdirSync(path) : [];
}

const executable = process.platform === 'win32' ? 'mongod.exe' : 'mongod';
const installRoot =
  process.env.ProgramFiles &&
  join(process.env.ProgramFiles, 'MongoDB', 'Server');
const installed = installRoot
  ? directoryEntries(installRoot)
      .sort()
      .reverse()
      .map((version) => join(installRoot, version, 'bin', executable))
  : [];
const cache = join(homedir(), '.cache', 'mongodb-binaries');
const cached =
  process.platform === 'win32'
    ? directoryEntries(cache)
        .filter((name) => /^mongod-.+-win32-.+\.exe$/.test(name))
        .sort()
        .reverse()
        .map((name) => join(cache, name))
    : [];
const onPath = (process.env.PATH ?? '')
  .split(delimiter)
  .filter(Boolean)
  .map((path) => join(path, executable));
const binary =
  process.env.MONGODB_BINARY ||
  [...onPath, ...installed, ...cached].find(existsSync);
if (!binary || !existsSync(binary)) {
  console.error(
    'Install MongoDB Community Server or set MONGODB_BINARY to the full path of mongod.',
  );
  process.exit(1);
}

const dataPath = fileURLToPath(new URL('../.mongo-data/', import.meta.url));
mkdirSync(dataPath, { recursive: true });
console.info('MongoDB data directory: ' + dataPath);
const mongo = spawn(
  binary,
  ['--bind_ip', '127.0.0.1', '--port', '27017', '--dbpath', dataPath],
  {
    stdio: 'inherit',
    windowsHide: true,
  },
);
mongo.once('error', () => {
  console.error(
    'Could not launch MongoDB. Check MONGODB_BINARY and file permissions.',
  );
  process.exitCode = 1;
});
mongo.once('exit', (code) => {
  process.exitCode = code ?? 1;
});
