const fs = require('fs');
const path = require('path');

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;

  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const idx = line.indexOf('=');
    if (idx <= 0) continue;

    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

const rootDir = path.join(__dirname, '..');
loadEnvFile(path.join(rootDir, '.env.local'));
loadEnvFile(path.join(rootDir, '.env'));

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_ANON_KEY in environment.');
  process.exit(1);
}

const targetPath = path.join(
  rootDir,
  'src',
  'environments',
  'environment.local.ts'
);

const contents = `import type { Environment } from './environment.model';

export const environment: Environment = {
  production: false,
  supabaseUrl: '${supabaseUrl}',
  supabaseAnonKey: '${supabaseAnonKey}',
  buildTime: 'local',
  buildTimestamp: 'local',
  logging: {
    minLevel: 'debug',
    saveDebounceMs: 750,
    persistLevel: 'debug',
    consoleLevel: 'debug'
  },
  sync: {
    backoffBaseMs: 5000,
    maxBackoffMs: 300000,
    pollIntervalMs: 30000
  }
};
`;

fs.writeFileSync(targetPath, contents, 'utf8');
console.log('Wrote local environment config to src/environments/environment.local.ts');
