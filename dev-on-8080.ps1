# Script para desarrollo en puerto 8080
# Ejecutar con: .\dev-on-8080.ps1

Write-Host "Iniciando en modo desarrollo en puerto 8080..." -ForegroundColor Green

# Establecer variable de entorno para el puerto
$env:PORT = "8080"

# Verificar si el puerto está en uso
$portInUse = Get-NetTCPConnection -LocalPort 8080 -ErrorAction SilentlyContinue
if ($portInUse) {
    Write-Host "Puerto 8080 está en uso. Liberando..." -ForegroundColor Yellow
    Stop-Process -Name "node" -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
}

Write-Host "Health check estará disponible en: http://localhost:8080/health" -ForegroundColor Cyan
Write-Host "Aplicación estará disponible en: http://localhost:8080" -ForegroundColor Cyan

# Ejecutar en modo desarrollo
pnpm run dev