#!/usr/bin/env node
/**
 * Script para eliminar ESLint completamente del proyecto
 * ÚSALO SOLO COMO ÚLTIMO RECURSO
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('⚠️  ADVERTENCIA: Esto eliminará ESLint completamente del proyecto');
console.log('⚠️  Presiona Ctrl+C para cancelar, o espera 5 segundos...');

setTimeout(() => {
  console.log('\n🗑️  Eliminando ESLint...');

  // Eliminar archivos de configuración
  const filesToDelete = [
    '.eslintrc.json',
    '.eslintrc.js',
    '.eslintrc',
    '.eslintignore',
  ];

  filesToDelete.forEach((file) => {
    const filePath = path.join(process.cwd(), file);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`✅ Eliminado: ${file}`);
    }
  });

  // Desinstalar paquetes
  try {
    console.log('\n📦 Desinstalando paquetes de ESLint...');
    execSync('npm uninstall eslint eslint-config-next @typescript-eslint/eslint-plugin @typescript-eslint/parser', {
      stdio: 'inherit',
    });
    console.log('✅ Paquetes desinstalados');
  } catch (error) {
    console.log('⚠️  Error al desinstalar (puede que ya estén desinstalados)');
  }

  // Modificar package.json para quitar scripts de lint
  const packageJsonPath = path.join(process.cwd(), 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    // Quitar scripts de lint
    if (packageJson.scripts) {
      delete packageJson.scripts.lint;
      delete packageJson.scripts['lint:fix'];
    }

    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    console.log('✅ package.json actualizado');
  }

  console.log('\n✨ ESLint eliminado completamente');
  console.log('⚠️  Ahora necesitas modificar next.config.js para quitar referencias a ESLint');
  console.log('⚠️  Y eliminar eslint de devDependencies manualmente si es necesario');
}, 5000);

