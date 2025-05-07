import { 
  Budget, 
  BudgetItem, 
  ContactInfo, 
  ImportLog, 
  InsertBudget, 
  InsertBudgetItem, 
  InsertContactInfo, 
  InsertImportLog, 
  User, 
  InsertUser,
  UserActivity,
  InsertUserActivity,
  budgets,
  budgetItems,
  contactInfo,
  importLogs,
  users,
  userActivities
} from "../shared/schema.js";
import { convertCsvToBudgets, compareBudgets } from "../client/src/lib/csvParser.js";
import { db } from "./db.js";
import { eq, desc, sql, inArray } from "drizzle-orm";

// Interface for storage operations
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, userData: Partial<Omit<InsertUser, 'id'>>): Promise<User>;
  getAllUsers(): Promise<User[]>;
  getUserCount(): Promise<number>;
  
  // User activity operations
  createUserActivity(activity: InsertUserActivity): Promise<UserActivity>;
  getUserActivities(limit?: number, offset?: number): Promise<(UserActivity & { username: string })[]>;
  getUserActivitiesByUserId(userId: number, limit?: number, offset?: number): Promise<UserActivity[]>;
  getUserStats(): Promise<{
    totalUsers: number;
    activeUsers: number;
    userActivities: { userId: number; username: string; count: number }[];
    recentActivities: (UserActivity & { username: string })[];
  }>;
  
  // Budget operations
  getAllBudgets(): Promise<Budget[]>;
  getBudget(id: string): Promise<Budget | undefined>;
  createBudget(budget: InsertBudget): Promise<Budget>;
  updateBudget(id: string, budgetData: Partial<InsertBudget>): Promise<Budget | undefined>;
  deleteBudget(id: string): Promise<boolean>;
  
  // Budget items operations
  getBudgetItems(budgetId: string): Promise<BudgetItem[]>;
  createBudgetItem(item: InsertBudgetItem): Promise<BudgetItem>;
  
  // Contact operations
  getAllContacts(): Promise<(ContactInfo & { budgetId: string })[]>;
  getContact(budgetId: string): Promise<(ContactInfo & { budgetId: string }) | undefined>;
  createContact(budgetId: string, contact: Omit<InsertContactInfo, 'budgetId'>): Promise<ContactInfo & { budgetId: string }>;
  updateContact(budgetId: string, contactData: Partial<Omit<InsertContactInfo, 'budgetId'>>): Promise<(ContactInfo & { budgetId: string }) | undefined>;
  
  // Import operations
  importCsvData(csvData: string, options: { compareWithPrevious: boolean; autoFinalizeMissing: boolean }): Promise<{ added: number; updated: number; deleted: number; total: number }>;
  getImportLogs(): Promise<ImportLog[]>;
  createImportLog(log: Omit<InsertImportLog, 'id'>): Promise<ImportLog>;
}

