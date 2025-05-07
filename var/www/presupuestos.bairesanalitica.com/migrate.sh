#!/bin/bash

# Este script ejecuta las migraciones de la base de datos
echo "Ejecutando migraciones de base de datos..."

# Ejecutar migraciones con Drizzle
npm run db:push

echo "Migraciones completadas con éxito!"