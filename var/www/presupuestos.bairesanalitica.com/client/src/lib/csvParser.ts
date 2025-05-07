import Papa, { ParseError, ParseResult } from 'papaparse';
import { Budget, BudgetItem, CsvBudgetRow, ImportOptions, ImportResult } from './types';

// Group the items by budget ID
function groupItemsByBudget(rows: CsvBudgetRow[]): Map<string, CsvBudgetRow[]> {
  const budgetMap = new Map<string, CsvBudgetRow[]>();
  
  rows.forEach(row => {
    const budgetId = row.ID;
    
    if (!budgetMap.has(budgetId)) {
      budgetMap.set(budgetId, []);
    }
    
    budgetMap.get(budgetId)?.push(row);
  });
  
  return budgetMap;
}

// Calculate status, days remaining, and alerts for a budget
function calculateBudgetDetails(budgetRows: CsvBudgetRow[]): {
  tipoSeguimiento: string;
  accion: string;
  prioridad: string;
  diasRestantes: number;
  diasTranscurridos: number;
  alertas: string[];
  esLicitacion: boolean;
  contacto?: {
    nombre: string;
    email?: string;
  };
} {
  const firstRow = budgetRows[0];
  
  const validez = parseInt(firstRow.Validez) || 0;
  
  // Calculate days from creation
  const dateString = firstRow.FechaCreacion.split(' ')[0]; // DD/MM/YYYY
  const [day, month, year] = dateString.split('/').map(Number);
  const creationDate = new Date(year, month - 1, day);
  const today = new Date();
  
  // Days from creation to now
  const diffTime = Math.abs(today.getTime() - creationDate.getTime());
  const diasTranscurridos = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  // Days remaining until expiration
  const diasRestantes = validez - diasTranscurridos;
  
  // Generate alerts
  const alertas: string[] = [];
  
  if (validez === 0) {
    alertas.push('Sin fecha de validez definida');
  }
  
  if (validez > 0 && validez < 14) {
    alertas.push(`Validez corta (${validez} días)`);
  }
  
  if (diasRestantes < 0) {
    alertas.push(`Presupuesto vencido hace ${Math.abs(diasRestantes)} días`);
  }
  
  // Determinar si es una licitación (para esta implementación, consideraremos licitación
  // los presupuestos con validez mayor a 60 días o empresa que contenga palabras clave como "municipalidad", "gobierno", etc.)
  const esLicitacion = validez > 60 || 
                     /municipalidad|gobierno|ministerio|secretaria|universidad|obras|ente|instituto/i.test(firstRow.Empresa);
  
  // Extraer información de contacto si está disponible
  const contacto = firstRow.Nombre_Contacto ? {
    nombre: firstRow.Nombre_Contacto,
    email: firstRow.Direccion
  } : undefined;
  
  // Determine follow-up type and actions
  let tipoSeguimiento: string;
  let accion: string;
  let prioridad: string;
  
  if (diasRestantes <= 0) {
    tipoSeguimiento = 'Vencido';
    accion = 'Registrar estado final del presupuesto (aprobado, rechazado, o vencido sin respuesta)';
    prioridad = 'Alta';
  } else if (diasTranscurridos <= 3) {
    tipoSeguimiento = 'Confirmación';
    accion = 'Confirmar recepción del presupuesto y aclarar dudas iniciales';
    prioridad = validez < 14 ? 'Alta' : 'Media';
  } else if (diasTranscurridos <= 15) {
    tipoSeguimiento = 'Primer Seguimiento';
    accion = 'Proporcionar información adicional sobre productos y verificar interés inicial';
    prioridad = diasRestantes <= 7 ? 'Alta' : 'Media';
  } else {
    tipoSeguimiento = 'Seguimiento Final';
    accion = 'Última comunicación antes de expiración y motivar decisión final';
    prioridad = 'Alta';
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

// Convert CSV rows to Budget objects
export function convertCsvToBudgets(csvData: string): Promise<Budget[]> {
  return new Promise((resolve, reject) => {
    Papa.parse<CsvBudgetRow>(csvData, {
      header: true,
      complete: (results: ParseResult<CsvBudgetRow>) => {
        try {
          const budgetMap = groupItemsByBudget(results.data);
          const budgets: Budget[] = [];
          
          budgetMap.forEach((rows, budgetId) => {
            if (rows.length === 0 || !budgetId) return;
            
            const firstRow = rows[0];
            
            // Calculate total amount
            const montoTotal = rows.reduce((sum, row) => {
              const neto = parseFloat(row.NetoItems_USD.replace(',', '.')) || 0;
              const cantidad = parseInt(row.Cantidad) || 1;
              return sum + (neto * cantidad);
            }, 0);
            
            // Generate budget items
            const items: BudgetItem[] = rows.map(row => ({
              codigo: row.Codigo_Producto,
              descripcion: row.Descripcion,
              precio: row.NetoItems_USD.replace(',', '.'), // Mantener como string para consistencia con el servidor
              cantidad: parseInt(row.Cantidad) || 1
            }));
            
            // Calculate budget details
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
            
            // Create budget object
            const budget: Budget = {
              id: budgetId,
              empresa: firstRow.Empresa,
              fechaCreacion: firstRow.FechaCreacion,
              fabricante: firstRow.Fabricante,
              moneda: 'Dólar EEUU',
              descuento: parseInt(firstRow.Descuento) || 0,
              validez: parseInt(firstRow.Validez) || 0,
              items,
              montoTotal: montoTotal.toFixed(2).toString(), // Mantener como string para consistencia con el servidor
              diasTranscurridos,
              diasRestantes,
              tipoSeguimiento,
              accion,
              prioridad,
              alertas,
              estado: tipoSeguimiento === 'Vencido' ? 'Vencido' : 'Pendiente',
              esLicitacion,
              contacto
            };
            
            budgets.push(budget);
          });
          
          resolve(budgets);
        } catch (error) {
          reject(error);
        }
      },
      error: (error: Error) => {
        reject(error);
      }
    });
  });
}

// Compare existing budgets with new budgets
export function compareBudgets(
  existingBudgets: Budget[],
  newBudgets: Budget[],
  options: ImportOptions
): ImportResult {
  const result: ImportResult = {
    added: 0,
    updated: 0,
    deleted: 0,
    total: newBudgets.length
  };
  
  // Create maps for faster lookup
  const existingBudgetMap = new Map<string, Budget>();
  existingBudgets.forEach(budget => {
    existingBudgetMap.set(budget.id, budget);
  });
  
  const newBudgetMap = new Map<string, Budget>();
  newBudgets.forEach(budget => {
    newBudgetMap.set(budget.id, budget);
  });
  
  // Find budgets to add or update
  newBudgets.forEach(newBudget => {
    if (existingBudgetMap.has(newBudget.id)) {
      result.updated++;
    } else {
      result.added++;
    }
  });
  
  // Find budgets that are in existing but not in new (deleted/finalized)
  if (options.autoFinalizeMissing && options.compareWithPrevious) {
    existingBudgets.forEach(existingBudget => {
      if (!newBudgetMap.has(existingBudget.id) && !existingBudget.finalizado) {
        result.deleted++;
      }
    });
  }
  
  return result;
}

// Process CSV import and return updated budgets
export async function processImportedCsv(
  csvData: string,
  existingBudgets: Budget[],
  options: ImportOptions
): Promise<{
  budgets: Budget[];
  result: ImportResult;
}> {
  try {
    // Parse CSV and convert to budgets
    const newBudgets = await convertCsvToBudgets(csvData);
    
    // Compare with existing budgets
    const result = compareBudgets(existingBudgets, newBudgets, options);
    
    // Create final budget array
    const updatedBudgets: Budget[] = [];
    
    // Add or update budgets from the new CSV
    newBudgets.forEach(newBudget => {
      const existingBudget = existingBudgets.find(b => b.id === newBudget.id);
      
      if (existingBudget) {
        // Keep user-entered data like notes and completed status
        updatedBudgets.push({
          ...newBudget,
          notas: existingBudget.notas || '',
          completado: existingBudget.completado || false,
          estado: existingBudget.estado || 'Pendiente'
        });
      } else {
        updatedBudgets.push(newBudget);
      }
    });
    
    // Add existing budgets that are not in the new CSV (if not auto-finalizing)
    if (!options.autoFinalizeMissing) {
      existingBudgets.forEach(existingBudget => {
        if (!newBudgets.find(b => b.id === existingBudget.id)) {
          updatedBudgets.push(existingBudget);
        }
      });
    } else if (options.compareWithPrevious) {
      // Mark missing budgets as finalized
      existingBudgets.forEach(existingBudget => {
        if (!newBudgets.find(b => b.id === existingBudget.id) && !existingBudget.finalizado) {
          updatedBudgets.push({
            ...existingBudget,
            finalizado: true,
            estado: 'Vencido'
          });
        }
      });
    }
    
    return {
      budgets: updatedBudgets,
      result
    };
  } catch (error) {
    console.error('Error processing CSV import:', error);
    throw error;
  }
}
