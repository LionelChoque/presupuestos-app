#!/bin/bash

echo "=== Iniciando construcción de la aplicación para producción ==="

# Limpiar directorios de salida previos
echo "Limpiando directorios anteriores..."
rm -rf dist
rm -rf build

# Crear estructura de directorios para producción
echo "Creando estructura de directorios..."
mkdir -p dist/client
mkdir -p dist/server
mkdir -p dist/shared
mkdir -p dist/config

# Paso 1: Construir el frontend
echo "=== Construyendo el frontend ==="
npm run build

# Paso 2: Transpilación de TypeScript a JavaScript
echo "=== Transpilando TypeScript a JavaScript ==="
echo "Transpilando archivos del servidor y compartidos..."
npx tsc -p tsconfig.prod.json

# Paso 3: Copiando punto de entrada simplificado para el servidor
echo "=== Copiando punto de entrada para producción ==="
cp deploy-server.js dist/server.js

# Paso 4: Corregir import statements para ES Modules en producción
echo "=== Corrigiendo importaciones para ES Modules ==="
find dist -name "*.js" -exec sed -i 's/from "\.\(.*\)"/from ".\1.js"/g' {} \;
find dist -name "*.js" -exec sed -i 's/from "\.\.\(.*\)"/from "..\1.js"/g' {} \;
find dist -name "*.js" -exec sed -i 's/from "\.\.\.\(.*\)"/from "...\1.js"/g' {} \;
find dist -name "*.js" -exec sed -i 's/from "@shared\/\(.*\)"/from "..\/shared\/\1.js"/g' {} \;

# Paso 5: Copiar archivos estáticos y configuraciones
echo "=== Copiando archivos adicionales ==="
cp package.json dist/
cp -r client/dist/* dist/client/
cp nginx/presupuestos.bairesanalitica.com.conf dist/config/
cp db-setup.sql dist/config/
cp import-data.sh dist/
chmod +x dist/import-data.sh

# Paso 6: Crear el archivo ecosystem.config.js con configuración para producción
echo "=== Generando archivo de configuración para PM2 ==="
cat > dist/ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'presupuestos-app',
    script: 'server.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 5000,
      DATABASE_URL: 'postgresql://presupuestos_user:CHANGE_THIS_PASSWORD@localhost:5432/presupuestos_db'
    }
  }]
};
EOF

# Paso 7: Crear archivo README para producción
echo "=== Creando README para producción ==="
cat > dist/README.md << 'EOF'
# Sistema de Seguimiento de Presupuestos - Producción

Esta es la versión compilada para producción del Sistema de Seguimiento de Presupuestos.

## Instrucciones de Despliegue

1. Configurar la base de datos:
   ```
   sudo -u postgres psql -f config/db-setup.sql
   ```

2. Actualizar la contraseña de la base de datos en ecosystem.config.js:
   ```
   nano ecosystem.config.js
   ```

3. Instalar dependencias:
   ```
   npm install --omit=dev
   ```

4. Iniciar la aplicación:
   ```
   pm2 start ecosystem.config.js
   ```

5. Configurar Nginx:
   ```
   sudo cp config/presupuestos.bairesanalitica.com.conf /etc/nginx/sites-available/
   sudo ln -sf /etc/nginx/sites-available/presupuestos.bairesanalitica.com.conf /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

6. Configurar inicio automático con PM2:
   ```
   pm2 startup
   pm2 save
   ```

7. Para importar datos iniciales:
   ```
   ./import-data.sh ruta_al_archivo.csv
   ```

## Solución de Problemas

Consulta los logs para diagnosticar problemas:
```
pm2 logs presupuestos-app
```
EOF

# Paso 8: Crear script de instalación en el servidor
echo "=== Creando script de instalación para el servidor ==="
cat > dist/install.sh << 'EOF'
#!/bin/bash

# Script de instalación para Sistema de Seguimiento de Presupuestos
echo "=== Instalando Sistema de Seguimiento de Presupuestos ==="

# Verificar si se está ejecutando como root
if [ "$EUID" -ne 0 ]; then
  echo "Este script debe ejecutarse como root o con sudo"
  exit 1
fi

# Instalar dependencias del sistema
echo "Instalando dependencias del sistema..."
apt update
apt install -y nginx postgresql postgresql-contrib nodejs npm

# Instalar PM2 globalmente
echo "Instalando PM2..."
npm install -g pm2

# Configurar la base de datos
echo "Configurando la base de datos..."
su - postgres -c "psql -f $(pwd)/config/db-setup.sql"

# Instalar dependencias de Node.js
echo "Instalando dependencias de Node.js..."
npm install --omit=dev

# Configurar Nginx
echo "Configurando Nginx..."
cp config/presupuestos.bairesanalitica.com.conf /etc/nginx/sites-available/
ln -sf /etc/nginx/sites-available/presupuestos.bairesanalitica.com.conf /etc/nginx/sites-enabled/
nginx -t && systemctl restart nginx

echo "=== Instalación completada ==="
echo "IMPORTANTE: Actualice la contraseña de la base de datos en ecosystem.config.js"
echo "Luego inicie la aplicación con: pm2 start ecosystem.config.js"
EOF

chmod +x dist/install.sh

# Crear archivo para importar datos iniciales
cat > dist/migrate.sh << 'EOF'
#!/bin/bash

# Script para ejecutar migraciones en producción
echo "Ejecutando migraciones para configurar la base de datos..."

# Importar esquema desde shared/schema.js
node -e "
  import('./server/db.js').then(async (db) => {
    try {
      console.log('Creando tablas en la base de datos...');
      const { migrate } = await import('drizzle-orm/node-postgres/migrator');
      await migrate(db.db, { migrationsFolder: './migrations' });
      console.log('Migración completada con éxito.');
      process.exit(0);
    } catch (err) {
      console.error('Error durante la migración:', err);
      process.exit(1);
    }
  }).catch(err => {
    console.error('Error al importar el módulo de la base de datos:', err);
    process.exit(1);
  });
"

echo "Migración completada."
EOF

chmod +x dist/migrate.sh

echo "=== Construcción completada con éxito ==="
echo "Los archivos para producción están disponibles en el directorio './dist/'"
echo "Para desplegar, transfiera estos archivos al servidor y ejecute 'install.sh'"