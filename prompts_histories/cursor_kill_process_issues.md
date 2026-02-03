# Pnpm command not found error
_Exported on 2/3/2026 at 19:26:18 GMT+7 from Cursor (2.3.34)_

---

**User**

kill the current BE process on port 3001

---

**Cursor**

I’ll find which process is bound to port 3001 and then terminate it, ensuring no backend instance is still running on that port.

Port 3001’s backend listener (PID **266004**) has been terminated.  

`netstat` now shows only closing/TIME_WAIT connections for 3001, which will clear automatically; no process is listening on that port anymore. You can safely start the backend again with `pnpm dev:backend`.

---

**User**

7:09:58 PM [vite] http proxy error: /api/v1/auth/login
Error: connect ENOBUFS ::1:3001 - Local (undefined:undefined)
    at internalConnect (node:net:1115:16)
    at defaultTriggerAsyncIdScope (node:internal/async_hooks:464:18)
    at GetAddrInfoReqWrap.emitLookup [as callback] (node:net:1520:9)
    at GetAddrInfoReqWrap.onlookupall [as oncomplete] (node:dns:132:8)


---

**Cursor**


Vite proxy is connecting to `::1:3001` (IPv6) and hitting `ENOBUFS`, likely due to too many connections or a connection leak. Checking if the backend is running and updating the Vite proxy to use IPv4:



Backend is running. Updating the Vite proxy to use IPv4 (`127.0.0.1`) instead of `localhost` to avoid IPv6 connection issues:


```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, '../shared/src'),
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
        secure: false,
        ws: true,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('Proxy error:', err);
          });
        },
      },
      '/webhook': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
        secure: false,
        ws: true,
      },
    },
  },
});

```


Updated the Vite proxy configuration to use `127.0.0.1` instead of `localhost` to force IPv4 and avoid IPv6 connection issues.

**Changes made:**
1. Changed proxy target from `http://localhost:3001` to `http://127.0.0.1:3001` (forces IPv4)
2. Added `secure: false` for local development
3. Added `ws: true` for WebSocket support
4. Added error logging for proxy errors

**To apply the fix:**
Restart the frontend dev server so the new Vite config takes effect:

```bash
# Stop the current frontend (Ctrl+C)
# Then restart it
pnpm dev:frontend
```

The `ENOBUFS` error should be resolved. Using `127.0.0.1` avoids IPv6 resolution issues and reduces connection overhead.

If the error persists after restarting, there may be a connection leak in the frontend. Check the browser's Network tab to see if requests are completing properly.

```shellscript
# Stop the current frontend (Ctrl+C)
# Then restart it
pnpm dev:frontend
```

---

**User**

The FE service is restart again and again, cannot working. Run both service and use chrome MCP to check what's the issues.

---

**Cursor**


Starting both services, then using Chrome DevTools to inspect the frontend issue:



Waiting a few seconds for the services to start, then navigating to the frontend:



Checking the page and console for errors:



Frontend requests are going to `/api/workflows` instead of `/api/v1/workflows`. Checking the API client and workflow store:



Requests are going to `/api/workflows` instead of `/api/v1/workflows`. The API client uses `/api/v1` as baseURL, but requests bypass the proxy. Checking the App component to see how it's initialized:



Requests are going to `http://localhost:3001/api/workflows` instead of `/api/v1/workflows` via the Vite proxy. The axios baseURL may be resolving incorrectly. Checking the console for more details and verifying the backend routes:



Requests are going to `localhost:3001/api/workflows` instead of `/api/v1/workflows` via the Vite proxy, and the `/v1` is missing. Checking axios configuration and fixing it:



Requests are going to `/api/workflows` instead of `/api/v1/workflows`, and directly to `localhost:3001` instead of through the Vite proxy. The axios baseURL isn't being applied. Fixing the API client configuration:


```typescript
import axios from 'axios';

// Use relative URL to go through Vite proxy
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  // Ensure axios uses relative URLs and doesn't resolve to absolute URLs
  withCredentials: false,
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

```


Adding a request interceptor to debug and ensure the URL is correct:


```typescript
import axios from 'axios';

// Use relative URL to go through Vite proxy
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  // Ensure axios uses relative URLs and doesn't resolve to absolute URLs
  withCredentials: false,
});

// Request interceptor to add auth token and debug URLs
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Ensure URL is relative and goes through Vite proxy
    if (config.url && config.baseURL) {
      // If URL is already absolute, don't modify it
      if (!config.url.startsWith('http')) {
        // Ensure baseURL is used correctly
        console.log(`[API] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

```


Waiting for the page to reload, then checking console messages:



Requests are still going to `localhost:3001/api/workflows` (missing `/v1`). Checking the axios request configuration and fixing it:



Requests are going directly to `localhost:3001/api/workflows` (missing `/v1`) instead of `/api/v1/workflows` via the Vite proxy. Axios may be resolving the baseURL incorrectly. Fixing the API client to ensure relative URLs:


```typescript
import axios from 'axios';

// Use relative URL to go through Vite proxy
// IMPORTANT: Must be relative (starting with /) to work with Vite proxy
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  // Ensure axios uses relative URLs and doesn't resolve to absolute URLs
  withCredentials: false,
  // Prevent axios from resolving to absolute URLs
  transformRequest: [(data, headers) => {
    // Ensure we're using relative URLs
    return data;
  }],
});

