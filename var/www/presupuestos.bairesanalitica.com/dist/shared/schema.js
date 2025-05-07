import { pgTable, text, serial, integer, boolean, jsonb, timestamp, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
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
export const userActivities = pgTable("user_activities", {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull().references(() => users.id),
    tipo: text("tipo").notNull(),
    descripcion: text("descripcion").notNull(),
    timestamp: timestamp("timestamp").defaultNow(),
    detalles: jsonb("detalles").$type(),
    entidadId: text("entidad_id"),
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
    alertas: jsonb("alertas").$type().default([]),
    completado: boolean("completado").default(false),
    fechaCompletado: text("fecha_completado"),
    estado: text("estado").default("Pendiente"),
    fechaEstado: text("fecha_estado"),
    notas: text("notas").default(""),
    finalizado: boolean("finalizado").default(false),
    fechaFinalizado: text("fecha_finalizado"),
    esLicitacion: boolean("es_licitacion").default(false),
    historialEtapas: jsonb("historial_etapas").$type().default([]),
    historialAcciones: jsonb("historial_acciones").$type().default([]),
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
export const importLogs = pgTable("import_logs", {
    id: serial("id").primaryKey(),
    timestamp: timestamp("timestamp").defaultNow(),
    fileName: text("file_name").notNull(),
    recordsImported: integer("records_imported").notNull(),
    recordsUpdated: integer("records_updated").default(0),
    recordsDeleted: integer("records_deleted").default(0),
});
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
//# sourceMappingURL=schema.js.map