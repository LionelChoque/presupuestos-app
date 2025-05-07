var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/index.ts
import express2 from "express";

// server/routes.ts
import { createServer } from "http";

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  budgetItems: () => budgetItems,
  budgets: () => budgets,
  contactInfo: () => contactInfo,
  importLogs: () => importLogs,
  insertBudgetItemSchema: () => insertBudgetItemSchema,
  insertBudgetSchema: () => insertBudgetSchema,
  insertContactInfoSchema: () => insertContactInfoSchema,
  insertImportLogSchema: () => insertImportLogSchema,
  insertUserActivitySchema: () => insertUserActivitySchema,
  insertUserSchema: () => insertUserSchema,
  userActivities: () => userActivities,
  users: () => users
});
import { pgTable, text, serial, integer, boolean, jsonb, timestamp, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
var users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email"),
  nombre: text("nombre"),
  apellido: text("apellido"),
  rol: text("rol").default("usuario").notNull(),
  fechaCreacion: timestamp("fecha_creacion").defaultNow(),
  ultimoAcceso: timestamp("ultimo_acceso"),
  activo: boolean("activo").default(true)
});
var userActivities = pgTable("user_activities", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  tipo: text("tipo").notNull(),
  // login, budget_update, budget_create, etc.
  descripcion: text("descripcion").notNull(),
  timestamp: timestamp("timestamp").defaultNow(),
  detalles: jsonb("detalles").$type(),
  entidadId: text("entidad_id")
  // ID del presupuesto afectado, si aplica
});
var budgets = pgTable("budgets", {
  id: text("id").primaryKey(),
  empresa: text("empresa").notNull(),
  fechaCreacion: text("fecha_creacion").notNull(),
  fabricante: text("fabricante").notNull(),
  moneda: text("moneda").default("D\xF3lar EEUU"),
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
  usuarioAsignado: integer("usuario_asignado").references(() => users.id)
});
var budgetItems = pgTable("budget_items", {
  id: serial("id").primaryKey(),
  budgetId: text("budget_id").notNull().references(() => budgets.id),
  codigo: text("codigo"),
  descripcion: text("descripcion").notNull(),
  precio: decimal("precio", { precision: 15, scale: 2 }).notNull(),
  cantidad: integer("cantidad").default(1)
});
var contactInfo = pgTable("contact_info", {
  id: serial("id").primaryKey(),
  budgetId: text("budget_id").notNull().unique().references(() => budgets.id),
  nombre: text("nombre").notNull(),
  email: text("email"),
  telefono: text("telefono")
});
var importLogs = pgTable("import_logs", {
  id: serial("id").primaryKey(),
  timestamp: timestamp("timestamp").defaultNow(),
  fileName: text("file_name").notNull(),
  recordsImported: integer("records_imported").notNull(),
  recordsUpdated: integer("records_updated").default(0),
  recordsDeleted: integer("records_deleted").default(0)
});
var insertUserSchema = createInsertSchema(users).omit({
  id: true,
  fechaCreacion: true,
  ultimoAcceso: true
});
var insertUserActivitySchema = createInsertSchema(userActivities).omit({
  id: true,
  timestamp: true
});
var insertBudgetItemSchema = createInsertSchema(budgetItems).omit({
  id: true
});
var insertBudgetSchema = createInsertSchema(budgets).omit({
  id: true
});
var insertContactInfoSchema = createInsertSchema(contactInfo).omit({
  id: true
});
var insertImportLogSchema = createInsertSchema(importLogs).omit({
  id: true,
  timestamp: true
});