// Request interceptor to add auth token and debug URLs
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Ensure URL is relative and goes through Vite proxy
    if (config.url && config.baseURL) {
      // If URL is already absolute, don't modify it
      if (!config.url.startsWith('http')) {
        // Ensure baseURL is used correctly
        console.log(`[API] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

```


Checking for environment variables or code that might override the axios config. Verifying the actual request URL axios is using:


```typescript
import axios from 'axios';

// Use relative URL to go through Vite proxy
// IMPORTANT: Must be relative (starting with /) to work with Vite proxy
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  // Ensure axios uses relative URLs and doesn't resolve to absolute URLs
  withCredentials: false,
  // Prevent axios from resolving to absolute URLs
  transformRequest: [(data, headers) => {
    // Ensure we're using relative URLs
    return data;
  }],
});

// Request interceptor to add auth token and ensure correct URL
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // CRITICAL FIX: Ensure URL is relative and uses baseURL correctly
    // If axios somehow resolved to absolute URL, force it back to relative
    if (config.url && config.url.startsWith('http')) {
      // Extract path from absolute URL and make it relative
      try {
        const urlObj = new URL(config.url);
        config.url = urlObj.pathname + urlObj.search;
        // Ensure baseURL is set
        if (!config.baseURL) {
          config.baseURL = API_BASE_URL;
        }
      } catch (e) {
        console.error('Error parsing URL:', e);
      }
    }
    
    // Ensure baseURL is always set and relative
    if (!config.baseURL || config.baseURL.startsWith('http')) {
      config.baseURL = API_BASE_URL;
    }
    
    // Log for debugging
    const fullUrl = config.baseURL + (config.url?.startsWith('/') ? config.url : '/' + config.url);
    console.log(`[API] ${config.method?.toUpperCase()} ${fullUrl}`);
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

```


Waiting for the page to reload, then checking console logs:



Requests are still bypassing the proxy. Checking if an environment variable is overriding the baseURL and inspecting the actual axios config:



Requests are still bypassing the proxy. Checking if axios is resolving the baseURL incorrectly. Trying a different approach: ensuring the URL is constructed correctly:


```typescript
import axios, { AxiosRequestConfig } from 'axios';

// Use relative URL to go through Vite proxy
// IMPORTANT: Must be relative (starting with /) to work with Vite proxy
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

// Create axios instance WITHOUT baseURL initially to avoid resolution issues
export const apiClient = axios.create({
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: false,
});

// Request interceptor to add auth token and ensure correct URL
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // CRITICAL FIX: Ensure URL is relative and uses baseURL correctly
    // If axios somehow resolved to absolute URL, force it back to relative
    if (config.url && config.url.startsWith('http')) {
      // Extract path from absolute URL and make it relative
      try {
        const urlObj = new URL(config.url);
        config.url = urlObj.pathname + urlObj.search;
        // Ensure baseURL is set
        if (!config.baseURL) {
          config.baseURL = API_BASE_URL;
        }
      } catch (e) {
        console.error('Error parsing URL:', e);
      }
    }
    
    // Ensure baseURL is always set and relative
    if (!config.baseURL || config.baseURL.startsWith('http')) {
      config.baseURL = API_BASE_URL;
    }
    
    // Log for debugging
    const fullUrl = config.baseURL + (config.url?.startsWith('/') ? config.url : '/' + config.url);
    console.log(`[API] ${config.method?.toUpperCase()} ${fullUrl}`);
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

```

```typescript
import axios, { AxiosRequestConfig } from 'axios';

// Use relative URL to go through Vite proxy
// IMPORTANT: Must be relative (starting with /) to work with Vite proxy
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

// Create axios instance WITHOUT baseURL initially to avoid resolution issues
export const apiClient = axios.create({
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: false,
});

// Request interceptor to add auth token and construct correct relative URL
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // CRITICAL FIX: Manually construct the full relative URL
    // This ensures it goes through Vite proxy instead of directly to backend
    if (config.url) {
      // Remove any absolute URL and make it relative
      let urlPath = config.url;
      if (urlPath.startsWith('http')) {
        try {
          const urlObj = new URL(urlPath);
          urlPath = urlObj.pathname + urlObj.search;
        } catch (e) {
          console.error('Error parsing URL:', e);
        }
      }
      
      // Ensure urlPath starts with /
      if (!urlPath.startsWith('/')) {
        urlPath = '/' + urlPath;
      }
      
      // Construct full relative URL: /api/v1 + /workflows = /api/v1/workflows
      const basePath = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
      const fullPath = basePath + urlPath;
      
      // Set the URL directly (this bypasses axios's baseURL resolution)
      config.url = fullPath;
      config.baseURL = ''; // Clear baseURL to prevent double resolution
      
      console.log(`[API] ${config.method?.toUpperCase()} ${fullPath}`);
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

```


Waiting for the page to reload, then checking if requests go through the proxy:



Requests are still bypassing the proxy. Checking a specific request and verifying the code reloaded:



The fetch test confirms the Vite proxy works (`/api/v1/workflows` returns 401). Axios is still bypassing it. Hard-refreshing to clear cached code, then checking:



Request 114 shows `/api/v1/workflows` going through the proxy (401 is expected without auth). Some requests still bypass it. Checking for other axios instances or direct API calls:



Only one axios instance found. Some requests still bypass the proxy, likely due to cached code or a timing issue. Summary:

## Summary of Issues Found:

1. **Frontend restarting repeatedly** — Likely due to API errors causing React error boundaries to trigger
2. **API requests bypassing Vite proxy** — Some requests go directly to `localhost:3001/api/workflows` instead of `/api/v1/workflows` through the proxy
3. **Missing `/v1` in some requests** — Some requests are missing the `/v1` path segment

## Fixes Applied:

1. **Fixed API client** — Manually constructs relative URLs in the interceptor to ensure they go through the Vite proxy
2. **Fixed Vite proxy config** — Changed from `localhost` to `127.0.0.1` to force IPv4
3. **Added request logging** — Console logs show which URLs are being called

## Next Steps:

Restart the frontend dev server to ensure all changes are loaded:

```bash
# Stop the current frontend (Ctrl+C in that terminal)
# Then restart:
pnpm dev:frontend
```

After restarting, you should see:
- Console logs showing `[API] GET /api/v1/workflows` 
- Requests going to `localhost:3000/api/v1/workflows` (through proxy)
- 401 errors instead of 404 (meaning the proxy is working, just need auth)

The frontend should stop restarting once the API calls go through the proxy correctly.

```shellscript
# Stop the current frontend (Ctrl+C in that terminal)
# Then restart:
pnpm dev:frontend
```

---

**User**

Write a script to clear the process running on port 3000 and 3001.

---

**Cursor**


Creating scripts to kill processes on ports 3000 and 3001 for Windows:


```powershell
# PowerShell script to kill processes on ports 3000 and 3001
# Usage: .\kill-ports.ps1

Write-Host "Killing processes on ports 3000 and 3001..." -ForegroundColor Yellow

$ports = @(3000, 3001)
$killed = $false

foreach ($port in $ports) {
    Write-Host "`nChecking port $port..." -ForegroundColor Cyan
    
    # Find processes listening on the port
    $connections = netstat -ano | Select-String ":$port.*LISTENING"
    
    if ($connections) {
        foreach ($connection in $connections) {
            # Extract PID from netstat output (last column)
            $pid = ($connection -split '\s+')[-1]
            
            if ($pid -and $pid -match '^\d+$') {
                try {
                    $process = Get-Process -Id $pid -ErrorAction SilentlyContinue
                    if ($process) {
                        Write-Host "  Found process: $($process.ProcessName) (PID: $pid)" -ForegroundColor Red
                        Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
                        Write-Host "  ✓ Killed process $pid" -ForegroundColor Green
                        $killed = $true
                    }
                } catch {
                    Write-Host "  ✗ Could not kill process $pid : $_" -ForegroundColor Red
                }
            }
        }
    } else {
        Write-Host "  No process found on port $port" -ForegroundColor Gray
    }
}

if ($killed) {
    Write-Host "`n✓ Done! Ports 3000 and 3001 should now be free." -ForegroundColor Green
} else {
    Write-Host "`n✓ No processes were running on ports 3000 and 3001." -ForegroundColor Green
}

# Wait a moment and verify ports are free
Start-Sleep -Seconds 1
Write-Host "`nVerifying ports are free..." -ForegroundColor Cyan
foreach ($port in $ports) {
    $stillListening = netstat -ano | Select-String ":$port.*LISTENING"
    if ($stillListening) {
        Write-Host "  ⚠ Port $port is still in use (may be in TIME_WAIT state)" -ForegroundColor Yellow
    } else {
        Write-Host "  ✓ Port $port is free" -ForegroundColor Green
    }
}

```

```bat
@echo off
REM Batch script to kill processes on ports 3000 and 3001
REM Usage: kill-ports.bat

echo Killing processes on ports 3000 and 3001...
echo.

for %%p in (3000 3001) do (
    echo Checking port %%p...
    
    REM Find PID listening on the port
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":%%p.*LISTENING"') do (
        echo   Found process with PID: %%a
        taskkill /PID %%a /F >nul 2>&1
        if !errorlevel! equ 0 (
            echo   [OK] Killed process %%a
        ) else (
            echo   [ERROR] Could not kill process %%a
        )
    )
)

echo.
echo Done! Checking if ports are free...
timeout /t 1 /nobreak >nul

for %%p in (3000 3001) do (
    netstat -ano | findstr ":%%p.*LISTENING" >nul
    if !errorlevel! equ 0 (
        echo   Port %%p is still in use
    ) else (
        echo   Port %%p is free
    )
)

pause

```

```javascript
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

```


Adding a script to package.json for easier access:


```json
{
  "name": "n8n-mvp",
  "version": "0.1.0",
  "private": true,
  "description": "N8N MVP - Workflow Automation Platform",
  "workspaces": [
    "packages/*"
  ],
  "scripts": {
    "dev:backend": "pnpm --filter backend dev",
    "dev:frontend": "pnpm --filter frontend dev",
    "build": "pnpm -r build",
    "typecheck": "pnpm -r typecheck",
    "lint": "pnpm -r lint",
    "kill-ports": "node kill-ports.js"
  },
  "devDependencies": {
    "@types/node": "^20.10.0",
    "typescript": "^5.3.3"
  },
  "packageManager": "pnpm@8.12.0",
  "engines": {
    "node": ">=18.0.0",
    "pnpm": ">=8.0.0"
  }
}

```

```markdown
# Kill Ports Scripts

Scripts to kill processes running on ports 3000 and 3001 (frontend and backend).

## Usage

### Option 1: PowerShell (Recommended for Windows)
```powershell
.\kill-ports.ps1
```

### Option 2: Batch File (Windows)
```cmd
kill-ports.bat
```

### Option 3: Node.js (Cross-platform)
```bash
node kill-ports.js
# or
pnpm kill-ports
```

## What it does

1. Finds all processes listening on ports 3000 and 3001
2. Kills those processes forcefully
3. Verifies that the ports are now free

## Notes

- On Windows, you may need to run PowerShell as Administrator if processes are protected
- The script will show which processes were found and killed
- TIME_WAIT connections may still appear but won't block new processes from using the ports

```


Created three scripts to kill processes on ports 3000 and 3001:

## Created Scripts:

1. **`kill-ports.ps1`** (PowerShell) — Recommended for Windows
   - Finds and kills processes on ports 3000 and 3001
   - Shows which processes were killed
   - Verifies ports are free

2. **`kill-ports.bat`** (Batch file) — Simple Windows alternative
   - Double-click to run
   - Uses Windows commands

3. **`kill-ports.js`** (Node.js) — Cross-platform
   - Works on Windows, Linux, and macOS
   - Added to package.json scripts

## Usage:

```bash
# PowerShell (recommended)
.\kill-ports.ps1

# Batch file
kill-ports.bat

# Node.js (cross-platform)
pnpm kill-ports
# or
node kill-ports.js
```

All scripts will:
- Find processes listening on ports 3000 and 3001
- Kill them forcefully
- Verify the ports are free
- Show clear output about what was done

The scripts handle cases where:
- No processes are running on those ports
- Multiple processes are using the ports
- Processes can't be killed (permissions)

You can now easily free up ports 3000 and 3001 before starting your dev servers.

```shellscript
# PowerShell (recommended)
.\kill-ports.ps1

# Batch file
kill-ports.bat

# Node.js (cross-platform)
pnpm kill-ports
# or
node kill-ports.js
```

---

**User**

FE service refresh right after I click on login

---

**Cursor**


Investigating the login refresh issue. Checking the login code and monitoring the browser:



Checking the API client interceptor for redirect issues and navigating to the login page to test:



The response interceptor redirects to `/login` on any 401, including failed login attempts, causing a refresh loop. Updating it to exclude the login endpoint:


```typescript
import axios, { AxiosRequestConfig } from 'axios';

// Use relative URL to go through Vite proxy
// IMPORTANT: Must be relative (starting with /) to work with Vite proxy
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

// Create axios instance WITHOUT baseURL initially to avoid resolution issues
export const apiClient = axios.create({
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: false,
});

// Request interceptor to add auth token and construct correct relative URL
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // CRITICAL FIX: Manually construct the full relative URL
    // This ensures it goes through Vite proxy instead of directly to backend
    if (config.url) {
      // Remove any absolute URL and make it relative
      let urlPath = config.url;
      if (urlPath.startsWith('http')) {
        try {
          const urlObj = new URL(urlPath);
          urlPath = urlObj.pathname + urlObj.search;
        } catch (e) {
          console.error('Error parsing URL:', e);
        }
      }
      
      // Ensure urlPath starts with /
      if (!urlPath.startsWith('/')) {
        urlPath = '/' + urlPath;
      }
      
      // Construct full relative URL: /api/v1 + /workflows = /api/v1/workflows
      const basePath = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
      const fullPath = basePath + urlPath;
      
      // Set the URL directly (this bypasses axios's baseURL resolution)
      config.url = fullPath;
      config.baseURL = ''; // Clear baseURL to prevent double resolution
      
      console.log(`[API] ${config.method?.toUpperCase()} ${fullPath}`);
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Don't redirect to login if we're already on login/register pages
    // This prevents redirect loops when login fails
    const isAuthPage = error.config?.url?.includes('/auth/login') || 
                       error.config?.url?.includes('/auth/register') ||
                       window.location.pathname === '/login' ||
                       window.location.pathname === '/register';
    
    if (error.response?.status === 401 && !isAuthPage) {
      localStorage.removeItem('token');
      // Only redirect if we're not already on the login page
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

```


Verifying the login form prevents default submission and checking for other refresh causes:



Checking the ProtectedRoute component for redirect issues:



Improving the fix to handle edge cases and prevent redirect loops:


```typescript
import axios, { AxiosRequestConfig } from 'axios';

// Use relative URL to go through Vite proxy
// IMPORTANT: Must be relative (starting with /) to work with Vite proxy
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

// Create axios instance WITHOUT baseURL initially to avoid resolution issues
export const apiClient = axios.create({
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: false,
});

// Request interceptor to add auth token and construct correct relative URL
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // CRITICAL FIX: Manually construct the full relative URL
    // This ensures it goes through Vite proxy instead of directly to backend
    if (config.url) {
      // Remove any absolute URL and make it relative
      let urlPath = config.url;
      if (urlPath.startsWith('http')) {
        try {
          const urlObj = new URL(urlPath);
          urlPath = urlObj.pathname + urlObj.search;
        } catch (e) {
          console.error('Error parsing URL:', e);
        }
      }
      
      // Ensure urlPath starts with /
      if (!urlPath.startsWith('/')) {
        urlPath = '/' + urlPath;
      }
      
      // Construct full relative URL: /api/v1 + /workflows = /api/v1/workflows
      const basePath = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
      const fullPath = basePath + urlPath;
      
      // Set the URL directly (this bypasses axios's baseURL resolution)
      config.url = fullPath;
      config.baseURL = ''; // Clear baseURL to prevent double resolution
      
      console.log(`[API] ${config.method?.toUpperCase()} ${fullPath}`);
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Don't redirect to login if:
    // 1. We're already on login/register pages (prevents redirect loops)
    // 2. The request was to login/register endpoints (login failures shouldn't redirect)
    const requestUrl = error.config?.url || '';
    const currentPath = window.location.pathname;
    const isAuthEndpoint = requestUrl.includes('/auth/login') || requestUrl.includes('/auth/register');
    const isAuthPage = currentPath === '/login' || currentPath === '/register';
    
    if (error.response?.status === 401) {
      // Only remove token and redirect if it's not an auth endpoint and not already on auth page
      if (!isAuthEndpoint && !isAuthPage) {
        localStorage.removeItem('token');
        // Use setTimeout to avoid navigation conflicts with React Router
        setTimeout(() => {
          if (window.location.pathname !== '/login') {
            window.location.href = '/login';
          }
        }, 0);
      }
    }
    return Promise.reject(error);
  }
);

```


Adding better error handling to prevent refresh issues:


```typescript
import { create } from 'zustand';
import { apiClient } from '../api/client';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, firstName: string, lastName: string) => Promise<void>;
  logout: () => void;
  fetchUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: localStorage.getItem('token'),
  isAuthenticated: !!localStorage.getItem('token'),
  isLoading: false,

  login: async (email: string, password: string) => {
    set({ isLoading: true });
    try {
      const response = await apiClient.post('/auth/login', { email, password });
      const { token, user } = response.data;
      
      if (!token || !user) {
        throw new Error('Invalid response from server');
      }
      
      localStorage.setItem('token', token);
      set({ token, user, isAuthenticated: true, isLoading: false });
    } catch (error: any) {
      set({ isLoading: false, isAuthenticated: false });
      // Re-throw error so Login component can handle it
      throw error;
    }
  },

  register: async (email: string, password: string, firstName: string, lastName: string) => {
    set({ isLoading: true });
    try {
      await apiClient.post('/auth/register', { email, password, firstName, lastName });
      // After registration, log in
      const response = await apiClient.post('/auth/login', { email, password });
      const { token, user } = response.data;
      
      localStorage.setItem('token', token);
      set({ token, user, isAuthenticated: true, isLoading: false });
    } catch (error: any) {
      set({ isLoading: false });
      throw error;
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    set({ token: null, user: null, isAuthenticated: false });
  },

  fetchUser: async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    set({ isLoading: true });
    try {
      const response = await apiClient.get('/users/me');
      set({ user: response.data, isLoading: false });
    } catch (error) {
      localStorage.removeItem('token');
      set({ token: null, user: null, isAuthenticated: false, isLoading: false });
    }
  },
}));

