#!/bin/bash

# Script para importar el archivo CSV inicial en el servidor

# Verificar si el archivo se proporciona como parámetro
if [ "$#" -ne 1 ]; then
    echo "Uso: $0 ruta_al_archivo.csv"
    exit 1
fi

CSV_FILE=$1

# Verificar que el archivo exista
if [ ! -f "$CSV_FILE" ]; then
    echo "Error: El archivo $CSV_FILE no existe."
    exit 1
fi

# Llamar al endpoint de importación
echo "Importando datos desde $CSV_FILE..."
curl -X POST -H "Content-Type: application/json" \
     -d "{\"csvData\": \"$(cat $CSV_FILE | base64)\", \"options\": {\"compareWithPrevious\": false, \"autoFinalizeMissing\": false}}" \
     http://localhost:5000/api/import

echo -e "\nImportación completada."