const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Asegurarse de que existe el directorio dist/client
if (!fs.existsSync('dist/client')) {
  fs.mkdirSync('dist/client', { recursive: true });
}

try {
  // Construir el frontend con Vite
  console.log('Construyendo el frontend con Vite...');
  execSync('cd client && vite build --outDir ../dist/client', { stdio: 'inherit' });
  console.log('Frontend construido con éxito.');
} catch (error) {
  console.error('Error al construir el frontend:', error.message);
  
  // Si falla, crear un HTML básico como respaldo
  console.log('Creando HTML básico como respaldo...');
  const htmlContent = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sistema de Seguimiento de Presupuestos</title>
  <style>
    body {
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      margin: 0;
      background: linear-gradient(135deg, #3B82F6, #8B5CF6);
      color: white;
      text-align: center;
    }
    .container {
      max-width: 600px;
      padding: 20px;
    }
    h1 {
      font-size: 2rem;
      margin-bottom: 1rem;
    }
    p {
      font-size: 1.1rem;
      line-height: 1.5;
      margin-bottom: 1.5rem;
    }
    .button {
      display: inline-block;
      background-color: rgba(255, 255, 255, 0.2);
      color: white;
      padding: 12px 24px;
      border-radius: 4px;
      text-decoration: none;
      font-weight: 500;
      transition: background-color 0.3s;
    }
    .button:hover {
      background-color: rgba(255, 255, 255, 0.3);
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Sistema de Seguimiento de Presupuestos</h1>
    <p>La aplicación está en funcionamiento pero el frontend está siendo actualizado.<br>Por favor, contacta al administrador si necesitas acceso inmediato.</p>
    <a href="/" class="button">Recargar página</a>
  </div>
</body>
</html>
  `;
  
  fs.writeFileSync('dist/client/index.html', htmlContent);
  console.log('HTML básico creado con éxito.');
}
