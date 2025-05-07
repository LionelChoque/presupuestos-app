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
