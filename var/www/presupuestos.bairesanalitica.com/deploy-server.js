// Script de despliegue para la aplicación en producción
// Este archivo servirá como punto de entrada principal para el servidor en producción

import path from 'path';
import express from 'express';
import { fileURLToPath } from 'url';

// Configuración de __dirname en ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cargar rutas de la API y configuración
async function startServer() {
  try {
    // Crear aplicación Express
    const app = express();
    
    // Configuración básica
    app.use(express.json({ limit: '50mb' }));
    app.use(express.urlencoded({ extended: true, limit: '50mb' }));
    
    // Servir archivos estáticos del cliente
    app.use(express.static(path.join(__dirname, 'client')));
    
    // Importar las rutas de la API
    const { registerRoutes } = await import('./server/routes.js');
    const server = await registerRoutes(app);
    
    // Configurar ruta comodín para SPA
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'client', 'index.html'));
    });
    
    // Manejador de errores global
    app.use((err, _req, res, _next) => {
      console.error(err);
      res.status(500).json({
        error: 'Error interno del servidor',
        message: process.env.NODE_ENV === 'production' ? null : err.message
      });
    });
    
    // Obtener puerto de las variables de entorno o usar el valor por defecto
    const PORT = process.env.PORT || 5000;
    
    // Si registerRoutes no ha iniciado el servidor, iniciarlo aquí
    if (!server) {
      app.listen(PORT, '0.0.0.0', () => {
        console.log(`Servidor en modo producción escuchando en el puerto ${PORT}`);
      });
    }
    
    return { app, server };
  } catch (error) {
    console.error('Error fatal al iniciar el servidor:', error);
    process.exit(1);
  }
}

// Iniciar el servidor
startServer();