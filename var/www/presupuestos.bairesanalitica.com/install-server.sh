#!/bin/bash

# Script de instalación para el servidor de producción

echo "=== Instalando Sistema de Seguimiento de Presupuestos ==="

# Verificar si los requisitos están instalados
command -v node >/dev/null 2>&1 || { echo "Error: Node.js no está instalado. Por favor instálelo antes de continuar."; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "Error: npm no está instalado. Por favor instálelo antes de continuar."; exit 1; }
command -v psql >/dev/null 2>&1 || { echo "Error: PostgreSQL no está instalado. Por favor instálelo antes de continuar."; exit 1; }

# Verificar si está en el directorio correcto
if [ ! -f "package.json" ] || [ ! -f "ecosystem.config.js" ]; then
  echo "Error: Este script debe ejecutarse en el directorio raíz de la aplicación."
  echo "Asegúrese de que los archivos package.json y ecosystem.config.js estén presentes."
  exit 1
fi

# Paso 1: Instalar dependencias de Node.js
echo "Instalando dependencias de Node.js..."
npm install --omit=dev

if [ $? -ne 0 ]; then
  echo "Error: No se pudieron instalar las dependencias de Node.js."
  exit 1
fi

# Verificar y crear directorios necesarios
mkdir -p attached_assets
mkdir -p dist/public

# Paso 2: Configurar base de datos
echo "¿Desea configurar la base de datos PostgreSQL? (s/n)"
read -r configurar_db

if [ "$configurar_db" = "s" ]; then
  echo "Configurando base de datos PostgreSQL..."
  
  # Solicitar contraseña para la base de datos
  echo "Ingrese la contraseña para el usuario de la base de datos:"
  read -rs db_password
  
  # Reemplazar la contraseña en ecosystem.config.js
  sed -i "s/CHANGE_THIS_PASSWORD/$db_password/g" ecosystem.config.js
  
  # Ejecutar script de configuración de la base de datos
  if [ -f "config/db-setup.sql" ]; then
    # Modificar la contraseña en el script de configuración
    sed -i "s/CHANGE_THIS_PASSWORD/$db_password/g" config/db-setup.sql
    sudo -u postgres psql -f config/db-setup.sql
    
    if [ $? -eq 0 ]; then
      echo "Base de datos configurada con éxito."
    else
      echo "Advertencia: No se pudo configurar la base de datos. Verifique manualmente."
    fi
  else
    echo "Advertencia: No se encontró el script de configuración de la base de datos."
  fi
fi

# Paso 3: Configurar PM2
echo "¿Desea configurar PM2 para gestionar la aplicación? (s/n)"
read -r configurar_pm2

if [ "$configurar_pm2" = "s" ]; then
  if ! command -v pm2 &> /dev/null; then
    echo "PM2 no está instalado. Instalando..."
    npm install -g pm2
  fi
  
  echo "Configurando PM2 para gestionar la aplicación..."
  
  # Detener la aplicación si ya está en ejecución
  pm2 stop presupuestos-app 2>/dev/null || true
  pm2 delete presupuestos-app 2>/dev/null || true
  
  # Iniciar la aplicación con PM2
  pm2 start ecosystem.config.js
  pm2 save
  
  echo "Aplicación iniciada y configurada con PM2."
else
  echo "Puede iniciar la aplicación manualmente con: node dist/server.js"
fi

echo ""
echo "=== Instalación completada ==="
echo "Importante:"
echo "1. Verifique que la contraseña de la base de datos esté correctamente configurada en ecosystem.config.js"
echo "2. Si necesita importar datos iniciales, use: ./import-data.sh ruta_al_archivo.csv"
echo "3. Para verificar el estado de la aplicación: pm2 status"
echo "4. Para ver los logs: pm2 logs presupuestos-app"
echo ""