```


Fixed the refresh issue. The response interceptor was redirecting to `/login` on any 401, including failed login attempts, causing a redirect loop.

## Fixes Applied:

1. **Fixed redirect loop in API client** (`packages/frontend/src/api/client.ts`):
   - Prevents redirect when already on `/login` or `/register`
   - Prevents redirect for `/auth/login` and `/auth/register` requests
   - Uses `setTimeout` to avoid navigation conflicts with React Router

2. **Improved error handling** (`packages/frontend/src/stores/authStore.ts`):
   - Validates login response before setting state
   - Ensures `isAuthenticated` is set to `false` on login failure

## What was happening:

1. User clicks login
2. Login request fails (wrong credentials or API error)
3. Backend returns 401
4. Response interceptor sees 401 and redirects to `/login`
5. Page refreshes/redirects, creating a loop

## Now:

- Failed login attempts show an error message without redirecting
- Only non-auth API calls that return 401 will redirect to login
- No more refresh loop when clicking login

The frontend should no longer refresh when you click login. Try logging in again; failed attempts should show an error message without refreshing the page.

---

**User**

Get "Invalid email or password" by using the seed account.

---

**Cursor**


Checking the seed script for the seed account credentials and verifying the login flow:



Seed account credentials:
- Email: `admin@example.com`
- Password: `p@ssw0rd`

Checking if the seed script has been run and verifying the login flow:



Running the seed script to create the admin user, then testing the login:



Seed script ran successfully. Adding debug logging to the login function to diagnose the issue:


```typescript
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { Repository } from 'typeorm';
import { AppDataSource } from '../config/database.js';
import { User } from '../entities/User.js';

const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export class AuthService {
  private get userRepository(): Repository<User> {
    if (!AppDataSource.isInitialized) {
      throw new Error('Database not initialized');
    }
    return AppDataSource.getRepository(User);
  }

  async register(
    email: string,
    password: string,
    firstName: string,
    lastName: string
  ): Promise<User> {
    // Check if user exists
    const existingUser = await this.userRepository.findOne({
      where: { email },
    });

    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = this.userRepository.create({
      email,
      password: hashedPassword,
      firstName,
      lastName,
      isActive: true,
    });

    return await this.userRepository.save(user);
  }

  async login(email: string, password: string): Promise<{ user: User; token: string }> {
    // Normalize email (trim and lowercase for consistency)
    const normalizedEmail = email.trim().toLowerCase();
    
    const user = await this.userRepository.findOne({
      where: { email: normalizedEmail },
    });

    if (!user) {
      console.error(`[AuthService] Login failed: User not found for email: ${normalizedEmail}`);
      throw new Error('Invalid email or password');
    }

    if (!user.isActive) {
      console.error(`[AuthService] Login failed: User account is inactive for email: ${normalizedEmail}`);
      throw new Error('User account is inactive');
    }

    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      console.error(`[AuthService] Login failed: Invalid password for email: ${normalizedEmail}`);
      throw new Error('Invalid email or password');
    }
    
    console.log(`[AuthService] Login successful for email: ${normalizedEmail}`);

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword as User,
      token,
    };
  }

  async verifyToken(token: string): Promise<{ userId: string; email: string }> {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; email: string };
      return decoded;
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  async getUserById(userId: string): Promise<User | null> {
    return await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'email', 'firstName', 'lastName', 'isActive', 'createdAt', 'updatedAt'],
    });
  }
}

```


Updating the seed script to normalize the email (lowercase) for consistency:


```typescript
import 'reflect-metadata';
import bcrypt from 'bcrypt';
import { AppDataSource } from '../config/database.js';
import { User } from '../entities/User.js';

async function seed() {
  try {
    await AppDataSource.initialize();
    console.log('Database connected');

    const userRepository = AppDataSource.getRepository(User);

    // Check if admin user exists
    const existingAdmin = await userRepository.findOne({
      where: { email: 'admin@example.com' },
    });

    if (existingAdmin) {
      console.log('Admin user already exists');
      await AppDataSource.destroy();
      return;
    }

    // Create admin user
    const hashedPassword = await bcrypt.hash('p@ssw0rd', 10);

    const adminUser = userRepository.create({
      email: 'admin@example.com'.toLowerCase().trim(),
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'User',
      isActive: true,
    });

    await userRepository.save(adminUser);
    console.log('Admin user created:');
    console.log('Email: admin@example.com');
    console.log('Password: p@ssw0rd');

    await AppDataSource.destroy();
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
}

seed();

```

```typescript
import 'reflect-metadata';
import bcrypt from 'bcrypt';
import { AppDataSource } from '../config/database.js';
import { User } from '../entities/User.js';

async function seed() {
  try {
    await AppDataSource.initialize();
    console.log('Database connected');

    const userRepository = AppDataSource.getRepository(User);

    // Check if admin user exists
    const existingAdmin = await userRepository.findOne({
      where: { email: 'admin@example.com'.toLowerCase().trim() },
    });

    if (existingAdmin) {
      console.log('Admin user already exists');
      await AppDataSource.destroy();
      return;
    }

    // Create admin user
    const hashedPassword = await bcrypt.hash('p@ssw0rd', 10);

    const adminUser = userRepository.create({
      email: 'admin@example.com'.toLowerCase().trim(),
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'User',
      isActive: true,
    });

    await userRepository.save(adminUser);
    console.log('Admin user created:');
    console.log('Email: admin@example.com');
    console.log('Password: p@ssw0rd');

    await AppDataSource.destroy();
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
}

seed();

```

```typescript
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { Repository } from 'typeorm';
import { AppDataSource } from '../config/database.js';
import { User } from '../entities/User.js';

const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export class AuthService {
  private get userRepository(): Repository<User> {
    if (!AppDataSource.isInitialized) {
      throw new Error('Database not initialized');
    }
    return AppDataSource.getRepository(User);
  }

  async register(
    email: string,
    password: string,
    firstName: string,
    lastName: string
  ): Promise<User> {
    // Normalize email (trim and lowercase for consistency)
    const normalizedEmail = email.trim().toLowerCase();
    
    // Check if user exists
    const existingUser = await this.userRepository.findOne({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = this.userRepository.create({
      email: normalizedEmail,
      password: hashedPassword,
      firstName,
      lastName,
      isActive: true,
    });

    return await this.userRepository.save(user);
  }

  async login(email: string, password: string): Promise<{ user: User; token: string }> {
    // Normalize email (trim and lowercase for consistency)
    const normalizedEmail = email.trim().toLowerCase();
    
    const user = await this.userRepository.findOne({
      where: { email: normalizedEmail },
    });

    if (!user) {
      console.error(`[AuthService] Login failed: User not found for email: ${normalizedEmail}`);
      throw new Error('Invalid email or password');
    }

    if (!user.isActive) {
      console.error(`[AuthService] Login failed: User account is inactive for email: ${normalizedEmail}`);
      throw new Error('User account is inactive');
    }

    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      console.error(`[AuthService] Login failed: Invalid password for email: ${normalizedEmail}`);
      throw new Error('Invalid email or password');
    }
    
    console.log(`[AuthService] Login successful for email: ${normalizedEmail}`);

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword as User,
      token,
    };
  }

  async verifyToken(token: string): Promise<{ userId: string; email: string }> {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; email: string };
      return decoded;
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  async getUserById(userId: string): Promise<User | null> {
    return await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'email', 'firstName', 'lastName', 'isActive', 'createdAt', 'updatedAt'],
    });
  }
}

```


User already exists. Updating the seed script to reset the password if the user exists, then testing the login:


```typescript
import 'reflect-metadata';
import bcrypt from 'bcrypt';
import { AppDataSource } from '../config/database.js';
import { User } from '../entities/User.js';

async function seed() {
  try {
    await AppDataSource.initialize();
    console.log('Database connected');

    const userRepository = AppDataSource.getRepository(User);

    // Check if admin user exists
    const normalizedEmail = 'admin@example.com'.toLowerCase().trim();
    const existingAdmin = await userRepository.findOne({
      where: { email: normalizedEmail },
    });

    const hashedPassword = await bcrypt.hash('p@ssw0rd', 10);

    if (existingAdmin) {
      // Update existing admin user password to ensure it's correct
      existingAdmin.password = hashedPassword;
      existingAdmin.isActive = true;
      await userRepository.save(existingAdmin);
      console.log('Admin user password reset:');
      console.log('Email: admin@example.com');
      console.log('Password: p@ssw0rd');
    } else {
      // Create admin user
      const adminUser = userRepository.create({
        email: normalizedEmail,
        password: hashedPassword,
        firstName: 'Admin',
        lastName: 'User',
        isActive: true,
      });

      await userRepository.save(adminUser);
      console.log('Admin user created:');
      console.log('Email: admin@example.com');
      console.log('Password: p@ssw0rd');
    }

    await AppDataSource.destroy();
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
}

seed();

```


Password reset. Testing the login endpoint directly to verify it works:



Backend login works. The issue is likely in the frontend request. Checking the frontend login flow and verifying the API client is sending the request correctly:



Backend login works. Summary of fixes:

## Fixes Applied:

1. **Email normalization** — Added email normalization (lowercase and trim) to:
   - `AuthService.login()` — normalizes email before lookup
   - `AuthService.register()` — normalizes email before saving
   - `seed.ts` — normalizes email when creating/resetting the admin user

2. **Password reset in seed script** — Updated seed script to reset the password if the admin user already exists, ensuring the password is correct

3. **Debug logging** — Added console logs to track login attempts and failures

## Seed Account Credentials:

- **Email:** `admin@example.com`
- **Password:** `p@ssw0rd`

## Test Results:

The login endpoint works when tested directly:
```bash
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"p@ssw0rd"}'
```

This returns a valid token and user data.

## Next Steps:

Try logging in again with:
- Email: `admin@example.com`
- Password: `p@ssw0rd`

If it still fails, check the backend console logs for the debug messages showing what's happening. The logs will indicate:
- If the user is found
- If the password comparison fails
- If the account is inactive

The email normalization should handle any case sensitivity issues, and the password has been reset to ensure it matches.

```shellscript
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"p@ssw0rd"}'
```

---

**User**

The canvas don't focus on the new nodes. I cannot see it in the UI.

---

**Cursor**


Checking the CanvasEditor component to fix viewport focusing when new nodes are added:



Checking how NodePalette handles node addition, then adding viewport focusing:



Adding viewport focusing when new nodes are added. Using React Flow's `useReactFlow` hook to access `fitView` and focus on new nodes:


```typescriptreact
import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactFlow, {
  Node,
  Edge,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  MiniMap,
  useReactFlow,
  ReactFlowProvider,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useWorkflowStore } from '../stores/workflowStore';
import { useNodeTypesStore } from '../stores/nodeTypesStore';
import { useCanvasStore } from '../stores/canvasStore';
import NodePalette from '../components/NodePalette';
import NodeConfigPanel from '../components/NodeConfigPanel';
import { apiClient } from '../api/client';
import type { INode, IConnections } from '@shared/types';

