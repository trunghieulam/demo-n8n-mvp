#!/usr/bin/env node
/**
 * Cross-platform script to kill processes on ports 3000 and 3001
 * Usage: node kill-ports.js
 */

const { execSync } = require('child_process');
const os = require('os');

const ports = [3000, 3001];
const platform = os.platform();

console.log('Killing processes on ports 3000 and 3001...\n');

function killProcessOnPort(port) {
  try {
    let pid;
    
    if (platform === 'win32') {
      // Windows
      const netstatOutput = execSync(`netstat -ano | findstr ":${port}.*LISTENING"`, { encoding: 'utf-8' });
      const lines = netstatOutput.trim().split('\n');
      
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        pid = parts[parts.length - 1];
        
        if (pid && /^\d+$/.test(pid)) {
          try {
            execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' });
            console.log(`  ✓ Killed process ${pid} on port ${port}`);
            return true;
          } catch (e) {
            console.log(`  ✗ Could not kill process ${pid} on port ${port}`);
          }
        }
      }
    } else {
      // Unix-like (Linux, macOS)
      try {
        pid = execSync(`lsof -ti:${port}`, { encoding: 'utf-8' }).trim();
        if (pid) {
          execSync(`kill -9 ${pid}`, { stdio: 'ignore' });
          console.log(`  ✓ Killed process ${pid} on port ${port}`);
          return true;
        }
      } catch (e) {
        // Port might not be in use
      }
    }
    
    console.log(`  No process found on port ${port}`);
    return false;
  } catch (error) {
    console.log(`  Error checking port ${port}: ${error.message}`);
    return false;
  }
}

let killed = false;
for (const port of ports) {
  console.log(`Checking port ${port}...`);
  if (killProcessOnPort(port)) {
    killed = true;
  }
}

console.log('\n' + (killed ? '✓ Done! Ports should now be free.' : '✓ No processes were running on these ports.'));
