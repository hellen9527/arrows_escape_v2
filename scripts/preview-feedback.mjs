// Local-only D1 preview. This never creates, queries or deploys a remote database.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync, spawn } from 'node:child_process';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const file = path.join(root, 'dist/server/wrangler.json');
if (!fs.existsSync(file))
  throw new Error('Run npm run build before starting the preview.');
const config = JSON.parse(fs.readFileSync(file, 'utf8'));
config.name = 'arrows-escape-feedback-local';
config.main = path.join(root, 'dist/server/index.js');
config.assets.directory = path.join(root, 'dist/client');
config.routes = [];
config.workers_dev = false;
config.d1_databases = [
  {
    binding: 'FEEDBACK_DB',
    database_name: 'arrows-escape-feedback-local',
    database_id: 'local-feedback-only',
    migrations_dir: path.join(root, 'migrations'),
  },
];
config.ratelimits = [
  {
    name: 'FEEDBACK_RATE_LIMITER',
    namespace_id: '20260915',
    simple: { limit: 5, period: 60 },
  },
];
const configPath = path.join(root, '.wrangler/feedback-local.json');
fs.mkdirSync(path.dirname(configPath), { recursive: true });
fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
if (!process.argv.includes('--prepare-only')) {
  const cli = path.join(root, 'node_modules/wrangler/bin/wrangler.js');
  const common = [
    '--config',
    configPath,
    '--persist-to',
    path.join(root, '.wrangler/feedback-local-state'),
  ];
  const env = {
    ...process.env,
    WRANGLER_WRITE_LOGS: 'false',
    WRANGLER_LOG_PATH: path.join(root, '.wrangler/logs'),
  };
  const migration = spawnSync(
    process.execPath,
    [
      cli,
      'd1',
      'execute',
      'FEEDBACK_DB',
      '--local',
      ...common,
      '--file',
      path.join(root, 'migrations/0001_feedback.sql'),
    ],
    { cwd: root, env, stdio: 'inherit' },
  );
  if (migration.status !== 0) process.exit(migration.status ?? 1);
  const child = spawn(
    process.execPath,
    [
      cli,
      'dev',
      ...common,
      '--ip',
      '127.0.0.1',
      '--port',
      '3103',
      '--inspector-port',
      '9243',
    ],
    { cwd: root, env, stdio: 'inherit' },
  );
  for (const signal of ['SIGINT', 'SIGTERM'])
    process.on(signal, () => child.kill(signal));
  child.on('exit', (code) => process.exit(code ?? 0));
}
