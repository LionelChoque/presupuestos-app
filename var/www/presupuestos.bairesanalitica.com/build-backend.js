const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

try {
  // Construir el backend con TypeScript
  console.log('Construyendo el backend con TypeScript...');
  execSync('npx tsc -p tsconfig-prod-fixed.json', { stdio: 'inherit' });
  console.log('Backend construido con éxito.');
  
  // Copiar el archivo deploy-server.js a dist/server.js
  fs.copyFileSync('deploy-server.js', 'dist/server.js');
  console.log('Archivo server.js copiado con éxito.');
} catch (error) {
  console.error('Error al construir el backend:', error.message);
  process.exit(1);
}