// client/src/lib/csvParser.ts
import Papa from "papaparse";
function groupItemsByBudget(rows) {
  const budgetMap = /* @__PURE__ */ new Map();
  rows.forEach((row) => {
    const budgetId = row.ID;
    if (!budgetMap.has(budgetId)) {
      budgetMap.set(budgetId, []);
    }
    budgetMap.get(budgetId)?.push(row);
  });
  return budgetMap;
}
function calculateBudgetDetails(budgetRows) {
  const firstRow = budgetRows[0];
  const validez = parseInt(firstRow.Validez) || 0;
  const dateString = firstRow.FechaCreacion.split(" ")[0];
  const [day, month, year] = dateString.split("/").map(Number);
  const creationDate = new Date(year, month - 1, day);
  const today = /* @__PURE__ */ new Date();
  const diffTime = Math.abs(today.getTime() - creationDate.getTime());
  const diasTranscurridos = Math.ceil(diffTime / (1e3 * 60 * 60 * 24));
  const diasRestantes = validez - diasTranscurridos;
  const alertas = [];
  if (validez === 0) {
    alertas.push("Sin fecha de validez definida");
  }
  if (validez > 0 && validez < 14) {
    alertas.push(`Validez corta (${validez} d\xEDas)`);
  }
  if (diasRestantes < 0) {
    alertas.push(`Presupuesto vencido hace ${Math.abs(diasRestantes)} d\xEDas`);
  }
  const esLicitacion = validez > 60 || /municipalidad|gobierno|ministerio|secretaria|universidad|obras|ente|instituto/i.test(firstRow.Empresa);
  const contacto = firstRow.Nombre_Contacto ? {
    nombre: firstRow.Nombre_Contacto,
    email: firstRow.Direccion
  } : void 0;
  let tipoSeguimiento;
  let accion;
  let prioridad;
  if (diasRestantes <= 0) {
    tipoSeguimiento = "Vencido";
    accion = "Registrar estado final del presupuesto (aprobado, rechazado, o vencido sin respuesta)";
    prioridad = "Alta";
  } else if (diasTranscurridos <= 3) {
    tipoSeguimiento = "Confirmaci\xF3n";
    accion = "Confirmar recepci\xF3n del presupuesto y aclarar dudas iniciales";
    prioridad = validez < 14 ? "Alta" : "Media";
  } else if (diasTranscurridos <= 15) {
    tipoSeguimiento = "Primer Seguimiento";
    accion = "Proporcionar informaci\xF3n adicional sobre productos y verificar inter\xE9s inicial";
    prioridad = diasRestantes <= 7 ? "Alta" : "Media";
  } else {
    tipoSeguimiento = "Seguimiento Final";
    accion = "\xDAltima comunicaci\xF3n antes de expiraci\xF3n y motivar decisi\xF3n final";
    prioridad = "Alta";
  }
  return {
    tipoSeguimiento,
    accion,
    prioridad,
    diasRestantes,
    diasTranscurridos,
    alertas,
    esLicitacion,
    contacto
  };
}
function convertCsvToBudgets(csvData) {
  return new Promise((resolve, reject) => {
    Papa.parse(csvData, {
      header: true,
      complete: (results) => {
        try {
          const budgetMap = groupItemsByBudget(results.data);
          const budgets2 = [];
          budgetMap.forEach((rows, budgetId) => {
            if (rows.length === 0 || !budgetId) return;
            const firstRow = rows[0];
            const montoTotal = rows.reduce((sum, row) => {
              const neto = parseFloat(row.NetoItems_USD.replace(",", ".")) || 0;
              const cantidad = parseInt(row.Cantidad) || 1;
              return sum + neto * cantidad;
            }, 0);
            const items = rows.map((row) => ({
              codigo: row.Codigo_Producto,
              descripcion: row.Descripcion,
              precio: row.NetoItems_USD.replace(",", "."),
              // Mantener como string para consistencia con el servidor
              cantidad: parseInt(row.Cantidad) || 1
            }));
            const {
              tipoSeguimiento,
              accion,
              prioridad,
              diasRestantes,
              diasTranscurridos,
              alertas,
              esLicitacion,
              contacto
            } = calculateBudgetDetails(rows);
            const budget = {
              id: budgetId,
              empresa: firstRow.Empresa,
              fechaCreacion: firstRow.FechaCreacion,
              fabricante: firstRow.Fabricante,
              moneda: "D\xF3lar EEUU",
              descuento: parseInt(firstRow.Descuento) || 0,
              validez: parseInt(firstRow.Validez) || 0,
              items,
              montoTotal: montoTotal.toFixed(2).toString(),
              // Mantener como string para consistencia con el servidor
              diasTranscurridos,
              diasRestantes,
              tipoSeguimiento,
              accion,
              prioridad,
              alertas,
              estado: tipoSeguimiento === "Vencido" ? "Vencido" : "Pendiente",
              esLicitacion,
              contacto
            };
            budgets2.push(budget);
          });
          resolve(budgets2);
        } catch (error) {
          reject(error);
        }
      },
      error: (error) => {
        reject(error);
      }
    });
  });
}
function compareBudgets(existingBudgets, newBudgets, options) {
  const result = {
    added: 0,
    updated: 0,
    deleted: 0,
    total: newBudgets.length
  };
  const existingBudgetMap = /* @__PURE__ */ new Map();
  existingBudgets.forEach((budget) => {
    existingBudgetMap.set(budget.id, budget);
  });
  const newBudgetMap = /* @__PURE__ */ new Map();
  newBudgets.forEach((budget) => {
    newBudgetMap.set(budget.id, budget);
  });
  newBudgets.forEach((newBudget) => {
    if (existingBudgetMap.has(newBudget.id)) {
      result.updated++;
    } else {
      result.added++;
    }
  });
  if (options.autoFinalizeMissing && options.compareWithPrevious) {
    existingBudgets.forEach((existingBudget) => {
      if (!newBudgetMap.has(existingBudget.id) && !existingBudget.finalizado) {
        result.deleted++;
      }
    });
  }
  return result;
}

