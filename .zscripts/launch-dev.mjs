// Daemon launcher that fully detaches the Next.js dev server so it survives
// the parent shell session exiting. Output is tee'd to dev.log.
import { spawn } from 'node:child_process';
import { writeFileSync, openSync } from 'node:fs';

const out = openSync('dev.log', 'w');

const child = spawn(
  './node_modules/.bin/next',
  ['dev', '-p', '3000'],
  {
    cwd: process.cwd(),
    detached: true,
    stdio: ['ignore', out, out],
    env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1' },
  }
);

child.unref();

writeFileSync('.zscripts/dev.pid', String(child.pid));
console.log('Detached Next.js dev server started with PID:', child.pid);