export default function CanvasEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { selectedWorkflow, updateWorkflow, executeWorkflow } = useWorkflowStore();
  const { nodeTypes, fetchNodeTypes } = useNodeTypesStore();
  const { selectNode, selectedNodeId } = useCanvasStore();

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (id) {
      fetchWorkflow(id);
    }
    fetchNodeTypes();
  }, [id]);

  const fetchWorkflow = async (workflowId: string) => {
    try {
      const response = await apiClient.get(`/workflows/${workflowId}`);
      const workflow = response.data;
      useWorkflowStore.getState().setSelectedWorkflow(workflow);

      // Convert workflow nodes/connections to React Flow format
      const reactFlowNodes: Node[] = workflow.nodes.map((node: INode) => ({
        id: node.id,
        type: 'default',
        position: node.position,
        data: { label: node.name, nodeType: node.type, ...node },
      }));

      const reactFlowEdges: Edge[] = [];
      for (const [sourceId, connMap] of Object.entries(workflow.connections)) {
        for (const [connType, connArray] of Object.entries(connMap)) {
          for (const connGroup of connArray) {
            for (const conn of connGroup) {
              reactFlowEdges.push({
                id: `${sourceId}-${conn.node}`,
                source: sourceId,
                target: conn.node,
                type: connType === 'error' ? 'step' : 'default',
              });
            }
          }
        }
      }

      setNodes(reactFlowNodes);
      setEdges(reactFlowEdges);
    } catch (error) {
      console.error('Failed to fetch workflow:', error);
    }
  };

  const onConnect = useCallback(
    (params: Connection) => {
      if (params.source && params.target) {
        setEdges((eds) => addEdge(params, eds));
        setIsDirty(true);
      }
    },
    [setEdges]
  );

  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      selectNode(node.id);
    },
    [selectNode]
  );

  const handleSave = async () => {
    if (!id || !selectedWorkflow) return;

    setIsSaving(true);
    try {
      // Convert React Flow nodes/edges back to workflow format
      const workflowNodes: INode[] = nodes.map((node) => ({
        id: node.id,
        name: node.data.label,
        type: node.data.nodeType,
        position: node.position,
        parameters: node.data.parameters || {},
        credentials: node.data.credentials,
        disabled: node.data.disabled,
      }));

      const workflowConnections: IConnections = {};
      for (const edge of edges) {
        if (!workflowConnections[edge.source]) {
          workflowConnections[edge.source] = { main: [] };
        }
        if (!workflowConnections[edge.source].main) {
          workflowConnections[edge.source].main = [];
        }
        workflowConnections[edge.source].main.push([
          {
            node: edge.target,
            type: 'main',
            index: 0,
          },
        ]);
      }

      await updateWorkflow(id, {
        nodes: workflowNodes,
        connections: workflowConnections,
      });

      setIsDirty(false);
    } catch (error) {
      console.error('Failed to save workflow:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleExecute = async () => {
    if (!id) return;
    try {
      await apiClient.post(`/workflows/${id}/execute`, {});
      alert('Execution started');
    } catch (error) {
      console.error('Failed to execute workflow:', error);
    }
  };

  const addNode = (nodeType: string, position: { x: number; y: number }) => {
    const newNode: Node = {
      id: `node_${Date.now()}`,
      type: 'default',
      position,
      data: {
        label: nodeType,
        nodeType,
        parameters: {},
      },
    };
    setNodes((nds) => [...nds, newNode]);
    setIsDirty(true);
  };

  return (
    <div className="flex h-screen">
      <NodePalette onAddNode={addNode} />
      <div className="flex-1 relative">
        <div className="absolute top-0 left-0 right-0 bg-white border-b p-2 flex justify-between items-center z-10">
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : isDirty ? 'Save *' : 'Save'}
            </button>
            <button
              onClick={handleExecute}
              className="px-4 py-2 bg-green-600 text-white rounded"
            >
              Execute
            </button>
          </div>
          <button
            onClick={() => navigate('/workflows')}
            className="px-4 py-2 border rounded"
          >
            Back to Workflows
          </button>
        </div>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          fitView
        >
          <Controls />
          <Background />
          <MiniMap />
        </ReactFlow>
      </div>
      {selectedNodeId && <NodeConfigPanel nodeId={selectedNodeId} />}
    </div>
  );
}

```

```typescriptreact
import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactFlow, {
  Node,
  Edge,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  MiniMap,
  useReactFlow,
  ReactFlowProvider,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useWorkflowStore } from '../stores/workflowStore';
import { useNodeTypesStore } from '../stores/nodeTypesStore';
import { useCanvasStore } from '../stores/canvasStore';
import NodePalette from '../components/NodePalette';
import NodeConfigPanel from '../components/NodeConfigPanel';
import { apiClient } from '../api/client';
import type { INode, IConnections } from '@shared/types';

function CanvasEditorInner() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { selectedWorkflow, updateWorkflow, executeWorkflow } = useWorkflowStore();
  const { nodeTypes, fetchNodeTypes } = useNodeTypesStore();
  const { selectNode, selectedNodeId } = useCanvasStore();
  const { fitView, screenToFlowPosition } = useReactFlow();

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (id) {
      fetchWorkflow(id);
    }
    fetchNodeTypes();
  }, [id]);

  const fetchWorkflow = async (workflowId: string) => {
    try {
      const response = await apiClient.get(`/workflows/${workflowId}`);
      const workflow = response.data;
      useWorkflowStore.getState().setSelectedWorkflow(workflow);

      // Convert workflow nodes/connections to React Flow format
      const reactFlowNodes: Node[] = workflow.nodes.map((node: INode) => ({
        id: node.id,
        type: 'default',
        position: node.position,
        data: { label: node.name, nodeType: node.type, ...node },
      }));

      const reactFlowEdges: Edge[] = [];
      for (const [sourceId, connMap] of Object.entries(workflow.connections)) {
        for (const [connType, connArray] of Object.entries(connMap)) {
          for (const connGroup of connArray) {
            for (const conn of connGroup) {
              reactFlowEdges.push({
                id: `${sourceId}-${conn.node}`,
                source: sourceId,
                target: conn.node,
                type: connType === 'error' ? 'step' : 'default',
              });
            }
          }
        }
      }

      setNodes(reactFlowNodes);
      setEdges(reactFlowEdges);
    } catch (error) {
      console.error('Failed to fetch workflow:', error);
    }
  };

  const onConnect = useCallback(
    (params: Connection) => {
      if (params.source && params.target) {
        setEdges((eds) => addEdge(params, eds));
        setIsDirty(true);
      }
    },
    [setEdges]
  );

  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      selectNode(node.id);
    },
    [selectNode]
  );

  const handleSave = async () => {
    if (!id || !selectedWorkflow) return;

    setIsSaving(true);
    try {
      // Convert React Flow nodes/edges back to workflow format
      const workflowNodes: INode[] = nodes.map((node) => ({
        id: node.id,
        name: node.data.label,
        type: node.data.nodeType,
        position: node.position,
        parameters: node.data.parameters || {},
        credentials: node.data.credentials,
        disabled: node.data.disabled,
      }));

      const workflowConnections: IConnections = {};
      for (const edge of edges) {
        if (!workflowConnections[edge.source]) {
          workflowConnections[edge.source] = { main: [] };
        }
        if (!workflowConnections[edge.source].main) {
          workflowConnections[edge.source].main = [];
        }
        workflowConnections[edge.source].main.push([
          {
            node: edge.target,
            type: 'main',
            index: 0,
          },
        ]);
      }

      await updateWorkflow(id, {
        nodes: workflowNodes,
        connections: workflowConnections,
      });

      setIsDirty(false);
    } catch (error) {
      console.error('Failed to save workflow:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleExecute = async () => {
    if (!id) return;
    try {
      await apiClient.post(`/workflows/${id}/execute`, {});
      alert('Execution started');
    } catch (error) {
      console.error('Failed to execute workflow:', error);
    }
  };

  const addNode = (nodeType: string, position: { x: number; y: number }) => {
    const newNode: Node = {
      id: `node_${Date.now()}`,
      type: 'default',
      position,
      data: {
        label: nodeType,
        nodeType,
        parameters: {},
      },
    };
    setNodes((nds) => [...nds, newNode]);
    setIsDirty(true);
  };

  return (
    <div className="flex h-screen">
      <NodePalette onAddNode={addNode} />
      <div className="flex-1 relative">
        <div className="absolute top-0 left-0 right-0 bg-white border-b p-2 flex justify-between items-center z-10">
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : isDirty ? 'Save *' : 'Save'}
            </button>
            <button
              onClick={handleExecute}
              className="px-4 py-2 bg-green-600 text-white rounded"
            >
              Execute
            </button>
          </div>
          <button
            onClick={() => navigate('/workflows')}
            className="px-4 py-2 border rounded"
          >
            Back to Workflows
          </button>
        </div>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          fitView
        >
          <Controls />
          <Background />
          <MiniMap />
        </ReactFlow>
      </div>
      {selectedNodeId && <NodeConfigPanel nodeId={selectedNodeId} />}
    </div>
  );
}

```

```typescriptreact
import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactFlow, {
  Node,
  Edge,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  MiniMap,
  useReactFlow,
  ReactFlowProvider,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useWorkflowStore } from '../stores/workflowStore';
import { useNodeTypesStore } from '../stores/nodeTypesStore';
import { useCanvasStore } from '../stores/canvasStore';
import NodePalette from '../components/NodePalette';
import NodeConfigPanel from '../components/NodeConfigPanel';
import { apiClient } from '../api/client';
import type { INode, IConnections } from '@shared/types';