// server/db.ts
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
neonConfig.webSocketConstructor = ws;
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?"
  );
}
var pool = new Pool({ connectionString: process.env.DATABASE_URL });
var db = drizzle({ client: pool, schema: schema_exports });

// server/storage.ts
import { eq, desc, sql } from "drizzle-orm";
var DatabaseStorage = class {
  // User operations
  async getUser(id) {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || void 0;
  }
  async getUserByUsername(username) {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || void 0;
  }
  async createUser(insertUser) {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }
  async updateUser(id, userData) {
    const [user] = await db.update(users).set(userData).where(eq(users.id, id)).returning();
    return user;
  }
  async getAllUsers() {
    return db.select().from(users);
  }
  async getUserCount() {
    const result = await db.select({ count: sql`count(*)` }).from(users);
    return Number(result[0].count);
  }
  // User activity operations
  async createUserActivity(activity) {
    const [userActivity] = await db.insert(userActivities).values(activity).returning();
    return userActivity;
  }
  async getUserActivities(limit = 50, offset = 0) {
    const activities = await db.select().from(userActivities).orderBy(desc(userActivities.timestamp)).limit(limit).offset(offset);
    const result = [];
    for (const activity of activities) {
      const [user] = await db.select().from(users).where(eq(users.id, activity.userId));
      result.push({
        ...activity,
        username: user?.username || "Usuario eliminado"
      });
    }
    return result;
  }
  async getUserActivitiesByUserId(userId, limit = 50, offset = 0) {
    return db.select().from(userActivities).where(eq(userActivities.userId, userId)).orderBy(desc(userActivities.timestamp)).limit(limit).offset(offset);
  }
  async getUserStats() {
    const totalUsers = await this.getUserCount();
    const oneMonthAgo = /* @__PURE__ */ new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    const activeUsersResult = await db.select({ count: sql`count(distinct user_id)` }).from(userActivities).where(sql`timestamp > ${oneMonthAgo.toISOString()}`);
    const activeUsers = Number(activeUsersResult[0].count);
    const activitiesData = await db.select({
      userId: userActivities.userId,
      count: sql`count(*)`
    }).from(userActivities).groupBy(userActivities.userId).orderBy(sql`count(*) desc`).limit(10);
    const userIdsList = activitiesData.map((a) => a.userId);
    let usersData = [];
    if (userIdsList.length > 0) {
      for (const userId of userIdsList) {
        const userResult = await db.select().from(users).where(eq(users.id, userId));
        if (userResult.length > 0) {
          usersData.push(userResult[0]);
        }
      }
    }
    const usersMap = Object.fromEntries(usersData.map((u) => [u.id, u.username]));
    const userActivityStats = activitiesData.map((a) => ({
      userId: a.userId,
      username: usersMap[a.userId] || "Usuario eliminado",
      count: Number(a.count)
    }));
    const recentActivitiesRaw = await this.getUserActivities(10, 0);
    return {
      totalUsers,
      activeUsers,
      userActivities: userActivityStats,
      recentActivities: recentActivitiesRaw
    };
  }
  // Budget operations
  async getAllBudgets() {
    const dbBudgets = await db.select().from(budgets);
    return dbBudgets;
  }
  async getBudget(id) {
    const [budget] = await db.select().from(budgets).where(eq(budgets.id, id));
    return budget;
  }
  async createBudget(insertBudget) {
    const budgetWithId = {
      ...insertBudget
    };
    if (!budgetWithId.id) {
      budgetWithId.id = Date.now().toString();
    }
    const [budget] = await db.insert(budgets).values(budgetWithId).returning();
    return budget;
  }
  async updateBudget(id, budgetData) {
    const [updatedBudget] = await db.update(budgets).set(budgetData).where(eq(budgets.id, id)).returning();
    return updatedBudget;
  }
  async deleteBudget(id) {
    const [deletedBudget] = await db.delete(budgets).where(eq(budgets.id, id)).returning();
    return !!deletedBudget;
  }
  // Budget items operations
  async getBudgetItems(budgetId) {
    const items = await db.select().from(budgetItems).where(eq(budgetItems.budgetId, budgetId));
    return items;
  }
  async createBudgetItem(insertItem) {
    const itemToInsert = {
      ...insertItem
    };
    if (typeof itemToInsert.precio === "number") {
      itemToInsert.precio = String(itemToInsert.precio);
    }
    const [item] = await db.insert(budgetItems).values(itemToInsert).returning();
    return item;
  }
  // Contact operations
  async getAllContacts() {
    const contacts = await db.select().from(contactInfo);
    return contacts;
  }
  async getContact(budgetId) {
    const [contact] = await db.select().from(contactInfo).where(eq(contactInfo.budgetId, budgetId));
    return contact;
  }
  async createContact(budgetId, contact) {
    const [newContact] = await db.insert(contactInfo).values({
      ...contact,
      budgetId
    }).returning();
    return newContact;
  }
  async updateContact(budgetId, contactData) {
    const [updatedContact] = await db.update(contactInfo).set(contactData).where(eq(contactInfo.budgetId, budgetId)).returning();
    return updatedContact;
  }
  // Import operations
  async importCsvData(csvData, options) {
    try {
      const newBudgets = await convertCsvToBudgets(csvData);
      const existingBudgets = await this.getAllBudgets();
      const compareResult = compareBudgets(existingBudgets, newBudgets, options);
      for (const budget of newBudgets) {
        const existingBudget = await this.getBudget(budget.id);
        if (existingBudget) {
          await this.updateBudget(budget.id, {
            ...budget,
            notas: existingBudget.notas,
            completado: existingBudget.completado,
            estado: existingBudget.estado
          });
        } else {
          await this.createBudget(budget);
        }
        if (budget.items && budget.items.length > 0) {
          await db.delete(budgetItems).where(eq(budgetItems.budgetId, budget.id));
          for (const item of budget.items) {
            const precio = typeof item.precio === "number" ? String(item.precio) : item.precio;
            const codigo = typeof item.codigo === "number" ? String(item.codigo) : item.codigo;
            await this.createBudgetItem({
              budgetId: budget.id,
              codigo,
              descripcion: item.descripcion,
              precio,
              cantidad: item.cantidad || 1
            });
          }
        }
      }
      if (options.autoFinalizeMissing && options.compareWithPrevious) {
        const newBudgetIds = new Set(newBudgets.map((b) => b.id));
        for (const existingBudget of existingBudgets) {
          if (!newBudgetIds.has(existingBudget.id) && !existingBudget.finalizado) {
            await this.updateBudget(existingBudget.id, {
              finalizado: true,
              fechaFinalizado: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
              estado: "Vencido",
              fechaEstado: (/* @__PURE__ */ new Date()).toISOString().split("T")[0]
            });
          }
        }
      }
      return compareResult;
    } catch (error) {
      console.error("Error importing CSV data:", error);
      throw error;
    }
  }
  async getImportLogs() {
    const logs = await db.select().from(importLogs).orderBy(desc(importLogs.timestamp));
    return logs;
  }
  async createImportLog(log2) {
    const [importLog] = await db.insert(importLogs).values(log2).returning();
    return importLog;
  }
};
var storage = new DatabaseStorage();

