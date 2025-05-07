import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

// Configuración básica para ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Configuración para procesar datos JSON y de formularios con límites aumentados
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Configurar CORS con soporte para credenciales y métodos
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, X-Auth-Token');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Registrar rutas para depuración
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - Solicitud recibida: ${req.method} ${req.path}`);
  next();
});

// Ruta de prueba
app.get('/api/test', (req, res) => {
  res.json({ message: 'Servidor funcionando correctamente' });
});

// Servir archivos estáticos
const publicPath = path.join(__dirname, 'public');
console.log(`Sirviendo archivos estáticos desde: ${publicPath}`);
app.use(express.static(publicPath));

// Verificar que index.html existe
const indexPath = path.join(publicPath, 'index.html');
const fs = await import('fs');
console.log(`index.html existe: ${fs.existsSync(indexPath)}`);

// Simulación de sistema de sesión mejorado
let currentUser = null; // Usuario actualmente autenticado
let sessionToken = null; // Token de sesión simulado

// Mejorar la ruta de login para "iniciar sesión" con token
app.post('/api/auth/login', async (req, res) => {
  try {
    console.log('Intento de login con datos completos:', req.body);
    
    // Para fines de depuración, aceptar cualquier usuario/contraseña
    // En una implementación real, verificaríamos contra la base de datos
    
    const mockUser = {
      id: 1,
      username: req.body?.username || 'admin',
      nombre: 'Usuario',
      apellido: 'Demo',
      email: 'usuario@ejemplo.com',
      rol: 'admin',
      activo: true,
      fechaCreacion: new Date(),
      ultimoAcceso: new Date()
    };
    
    // Establecer usuario actual y generar token
    currentUser = mockUser;
    sessionToken = Date.now().toString(36) + Math.random().toString(36).substr(2);
    
    console.log('Usuario autenticado:', mockUser);
    console.log('Token generado:', sessionToken);
    
    // Configurar un encabezado de autorización personalizado
    res.setHeader('X-Auth-Token', sessionToken);
    
    res.status(200).json(mockUser);
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
});

// Modificar la ruta de verificación de usuario para aceptar el token
app.get('/api/auth/user', (req, res) => {
  // Para fines de prueba, siempre devolver el usuario simulado
  if (currentUser) {
    console.log('Verificación de usuario: devolviendo usuario autenticado');
    return res.status(200).json(currentUser);
  }
  
  console.log('Verificación de usuario: no autenticado');
  res.status(401).json({ message: 'No autenticado' });
});

// Modificar ruta de registro para crear usuario inmediatamente
app.post('/api/auth/register', async (req, res) => {
  try {
    console.log('Intento de registro con datos:', req.body);
    
    // Crear usuario simulado
    const mockUser = {
      id: 1,
      username: req.body?.username || 'nuevo_usuario',
      nombre: req.body?.nombre || 'Usuario',
      apellido: req.body?.apellido || 'Registrado',
      email: req.body?.email || 'usuario@ejemplo.com',
      rol: 'admin',
      activo: true,
      fechaCreacion: new Date(),
      ultimoAcceso: new Date()
    };
    
    // Establecer como usuario actual
    currentUser = mockUser;
    sessionToken = Date.now().toString(36) + Math.random().toString(36).substr(2);
    
    console.log('Usuario registrado y autenticado:', mockUser);
    console.log('Token generado:', sessionToken);
    
    // Configurar un encabezado de autorización personalizado
    res.setHeader('X-Auth-Token', sessionToken);
    
    res.status(201).json(mockUser);
  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
});
// Modificar la ruta de verificación de usuario para simular autenticación
app.get('/api/auth/user', (req, res) => {
  // Para fines de prueba, verificar si hay un usuario actual
  if (currentUser) {
    console.log('Verificación de usuario: devolviendo usuario autenticado');
    return res.status(200).json(currentUser);
  }
  
  console.log('Verificación de usuario: no autenticado');
  res.status(401).json({ message: 'No autenticado' });
});

// Modificar la ruta para verificar el estado de autenticación
app.get('/api/auth/check', (req, res) => {
  res.json({ authenticated: !!currentUser });
});

// Agregar ruta para cerrar sesión
app.post('/api/auth/logout', (req, res) => {
  console.log('Cerrando sesión de usuario:', currentUser?.username);
  currentUser = null;
  sessionToken = null;
  res.status(200).json({ message: 'Sesión cerrada' });
});

// Rutas simuladas para presupuestos
app.get('/api/budgets', (req, res) => {
  res.json([]);
});

// Rutas simuladas para contactos
app.get('/api/contacts', (req, res) => {
  res.json([]);
});

// Ruta comodín para SPA
app.get('*', (req, res) => {
  res.sendFile(indexPath);
});

// Iniciar servidor
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor simple ejecutándose en http://0.0.0.0:${PORT}`);
});
