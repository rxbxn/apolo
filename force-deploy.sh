#!/bin/bash

# Script para forzar rebuild en Dokploy sin cache
# Uso: ./force-deploy.sh

echo "🚀 Iniciando deployment forzado sin cache..."

# Obtener timestamp actual para romper cache
TIMESTAMP=$(date +%s)
echo "⏰ Cache bust timestamp: $TIMESTAMP"

# Crear archivo temporal con timestamp para forzar rebuild
echo "# Cache bust - $(date)" > .cache-bust

echo "✅ Archivo cache-bust creado"
echo "📝 Ahora haz commit y push de este cambio para forzar el rebuild"

# Opcional: hacer commit automático
read -p "¿Deseas hacer commit automático? (y/n): " AUTO_COMMIT

if [[ $AUTO_COMMIT =~ ^[Yy]$ ]]; then
    git add .cache-bust
    git commit -m "chore: force rebuild - $(date)"
    echo "✅ Commit realizado con cache bust"
    
    read -p "¿Deseas hacer push automático? (y/n): " AUTO_PUSH
    if [[ $AUTO_PUSH =~ ^[Yy]$ ]]; then
        git push origin main
        echo "✅ Push realizado - Dokploy debería detectar el cambio ahora"
    fi
fi

echo "🎉 ¡Listo! El deployment debería ejecutarse sin cache"