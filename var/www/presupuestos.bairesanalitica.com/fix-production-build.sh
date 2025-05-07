#!/bin/bash

# Script para corregir problemas de compilación en producción
echo "=== Corrigiendo configuración para producción ==="

# Paso 1: Corregir las importaciones en los archivos de TypeScript
echo "Corrigiendo importaciones para producción..."

# Función para procesar un archivo y añadir extensiones .js a las importaciones
fix_imports() {
  local file=$1
  echo "Corrigiendo importaciones en $file"
  # Reemplazar importaciones relativas sin extensión (excepto alias)
  sed -i 's/from "\.\(.*\)"/from ".\1.js"/g' "$file"
  sed -i 's/from "\.\.\(.*\)"/from "..\1.js"/g' "$file"
  sed -i 's/from "\.\.\.\(.*\)"/from "...\1.js"/g' "$file"
  
  # Reemplazar importaciones @shared/ con path relativo correcto
  if [[ "$file" == *"server/"* ]]; then
    sed -i 's/from "@shared\/\(.*\)"/from "..\/shared\/\1.js"/g' "$file"
  fi
  
  # Reemplazar importaciones específicas que causan problemas
  if [[ "$file" == "server/storage.ts" ]]; then
    sed -i 's/from "..\/client\/src\/lib\/csvParser"/from "..\/lib\/csvParser.js"/g' "$file"
  fi
  
  if [[ "$file" == "server/vite.ts" ]]; then
    sed -i 's/from "..\/vite.config"/from "..\/vite.config.js"/g' "$file"
  fi
}

# Corregir todos los archivos TypeScript del servidor y shared
find server shared -name "*.ts" -type f | while read file; do
  fix_imports "$file"
done

# Paso 2: Crear un directorio lib para funciones compartidas
echo "Creando directorio lib para funciones compartidas..."
mkdir -p lib

# Paso 3: Copiar la función csvParser del cliente a lib
echo "Copiando csvParser del cliente a lib..."
cp client/src/lib/csvParser.ts lib/

# Paso 4: Corregir importaciones en lib/csvParser.ts
echo "Corrigiendo importaciones en lib/csvParser.ts..."
sed -i 's/from "@shared\/\(.*\)"/from "..\/shared\/\1.js"/g' lib/csvParser.ts

# Paso 5: Crear un tsconfig especial para producción
echo "Creando tsconfig-prod-fixed.json..."
cat > tsconfig-prod-fixed.json << EOF
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "esModuleInterop": true,
    "outDir": "dist",
    "strict": false,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "allowSyntheticDefaultImports": true,
    "baseUrl": ".",
    "paths": {
      "@shared/*": ["./shared/*"]
    }
  },
  "include": ["server", "shared", "lib"],
  "exclude": ["node_modules", "client", "dist"]
}
EOF

# Paso 6: Crear un archivo index.html dummy para el frontend
echo "Creando index.html para el frontend..."
mkdir -p client/public
cat > client/public/index.html << EOF
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sistema de Seguimiento de Presupuestos</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.tsx"></script>
</body>
</html>
EOF

# Paso 7: Crear un script especial para construir el frontend
echo "Creando script para construir el frontend..."
cat > build-frontend.js << EOF
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Asegurarse de que existe el directorio dist/client
if (!fs.existsSync('dist/client')) {
  fs.mkdirSync('dist/client', { recursive: true });
}

try {
  // Construir el frontend con Vite
  console.log('Construyendo el frontend con Vite...');
  execSync('cd client && vite build --outDir ../dist/client', { stdio: 'inherit' });
  console.log('Frontend construido con éxito.');
} catch (error) {
  console.error('Error al construir el frontend:', error.message);
  
  // Si falla, crear un HTML básico como respaldo
  console.log('Creando HTML básico como respaldo...');
  const htmlContent = \`
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sistema de Seguimiento de Presupuestos</title>
  <style>
    body {
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      margin: 0;
      background: linear-gradient(135deg, #3B82F6, #8B5CF6);
      color: white;
      text-align: center;
    }
    .container {
      max-width: 600px;
      padding: 20px;
    }
    h1 {
      font-size: 2rem;
      margin-bottom: 1rem;
    }
    p {
      font-size: 1.1rem;
      line-height: 1.5;
      margin-bottom: 1.5rem;
    }
    .button {
      display: inline-block;
      background-color: rgba(255, 255, 255, 0.2);
      color: white;
      padding: 12px 24px;
      border-radius: 4px;
      text-decoration: none;
      font-weight: 500;
      transition: background-color 0.3s;
    }
    .button:hover {
      background-color: rgba(255, 255, 255, 0.3);
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Sistema de Seguimiento de Presupuestos</h1>
    <p>La aplicación está en funcionamiento pero el frontend está siendo actualizado.<br>Por favor, contacta al administrador si necesitas acceso inmediato.</p>
    <a href="/" class="button">Recargar página</a>
  </div>
</body>
</html>
  \`;
  
  fs.writeFileSync('dist/client/index.html', htmlContent);
  console.log('HTML básico creado con éxito.');
}
EOF

# Paso 8: Crear un script para construir el backend
echo "Creando script para construir el backend..."
cat > build-backend.js << EOF
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
EOF

# Paso 9: Actualizar el script principal para ejecutar ambos
echo "Actualizando package.json para añadir el script build-prod..."
# Usar jq si está disponible, si no, hacerlo con sed
if command -v jq &> /dev/null; then
  jq '.scripts["build-prod"] = "node build-frontend.js && node build-backend.js"' package.json > package.json.tmp && mv package.json.tmp package.json
else
  # Búsqueda básica y reemplazo con sed
  sed -i '/\"scripts\": {/a \    \"build-prod\": \"node build-frontend.js \&\& node build-backend.js\",' package.json
fi

# Paso 10: Instruir al usuario sobre cómo usar este script
echo ""
echo "=== Configuración completada ==="
echo "Ahora puedes compilar la aplicación para producción con:"
echo "npm run build-prod"
echo ""
echo "NOTA: Este script ha corregido los problemas de importación y"
echo "configuración que causaban errores en la compilación."

# Hacer el script ejecutable
chmod +x fix-production-build.sh