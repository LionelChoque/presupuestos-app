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