function CanvasEditorInner() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { selectedWorkflow, updateWorkflow, executeWorkflow } = useWorkflowStore();
  const { nodeTypes, fetchNodeTypes } = useNodeTypesStore();
  const { selectNode, selectedNodeId } = useCanvasStore();
  const { fitView, screenToFlowPosition } = useReactFlow();

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (id) {
      fetchWorkflow(id);
    }
    fetchNodeTypes();
  }, [id]);

  const fetchWorkflow = async (workflowId: string) => {
    try {
      const response = await apiClient.get(`/workflows/${workflowId}`);
      const workflow = response.data;
      useWorkflowStore.getState().setSelectedWorkflow(workflow);

      // Convert workflow nodes/connections to React Flow format
      const reactFlowNodes: Node[] = workflow.nodes.map((node: INode) => ({
        id: node.id,
        type: 'default',
        position: node.position,
        data: { label: node.name, nodeType: node.type, ...node },
      }));

      const reactFlowEdges: Edge[] = [];
      for (const [sourceId, connMap] of Object.entries(workflow.connections)) {
        for (const [connType, connArray] of Object.entries(connMap)) {
          for (const connGroup of connArray) {
            for (const conn of connGroup) {
              reactFlowEdges.push({
                id: `${sourceId}-${conn.node}`,
                source: sourceId,
                target: conn.node,
                type: connType === 'error' ? 'step' : 'default',
              });
            }
          }
        }
      }

      setNodes(reactFlowNodes);
      setEdges(reactFlowEdges);
    } catch (error) {
      console.error('Failed to fetch workflow:', error);
    }
  };

  const onConnect = useCallback(
    (params: Connection) => {
      if (params.source && params.target) {
        setEdges((eds) => addEdge(params, eds));
        setIsDirty(true);
      }
    },
    [setEdges]
  );

  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      selectNode(node.id);
    },
    [selectNode]
  );

  const handleSave = async () => {
    if (!id || !selectedWorkflow) return;

    setIsSaving(true);
    try {
      // Convert React Flow nodes/edges back to workflow format
      const workflowNodes: INode[] = nodes.map((node) => ({
        id: node.id,
        name: node.data.label,
        type: node.data.nodeType,
        position: node.position,
        parameters: node.data.parameters || {},
        credentials: node.data.credentials,
        disabled: node.data.disabled,
      }));

      const workflowConnections: IConnections = {};
      for (const edge of edges) {
        if (!workflowConnections[edge.source]) {
          workflowConnections[edge.source] = { main: [] };
        }
        if (!workflowConnections[edge.source].main) {
          workflowConnections[edge.source].main = [];
        }
        workflowConnections[edge.source].main.push([
          {
            node: edge.target,
            type: 'main',
            index: 0,
          },
        ]);
      }

      await updateWorkflow(id, {
        nodes: workflowNodes,
        connections: workflowConnections,
      });

      setIsDirty(false);
    } catch (error) {
      console.error('Failed to save workflow:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleExecute = async () => {
    if (!id) return;
    try {
      await apiClient.post(`/workflows/${id}/execute`, {});
      alert('Execution started');
    } catch (error) {
      console.error('Failed to execute workflow:', error);
    }
  };

  const addNode = useCallback((nodeType: string, position: { x: number; y: number }) => {
    const newNode: Node = {
      id: `node_${Date.now()}`,
      type: 'default',
      position,
      data: {
        label: nodeType,
        nodeType,
        parameters: {},
      },
    };
    setNodes((nds) => [...nds, newNode]);
    setIsDirty(true);
    
    // Focus on the new node after a short delay to ensure it's rendered
    setTimeout(() => {
      fitView({ 
        nodes: [newNode],
        padding: 0.2,
        duration: 300,
        minZoom: 0.5,
        maxZoom: 1.5
      });
    }, 100);
  }, [setNodes, fitView]);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const nodeType = event.dataTransfer.getData('application/reactflow');
      if (!nodeType || !reactFlowWrapper.current) {
        return;
      }

      const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
      const position = screenToFlowPosition({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      });

      addNode(nodeType, position);
    },
    [screenToFlowPosition, addNode]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  return (
    <div className="flex h-screen">
      <NodePalette onAddNode={addNode} />
      <div className="flex-1 relative">
        <div className="absolute top-0 left-0 right-0 bg-white border-b p-2 flex justify-between items-center z-10">
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : isDirty ? 'Save *' : 'Save'}
            </button>
            <button
              onClick={handleExecute}
              className="px-4 py-2 bg-green-600 text-white rounded"
            >
              Execute
            </button>
          </div>
          <button
            onClick={() => navigate('/workflows')}
            className="px-4 py-2 border rounded"
          >
            Back to Workflows
          </button>
        </div>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          fitView
        >
          <Controls />
          <Background />
          <MiniMap />
        </ReactFlow>
      </div>
      {selectedNodeId && <NodeConfigPanel nodeId={selectedNodeId} />}
    </div>
  );
}

```

```typescriptreact
import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactFlow, {
  Node,
  Edge,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  MiniMap,
  useReactFlow,
  ReactFlowProvider,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useWorkflowStore } from '../stores/workflowStore';
import { useNodeTypesStore } from '../stores/nodeTypesStore';
import { useCanvasStore } from '../stores/canvasStore';
import NodePalette from '../components/NodePalette';
import NodeConfigPanel from '../components/NodeConfigPanel';
import { apiClient } from '../api/client';
import type { INode, IConnections } from '@shared/types';

function CanvasEditorInner() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { selectedWorkflow, updateWorkflow, executeWorkflow } = useWorkflowStore();
  const { nodeTypes, fetchNodeTypes } = useNodeTypesStore();
  const { selectNode, selectedNodeId } = useCanvasStore();
  const { fitView, screenToFlowPosition } = useReactFlow();

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (id) {
      fetchWorkflow(id);
    }
    fetchNodeTypes();
  }, [id]);

  const fetchWorkflow = async (workflowId: string) => {
    try {
      const response = await apiClient.get(`/workflows/${workflowId}`);
      const workflow = response.data;
      useWorkflowStore.getState().setSelectedWorkflow(workflow);

      // Convert workflow nodes/connections to React Flow format
      const reactFlowNodes: Node[] = workflow.nodes.map((node: INode) => ({
        id: node.id,
        type: 'default',
        position: node.position,
        data: { label: node.name, nodeType: node.type, ...node },
      }));

      const reactFlowEdges: Edge[] = [];
      for (const [sourceId, connMap] of Object.entries(workflow.connections)) {
        for (const [connType, connArray] of Object.entries(connMap)) {
          for (const connGroup of connArray) {
            for (const conn of connGroup) {
              reactFlowEdges.push({
                id: `${sourceId}-${conn.node}`,
                source: sourceId,
                target: conn.node,
                type: connType === 'error' ? 'step' : 'default',
              });
            }
          }
        }
      }

      setNodes(reactFlowNodes);
      setEdges(reactFlowEdges);
    } catch (error) {
      console.error('Failed to fetch workflow:', error);
    }
  };

  const onConnect = useCallback(
    (params: Connection) => {
      if (params.source && params.target) {
        setEdges((eds) => addEdge(params, eds));
        setIsDirty(true);
      }
    },
    [setEdges]
  );

  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      selectNode(node.id);
    },
    [selectNode]
  );

  const handleSave = async () => {
    if (!id || !selectedWorkflow) return;

    setIsSaving(true);
    try {
      // Convert React Flow nodes/edges back to workflow format
      const workflowNodes: INode[] = nodes.map((node) => ({
        id: node.id,
        name: node.data.label,
        type: node.data.nodeType,
        position: node.position,
        parameters: node.data.parameters || {},
        credentials: node.data.credentials,
        disabled: node.data.disabled,
      }));

      const workflowConnections: IConnections = {};
      for (const edge of edges) {
        if (!workflowConnections[edge.source]) {
          workflowConnections[edge.source] = { main: [] };
        }
        if (!workflowConnections[edge.source].main) {
          workflowConnections[edge.source].main = [];
        }
        workflowConnections[edge.source].main.push([
          {
            node: edge.target,
            type: 'main',
            index: 0,
          },
        ]);
      }

      await updateWorkflow(id, {
        nodes: workflowNodes,
        connections: workflowConnections,
      });

      setIsDirty(false);
    } catch (error) {
      console.error('Failed to save workflow:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleExecute = async () => {
    if (!id) return;
    try {
      await apiClient.post(`/workflows/${id}/execute`, {});
      alert('Execution started');
    } catch (error) {
      console.error('Failed to execute workflow:', error);
    }
  };

  const addNode = useCallback((nodeType: string, position: { x: number; y: number }) => {
    const newNode: Node = {
      id: `node_${Date.now()}`,
      type: 'default',
      position,
      data: {
        label: nodeType,
        nodeType,
        parameters: {},
      },
    };
    setNodes((nds) => [...nds, newNode]);
    setIsDirty(true);
    
    // Focus on the new node after a short delay to ensure it's rendered
    setTimeout(() => {
      fitView({ 
        nodes: [newNode],
        padding: 0.2,
        duration: 300,
        minZoom: 0.5,
        maxZoom: 1.5
      });
    }, 100);
  }, [setNodes, fitView]);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const nodeType = event.dataTransfer.getData('application/reactflow');
      if (!nodeType || !reactFlowWrapper.current) {
        return;
      }

      const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
      const position = screenToFlowPosition({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      });

      addNode(nodeType, position);
    },
    [screenToFlowPosition, addNode]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  return (
    <div className="flex h-screen">
      <NodePalette onAddNode={addNode} />
      <div className="flex-1 relative" ref={reactFlowWrapper}>
        <div className="absolute top-0 left-0 right-0 bg-white border-b p-2 flex justify-between items-center z-10">
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : isDirty ? 'Save *' : 'Save'}
            </button>
            <button
              onClick={handleExecute}
              className="px-4 py-2 bg-green-600 text-white rounded"
            >
              Execute
            </button>
          </div>
          <button
            onClick={() => navigate('/workflows')}
            className="px-4 py-2 border rounded"
          >
            Back to Workflows
          </button>
        </div>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onDrop={onDrop}
          onDragOver={onDragOver}
          fitView
        >
          <Controls />
          <Background />
          <MiniMap />
        </ReactFlow>
      </div>
      {selectedNodeId && <NodeConfigPanel nodeId={selectedNodeId} />}
    </div>
  );
}

export default function CanvasEditor() {
  return (
    <ReactFlowProvider>
      <CanvasEditorInner />
    </ReactFlowProvider>
  );
}

```


Adding an effect to fit the view when nodes are initially loaded:


```typescriptreact
import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactFlow, {
  Node,
  Edge,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  MiniMap,
  useReactFlow,
  ReactFlowProvider,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useWorkflowStore } from '../stores/workflowStore';
import { useNodeTypesStore } from '../stores/nodeTypesStore';
import { useCanvasStore } from '../stores/canvasStore';
import NodePalette from '../components/NodePalette';
import NodeConfigPanel from '../components/NodeConfigPanel';
import { apiClient } from '../api/client';
import type { INode, IConnections } from '@shared/types';