// server/routes.ts
import { z } from "zod";
import { readFileSync } from "fs";
import path from "path";

// server/auth.ts
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import connectPg from "connect-pg-simple";
var scryptAsync = promisify(scrypt);
async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const buf = await scryptAsync(password, salt, 64);
  return `${buf.toString("hex")}.${salt}`;
}
async function comparePasswords(supplied, stored) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = await scryptAsync(supplied, salt, 64);
  return timingSafeEqual(hashedBuf, suppliedBuf);
}
function isAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "No autenticado" });
}
function isAdmin(req, res, next) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "No autenticado" });
  }
  if (req.user && req.user.rol === "admin") {
    return next();
  }
  res.status(403).json({ message: "No autorizado" });
}
async function logUserActivity(userId, tipo, descripcion, entidadId, detalles) {
  try {
    const activityData = {
      userId,
      tipo,
      descripcion,
      entidadId,
      detalles: detalles || {}
    };
    await storage.createUserActivity(activityData);
  } catch (error) {
    console.error("Error al registrar actividad de usuario:", error);
  }
}
function setupAuth(app2) {
  const PostgresSessionStore = connectPg(session);
  const sessionSettings = {
    secret: process.env.SESSION_SECRET || "presupuestos_secret_key_change_this_in_production",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      maxAge: 1e3 * 60 * 60 * 24
      // 1 día
    },
    store: new PostgresSessionStore({
      pool,
      tableName: "session",
      createTableIfMissing: true
    })
  };
  app2.set("trust proxy", 1);
  app2.use(session(sessionSettings));
  app2.use(passport.initialize());
  app2.use(passport.session());
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user || !await comparePasswords(password, user.password)) {
          return done(null, false);
        } else {
          try {
            await storage.updateUser(user.id, {
              // Nota: ultimoAcceso se define en el schema y convertimos a Date
              ultimoAcceso: /* @__PURE__ */ new Date()
            });
            await logUserActivity(user.id, "login", `Usuario ${username} ha iniciado sesi\xF3n`);
            return done(null, user);
          } catch (updateErr) {
            console.error("Error al actualizar acceso:", updateErr);
            return done(null, user);
          }
        }
      } catch (err) {
        console.error("Error en autenticaci\xF3n:", err);
        return done(err);
      }
    })
  );
  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await storage.getUser(id);
      if (!user) {
        return done(null, false);
      }
      done(null, user);
    } catch (err) {
      console.error("Error al deserializar usuario:", err);
      done(err, null);
    }
  });
  app2.post("/api/auth/register", async (req, res, next) => {
    try {
      const userCount = await storage.getUserCount();
      const rol = userCount === 0 ? "admin" : "usuario";
      const { username, password, email, nombre, apellido } = req.body;
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: "El nombre de usuario ya existe" });
      }
      const userData = {
        username,
        password: await hashPassword(password),
        email,
        nombre,
        apellido,
        rol
      };
      const user = await storage.createUser(userData);
      if (req.user) {
        const currentUser = req.user;
        await logUserActivity(
          currentUser.id,
          "user_create",
          `Usuario ${currentUser.username} cre\xF3 un nuevo usuario: ${username}`,
          String(user.id)
        );
      }
      req.login(user, (err) => {
        if (err) return next(err);
        const { password: password2, ...userWithoutPassword } = user;
        res.status(201).json(userWithoutPassword);
      });
    } catch (err) {
      console.error("Error al registrar usuario:", err);
      res.status(500).json({ message: "Error al registrar usuario" });
    }
  });
  app2.post("/api/auth/login", (req, res, next) => {
    passport.authenticate("local", (err, user, info) => {
      if (err) return next(err);
      if (!user) {
        return res.status(401).json({ message: "Credenciales incorrectas" });
      }
      req.login(user, (err2) => {
        if (err2) return next(err2);
        const { password, ...userWithoutPassword } = user;
        res.status(200).json(userWithoutPassword);
      });
    })(req, res, next);
  });
  app2.post("/api/auth/logout", (req, res, next) => {
    const userId = req.user?.id;
    const username = req.user?.username;
    req.logout((err) => {
      if (err) return next(err);
      if (userId) {
        logUserActivity(userId, "logout", `Usuario ${username} ha cerrado sesi\xF3n`);
      }
      res.sendStatus(200);
    });
  });
  app2.get("/api/auth/user", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "No autenticado" });
    }
    const user = req.user;
    const { password, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  });
  app2.get("/api/auth/check", (req, res) => {
    res.json({ authenticated: req.isAuthenticated() });
  });
  app2.get("/api/admin/users", isAdmin, async (req, res) => {
    try {
      const users2 = await storage.getAllUsers();
      const usersWithoutPasswords = users2.map((user) => {
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
      });
      res.json(usersWithoutPasswords);
    } catch (err) {
      console.error("Error al obtener usuarios:", err);
      res.status(500).json({ message: "Error al obtener usuarios" });
    }
  });
  app2.patch("/api/users/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const user = req.user;
      if (userId !== user.id && user.rol !== "admin") {
        return res.status(403).json({ message: "No autorizado para editar este usuario" });
      }
      const userData = { ...req.body };
      if (userData.rol && user.rol !== "admin") {
        delete userData.rol;
      }
      if (userData.password) {
        userData.password = await hashPassword(userData.password);
      }
      const updatedUser = await storage.updateUser(userId, userData);
      await logUserActivity(
        user.id,
        "user_update",
        `Usuario ${user.username} actualiz\xF3 los datos de usuario: ${updatedUser.username}`,
        String(userId)
      );
      const { password, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (err) {
      console.error("Error al actualizar usuario:", err);
      res.status(500).json({ message: "Error al actualizar usuario" });
    }
  });
  app2.delete("/api/users/:id", isAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const adminUser = req.user;
      if (userId === adminUser.id) {
        return res.status(400).json({ message: "No puede eliminar su propia cuenta" });
      }
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "Usuario no encontrado" });
      }
      await storage.updateUser(userId, { activo: false });
      await logUserActivity(
        adminUser.id,
        "user_delete",
        `Usuario ${adminUser.username} desactiv\xF3 la cuenta de usuario: ${user.username}`,
        String(userId)
      );
      res.json({ message: "Usuario desactivado correctamente" });
    } catch (err) {
      console.error("Error al eliminar usuario:", err);
      res.status(500).json({ message: "Error al eliminar usuario" });
    }
  });
  app2.get("/api/user-activities", isAdmin, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit) || 50;
      const offset = parseInt(req.query.offset) || 0;
      const activities = await storage.getUserActivities(limit, offset);
      res.json(activities);
    } catch (err) {
      console.error("Error al obtener actividades:", err);
      res.status(500).json({ message: "Error al obtener actividades" });
    }
  });
  app2.get("/api/users/:id/activities", isAuthenticated, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const currentUser = req.user;
      if (userId !== currentUser.id && currentUser.rol !== "admin") {
        return res.status(403).json({ message: "No autorizado para ver actividades de este usuario" });
      }
      const limit = parseInt(req.query.limit) || 50;
      const offset = parseInt(req.query.offset) || 0;
      const activities = await storage.getUserActivitiesByUserId(userId, limit, offset);
      res.json(activities);
    } catch (err) {
      console.error("Error al obtener actividades del usuario:", err);
      res.status(500).json({ message: "Error al obtener actividades del usuario" });
    }
  });
  app2.get("/api/admin/stats", isAdmin, async (req, res) => {
    try {
      const stats = await storage.getUserStats();
      res.json(stats);
    } catch (err) {
      console.error("Error al obtener estad\xEDsticas de usuarios:", err);
      res.status(500).json({ message: "Error al obtener estad\xEDsticas de usuarios" });
    }
  });
}

