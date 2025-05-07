#!/bin/bash

# Script de instalación para el servidor de producción

echo "=== Instalando Sistema de Seguimiento de Presupuestos ==="

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

# Paso 2: Configurar base de datos si no existe
if [ ! -f "/var/lib/postgresql/12/main/presupuestos_db_created" ]; then
  echo "Configurando base de datos PostgreSQL..."
  
  # Ejecutar script de configuración de la base de datos
  if [ -f "config/db-setup.sql" ]; then
    sudo -u postgres psql -f config/db-setup.sql
    
    if [ $? -eq 0 ]; then
      # Crear archivo marcador para indicar que la base de datos ya se ha creado
      sudo touch /var/lib/postgresql/12/main/presupuestos_db_created
      echo "Base de datos configurada con éxito."
    else
      echo "Advertencia: No se pudo configurar la base de datos. Verifique manualmente."
    fi
  else
    echo "Advertencia: No se encontró el script de configuración de la base de datos."
  fi
fi

# Paso 3: Configurar PM2 si está instalado
if command -v pm2 &> /dev/null; then
  echo "Configurando PM2 para gestionar la aplicación..."
  
  # Detener la aplicación si ya está en ejecución
  pm2 stop presupuestos-app 2>/dev/null || true
  pm2 delete presupuestos-app 2>/dev/null || true
  
  # Iniciar la aplicación con PM2
  pm2 start ecosystem.config.js
  pm2 save
  
  echo "Aplicación iniciada y configurada con PM2."
else
  echo "Advertencia: PM2 no está instalado. Se recomienda instalar PM2 para gestionar la aplicación."
  echo "Puede instalarlo con: sudo npm install -g pm2"
fi

# Paso 4: Ayuda para configurar Nginx
if [ -f "config/presupuestos.bairesanalitica.com.conf" ]; then
  echo "Copiando configuración de Nginx..."
  
  # Copiar archivo de configuración
  sudo cp config/presupuestos.bairesanalitica.com.conf /etc/nginx/sites-available/
  
  # Crear enlace simbólico si no existe
  if [ ! -f "/etc/nginx/sites-enabled/presupuestos.bairesanalitica.com.conf" ]; then
    sudo ln -s /etc/nginx/sites-available/presupuestos.bairesanalitica.com.conf /etc/nginx/sites-enabled/
  fi
  
  # Verificar configuración de Nginx
  sudo nginx -t
  
  if [ $? -eq 0 ]; then
    # Reiniciar Nginx
    sudo systemctl restart nginx
    echo "Nginx configurado y reiniciado con éxito."
  else
    echo "Advertencia: La configuración de Nginx no es válida. Verifique manualmente."
  fi
else
  echo "Advertencia: No se encontró el archivo de configuración de Nginx."
fi

echo ""
echo "=== Instalación completada ==="
echo "Importante:"
echo "1. Asegúrese de actualizar la contraseña de la base de datos en ecosystem.config.js"
echo "2. Si necesita importar datos iniciales, use: ./import-data.sh ruta_al_archivo.csv"
echo "3. Para verificar el estado de la aplicación: pm2 status"
echo "4. Para ver los logs: pm2 logs presupuestos-app"
echo ""