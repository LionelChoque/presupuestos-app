import { budgets, budgetItems, contactInfo, importLogs, users, userActivities } from "@shared/schema";
import { convertCsvToBudgets, compareBudgets } from "../client/src/lib/csvParser";
import { db } from "./db";
import { eq, desc, sql } from "drizzle-orm";
export class DatabaseStorage {
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
            .values(insertUser)
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
    async createUserActivity(activity) {
        const [userActivity] = await db
            .insert(userActivities)
            .values(activity)
            .returning();
        return userActivity;
    }
    async getUserActivities(limit = 50, offset = 0) {
        const activities = await db.select()
            .from(userActivities)
            .orderBy(desc(userActivities.timestamp))
            .limit(limit)
            .offset(offset);
        const result = [];
        for (const activity of activities) {
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
        const totalUsers = await this.getUserCount();
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
        const activeUsersResult = await db.select({ count: sql `count(distinct user_id)` })
            .from(userActivities)
            .where(sql `timestamp > ${oneMonthAgo.toISOString()}`);
        const activeUsers = Number(activeUsersResult[0].count);
        const activitiesData = await db.select({
            userId: userActivities.userId,
            count: sql `count(*)`,
        })
            .from(userActivities)
            .groupBy(userActivities.userId)
            .orderBy(sql `count(*) desc`)
            .limit(10);
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
        const recentActivitiesRaw = await this.getUserActivities(10, 0);
        return {
            totalUsers,
            activeUsers,
            userActivities: userActivityStats,
            recentActivities: recentActivitiesRaw
        };
    }
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
    async getBudgetItems(budgetId) {
        const items = await db
            .select()
            .from(budgetItems)
            .where(eq(budgetItems.budgetId, budgetId));
        return items;
    }
    async createBudgetItem(insertItem) {
        const itemToInsert = {
            ...insertItem
        };
        if (typeof itemToInsert.precio === 'number') {
            itemToInsert.precio = String(itemToInsert.precio);
        }
        const [item] = await db
            .insert(budgetItems)
            .values(itemToInsert)
            .returning();
        return item;
    }
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
                        estado: existingBudget.estado,
                    });
                }
                else {
                    await this.createBudget(budget);
                }
                if (budget.items && budget.items.length > 0) {
                    await db
                        .delete(budgetItems)
                        .where(eq(budgetItems.budgetId, budget.id));
                    for (const item of budget.items) {
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
export const storage = new DatabaseStorage();
//# sourceMappingURL=storage.js.map