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

// Tabla para registrar actividades de los usuarios
export const userActivities = pgTable("user_activities", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  tipo: text("tipo").notNull(), // login, budget_update, budget_create, etc.
  descripcion: text("descripcion").notNull(),
  timestamp: timestamp("timestamp").defaultNow(),
  detalles: jsonb("detalles").$type<Record<string, any>>(),
  entidadId: text("entidad_id"), // ID del presupuesto afectado, si aplica
});

export const budgets = pgTable("budgets", {
  id: text("id").primaryKey(),
  empresa: text("empresa").notNull(),
  fechaCreacion: text("fecha_creacion").notNull(),
  fabricante: text("fabricante").notNull(),
  moneda: text("moneda").default("Dólar EEUU"),
  descuento: integer("descuento").default(0),
  validez: integer("validez").default(0),
  montoTotal: decimal("monto_total", { precision: 15, scale: 2 }).notNull(),
  diasTranscurridos: integer("dias_transcurridos").default(0),
  diasRestantes: integer("dias_restantes").default(0),
  tipoSeguimiento: text("tipo_seguimiento").notNull(),
  accion: text("accion").notNull(),
  prioridad: text("prioridad").notNull(),
  alertas: jsonb("alertas").$type<string[]>().default([]),
  completado: boolean("completado").default(false),
  fechaCompletado: text("fecha_completado"),
  estado: text("estado").default("Pendiente"),
  fechaEstado: text("fecha_estado"),
  notas: text("notas").default(""),
  finalizado: boolean("finalizado").default(false),
  fechaFinalizado: text("fecha_finalizado"),
  esLicitacion: boolean("es_licitacion").default(false),
  historialEtapas: jsonb("historial_etapas").$type<{ etapa: string, fecha: string, comentario?: string, usuario?: string }[]>().default([]),
  historialAcciones: jsonb("historial_acciones").$type<{ accion: string, fecha: string, comentario?: string, usuario?: string }[]>().default([]),
  usuarioAsignado: integer("usuario_asignado").references(() => users.id),
});

export const budgetItems = pgTable("budget_items", {
  id: serial("id").primaryKey(),
  budgetId: text("budget_id").notNull().references(() => budgets.id),
  codigo: text("codigo"),
  descripcion: text("descripcion").notNull(),
  precio: decimal("precio", { precision: 15, scale: 2 }).notNull(),
  cantidad: integer("cantidad").default(1),
});

export const contactInfo = pgTable("contact_info", {
  id: serial("id").primaryKey(),
  budgetId: text("budget_id").notNull().unique().references(() => budgets.id),
  nombre: text("nombre").notNull(),
  email: text("email"),
  telefono: text("telefono"),
});

// Las relaciones se definirán después en TypeScript usando una librería compatible

export const importLogs = pgTable("import_logs", {
  id: serial("id").primaryKey(),
  timestamp: timestamp("timestamp").defaultNow(),
  fileName: text("file_name").notNull(),
  recordsImported: integer("records_imported").notNull(),
  recordsUpdated: integer("records_updated").default(0),
  recordsDeleted: integer("records_deleted").default(0),
});

// Insert Schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  fechaCreacion: true,
  ultimoAcceso: true
});

export const insertUserActivitySchema = createInsertSchema(userActivities).omit({
  id: true,
  timestamp: true,
});

export const insertBudgetItemSchema = createInsertSchema(budgetItems).omit({
  id: true,
});

export const insertBudgetSchema = createInsertSchema(budgets).omit({
  id: true,
});

export const insertContactInfoSchema = createInsertSchema(contactInfo).omit({
  id: true,
});

export const insertImportLogSchema = createInsertSchema(importLogs).omit({
  id: true,
  timestamp: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertBudgetItem = z.infer<typeof insertBudgetItemSchema>;
export type BudgetItem = typeof budgetItems.$inferSelect;

export type InsertBudget = z.infer<typeof insertBudgetSchema>;
export type Budget = typeof budgets.$inferSelect;

export type InsertContactInfo = z.infer<typeof insertContactInfoSchema>;
export type ContactInfo = typeof contactInfo.$inferSelect;

export type InsertImportLog = z.infer<typeof insertImportLogSchema>;
export type ImportLog = typeof importLogs.$inferSelect;

export type InsertUserActivity = z.infer<typeof insertUserActivitySchema>;
export type UserActivity = typeof userActivities.$inferSelect;