// Database storage implementation
export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }
  
  async updateUser(id: number, userData: Partial<Omit<InsertUser, 'id'>>): Promise<User> {
    const [user] = await db
      .update(users)
      .set(userData as any)
      .where(eq(users.id, id))
      .returning();
    return user;
  }
  
  async getAllUsers(): Promise<User[]> {
    return db.select().from(users);
  }
  
  async getUserCount(): Promise<number> {
    const result = await db.select({ count: sql`count(*)` }).from(users);
    return Number(result[0].count);
  }
  
  // User activity operations
  async createUserActivity(activity: InsertUserActivity): Promise<UserActivity> {
    const [userActivity] = await db
      .insert(userActivities)
      .values(activity)
      .returning();
    return userActivity;
  }
  
  async getUserActivities(limit = 50, offset = 0): Promise<(UserActivity & { username: string })[]> {
    // Obtener actividades
    const activities = await db.select()
      .from(userActivities)
      .orderBy(desc(userActivities.timestamp))
      .limit(limit)
      .offset(offset);
    
    // Procesar cada actividad para obtener el nombre de usuario
    const result: (UserActivity & { username: string })[] = [];
    
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
  
  async getUserActivitiesByUserId(userId: number, limit = 50, offset = 0): Promise<UserActivity[]> {
    return db.select()
      .from(userActivities)
      .where(eq(userActivities.userId, userId))
      .orderBy(desc(userActivities.timestamp))
      .limit(limit)
      .offset(offset);
  }
  
  async getUserStats(): Promise<{
    totalUsers: number;
    activeUsers: number;
    userActivities: { userId: number; username: string; count: number }[];
    recentActivities: (UserActivity & { username: string })[];
  }> {
    // Total usuarios
    const totalUsers = await this.getUserCount();
    
    // Usuarios activos en el último mes
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    
    const activeUsersResult = await db.select({ count: sql`count(distinct user_id)` })
      .from(userActivities)
      .where(sql`timestamp > ${oneMonthAgo.toISOString()}`);
    
    const activeUsers = Number(activeUsersResult[0].count);
    
    // Actividad por usuario (top 10)
    const activitiesData = await db.select({
      userId: userActivities.userId,
      count: sql`count(*)`,
    })
    .from(userActivities)
    .groupBy(userActivities.userId)
    .orderBy(sql`count(*) desc`)
    .limit(10);
    
    // Obtener nombres de usuario
    const userIdsList = activitiesData.map(a => a.userId);
    let usersData: User[] = [];
    
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
  async getAllBudgets(): Promise<Budget[]> {
    const dbBudgets = await db.select().from(budgets);
    return dbBudgets as Budget[];
  }

  async getBudget(id: string): Promise<Budget | undefined> {
    const [budget] = await db.select().from(budgets).where(eq(budgets.id, id));
    return budget as Budget | undefined;
  }

  async createBudget(insertBudget: InsertBudget): Promise<Budget> {
    // Asegurar que el presupuesto tenga un ID
    const budgetWithId: any = {
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
    
    return budget as Budget;
  }

  async updateBudget(id: string, budgetData: Partial<InsertBudget>): Promise<Budget | undefined> {
    const [updatedBudget] = await db
      .update(budgets)
      .set(budgetData as any)
      .where(eq(budgets.id, id))
      .returning();
    
    return updatedBudget as Budget | undefined;
  }

  async deleteBudget(id: string): Promise<boolean> {
    const [deletedBudget] = await db
      .delete(budgets)
      .where(eq(budgets.id, id))
      .returning();
    
    return !!deletedBudget;
  }

  // Budget items operations
  async getBudgetItems(budgetId: string): Promise<BudgetItem[]> {
    const items = await db
      .select()
      .from(budgetItems)
      .where(eq(budgetItems.budgetId, budgetId));
    
    return items as BudgetItem[];
  }

  async createBudgetItem(insertItem: InsertBudgetItem): Promise<BudgetItem> {
    // Aseguramos que el precio sea string (esperado por el esquema)
    const itemToInsert: any = {
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
    
    return item as BudgetItem;
  }

  // Contact operations
  async getAllContacts(): Promise<(ContactInfo & { budgetId: string })[]> {
    const contacts = await db.select().from(contactInfo);
    return contacts as (ContactInfo & { budgetId: string })[];
  }

  async getContact(budgetId: string): Promise<(ContactInfo & { budgetId: string }) | undefined> {
    const [contact] = await db
      .select()
      .from(contactInfo)
      .where(eq(contactInfo.budgetId, budgetId));
    
    return contact as (ContactInfo & { budgetId: string }) | undefined;
  }

  async createContact(budgetId: string, contact: Omit<InsertContactInfo, 'budgetId'>): Promise<ContactInfo & { budgetId: string }> {
    const [newContact] = await db
      .insert(contactInfo)
      .values({
        ...contact,
        budgetId
      } as any)
      .returning();
    
    return newContact as ContactInfo & { budgetId: string };
  }

  async updateContact(budgetId: string, contactData: Partial<Omit<InsertContactInfo, 'budgetId'>>): Promise<(ContactInfo & { budgetId: string }) | undefined> {
    const [updatedContact] = await db
      .update(contactInfo)
      .set(contactData as any)
      .where(eq(contactInfo.budgetId, budgetId))
      .returning();
    
    return updatedContact as (ContactInfo & { budgetId: string }) | undefined;
  }

  // Import operations
  async importCsvData(csvData: string, options: { compareWithPrevious: boolean; autoFinalizeMissing: boolean }): Promise<{ added: number; updated: number; deleted: number; total: number }> {
    try {
      // Parse CSV data into budgets
      const newBudgets = await convertCsvToBudgets(csvData);
      const existingBudgets = await this.getAllBudgets();
      
      // Compare with existing budgets
      // Usamos as any para evitar problemas de tipos durante la comparación
      const compareResult = compareBudgets(existingBudgets as any, newBudgets as any, options);
      
      // Process budgets to add or update
      for (const budget of newBudgets) {
        // Check if budget already exists
        const existingBudget = await this.getBudget(budget.id);
        
        if (existingBudget) {
          // Update existing budget, preserving user-entered data
          // Usamos as any para resolver problemas de tipos temporalmente
          await this.updateBudget(budget.id, {
            ...(budget as any),
            notas: existingBudget.notas,
            completado: existingBudget.completado,
            estado: existingBudget.estado,
          });
        } else {
          // Create new budget
          await this.createBudget(budget as any);
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
    } catch (error) {
      console.error('Error importing CSV data:', error);
      throw error;
    }
  }

  async getImportLogs(): Promise<ImportLog[]> {
    const logs = await db
      .select()
      .from(importLogs)
      .orderBy(desc(importLogs.timestamp));
    
    return logs as ImportLog[];
  }

  async createImportLog(log: Omit<InsertImportLog, 'id'>): Promise<ImportLog> {
    const [importLog] = await db
      .insert(importLogs)
      .values(log as any)
      .returning();
    
    return importLog as ImportLog;
  }
}

// Initialize the storage
export const storage = new DatabaseStorage();