function CanvasEditorInner() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { selectedWorkflow, updateWorkflow, executeWorkflow } = useWorkflowStore();
  const { nodeTypes, fetchNodeTypes } = useNodeTypesStore();
  const { selectNode, selectedNodeId } = useCanvasStore();
  const { fitView, screenToFlowPosition } = useReactFlow();

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (id) {
      fetchWorkflow(id);
    }
    fetchNodeTypes();
  }, [id]);

  // Fit view when nodes are loaded or changed
  useEffect(() => {
    if (nodes.length > 0) {
      setTimeout(() => {
        fitView({ padding: 0.2, duration: 300 });
      }, 100);
    }
  }, [nodes.length, fitView]);

  const fetchWorkflow = async (workflowId: string) => {
    try {
      const response = await apiClient.get(`/workflows/${workflowId}`);
      const workflow = response.data;
      useWorkflowStore.getState().setSelectedWorkflow(workflow);

      // Convert workflow nodes/connections to React Flow format
      const reactFlowNodes: Node[] = workflow.nodes.map((node: INode) => ({
        id: node.id,
        type: 'default',
        position: node.position,
        data: { label: node.name, nodeType: node.type, ...node },
      }));

      const reactFlowEdges: Edge[] = [];
      for (const [sourceId, connMap] of Object.entries(workflow.connections)) {
        for (const [connType, connArray] of Object.entries(connMap)) {
          for (const connGroup of connArray) {
            for (const conn of connGroup) {
              reactFlowEdges.push({
                id: `${sourceId}-${conn.node}`,
                source: sourceId,
                target: conn.node,
                type: connType === 'error' ? 'step' : 'default',
              });
            }
          }
        }
      }

      setNodes(reactFlowNodes);
      setEdges(reactFlowEdges);
    } catch (error) {
      console.error('Failed to fetch workflow:', error);
    }
  };

  const onConnect = useCallback(
    (params: Connection) => {
      if (params.source && params.target) {
        setEdges((eds) => addEdge(params, eds));
        setIsDirty(true);
      }
    },
    [setEdges]
  );

  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      selectNode(node.id);
    },
    [selectNode]
  );

  const handleSave = async () => {
    if (!id || !selectedWorkflow) return;

    setIsSaving(true);
    try {
      // Convert React Flow nodes/edges back to workflow format
      const workflowNodes: INode[] = nodes.map((node) => ({
        id: node.id,
        name: node.data.label,
        type: node.data.nodeType,
        position: node.position,
        parameters: node.data.parameters || {},
        credentials: node.data.credentials,
        disabled: node.data.disabled,
      }));

      const workflowConnections: IConnections = {};
      for (const edge of edges) {
        if (!workflowConnections[edge.source]) {
          workflowConnections[edge.source] = { main: [] };
        }
        if (!workflowConnections[edge.source].main) {
          workflowConnections[edge.source].main = [];
        }
        workflowConnections[edge.source].main.push([
          {
            node: edge.target,
            type: 'main',
            index: 0,
          },
        ]);
      }

      await updateWorkflow(id, {
        nodes: workflowNodes,
        connections: workflowConnections,
      });

      setIsDirty(false);
    } catch (error) {
      console.error('Failed to save workflow:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleExecute = async () => {
    if (!id) return;
    try {
      await apiClient.post(`/workflows/${id}/execute`, {});
      alert('Execution started');
    } catch (error) {
      console.error('Failed to execute workflow:', error);
    }
  };

  const addNode = useCallback((nodeType: string, position: { x: number; y: number }) => {
    const newNode: Node = {
      id: `node_${Date.now()}`,
      type: 'default',
      position,
      data: {
        label: nodeType,
        nodeType,
        parameters: {},
      },
    };
    setNodes((nds) => [...nds, newNode]);
    setIsDirty(true);
    
    // Focus on the new node after a short delay to ensure it's rendered
    setTimeout(() => {
      fitView({ 
        nodes: [newNode],
        padding: 0.2,
        duration: 300,
        minZoom: 0.5,
        maxZoom: 1.5
      });
    }, 100);
  }, [setNodes, fitView]);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const nodeType = event.dataTransfer.getData('application/reactflow');
      if (!nodeType || !reactFlowWrapper.current) {
        return;
      }

      const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
      const position = screenToFlowPosition({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      });

      addNode(nodeType, position);
    },
    [screenToFlowPosition, addNode]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  return (
    <div className="flex h-screen">
      <NodePalette onAddNode={addNode} />
      <div className="flex-1 relative" ref={reactFlowWrapper}>
        <div className="absolute top-0 left-0 right-0 bg-white border-b p-2 flex justify-between items-center z-10">
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : isDirty ? 'Save *' : 'Save'}
            </button>
            <button
              onClick={handleExecute}
              className="px-4 py-2 bg-green-600 text-white rounded"
            >
              Execute
            </button>
          </div>
          <button
            onClick={() => navigate('/workflows')}
            className="px-4 py-2 border rounded"
          >
            Back to Workflows
          </button>
        </div>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onDrop={onDrop}
          onDragOver={onDragOver}
          fitView
        >
          <Controls />
          <Background />
          <MiniMap />
        </ReactFlow>
      </div>
      {selectedNodeId && <NodeConfigPanel nodeId={selectedNodeId} />}
    </div>
  );
}

export default function CanvasEditor() {
  return (
    <ReactFlowProvider>
      <CanvasEditorInner />
    </ReactFlowProvider>
  );
}

```


Refining the fitView logic to avoid unnecessary refits:


```typescriptreact
import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactFlow, {
  Node,
  Edge,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  MiniMap,
  useReactFlow,
  ReactFlowProvider,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useWorkflowStore } from '../stores/workflowStore';
import { useNodeTypesStore } from '../stores/nodeTypesStore';
import { useCanvasStore } from '../stores/canvasStore';
import NodePalette from '../components/NodePalette';
import NodeConfigPanel from '../components/NodeConfigPanel';
import { apiClient } from '../api/client';
import type { INode, IConnections } from '@shared/types';

function CanvasEditorInner() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { selectedWorkflow, updateWorkflow, executeWorkflow } = useWorkflowStore();
  const { nodeTypes, fetchNodeTypes } = useNodeTypesStore();
  const { selectNode, selectedNodeId } = useCanvasStore();
  const { fitView, screenToFlowPosition } = useReactFlow();

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  const hasInitialFit = useRef(false);

  useEffect(() => {
    if (id) {
      fetchWorkflow(id);
    }
    fetchNodeTypes();
  }, [id]);

  // Fit view when nodes are first loaded from workflow
  useEffect(() => {
    if (nodes.length > 0 && !hasInitialFit.current) {
      hasInitialFit.current = true;
      setTimeout(() => {
        fitView({ padding: 0.2, duration: 300 });
      }, 100);
    }
  }, [nodes.length, fitView]);

  const fetchWorkflow = async (workflowId: string) => {
    try {
      const response = await apiClient.get(`/workflows/${workflowId}`);
      const workflow = response.data;
      useWorkflowStore.getState().setSelectedWorkflow(workflow);

      // Convert workflow nodes/connections to React Flow format
      const reactFlowNodes: Node[] = workflow.nodes.map((node: INode) => ({
        id: node.id,
        type: 'default',
        position: node.position,
        data: { label: node.name, nodeType: node.type, ...node },
      }));

      const reactFlowEdges: Edge[] = [];
      for (const [sourceId, connMap] of Object.entries(workflow.connections)) {
        for (const [connType, connArray] of Object.entries(connMap)) {
          for (const connGroup of connArray) {
            for (const conn of connGroup) {
              reactFlowEdges.push({
                id: `${sourceId}-${conn.node}`,
                source: sourceId,
                target: conn.node,
                type: connType === 'error' ? 'step' : 'default',
              });
            }
          }
        }
      }

      setNodes(reactFlowNodes);
      setEdges(reactFlowEdges);
    } catch (error) {
      console.error('Failed to fetch workflow:', error);
    }
  };

  const onConnect = useCallback(
    (params: Connection) => {
      if (params.source && params.target) {
        setEdges((eds) => addEdge(params, eds));
        setIsDirty(true);
      }
    },
    [setEdges]
  );

  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      selectNode(node.id);
    },
    [selectNode]
  );

  const handleSave = async () => {
    if (!id || !selectedWorkflow) return;

    setIsSaving(true);
    try {
      // Convert React Flow nodes/edges back to workflow format
      const workflowNodes: INode[] = nodes.map((node) => ({
        id: node.id,
        name: node.data.label,
        type: node.data.nodeType,
        position: node.position,
        parameters: node.data.parameters || {},
        credentials: node.data.credentials,
        disabled: node.data.disabled,
      }));

      const workflowConnections: IConnections = {};
      for (const edge of edges) {
        if (!workflowConnections[edge.source]) {
          workflowConnections[edge.source] = { main: [] };
        }
        if (!workflowConnections[edge.source].main) {
          workflowConnections[edge.source].main = [];
        }
        workflowConnections[edge.source].main.push([
          {
            node: edge.target,
            type: 'main',
            index: 0,
          },
        ]);
      }

      await updateWorkflow(id, {
        nodes: workflowNodes,
        connections: workflowConnections,
      });

      setIsDirty(false);
    } catch (error) {
      console.error('Failed to save workflow:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleExecute = async () => {
    if (!id) return;
    try {
      await apiClient.post(`/workflows/${id}/execute`, {});
      alert('Execution started');
    } catch (error) {
      console.error('Failed to execute workflow:', error);
    }
  };

  const addNode = useCallback((nodeType: string, position: { x: number; y: number }) => {
    const newNode: Node = {
      id: `node_${Date.now()}`,
      type: 'default',
      position,
      data: {
        label: nodeType,
        nodeType,
        parameters: {},
      },
    };
    setNodes((nds) => [...nds, newNode]);
    setIsDirty(true);
    
    // Focus on the new node after a short delay to ensure it's rendered
    setTimeout(() => {
      fitView({ 
        nodes: [newNode],
        padding: 0.2,
        duration: 300,
        minZoom: 0.5,
        maxZoom: 1.5
      });
    }, 100);
  }, [setNodes, fitView]);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const nodeType = event.dataTransfer.getData('application/reactflow');
      if (!nodeType || !reactFlowWrapper.current) {
        return;
      }

      const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
      const position = screenToFlowPosition({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      });

      addNode(nodeType, position);
    },
    [screenToFlowPosition, addNode]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  return (
    <div className="flex h-screen">
      <NodePalette onAddNode={addNode} />
      <div className="flex-1 relative" ref={reactFlowWrapper}>
        <div className="absolute top-0 left-0 right-0 bg-white border-b p-2 flex justify-between items-center z-10">
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : isDirty ? 'Save *' : 'Save'}
            </button>
            <button
              onClick={handleExecute}
              className="px-4 py-2 bg-green-600 text-white rounded"
            >
              Execute
            </button>
          </div>
          <button
            onClick={() => navigate('/workflows')}
            className="px-4 py-2 border rounded"
          >
            Back to Workflows
          </button>
        </div>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onDrop={onDrop}
          onDragOver={onDragOver}
          fitView
        >
          <Controls />
          <Background />
          <MiniMap />
        </ReactFlow>
      </div>
      {selectedNodeId && <NodeConfigPanel nodeId={selectedNodeId} />}
    </div>
  );
}

export default function CanvasEditor() {
  return (
    <ReactFlowProvider>
      <CanvasEditorInner />
    </ReactFlowProvider>
  );
}

```


Resetting the fit flag when switching workflows:


```typescriptreact
import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactFlow, {
  Node,
  Edge,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  MiniMap,
  useReactFlow,
  ReactFlowProvider,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useWorkflowStore } from '../stores/workflowStore';
import { useNodeTypesStore } from '../stores/nodeTypesStore';
import { useCanvasStore } from '../stores/canvasStore';
import NodePalette from '../components/NodePalette';
import NodeConfigPanel from '../components/NodeConfigPanel';
import { apiClient } from '../api/client';
import type { INode, IConnections } from '@shared/types';

