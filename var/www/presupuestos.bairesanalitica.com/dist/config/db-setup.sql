-- Crear usuario y base de datos para la aplicación
CREATE USER presupuestos_user WITH PASSWORD 'SECURE_PASSWORD_HERE';
CREATE DATABASE presupuestos_db OWNER presupuestos_user;

-- Conectar a la base de datos recién creada
\c presupuestos_db

-- Conceder permisos
GRANT ALL PRIVILEGES ON DATABASE presupuestos_db TO presupuestos_user;
ALTER USER presupuestos_user WITH SUPERUSER;

-- Mensaje de finalización
\echo 'Configuración de la base de datos completada con éxito!';