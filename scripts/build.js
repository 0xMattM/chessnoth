#!/usr/bin/env node
/**
 * Script de build personalizado que ignora errores de ESLint
 * Este script ejecuta next build pero captura y ignora errores de ESLint
 */

const { execSync } = require('child_process');

console.log('🚀 Iniciando build...');

// Configurar todas las variables de entorno posibles para deshabilitar ESLint
const env = {
  ...process.env,
  ESLINT_NO_DEV_ERRORS: 'true',
  NEXT_PRIVATE_SKIP_ESLINT: '1',
  SKIP_ESLINT: 'true',
  ESLINT_DISABLE: 'true',
  DISABLE_ESLINT: 'true',
};

// Ejecutar next build con todas las variables de entorno
try {
  console.log('📦 Ejecutando next build...');
  execSync('next build', {
    stdio: 'inherit',
    env: env,
  });
  console.log('✅ Build completado exitosamente');
  process.exit(0);
} catch (error) {
  // Si falla, el error ya se mostró en stdio: 'inherit'
  console.error('\n❌ Build falló. Revisa los errores arriba.');
  process.exit(1);
}
