#!/usr/bin/env node

const http = require('http');

console.log('🔍 Verificando configuración de puertos...');

// Test básico de puerto
const port = process.env.PORT || 3000;
console.log(`📍 Puerto configurado: ${port}`);

// Simular health check
function testHealthCheck() {
    return new Promise((resolve, reject) => {
        const req = http.get(`http://localhost:${port}/api/health`, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode === 200) {
                    console.log('✅ Health check OK');
                    console.log('Response:', JSON.parse(data));
                    resolve(true);
                } else {
                    console.log(`❌ Health check failed with status: ${res.statusCode}`);
                    reject(false);
                }
            });
        });
        
        req.on('error', (error) => {
            console.log(`❌ Error conectando al health check: ${error.message}`);
            reject(error);
        });
        
        req.setTimeout(5000, () => {
            console.log('❌ Timeout en health check');
            req.destroy();
            reject(new Error('Timeout'));
        });
    });
}

// Solo ejecutar test si el servidor está corriendo
if (process.argv.includes('--test-health')) {
    setTimeout(() => {
        testHealthCheck().catch(() => process.exit(1));
    }, 2000);
}

console.log('✅ Test script listo. Para probar health check: node test-build.js --test-health');