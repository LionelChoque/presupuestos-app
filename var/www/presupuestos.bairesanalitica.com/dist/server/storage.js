import { budgets, budgetItems, contactInfo, importLogs, users, userActivities } from "../shared/schema.js.js.js";
import { convertCsvToBudgets, compareBudgets } from "../client/src/lib/csvParser.js.js";
import { db } from "./db.js";
import { eq, desc, sql } from "drizzle-orm";
// Database storage implementation
export class DatabaseStorage {
    // User operations
    async getUser(id) {
        const [user] = await db.select().from(users).where(eq(users.id, id));
        return user || undefined;
    }
    async getUserByUsername(username) {
        const [user] = await db.select().from(users).where(eq(users.username, username));
        return user || undefined;
    }
    async createUser(insertUser) {
        const [user] = await db
            .insert(users)
            .values({
            username: insertUser.username,
            password: insertUser.password,
            // otros campos necesarios
        })
            .returning();
        return user;
    }
    async updateUser(id, userData) {
        const [user] = await db
            .update(users)
            .set(userData)
            .where(eq(users.id, id))
            .returning();
        return user;
    }
    async getAllUsers() {
        return db.select().from(users);
    }
    async getUserCount() {
        const result = await db.select({ count: sql `count(*)` }).from(users);
        return Number(result[0].count);
    }
    // User activity operations
    async createUserActivity(activity) {
        const [userActivity] = await db
            .insert(userActivities)
            .values(activity)
            .returning();
        return userActivity;
    }
    async getUserActivities(limit = 50, offset = 0) {
        // Obtener actividades
        const activities = await db.select()
            .from(userActivities)
            .orderBy(desc(userActivities.timestamp))
            .limit(limit)
            .offset(offset);
        // Procesar cada actividad para obtener el nombre de usuario
        const result = [];
        for (const activity of activities) {
            // Obtener usuario
            const [user] = await db.select().from(users).where(eq(users.id, activity.userId));
            result.push({
                ...activity,
                username: user?.username || 'Usuario eliminado'
            });
        }
        return result;
    }
    async getUserActivitiesByUserId(userId, limit = 50, offset = 0) {
        return db.select()
            .from(userActivities)
            .where(eq(userActivities.userId, userId))
            .orderBy(desc(userActivities.timestamp))
            .limit(limit)
            .offset(offset);
    }
    async getUserStats() {
        // Total usuarios
        const totalUsers = await this.getUserCount();
        // Usuarios activos en el último mes
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
        const activeUsersResult = await db.select({ count: sql `count(distinct user_id)` })
            .from(userActivities)
            .where(sql `timestamp > ${oneMonthAgo.toISOString()}`);
        const activeUsers = Number(activeUsersResult[0].count);
        // Actividad por usuario (top 10)
        const activitiesData = await db.select({
            userId: userActivities.userId,
            count: sql `count(*)`,
        })
            .from(userActivities)
            .groupBy(userActivities.userId)
            .orderBy(sql `count(*) desc`)
            .limit(10);
        // Obtener nombres de usuario
        const userIdsList = activitiesData.map(a => a.userId);
        let usersData = [];
        if (userIdsList.length > 0) {
            for (const userId of userIdsList) {
                const userResult = await db.select().from(users).where(eq(users.id, userId));
                if (userResult.length > 0) {
                    usersData.push(userResult[0]);
                }
            }
        }
        const usersMap = Object.fromEntries(usersData.map(u => [u.id, u.username]));
        const userActivityStats = activitiesData.map(a => ({
            userId: a.userId,
            username: usersMap[a.userId] || 'Usuario eliminado',
            count: Number(a.count)
        }));
        // Actividades recientes
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
        // Asegurar que el presupuesto tenga un ID
        const budgetWithId = {
            ...insertBudget
        };
        // Si no tiene ID, generamos uno basado en timestamp
        if (!budgetWithId.id) {
            budgetWithId.id = Date.now().toString();
        }
        const [budget] = await db
            .insert(budgets)
            .values(budgetWithId)
            .returning();
        return budget;
    }
    async updateBudget(id, budgetData) {
        const [updatedBudget] = await db
            .update(budgets)
            .set(budgetData)
            .where(eq(budgets.id, id))
            .returning();
        return updatedBudget;
    }
    async deleteBudget(id) {
        const [deletedBudget] = await db
            .delete(budgets)
            .where(eq(budgets.id, id))
            .returning();
        return !!deletedBudget;
    }
    // Budget items operations
    async getBudgetItems(budgetId) {
        const items = await db
            .select()
            .from(budgetItems)
            .where(eq(budgetItems.budgetId, budgetId));
        return items;
    }
    async createBudgetItem(insertItem) {
        // Aseguramos que el precio sea string (esperado por el esquema)
        const itemToInsert = {
            ...insertItem
        };
        // Convertir precio a string si es necesario
        if (typeof itemToInsert.precio === 'number') {
            itemToInsert.precio = String(itemToInsert.precio);
        }
        const [item] = await db
            .insert(budgetItems)
            .values(itemToInsert)
            .returning();
        return item;
    }
    // Contact operations
    async getAllContacts() {
        const contacts = await db.select().from(contactInfo);
        return contacts;
    }
    async getContact(budgetId) {
        const [contact] = await db
            .select()
            .from(contactInfo)
            .where(eq(contactInfo.budgetId, budgetId));
        return contact;
    }
    async createContact(budgetId, contact) {
        const [newContact] = await db
            .insert(contactInfo)
            .values({
            ...contact,
            budgetId
        })
            .returning();
        return newContact;
    }
    async updateContact(budgetId, contactData) {
        const [updatedContact] = await db
            .update(contactInfo)
            .set(contactData)
            .where(eq(contactInfo.budgetId, budgetId))
            .returning();
        return updatedContact;
    }
    // Import operations
    async importCsvData(csvData, options) {
        try {
            // Parse CSV data into budgets
            const newBudgets = await convertCsvToBudgets(csvData);
            const existingBudgets = await this.getAllBudgets();
            // Compare with existing budgets
            // Usamos as any para evitar problemas de tipos durante la comparación
            const compareResult = compareBudgets(existingBudgets, newBudgets, options);
            // Process budgets to add or update
            for (const budget of newBudgets) {
                // Check if budget already exists
                const existingBudget = await this.getBudget(budget.id);
                if (existingBudget) {
                    // Update existing budget, preserving user-entered data
                    // Usamos as any para resolver problemas de tipos temporalmente
                    await this.updateBudget(budget.id, {
                        ...budget,
                        notas: existingBudget.notas,
                        completado: existingBudget.completado,
                        estado: existingBudget.estado,
                    });
                }
                else {
                    // Create new budget
                    await this.createBudget(budget);
                }
                // Process budget items
                if (budget.items && budget.items.length > 0) {
                    // Clear existing items for this budget
                    await db
                        .delete(budgetItems)
                        .where(eq(budgetItems.budgetId, budget.id));
                    // Add new items
                    for (const item of budget.items) {
                        // Asegurar que los tipos sean correctos
                        const precio = typeof item.precio === 'number' ? String(item.precio) : item.precio;
                        const codigo = typeof item.codigo === 'number' ? String(item.codigo) : item.codigo;
                        await this.createBudgetItem({
                            budgetId: budget.id,
                            codigo,
                            descripcion: item.descripcion,
                            precio,
                            cantidad: item.cantidad || 1,
                        });
                    }
                }
            }
            // Handle missing budgets (deleted/finalized)
            if (options.autoFinalizeMissing && options.compareWithPrevious) {
                const newBudgetIds = new Set(newBudgets.map(b => b.id));
                for (const existingBudget of existingBudgets) {
                    if (!newBudgetIds.has(existingBudget.id) && !existingBudget.finalizado) {
                        await this.updateBudget(existingBudget.id, {
                            finalizado: true,
                            fechaFinalizado: new Date().toISOString().split('T')[0],
                            estado: 'Vencido',
                            fechaEstado: new Date().toISOString().split('T')[0],
                        });
                    }
                }
            }
            return compareResult;
        }
        catch (error) {
            console.error('Error importing CSV data:', error);
            throw error;
        }
    }
    async getImportLogs() {
        const logs = await db
            .select()
            .from(importLogs)
            .orderBy(desc(importLogs.timestamp));
        return logs;
    }
    async createImportLog(log) {
        const [importLog] = await db
            .insert(importLogs)
            .values(log)
            .returning();
        return importLog;
    }
}
// Initialize the storage
export const storage = new DatabaseStorage();
