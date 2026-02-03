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
