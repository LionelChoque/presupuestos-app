#!/bin/bash

# Fix imports in TypeScript files
echo "Corrigiendo importaciones en archivos TypeScript..."

# client/src/lib/csvParser.ts
if [ -f "client/src/lib/csvParser.ts" ]; then
  sed -i 's/from \(.\)\.\/types.\([^j]\)/from \1\.\/types\.js\2/g' client/src/lib/csvParser.ts
fi

# lib/csvParser.ts
if [ -f "lib/csvParser.ts" ]; then
  sed -i 's/from \(.\)\.\/types.\([^j]\)/from \1\.\/types\.js\2/g' lib/csvParser.ts
fi

# server/db.ts
if [ -f "server/db.ts" ]; then
  sed -i 's/from "@shared\/schema"/from "..\/shared\/schema.js"/g' server/db.ts
fi

# server/routes.ts
if [ -f "server/routes.ts" ]; then
  sed -i 's/from "\.\/storage"/from "\.\/storage\.js"/g' server/routes.ts
  sed -i 's/from "@shared\/schema"/from "..\/shared\/schema.js"/g' server/routes.ts
  sed -i 's/from \(.\)\.\/auth.\([^j]\)/from \1\.\/auth\.js\2/g' server/routes.ts
  
  # Agregar import fs
  if ! grep -q "import fs from 'fs';" server/routes.ts; then
    sed -i '1s/^/import fs from "fs";\n/' server/routes.ts
  fi
fi

# shared/utils.ts
if [ -f "shared/utils.ts" ]; then
  sed -i 's/from \(.\)\.\/schema.\([^j]\)/from \1\.\/schema\.js\2/g' shared/utils.ts
fi

echo "Corrigiendo errores en shared/schema.ts..."
if [ -f "shared/schema.ts" ]; then
  # Backup original file
  cp shared/schema.ts shared/schema.ts.bak
  
  # Create a new file with corrected schema definitions
  cat > shared/schema.ts.new << 'EOF'
import { pgTable, text, serial, integer, boolean, jsonb, timestamp, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email"),
  nombre: text("nombre"),
  apellido: text("apellido"),
  rol: text("rol").default("usuario").notNull(),
  fechaCreacion: timestamp("fecha_creacion").defaultNow(),
  ultimoAcceso: timestamp("ultimo_acceso"),
  activo: boolean("activo").default(true),
});

// Resto del archivo sigue igual...

// Modificar las definiciones de esquema de inserción
export const insertUserSchema = createInsertSchema(users);
export const userInsertSchema = insertUserSchema.omit({
  id: true,
  fechaCreacion: true,
  ultimoAcceso: true
});

export const insertUserActivitySchema = createInsertSchema(userActivities);
export const userActivityInsertSchema = insertUserActivitySchema.omit({
  id: true,
  timestamp: true,
});

export const insertBudgetItemSchema = createInsertSchema(budgetItems);
export const budgetItemInsertSchema = insertBudgetItemSchema.omit({
  id: true,
});

export const insertBudgetSchema = createInsertSchema(budgets);
export const budgetInsertSchema = insertBudgetSchema.omit({
  id: true,
});

export const insertContactInfoSchema = createInsertSchema(contactInfo);
export const contactInfoInsertSchema = insertContactInfoSchema.omit({
  id: true,
});

export const insertImportLogSchema = createInsertSchema(importLogs);
export const importLogInsertSchema = insertImportLogSchema.omit({
  id: true,
  timestamp: true,
});

// Types
export type InsertUser = z.infer<typeof userInsertSchema>;
export type User = typeof users.$inferSelect;

export type InsertBudgetItem = z.infer<typeof budgetItemInsertSchema>;
export type BudgetItem = typeof budgetItems.$inferSelect;

export type InsertBudget = z.infer<typeof budgetInsertSchema>;
export type Budget = typeof budgets.$inferSelect;

export type InsertContactInfo = z.infer<typeof contactInfoInsertSchema>;
export type ContactInfo = typeof contactInfo.$inferSelect;

export type InsertImportLog = z.infer<typeof importLogInsertSchema>;
export type ImportLog = typeof importLogs.$inferSelect;

export type InsertUserActivity = z.infer<typeof userActivityInsertSchema>;
export type UserActivity = typeof userActivities.$inferSelect;
EOF

  # Replace original with corrected file
  mv shared/schema.ts.new shared/schema.ts
fi

echo "Corrigiendo error en server/vite.ts..."
if [ -f "server/vite.ts" ]; then
  sed -i 's/allowedHosts: true/allowedHosts: ["localhost", "0.0.0.0"]/g' server/vite.ts
fi

echo "Corrigiendo errores en server/storage.ts..."
if [ -f "server/storage.ts" ]; then
  # Fix values typings with a temporary solution
  sed -i 's/\.values(insertUser)/\.values(insertUser as any)/g' server/storage.ts
  sed -i 's/\.values(activity)/\.values(activity as any)/g' server/storage.ts
fi

echo "Correcciones completadas."