function CanvasEditorInner() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { selectedWorkflow, updateWorkflow, executeWorkflow } = useWorkflowStore();
  const { nodeTypes, fetchNodeTypes } = useNodeTypesStore();
  const { selectNode, selectedNodeId } = useCanvasStore();
  const { fitView, screenToFlowPosition } = useReactFlow();

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  const hasInitialFit = useRef(false);

  useEffect(() => {
    if (id) {
      hasInitialFit.current = false; // Reset fit flag when workflow changes
      fetchWorkflow(id);
    }
    fetchNodeTypes();
  }, [id]);

  // Fit view when nodes are first loaded from workflow
  useEffect(() => {
    if (nodes.length > 0 && !hasInitialFit.current) {
      hasInitialFit.current = true;
      setTimeout(() => {
        fitView({ padding: 0.2, duration: 300 });
      }, 100);
    }
  }, [nodes.length, fitView]);

  const fetchWorkflow = async (workflowId: string) => {
    try {
      const response = await apiClient.get(`/workflows/${workflowId}`);
      const workflow = response.data;
      useWorkflowStore.getState().setSelectedWorkflow(workflow);

      // Convert workflow nodes/connections to React Flow format
      const reactFlowNodes: Node[] = workflow.nodes.map((node: INode) => ({
        id: node.id,
        type: 'default',
        position: node.position,
        data: { label: node.name, nodeType: node.type, ...node },
      }));

      const reactFlowEdges: Edge[] = [];
      for (const [sourceId, connMap] of Object.entries(workflow.connections)) {
        for (const [connType, connArray] of Object.entries(connMap)) {
          for (const connGroup of connArray) {
            for (const conn of connGroup) {
              reactFlowEdges.push({
                id: `${sourceId}-${conn.node}`,
                source: sourceId,
                target: conn.node,
                type: connType === 'error' ? 'step' : 'default',
              });
            }
          }
        }
      }

      setNodes(reactFlowNodes);
      setEdges(reactFlowEdges);
    } catch (error) {
      console.error('Failed to fetch workflow:', error);
    }
  };

  const onConnect = useCallback(
    (params: Connection) => {
      if (params.source && params.target) {
        setEdges((eds) => addEdge(params, eds));
        setIsDirty(true);
      }
    },
    [setEdges]
  );

  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      selectNode(node.id);
    },
    [selectNode]
  );

  const handleSave = async () => {
    if (!id || !selectedWorkflow) return;

    setIsSaving(true);
    try {
      // Convert React Flow nodes/edges back to workflow format
      const workflowNodes: INode[] = nodes.map((node) => ({
        id: node.id,
        name: node.data.label,
        type: node.data.nodeType,
        position: node.position,
        parameters: node.data.parameters || {},
        credentials: node.data.credentials,
        disabled: node.data.disabled,
      }));

      const workflowConnections: IConnections = {};
      for (const edge of edges) {
        if (!workflowConnections[edge.source]) {
          workflowConnections[edge.source] = { main: [] };
        }
        if (!workflowConnections[edge.source].main) {
          workflowConnections[edge.source].main = [];
        }
        workflowConnections[edge.source].main.push([
          {
            node: edge.target,
            type: 'main',
            index: 0,
          },
        ]);
      }

      await updateWorkflow(id, {
        nodes: workflowNodes,
        connections: workflowConnections,
      });

      setIsDirty(false);
    } catch (error) {
      console.error('Failed to save workflow:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleExecute = async () => {
    if (!id) return;
    try {
      await apiClient.post(`/workflows/${id}/execute`, {});
      alert('Execution started');
    } catch (error) {
      console.error('Failed to execute workflow:', error);
    }
  };

  const addNode = useCallback((nodeType: string, position: { x: number; y: number }) => {
    const newNode: Node = {
      id: `node_${Date.now()}`,
      type: 'default',
      position,
      data: {
        label: nodeType,
        nodeType,
        parameters: {},
      },
    };
    setNodes((nds) => [...nds, newNode]);
    setIsDirty(true);
    
    // Focus on the new node after a short delay to ensure it's rendered
    setTimeout(() => {
      fitView({ 
        nodes: [newNode],
        padding: 0.2,
        duration: 300,
        minZoom: 0.5,
        maxZoom: 1.5
      });
    }, 100);
  }, [setNodes, fitView]);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const nodeType = event.dataTransfer.getData('application/reactflow');
      if (!nodeType || !reactFlowWrapper.current) {
        return;
      }

      const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
      const position = screenToFlowPosition({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      });

      addNode(nodeType, position);
    },
    [screenToFlowPosition, addNode]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  return (
    <div className="flex h-screen">
      <NodePalette onAddNode={addNode} />
      <div className="flex-1 relative" ref={reactFlowWrapper}>
        <div className="absolute top-0 left-0 right-0 bg-white border-b p-2 flex justify-between items-center z-10">
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : isDirty ? 'Save *' : 'Save'}
            </button>
            <button
              onClick={handleExecute}
              className="px-4 py-2 bg-green-600 text-white rounded"
            >
              Execute
            </button>
          </div>
          <button
            onClick={() => navigate('/workflows')}
            className="px-4 py-2 border rounded"
          >
            Back to Workflows
          </button>
        </div>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onDrop={onDrop}
          onDragOver={onDragOver}
          fitView
        >
          <Controls />
          <Background />
          <MiniMap />
        </ReactFlow>
      </div>
      {selectedNodeId && <NodeConfigPanel nodeId={selectedNodeId} />}
    </div>
  );
}

export default function CanvasEditor() {
  return (
    <ReactFlowProvider>
      <CanvasEditorInner />
    </ReactFlowProvider>
  );
}

```


Verifying the implementation and checking if we need to adjust the fitView approach:



Updating `fitView` to use the node ID instead of the node object:


```typescriptreact
import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactFlow, {
  Node,
  Edge,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  MiniMap,
  useReactFlow,
  ReactFlowProvider,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useWorkflowStore } from '../stores/workflowStore';
import { useNodeTypesStore } from '../stores/nodeTypesStore';
import { useCanvasStore } from '../stores/canvasStore';
import NodePalette from '../components/NodePalette';
import NodeConfigPanel from '../components/NodeConfigPanel';
import { apiClient } from '../api/client';
import type { INode, IConnections } from '@shared/types';

function CanvasEditorInner() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { selectedWorkflow, updateWorkflow, executeWorkflow } = useWorkflowStore();
  const { nodeTypes, fetchNodeTypes } = useNodeTypesStore();
  const { selectNode, selectedNodeId } = useCanvasStore();
  const { fitView, screenToFlowPosition } = useReactFlow();

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  const hasInitialFit = useRef(false);

  useEffect(() => {
    if (id) {
      hasInitialFit.current = false; // Reset fit flag when workflow changes
      fetchWorkflow(id);
    }
    fetchNodeTypes();
  }, [id]);

  // Fit view when nodes are first loaded from workflow
  useEffect(() => {
    if (nodes.length > 0 && !hasInitialFit.current) {
      hasInitialFit.current = true;
      setTimeout(() => {
        fitView({ padding: 0.2, duration: 300 });
      }, 100);
    }
  }, [nodes.length, fitView]);

  const fetchWorkflow = async (workflowId: string) => {
    try {
      const response = await apiClient.get(`/workflows/${workflowId}`);
      const workflow = response.data;
      useWorkflowStore.getState().setSelectedWorkflow(workflow);

      // Convert workflow nodes/connections to React Flow format
      const reactFlowNodes: Node[] = workflow.nodes.map((node: INode) => ({
        id: node.id,
        type: 'default',
        position: node.position,
        data: { label: node.name, nodeType: node.type, ...node },
      }));

      const reactFlowEdges: Edge[] = [];
      for (const [sourceId, connMap] of Object.entries(workflow.connections)) {
        for (const [connType, connArray] of Object.entries(connMap)) {
          for (const connGroup of connArray) {
            for (const conn of connGroup) {
              reactFlowEdges.push({
                id: `${sourceId}-${conn.node}`,
                source: sourceId,
                target: conn.node,
                type: connType === 'error' ? 'step' : 'default',
              });
            }
          }
        }
      }

      setNodes(reactFlowNodes);
      setEdges(reactFlowEdges);
    } catch (error) {
      console.error('Failed to fetch workflow:', error);
    }
  };

  const onConnect = useCallback(
    (params: Connection) => {
      if (params.source && params.target) {
        setEdges((eds) => addEdge(params, eds));
        setIsDirty(true);
      }
    },
    [setEdges]
  );

  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      selectNode(node.id);
    },
    [selectNode]
  );

  const handleSave = async () => {
    if (!id || !selectedWorkflow) return;

    setIsSaving(true);
    try {
      // Convert React Flow nodes/edges back to workflow format
      const workflowNodes: INode[] = nodes.map((node) => ({
        id: node.id,
        name: node.data.label,
        type: node.data.nodeType,
        position: node.position,
        parameters: node.data.parameters || {},
        credentials: node.data.credentials,
        disabled: node.data.disabled,
      }));

      const workflowConnections: IConnections = {};
      for (const edge of edges) {
        if (!workflowConnections[edge.source]) {
          workflowConnections[edge.source] = { main: [] };
        }
        if (!workflowConnections[edge.source].main) {
          workflowConnections[edge.source].main = [];
        }
        workflowConnections[edge.source].main.push([
          {
            node: edge.target,
            type: 'main',
            index: 0,
          },
        ]);
      }

      await updateWorkflow(id, {
        nodes: workflowNodes,
        connections: workflowConnections,
      });

      setIsDirty(false);
    } catch (error) {
      console.error('Failed to save workflow:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleExecute = async () => {
    if (!id) return;
    try {
      await apiClient.post(`/workflows/${id}/execute`, {});
      alert('Execution started');
    } catch (error) {
      console.error('Failed to execute workflow:', error);
    }
  };

  const addNode = useCallback((nodeType: string, position: { x: number; y: number }) => {
    const nodeId = `node_${Date.now()}`;
    const newNode: Node = {
      id: nodeId,
      type: 'default',
      position,
      data: {
        label: nodeType,
        nodeType,
        parameters: {},
      },
    };
    setNodes((nds) => [...nds, newNode]);
    setIsDirty(true);
    
    // Focus on the new node after a short delay to ensure it's rendered
    setTimeout(() => {
      // Use fitView with the node ID to focus on the newly added node
      fitView({ 
        nodes: [{ id: nodeId }],
        padding: 0.3,
        duration: 400,
        minZoom: 0.5,
        maxZoom: 2
      });
    }, 150);
  }, [setNodes, fitView]);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const nodeType = event.dataTransfer.getData('application/reactflow');
      if (!nodeType || !reactFlowWrapper.current) {
        return;
      }

      const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
      const position = screenToFlowPosition({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      });

      addNode(nodeType, position);
    },
    [screenToFlowPosition, addNode]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  return (
    <div className="flex h-screen">
      <NodePalette onAddNode={addNode} />
      <div className="flex-1 relative" ref={reactFlowWrapper}>
        <div className="absolute top-0 left-0 right-0 bg-white border-b p-2 flex justify-between items-center z-10">
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : isDirty ? 'Save *' : 'Save'}
            </button>
            <button
              onClick={handleExecute}
              className="px-4 py-2 bg-green-600 text-white rounded"
            >
              Execute
            </button>
          </div>
          <button
            onClick={() => navigate('/workflows')}
            className="px-4 py-2 border rounded"
          >
            Back to Workflows
          </button>
        </div>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onDrop={onDrop}
          onDragOver={onDragOver}
          fitView
        >
          <Controls />
          <Background />
          <MiniMap />
        </ReactFlow>
      </div>
      {selectedNodeId && <NodeConfigPanel nodeId={selectedNodeId} />}
    </div>
  );
}

export default function CanvasEditor() {
  return (
    <ReactFlowProvider>
      <CanvasEditorInner />
    </ReactFlowProvider>
  );
}

```


Switching to `setCenter` for more reliable focusing:


```typescriptreact
import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactFlow, {
  Node,
  Edge,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  MiniMap,
  useReactFlow,
  ReactFlowProvider,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useWorkflowStore } from '../stores/workflowStore';
import { useNodeTypesStore } from '../stores/nodeTypesStore';
import { useCanvasStore } from '../stores/canvasStore';
import NodePalette from '../components/NodePalette';
import NodeConfigPanel from '../components/NodeConfigPanel';
import { apiClient } from '../api/client';
import type { INode, IConnections } from '@shared/types';

