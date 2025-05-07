# Guía para desplegar la aplicación en producción

## Pasos previos

1. Ya has configurado correctamente Nginx con SSL para el subdominio presupuestos.bairesanalitica.com
2. Has creado un archivo de configuración de Nginx que redirige el tráfico HTTP al puerto 443 (HTTPS)

## Paso 1: Preparar el directorio en el servidor

```bash
# Crear directorio para la aplicación
sudo mkdir -p /var/www/presupuestos.bairesanalitica.com
sudo chown -R $USER:$USER /var/www/presupuestos.bairesanalitica.com
```

## Paso 2: Transferir archivos al servidor

Existen dos opciones:

### Opción 1: Transfiriendo el código fuente

```bash
# En tu máquina local
git clone <url-repositorio> /tmp/presupuestos
cd /tmp/presupuestos
tar -czf presupuestos-src.tar.gz --exclude=node_modules --exclude=.git .

# Transferir al servidor
scp presupuestos-src.tar.gz usuario@tu-servidor:/var/www/presupuestos.bairesanalitica.com/

# En el servidor
cd /var/www/presupuestos.bairesanalitica.com
tar -xzf presupuestos-src.tar.gz
rm presupuestos-src.tar.gz
```

### Opción 2: Usando el archivo ya preparado

```bash
# Transferir al servidor
scp presupuestos-deploy.tar.gz usuario@tu-servidor:/var/www/presupuestos.bairesanalitica.com/

# En el servidor
cd /var/www/presupuestos.bairesanalitica.com
tar -xzf presupuestos-deploy.tar.gz
rm presupuestos-deploy.tar.gz
```

## Paso 3: Instalar dependencias y configurar la aplicación

```bash
# En el servidor
cd /var/www/presupuestos.bairesanalitica.com

# Instalar dependencias de Node.js
npm install

# Configurar la base de datos
sudo -u postgres psql -f config/db-setup.sql

# IMPORTANTE: Editar la contraseña de la base de datos
nano ecosystem.config.js
# Cambiar: CHANGE_THIS_PASSWORD por una contraseña segura
```

## Paso 4: Compilar la aplicación

```bash
# Compilar el frontend
npm run build

# Compilar el backend
npx tsc -p tsconfig.prod.json
```

## Paso 5: Configurar Nginx

```bash
# Copiar archivo de configuración
sudo cp config/presupuestos.bairesanalitica.com.conf /etc/nginx/sites-available/

# Crear enlace simbólico si no existe
sudo ln -sf /etc/nginx/sites-available/presupuestos.bairesanalitica.com.conf /etc/nginx/sites-enabled/

# Verificar configuración
sudo nginx -t

# Reiniciar Nginx
sudo systemctl restart nginx
```

## Paso 6: Configurar PM2 para gestionar la aplicación

```bash
# Instalar PM2 globalmente si no está instalado
sudo npm install -g pm2

# Iniciar la aplicación con PM2
pm2 start ecosystem.config.js

# Configurar para que PM2 inicie con el sistema
pm2 startup
pm2 save
```

## Paso 7: Solución de problemas

Si encuentras problemas, puedes verificar los logs:

```bash
# Ver logs de la aplicación
pm2 logs presupuestos-app

# Ver logs de Nginx
sudo tail -f /var/log/nginx/error.log
```

## Actualizaciones futuras

Para actualizaciones futuras, solo necesitarás:

1. Transferir los archivos actualizados
2. Reconstruir la aplicación (frontend y backend)
3. Reiniciar la aplicación: `pm2 restart presupuestos-app`