import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';

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
const child = spawn(command, commandArgs, {
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