// server/routes.ts
async function registerRoutes(app2) {
  setupAuth(app2);
  app2.get("/api/budgets", async (req, res) => {
    try {
      const budgets2 = await storage.getAllBudgets();
      res.json(budgets2);
    } catch (error) {
      console.error("Error fetching budgets:", error);
      res.status(500).json({ message: "Failed to fetch budgets" });
    }
  });
  app2.get("/api/budgets/:id", async (req, res) => {
    try {
      const budget = await storage.getBudget(req.params.id);
      if (!budget) {
        return res.status(404).json({ message: "Budget not found" });
      }
      res.json(budget);
    } catch (error) {
      console.error("Error fetching budget:", error);
      res.status(500).json({ message: "Failed to fetch budget" });
    }
  });
  app2.get("/api/budgets/:id/items", async (req, res) => {
    try {
      const items = await storage.getBudgetItems(req.params.id);
      res.json(items);
    } catch (error) {
      console.error("Error fetching budget items:", error);
      res.status(500).json({ message: "Failed to fetch budget items" });
    }
  });
  app2.patch("/api/budgets/:id", isAuthenticated, async (req, res) => {
    try {
      const updateSchema = insertBudgetSchema.partial();
      const validatedData = updateSchema.safeParse(req.body);
      if (!validatedData.success) {
        return res.status(400).json({
          message: "Invalid budget data",
          errors: validatedData.error.format()
        });
      }
      const updatedBudget = await storage.updateBudget(req.params.id, validatedData.data);
      if (!updatedBudget) {
        return res.status(404).json({ message: "Budget not found" });
      }
      if (req.user) {
        await logUserActivity(
          req.user.id,
          "budget_update",
          `Usuario ${req.user.username} actualiz\xF3 el presupuesto ${updatedBudget.id}`,
          updatedBudget.id,
          { ...validatedData.data }
        );
      }
      res.json(updatedBudget);
    } catch (error) {
      console.error("Error updating budget:", error);
      res.status(500).json({ message: "Failed to update budget" });
    }
  });
  app2.get("/api/contacts", async (req, res) => {
    try {
      const contacts = await storage.getAllContacts();
      res.json(contacts);
    } catch (error) {
      console.error("Error fetching contacts:", error);
      res.status(500).json({ message: "Failed to fetch contacts" });
    }
  });
  app2.get("/api/contacts/:budgetId", async (req, res) => {
    try {
      const contact = await storage.getContact(req.params.budgetId);
      if (!contact) {
        return res.status(404).json({ message: "Contact not found" });
      }
      res.json(contact);
    } catch (error) {
      console.error("Error fetching contact:", error);
      res.status(500).json({ message: "Failed to fetch contact" });
    }
  });
  app2.post("/api/contacts", isAuthenticated, async (req, res) => {
    try {
      const contactSchema = z.object({
        budgetId: z.string(),
        nombre: z.string(),
        email: z.string().email().optional(),
        telefono: z.string().optional()
      });
      const validatedData = contactSchema.safeParse(req.body);
      if (!validatedData.success) {
        return res.status(400).json({
          message: "Invalid contact data",
          errors: validatedData.error.format()
        });
      }
      const { budgetId, ...contactData } = validatedData.data;
      const existingContact = await storage.getContact(budgetId);
      let contact;
      if (existingContact) {
        contact = await storage.updateContact(budgetId, contactData);
        if (req.user) {
          await logUserActivity(
            req.user.id,
            "contact_update",
            `Usuario ${req.user.username} actualiz\xF3 el contacto para el presupuesto ${budgetId}`,
            budgetId,
            contactData
          );
        }
      } else {
        contact = await storage.createContact(budgetId, contactData);
        if (req.user) {
          await logUserActivity(
            req.user.id,
            "contact_create",
            `Usuario ${req.user.username} cre\xF3 el contacto para el presupuesto ${budgetId}`,
            budgetId,
            contactData
          );
        }
      }
      res.json(contact);
    } catch (error) {
      console.error("Error creating/updating contact:", error);
      res.status(500).json({ message: "Failed to create/update contact" });
    }
  });
  app2.post("/api/import", isAuthenticated, async (req, res) => {
    try {
      const importSchema = z.object({
        csvData: z.string(),
        options: z.object({
          compareWithPrevious: z.boolean(),
          autoFinalizeMissing: z.boolean()
        })
      });
      const validatedData = importSchema.safeParse(req.body);
      if (!validatedData.success) {
        return res.status(400).json({
          message: "Invalid import data",
          errors: validatedData.error.format()
        });
      }
      const { csvData, options } = validatedData.data;
      const result = await storage.importCsvData(csvData, options);
      await storage.createImportLog({
        fileName: "manual_import.csv",
        recordsImported: result.added,
        recordsUpdated: result.updated,
        recordsDeleted: result.deleted
      });
      if (req.user) {
        await logUserActivity(
          req.user.id,
          "import_csv",
          `Usuario ${req.user.username} import\xF3 CSV con ${result.added} nuevos, ${result.updated} actualizados, ${result.deleted} eliminados`,
          "manual_csv",
          { ...options, totalRecords: result.total }
        );
      }
      res.json(result);
    } catch (error) {
      console.error("Error importing CSV:", error);
      res.status(500).json({ message: "Failed to import CSV data" });
    }
  });
  app2.get("/api/import-logs", isAuthenticated, async (req, res) => {
    try {
      const logs = await storage.getImportLogs();
      res.json(logs);
    } catch (error) {
      console.error("Error fetching import logs:", error);
      res.status(500).json({ message: "Failed to fetch import logs" });
    }
  });
  app2.post("/api/import/demo", isAuthenticated, async (req, res) => {
    try {
      const optionsSchema = z.object({
        options: z.object({
          compareWithPrevious: z.boolean(),
          autoFinalizeMissing: z.boolean()
        })
      });
      const validatedData = optionsSchema.safeParse(req.body);
      if (!validatedData.success) {
        return res.status(400).json({
          message: "Invalid options data",
          errors: validatedData.error.format()
        });
      }
      const { options } = validatedData.data;
      const csvFilePath = path.join(process.cwd(), "attached_assets", "PRESUPUESTOS_CON_ITEMS.csv");
      console.log(`Leyendo archivo CSV de demostraci\xF3n: ${csvFilePath}`);
      const csvData = readFileSync(csvFilePath, "utf-8");
      const result = await storage.importCsvData(csvData, options);
      await storage.createImportLog({
        fileName: "PRESUPUESTOS_CON_ITEMS.csv",
        recordsImported: result.added,
        recordsUpdated: result.updated,
        recordsDeleted: result.deleted
      });
      if (req.user) {
        await logUserActivity(
          req.user.id,
          "import_demo",
          `Usuario ${req.user.username} import\xF3 CSV de demostraci\xF3n con ${result.added} nuevos, ${result.updated} actualizados, ${result.deleted} eliminados`,
          "demo_csv",
          { ...options, totalRecords: result.total }
        );
      }
      res.json(result);
    } catch (error) {
      console.error("Error importing demo CSV:", error);
      res.status(500).json({ message: "Failed to import demo CSV data" });
    }
  });
  const httpServer = createServer(app2);
  return httpServer;
}

// server/vite.ts
import express from "express";
import fs from "fs";
import path3 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path2 from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path2.resolve(import.meta.dirname, "client", "src"),
      "@shared": path2.resolve(import.meta.dirname, "shared"),
      "@assets": path2.resolve(import.meta.dirname, "attached_assets")
    }
  },
  root: path2.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path2.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path3.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path3.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path3.resolve(distPath, "index.html"));
  });
}

// server/index.ts
var app = express2();
app.use(express2.json({ limit: "50mb" }));
app.use(express2.urlencoded({ extended: false, limit: "50mb" }));
app.use((req, res, next) => {
  const start = Date.now();
  const path4 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path4.startsWith("/api")) {
      let logLine = `${req.method} ${path4} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  setupAuth(app);
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    console.error("Server error:", err);
    res.status(status).json({ message });
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = 5e3;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true
  }, () => {
    log(`serving on port ${port}`);
  });
})();