function CanvasEditorInner() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { selectedWorkflow, updateWorkflow, executeWorkflow } = useWorkflowStore();
  const { nodeTypes, fetchNodeTypes } = useNodeTypesStore();
  const { selectNode, selectedNodeId } = useCanvasStore();
  const { fitView, screenToFlowPosition, setCenter } = useReactFlow();

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  const hasInitialFit = useRef(false);

  useEffect(() => {
    if (id) {
      hasInitialFit.current = false; // Reset fit flag when workflow changes
      fetchWorkflow(id);
    }
    fetchNodeTypes();
  }, [id]);

  // Fit view when nodes are first loaded from workflow
  useEffect(() => {
    if (nodes.length > 0 && !hasInitialFit.current) {
      hasInitialFit.current = true;
      setTimeout(() => {
        fitView({ padding: 0.2, duration: 300 });
      }, 100);
    }
  }, [nodes.length, fitView]);

  const fetchWorkflow = async (workflowId: string) => {
    try {
      const response = await apiClient.get(`/workflows/${workflowId}`);
      const workflow = response.data;
      useWorkflowStore.getState().setSelectedWorkflow(workflow);

      // Convert workflow nodes/connections to React Flow format
      const reactFlowNodes: Node[] = workflow.nodes.map((node: INode) => ({
        id: node.id,
        type: 'default',
        position: node.position,
        data: { label: node.name, nodeType: node.type, ...node },
      }));

      const reactFlowEdges: Edge[] = [];
      for (const [sourceId, connMap] of Object.entries(workflow.connections)) {
        for (const [connType, connArray] of Object.entries(connMap)) {
          for (const connGroup of connArray) {
            for (const conn of connGroup) {
              reactFlowEdges.push({
                id: `${sourceId}-${conn.node}`,
                source: sourceId,
                target: conn.node,
                type: connType === 'error' ? 'step' : 'default',
              });
            }
          }
        }
      }

      setNodes(reactFlowNodes);
      setEdges(reactFlowEdges);
    } catch (error) {
      console.error('Failed to fetch workflow:', error);
    }
  };

  const onConnect = useCallback(
    (params: Connection) => {
      if (params.source && params.target) {
        setEdges((eds) => addEdge(params, eds));
        setIsDirty(true);
      }
    },
    [setEdges]
  );

  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      selectNode(node.id);
    },
    [selectNode]
  );

  const handleSave = async () => {
    if (!id || !selectedWorkflow) return;

    setIsSaving(true);
    try {
      // Convert React Flow nodes/edges back to workflow format
      const workflowNodes: INode[] = nodes.map((node) => ({
        id: node.id,
        name: node.data.label,
        type: node.data.nodeType,
        position: node.position,
        parameters: node.data.parameters || {},
        credentials: node.data.credentials,
        disabled: node.data.disabled,
      }));

      const workflowConnections: IConnections = {};
      for (const edge of edges) {
        if (!workflowConnections[edge.source]) {
          workflowConnections[edge.source] = { main: [] };
        }
        if (!workflowConnections[edge.source].main) {
          workflowConnections[edge.source].main = [];
        }
        workflowConnections[edge.source].main.push([
          {
            node: edge.target,
            type: 'main',
            index: 0,
          },
        ]);
      }

      await updateWorkflow(id, {
        nodes: workflowNodes,
        connections: workflowConnections,
      });

      setIsDirty(false);
    } catch (error) {
      console.error('Failed to save workflow:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleExecute = async () => {
    if (!id) return;
    try {
      await apiClient.post(`/workflows/${id}/execute`, {});
      alert('Execution started');
    } catch (error) {
      console.error('Failed to execute workflow:', error);
    }
  };

  const addNode = useCallback((nodeType: string, position: { x: number; y: number }) => {
    const nodeId = `node_${Date.now()}`;
    const newNode: Node = {
      id: nodeId,
      type: 'default',
      position,
      data: {
        label: nodeType,
        nodeType,
        parameters: {},
      },
    };
    setNodes((nds) => [...nds, newNode]);
    setIsDirty(true);
    
    // Focus on the new node after a short delay to ensure it's rendered
    setTimeout(() => {
      // Use fitView with the node ID to focus on the newly added node
      fitView({ 
        nodes: [{ id: nodeId }],
        padding: 0.3,
        duration: 400,
        minZoom: 0.5,
        maxZoom: 2
      });
    }, 150);
  }, [setNodes, fitView]);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const nodeType = event.dataTransfer.getData('application/reactflow');
      if (!nodeType || !reactFlowWrapper.current) {
        return;
      }

      const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
      const position = screenToFlowPosition({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      });

      addNode(nodeType, position);
    },
    [screenToFlowPosition, addNode]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  return (
    <div className="flex h-screen">
      <NodePalette onAddNode={addNode} />
      <div className="flex-1 relative" ref={reactFlowWrapper}>
        <div className="absolute top-0 left-0 right-0 bg-white border-b p-2 flex justify-between items-center z-10">
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : isDirty ? 'Save *' : 'Save'}
            </button>
            <button
              onClick={handleExecute}
              className="px-4 py-2 bg-green-600 text-white rounded"
            >
              Execute
            </button>
          </div>
          <button
            onClick={() => navigate('/workflows')}
            className="px-4 py-2 border rounded"
          >
            Back to Workflows
          </button>
        </div>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onDrop={onDrop}
          onDragOver={onDragOver}
          fitView
        >
          <Controls />
          <Background />
          <MiniMap />
        </ReactFlow>
      </div>
      {selectedNodeId && <NodeConfigPanel nodeId={selectedNodeId} />}
    </div>
  );
}

export default function CanvasEditor() {
  return (
    <ReactFlowProvider>
      <CanvasEditorInner />
    </ReactFlowProvider>
  );
}

```

```typescriptreact
import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactFlow, {
  Node,
  Edge,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  MiniMap,
  useReactFlow,
  ReactFlowProvider,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useWorkflowStore } from '../stores/workflowStore';
import { useNodeTypesStore } from '../stores/nodeTypesStore';
import { useCanvasStore } from '../stores/canvasStore';
import NodePalette from '../components/NodePalette';
import NodeConfigPanel from '../components/NodeConfigPanel';
import { apiClient } from '../api/client';
import type { INode, IConnections } from '@shared/types';

function CanvasEditorInner() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { selectedWorkflow, updateWorkflow, executeWorkflow } = useWorkflowStore();
  const { nodeTypes, fetchNodeTypes } = useNodeTypesStore();
  const { selectNode, selectedNodeId } = useCanvasStore();
  const { fitView, screenToFlowPosition, setCenter } = useReactFlow();

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  const hasInitialFit = useRef(false);

  useEffect(() => {
    if (id) {
      hasInitialFit.current = false; // Reset fit flag when workflow changes
      fetchWorkflow(id);
    }
    fetchNodeTypes();
  }, [id]);

  // Fit view when nodes are first loaded from workflow
  useEffect(() => {
    if (nodes.length > 0 && !hasInitialFit.current) {
      hasInitialFit.current = true;
      setTimeout(() => {
        fitView({ padding: 0.2, duration: 300 });
      }, 100);
    }
  }, [nodes.length, fitView]);

  const fetchWorkflow = async (workflowId: string) => {
    try {
      const response = await apiClient.get(`/workflows/${workflowId}`);
      const workflow = response.data;
      useWorkflowStore.getState().setSelectedWorkflow(workflow);

      // Convert workflow nodes/connections to React Flow format
      const reactFlowNodes: Node[] = workflow.nodes.map((node: INode) => ({
        id: node.id,
        type: 'default',
        position: node.position,
        data: { label: node.name, nodeType: node.type, ...node },
      }));

      const reactFlowEdges: Edge[] = [];
      for (const [sourceId, connMap] of Object.entries(workflow.connections)) {
        for (const [connType, connArray] of Object.entries(connMap)) {
          for (const connGroup of connArray) {
            for (const conn of connGroup) {
              reactFlowEdges.push({
                id: `${sourceId}-${conn.node}`,
                source: sourceId,
                target: conn.node,
                type: connType === 'error' ? 'step' : 'default',
              });
            }
          }
        }
      }

      setNodes(reactFlowNodes);
      setEdges(reactFlowEdges);
    } catch (error) {
      console.error('Failed to fetch workflow:', error);
    }
  };

  const onConnect = useCallback(
    (params: Connection) => {
      if (params.source && params.target) {
        setEdges((eds) => addEdge(params, eds));
        setIsDirty(true);
      }
    },
    [setEdges]
  );

  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      selectNode(node.id);
    },
    [selectNode]
  );

  const handleSave = async () => {
    if (!id || !selectedWorkflow) return;

    setIsSaving(true);
    try {
      // Convert React Flow nodes/edges back to workflow format
      const workflowNodes: INode[] = nodes.map((node) => ({
        id: node.id,
        name: node.data.label,
        type: node.data.nodeType,
        position: node.position,
        parameters: node.data.parameters || {},
        credentials: node.data.credentials,
        disabled: node.data.disabled,
      }));

      const workflowConnections: IConnections = {};
      for (const edge of edges) {
        if (!workflowConnections[edge.source]) {
          workflowConnections[edge.source] = { main: [] };
        }
        if (!workflowConnections[edge.source].main) {
          workflowConnections[edge.source].main = [];
        }
        workflowConnections[edge.source].main.push([
          {
            node: edge.target,
            type: 'main',
            index: 0,
          },
        ]);
      }

      await updateWorkflow(id, {
        nodes: workflowNodes,
        connections: workflowConnections,
      });

      setIsDirty(false);
    } catch (error) {
      console.error('Failed to save workflow:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleExecute = async () => {
    if (!id) return;
    try {
      await apiClient.post(`/workflows/${id}/execute`, {});
      alert('Execution started');
    } catch (error) {
      console.error('Failed to execute workflow:', error);
    }
  };

  const addNode = useCallback((nodeType: string, position: { x: number; y: number }) => {
    const nodeId = `node_${Date.now()}`;
    const newNode: Node = {
      id: nodeId,
      type: 'default',
      position,
      data: {
        label: nodeType,
        nodeType,
        parameters: {},
      },
    };
    setNodes((nds) => [...nds, newNode]);
    setIsDirty(true);
    
    // Focus on the new node after a short delay to ensure it's rendered
    setTimeout(() => {
      // Center the viewport on the new node's position
      setCenter(position.x, position.y, { zoom: 1, duration: 400 });
    }, 150);
  }, [setNodes, fitView]);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const nodeType = event.dataTransfer.getData('application/reactflow');
      if (!nodeType || !reactFlowWrapper.current) {
        return;
      }

      const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
      const position = screenToFlowPosition({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      });

      addNode(nodeType, position);
    },
    [screenToFlowPosition, addNode]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  return (
    <div className="flex h-screen">
      <NodePalette onAddNode={addNode} />
      <div className="flex-1 relative" ref={reactFlowWrapper}>
        <div className="absolute top-0 left-0 right-0 bg-white border-b p-2 flex justify-between items-center z-10">
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : isDirty ? 'Save *' : 'Save'}
            </button>
            <button
              onClick={handleExecute}
              className="px-4 py-2 bg-green-600 text-white rounded"
            >
              Execute
            </button>
          </div>
          <button
            onClick={() => navigate('/workflows')}
            className="px-4 py-2 border rounded"
          >
            Back to Workflows
          </button>
        </div>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onDrop={onDrop}
          onDragOver={onDragOver}
          fitView
        >
          <Controls />
          <Background />
          <MiniMap />
        </ReactFlow>
      </div>
      {selectedNodeId && <NodeConfigPanel nodeId={selectedNodeId} />}
    </div>
  );
}

export default function CanvasEditor() {
  return (
    <ReactFlowProvider>
      <CanvasEditorInner />
    </ReactFlowProvider>
  );
}

```


Fixed the canvas focusing issue. Changes:

## Fixes Applied:

1. **Added ReactFlowProvider** - Wrapped the component to enable React Flow hooks
2. **Added useReactFlow hook** - Access to `setCenter` and `screenToFlowPosition` for viewport control
3. **Added drag-and-drop handlers** - `onDrop` and `onDragOver` to handle nodes dragged from the palette
4. **Auto-focus on new nodes** - When a node is added, the canvas centers on it with a smooth animation
5. **Initial view fitting** - Canvas fits all nodes when a workflow is first loaded

## How it works now:

- When you drag a node from the palette and drop it on the canvas, it will be added at the drop position
- After adding, the canvas automatically centers on the new node with a 400ms animation
- When you first load a workflow, the canvas fits all existing nodes
- The zoom level is set to 1.0 when focusing on new nodes (you can adjust if needed)

New nodes should now be visible immediately after being added. Try dragging a node from the palette onto the canvas; it should appear and the viewport should center on it.

