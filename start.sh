#!/bin/sh

echo "🚀 Iniciando aplicación APOLO en puerto 3001..."
echo "🔧 NODE_ENV: $NODE_ENV"
echo "🔧 PORT: $PORT"
echo "🔧 HOSTNAME: $(hostname)"
echo "🔧 IP: $(hostname -i 2>/dev/null || echo 'no disponible')"

export PORT=3001
export NODE_ENV=production
export NEXT_TELEMETRY_DISABLED=1
export HOSTNAME=0.0.0.0

echo "▶️ Ejecutando aplicación..."
echo "🔍 Comando: node server.js"
echo "📍 Directorio actual: $(pwd)"
echo "📁 Archivos disponibles:"
ls -la

# Verificar que server.js existe
if [ ! -f "server.js" ]; then
    echo "❌ ERROR: server.js no encontrado!"
    echo "📁 Contenido del directorio:"
    ls -la
    exit 1
fi

echo "✅ server.js encontrado, iniciando..."
node server.js --hostname 0.0.0.0 --port 3001
