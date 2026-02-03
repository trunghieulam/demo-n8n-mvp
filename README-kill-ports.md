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
