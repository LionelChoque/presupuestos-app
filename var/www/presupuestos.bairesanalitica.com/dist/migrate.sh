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
