import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage.js";
import { z } from 'zod';
import { insertContactInfoSchema, insertBudgetSchema } from '../shared/schema.js';
import { readFileSync } from 'fs';
import path from 'path';
import { setupAuth, isAuthenticated, isAdmin, logUserActivity } from './auth.js';
import fs from 'fs';

export async function registerRoutes(app: Express): Promise<Server> {
  // Configurar autenticación
  setupAuth(app);
  // Get all budgets
  app.get('/api/budgets', async (req, res) => {
    try {
      const budgets = await storage.getAllBudgets();
      res.json(budgets);
    } catch (error) {
      console.error('Error fetching budgets:', error);
      res.status(500).json({ message: 'Failed to fetch budgets' });
    }
  });

  // Get a specific budget
  app.get('/api/budgets/:id', async (req, res) => {
    try {
      const budget = await storage.getBudget(req.params.id);
      if (!budget) {
        return res.status(404).json({ message: 'Budget not found' });
      }
      res.json(budget);
    } catch (error) {
      console.error('Error fetching budget:', error);
      res.status(500).json({ message: 'Failed to fetch budget' });
    }
  });

  // Get budget items for a specific budget
  app.get('/api/budgets/:id/items', async (req, res) => {
    try {
      const items = await storage.getBudgetItems(req.params.id);
      res.json(items);
    } catch (error) {
      console.error('Error fetching budget items:', error);
      res.status(500).json({ message: 'Failed to fetch budget items' });
    }
  });

  // Update a budget
  app.patch('/api/budgets/:id', isAuthenticated, async (req, res) => {
    try {
      const updateSchema = insertBudgetSchema.partial();
      const validatedData = updateSchema.safeParse(req.body);
      
      if (!validatedData.success) {
        return res.status(400).json({ 
          message: 'Invalid budget data', 
          errors: validatedData.error.format() 
        });
      }
      
      const updatedBudget = await storage.updateBudget(req.params.id, validatedData.data);
      if (!updatedBudget) {
        return res.status(404).json({ message: 'Budget not found' });
      }
      
      // Registrar la actividad
      if (req.user) {
        await logUserActivity(
          req.user.id, 
          "budget_update", 
          `Usuario ${req.user.username} actualizó el presupuesto ${updatedBudget.id}`,
          updatedBudget.id,
          { ...validatedData.data }
        );
      }
      
      res.json(updatedBudget);
    } catch (error) {
      console.error('Error updating budget:', error);
      res.status(500).json({ message: 'Failed to update budget' });
    }
  });

  // Get all contacts
  app.get('/api/contacts', async (req, res) => {
    try {
      const contacts = await storage.getAllContacts();
      res.json(contacts);
    } catch (error) {
      console.error('Error fetching contacts:', error);
      res.status(500).json({ message: 'Failed to fetch contacts' });
    }
  });

  // Get contact for a specific budget
  app.get('/api/contacts/:budgetId', async (req, res) => {
    try {
      const contact = await storage.getContact(req.params.budgetId);
      if (!contact) {
        return res.status(404).json({ message: 'Contact not found' });
      }
      res.json(contact);
    } catch (error) {
      console.error('Error fetching contact:', error);
      res.status(500).json({ message: 'Failed to fetch contact' });
    }
  });

  // Create or update contact for a budget
  app.post('/api/contacts', isAuthenticated, async (req, res) => {
    try {
      const contactSchema = z.object({
        budgetId: z.string(),
        nombre: z.string(),
        email: z.string().email().optional(),
        telefono: z.string().optional(),
      });
      
      const validatedData = contactSchema.safeParse(req.body);
      
      if (!validatedData.success) {
        return res.status(400).json({ 
          message: 'Invalid contact data', 
          errors: validatedData.error.format() 
        });
      }
      
      const { budgetId, ...contactData } = validatedData.data;
      
      const existingContact = await storage.getContact(budgetId);
      let contact;
      
      if (existingContact) {
        contact = await storage.updateContact(budgetId, contactData);
        
        // Registrar la actividad de actualización
        if (req.user) {
          await logUserActivity(
            req.user.id, 
            "contact_update", 
            `Usuario ${req.user.username} actualizó el contacto para el presupuesto ${budgetId}`,
            budgetId,
            contactData
          );
        }
      } else {
        contact = await storage.createContact(budgetId, contactData);
        
        // Registrar la actividad de creación
        if (req.user) {
          await logUserActivity(
            req.user.id, 
            "contact_create", 
            `Usuario ${req.user.username} creó el contacto para el presupuesto ${budgetId}`,
            budgetId,
            contactData
          );
        }
      }
      
      res.json(contact);
    } catch (error) {
      console.error('Error creating/updating contact:', error);
      res.status(500).json({ message: 'Failed to create/update contact' });
    }
  });

  // Import CSV data
  app.post('/api/import', isAuthenticated, async (req, res) => {
    try {
      const importSchema = z.object({
        csvData: z.string(),
        options: z.object({
          compareWithPrevious: z.boolean(),
          autoFinalizeMissing: z.boolean(),
        }),
      });
      
      const validatedData = importSchema.safeParse(req.body);
      
      if (!validatedData.success) {
        return res.status(400).json({ 
          message: 'Invalid import data', 
          errors: validatedData.error.format() 
        });
      }
      
      const { csvData, options } = validatedData.data;
      
      // Process CSV data and save to storage
      const rawCsvData = readFileSync(csvFilePath, 'utf-8');
      const result = await storage.importCsvData(rawCsvData, options);

      
      // Log the import
      await storage.createImportLog({
        fileName: 'manual_import.csv',
        recordsImported: result.added,
        recordsUpdated: result.updated,
        recordsDeleted: result.deleted,
      });
      
      // Registrar la actividad
      if (req.user) {
        await logUserActivity(
          req.user.id, 
          "import_csv", 
          `Usuario ${req.user.username} importó CSV con ${result.added} nuevos, ${result.updated} actualizados, ${result.deleted} eliminados`,
          "manual_csv",
          { ...options, totalRecords: result.total }
        );
      }
      
      res.json(result);
    } catch (error) {
      console.error('Error importing CSV:', error);
      res.status(500).json({ message: 'Failed to import CSV data' });
    }
  });

  // Get import logs
  app.get('/api/import-logs', isAuthenticated, async (req, res) => {
    try {
      const logs = await storage.getImportLogs();
      res.json(logs);
    } catch (error) {
      console.error('Error fetching import logs:', error);
      res.status(500).json({ message: 'Failed to fetch import logs' });
    }
  });

  // Import demo CSV file
  app.post('/api/import/demo', isAuthenticated, async (req, res) => {
    try {
      const optionsSchema = z.object({
        options: z.object({
          compareWithPrevious: z.boolean(),
          autoFinalizeMissing: z.boolean(),
        }),
      });
      
      const validatedData = optionsSchema.safeParse(req.body);
      
      if (!validatedData.success) {
        return res.status(400).json({ 
          message: 'Invalid options data', 
          errors: validatedData.error.format() 
        });
      }
      
      const { options } = validatedData.data;
      
      // Modificar:
const csvFilePath = path.join(process.cwd(), 'attached_assets', 'PRESUPUESTOS_CON_ITEMS.csv');

// Y agregar manejo de error:
try {
  // Verificar si el archivo existe
  if (!fs.existsSync(csvFilePath)) {
    return res.status(404).json({ 
      message: 'Archivo de demostración no encontrado. Cree el directorio attached_assets y coloque allí el archivo CSV.'
    });
  }
  const csvData = readFileSync(csvFilePath, 'utf-8');
  // Resto del código...
} catch (error) {
  console.error('Error al leer el archivo CSV:', error);
  return res.status(500).json({ message: 'Error al leer el archivo CSV de demostración' });
}
      
      // Procesar e importar los datos
      const result = await storage.importCsvData(csvData, options);
      
      // Registrar la importación
      await storage.createImportLog({
        fileName: 'PRESUPUESTOS_CON_ITEMS.csv',
        recordsImported: result.added,
        recordsUpdated: result.updated,
        recordsDeleted: result.deleted,
      });
      
      // Registrar la actividad
      if (req.user) {
        await logUserActivity(
          req.user.id, 
          "import_demo", 
          `Usuario ${req.user.username} importó CSV de demostración con ${result.added} nuevos, ${result.updated} actualizados, ${result.deleted} eliminados`,
          "demo_csv",
          { ...options, totalRecords: result.total }
        );
      }
      
      res.json(result);
    } catch (error) {
      console.error('Error importing demo CSV:', error);
      res.status(500).json({ message: 'Failed to import demo CSV data' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
