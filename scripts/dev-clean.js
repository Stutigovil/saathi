const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PORTS = [3000, 3001, 5000];

function run(command) {
  return execSync(command, { stdio: ['ignore', 'pipe', 'pipe'] }).toString();
}

function killPortListenersWindows(ports) {
  const pidSet = new Set();

  for (const port of ports) {
    try {
      const output = run(`netstat -ano -p tcp | findstr :${port}`);
      const lines = output.split(/\r?\n/).filter(Boolean);

      for (const line of lines) {
        // netstat columns: Proto LocalAddress ForeignAddress State PID
        const parts = line.trim().split(/\s+/);
        if (parts.length < 5) continue;
        const state = parts[3];
        const pid = parts[4];

        if (state === 'LISTENING' && /^\d+$/.test(pid)) {
          pidSet.add(Number(pid));
        }
      }
    } catch {
      // No listeners for this port.
    }
  }

  const pids = [...pidSet];
  if (!pids.length) {
    console.log('No listeners found on ports 3000, 3001, 5000.');
    return;
  }

  console.log(`Killing PIDs: ${pids.join(', ')}`);

  for (const pid of pids) {
    try {
      execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' });
    } catch {
      // Ignore process already gone or access issues.
    }
  }
}

function removeNextCache() {
  const nextCache = path.join(process.cwd(), 'frontend', '.next');
  if (fs.existsSync(nextCache)) {
    fs.rmSync(nextCache, { recursive: true, force: true });
    console.log('Removed frontend/.next cache.');
  } else {
    console.log('frontend/.next cache not present.');
  }
}

function startDev() {
  execSync('npm run dev', { stdio: 'inherit' });
}

function main() {
  if (process.platform === 'win32') {
    killPortListenersWindows(PORTS);
  } else {
    console.log('Port cleanup helper currently targets Windows only.');
  }

  removeNextCache();
  startDev();
}

main();
