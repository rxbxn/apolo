# Script para iniciar la aplicación en puerto 8080
# Ejecutar con: .\start-on-8080.ps1

Write-Host "Configurando aplicación para puerto 8080..." -ForegroundColor Green

# Establecer variable de entorno para el puerto
$env:PORT = "8080"

# Verificar si el puerto 8080 está disponible
$portInUse = Get-NetTCPConnection -LocalPort 8080 -ErrorAction SilentlyContinue
if ($portInUse) {
    Write-Host "Puerto 8080 está en uso. Liberando..." -ForegroundColor Yellow
    Stop-Process -Name "node" -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
}

# Construir la aplicación si es necesario
Write-Host "Construyendo aplicación..." -ForegroundColor Yellow
pnpm run build

# Iniciar la aplicación en puerto 8080
Write-Host "Iniciando aplicación en puerto 8080..." -ForegroundColor Green
Write-Host "Health check estará disponible en: http://localhost:8080/health" -ForegroundColor Cyan
Write-Host "Aplicación estará disponible en: http://localhost:8080" -ForegroundColor Cyan

# Ejecutar en modo producción
pnpm run start