#!/usr/bin/env node
/**
 * Script que corrige automáticamente los errores de ESLint antes del build
 * Reemplaza texto problemático y corrige casos problemáticos
 */

const fs = require('fs');
const path = require('path');

const filesToFix = [
  {
    path: 'app/team/page.tsx',
    fixes: [
      {
        search: /You do not have any characters yet/g,
        replace: 'You do not have any characters yet',
      },
      {
        search: /This character has not learned any skills yet\. Learn skills in the Skills page\./g,
        replace: 'This character has not learned any skills yet. Learn skills in the Skills page.',
      },
    ],
  },
  {
    path: 'components/character-skills.tsx',
    fixes: [
      {
        search: /This character has not learned any skills yet\. Learn skills above\./g,
        replace: 'This character has not learned any skills yet. Learn skills above.',
      },
    ],
  },
  {
    path: 'app/combat/page.tsx',
    fixes: [
      {
        search: /case 'w':\s*event\.preventDefault\(\)\s*handleAction\('skill'\)\s*break/g,
        replace: "case 'w': {\n          event.preventDefault()\n          handleAction('skill')\n          break\n        }",
      },
    ],
  },
];

console.log('🔧 Corrigiendo errores de ESLint...');

let fixedCount = 0;

filesToFix.forEach(({ path: filePath, fixes }) => {
  const fullPath = path.join(process.cwd(), filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  Archivo no encontrado: ${filePath}`);
    return;
  }

  let content = fs.readFileSync(fullPath, 'utf8');
  let modified = false;

  fixes.forEach(({ search, replace }) => {
    if (search.test(content)) {
      content = content.replace(search, replace);
      modified = true;
      fixedCount++;
    }
  });

  if (modified) {
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`✅ Corregido: ${filePath}`);
  }
});

console.log(`\n✨ ${fixedCount} correcciones aplicadas`);
console.log('🚀 Listo para build');

