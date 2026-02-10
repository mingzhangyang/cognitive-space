import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Usage: run-with-build-id <command> [...args]');
  process.exit(1);
}

const buildId =
  process.env.VITE_BUILD_ID ||
  process.env.BUILD_ID ||
  process.env.GIT_COMMIT ||
  Date.now().toString(36) + '-' + randomUUID().slice(0, 8);

const [command, ...commandArgs] = args;
let spawnCommand = command;
let spawnArgs = commandArgs;

if (command === 'vite') {
  const viteBin = path.resolve(process.cwd(), 'node_modules', 'vite', 'bin', 'vite.js');
  if (existsSync(viteBin)) {
    spawnCommand = process.execPath;
    spawnArgs = [viteBin, ...commandArgs];
  } else {
    const viteCli = path.resolve(
      process.cwd(),
      'node_modules',
      '.bin',
      process.platform === 'win32' ? 'vite.cmd' : 'vite'
    );
    if (existsSync(viteCli)) {
      spawnCommand = viteCli;
      spawnArgs = commandArgs;
    }
  }
}

const child = spawn(spawnCommand, spawnArgs, {
  stdio: 'inherit',
  env: {
    ...process.env,
    VITE_BUILD_ID: buildId,
  },
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.exit(1);
  }
  process.exit(code ?? 1);
});
