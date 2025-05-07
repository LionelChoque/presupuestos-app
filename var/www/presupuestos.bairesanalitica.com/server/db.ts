import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "..shared/schema.js";

neonConfig.webSocketConstructor = ws;

// Modificar para manejar mejor el error:
const databaseUrl = process.env.DATABASE_URL || 'postgresql://presupuestos_user:CHANGE_THIS_PASSWORD@localhost:5432/presupuestos_db';

console.log(`Conectando a la base de datos: ${databaseUrl.replace(/:[^:]*@/, ':****@')}`); // Oculta la contraseña

export const pool = new Pool({ connectionString: databaseUrl });
export const db = drizzle({ client: pool, schema });
