# Sistema de Seguimiento de Presupuestos

Aplicación de seguimiento y gestión de presupuestos con análisis de datos.

## Guía de Despliegue en VPS

### 1. Preparación Inicial

#### 1.1 Requisitos del Sistema
- Node.js (v14 o superior)
- PostgreSQL (v12 o superior)
- Nginx
- PM2

#### 1.2 Estructura de Directorios en el VPS
```
/home/baires/
└── apps/
    └── presupuestos/
        ├── client/
        ├── server/
        ├── shared/
        ├── package.json
        ├── ecosystem.config.js
        └── otros archivos de configuración...
```

### 2. Configuración del Servidor

#### 2.1 Configuración de la Base de Datos
1. Accede al servidor a través de SSH:
   ```
   ssh baires@168.231.99.16
   ```

2. Ejecuta el script de configuración de la base de datos:
   ```
   cd /home/baires/apps/presupuestos
   sudo -u postgres psql -f db-setup.sql
   ```

3. **IMPORTANTE**: Después de ejecutar el script, modifica la contraseña por defecto:
   ```
   sudo -u postgres psql -c "ALTER USER presupuestos_user WITH PASSWORD 'tu_contraseña_segura';"
   ```

4. Actualiza la configuración en ecosystem.config.js con la nueva contraseña:
   ```
   nano ecosystem.config.js
   ```
   
   Modifica la línea DATABASE_URL con tu contraseña:
   ```
   DATABASE_URL: 'postgresql://presupuestos_user:tu_contraseña_segura@localhost:5432/presupuestos_db'
   ```

#### 2.2 Configuración de Nginx
1. Copia el archivo de configuración de Nginx a la ubicación correcta:
   ```
   sudo cp nginx/presupuestos.bairesanalitica.com.conf /etc/nginx/sites-available/
   sudo ln -sf /etc/nginx/sites-available/presupuestos.bairesanalitica.com.conf /etc/nginx/sites-enabled/
   ```

2. Verifica la configuración y reinicia Nginx:
   ```
   sudo nginx -t
   sudo systemctl restart nginx
   ```

3. Configura el DNS de tu dominio para que apunte a la IP del servidor (168.231.99.16).

4. (Opcional) Configura SSL con Certbot:
   ```
   sudo apt install certbot python3-certbot-nginx -y
   sudo certbot --nginx -d presupuestos.bairesanalitica.com
   ```
   
   Sigue las instrucciones en pantalla para completar la configuración SSL.

### 3. Despliegue de la Aplicación

#### 3.1 Construir la Aplicación para Producción
1. En tu entorno de desarrollo, ejecuta el script de construcción:
   ```
   ./build.sh
   ```

2. Transfiere los archivos al servidor:
   ```
   scp -r dist/* baires@168.231.99.16:/home/baires/apps/presupuestos/
   ```

#### 3.2 Instalar Dependencias y Migrar Base de Datos
1. En el servidor:
   ```
   cd /home/baires/apps/presupuestos
   npm install --production
   ```

2. Ejecuta las migraciones de la base de datos:
   ```
   ./migrate.sh
   ```

#### 3.3 Iniciar la Aplicación con PM2
1. Inicia la aplicación:
   ```
   pm2 start ecosystem.config.js
   ```

2. Configura PM2 para que inicie automáticamente tras reiniciar el servidor:
   ```
   pm2 startup
   pm2 save
   ```

#### 3.4 Importación Inicial de Datos
1. Copia el archivo CSV con los presupuestos a importar:
   ```
   cp attached_assets/PRESUPUESTOS_CON_ITEMS.csv .
   ```

2. Ejecuta el script de importación:
   ```
   ./import-data.sh PRESUPUESTOS_CON_ITEMS.csv
   ```
   
   Este proceso puede tardar varios minutos dependiendo del tamaño del archivo.

### 4. Mantenimiento y Backup

#### 4.1 Respaldo de la Base de Datos
Para crear un respaldo de la base de datos:
```
pg_dump -U presupuestos_user -d presupuestos_db -F c -f backup_presupuestos_$(date +%Y%m%d).dump
```

#### 4.2 Restauración de Backup
Para restaurar un backup:
```
pg_restore -U presupuestos_user -d presupuestos_db -c backup_presupuestos_YYYYMMDD.dump
```

#### 4.3 Logs y Monitoreo
- Verificar logs de la aplicación:
  ```
  pm2 logs presupuestos-app
  ```

- Monitorear el estado de la aplicación:
  ```
  pm2 monit
  ```

#### 4.4 Actualización de la Aplicación
1. Construye la nueva versión.
2. Transfiere los archivos al servidor.
3. Reinicia la aplicación:
   ```
   pm2 restart presupuestos-app
   ```

## Solución de Problemas Comunes

### Problema: La aplicación no arranca
Verifica los logs:
```
pm2 logs presupuestos-app
```

### Problema: Error de conexión a la base de datos
Verifica que la base de datos esté funcionando:
```
sudo systemctl status postgresql
```

Comprueba las credenciales en ecosystem.config.js.

### Problema: La aplicación no es accesible desde el navegador
1. Verifica que Nginx esté funcionando:
   ```
   sudo systemctl status nginx
   ```

2. Comprueba los logs de Nginx:
   ```
   sudo tail -f /var/log/nginx/error.log
   ```

3. Asegúrate de que los puertos necesarios estén abiertos en el firewall.