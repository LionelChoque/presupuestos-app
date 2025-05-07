import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { Budget, BudgetFilters, Stats, TaskFilters, Budget as BudgetType } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number | undefined): string {
  if (value === undefined) return "0.00";
  
  return new Intl.NumberFormat('es-AR', {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value / 100); // Assuming value is stored in cents
}

export function formatDate(dateString: string): string {
  // Expect format: "DD/MM/YYYY HH:MM" (Spanish format)
  if (!dateString) return "";
  
  const parts = dateString.split(' ');
  if (parts.length !== 2) return dateString;
  
  return dateString;
}

export function calculateStats(budgets: Budget[]): Stats {
  const stats: Stats = {
    total: budgets.length,
    pending: 0,
    expiringSoon: 0,
    approved: 0,
    rejected: 0,
    byManufacturer: {},
    byStatus: {
      'Confirmación': 0,
      'Primer Seguimiento': 0,
      'Seguimiento Final': 0,
      'Vencido': 0,
      'Aprobado': 0,
      'Rechazado': 0
    }
  };

  budgets.forEach(budget => {
    // Count by status
    stats.byStatus[budget.tipoSeguimiento] = (stats.byStatus[budget.tipoSeguimiento] || 0) + 1;
    
    // Count by manufacturer
    stats.byManufacturer[budget.fabricante] = (stats.byManufacturer[budget.fabricante] || 0) + 1;
    
    // Count by priority types
    if (budget.tipoSeguimiento !== 'Vencido' && budget.tipoSeguimiento !== 'Aprobado' && budget.tipoSeguimiento !== 'Rechazado') {
      stats.pending++;
    }

    if (budget.estado === 'Aprobado') {
      stats.approved++;
    }

    if (budget.estado === 'Rechazado') {
      stats.rejected++;
    }

    // Count expiring soon (7 days or less)
    if (budget.diasRestantes >= 0 && budget.diasRestantes <= 7) {
      stats.expiringSoon++;
    }
  });

  return stats;
}

export function filterBudgets(budgets: Budget[], filters: BudgetFilters): Budget[] {
  return budgets.filter(budget => {
    // Search filter
    const searchMatch = filters.search === '' || 
      budget.id.toLowerCase().includes(filters.search.toLowerCase()) ||
      budget.empresa.toLowerCase().includes(filters.search.toLowerCase()) ||
      budget.fabricante.toLowerCase().includes(filters.search.toLowerCase());
    
    // Status filter
    let statusMatch = true;
    
    if (filters.status !== 'all') {
      if (filters.status === 'pending') {
        statusMatch = budget.tipoSeguimiento === 'Confirmación' || budget.tipoSeguimiento === 'Primer Seguimiento' || budget.tipoSeguimiento === 'Seguimiento Final';
      } else if (filters.status === 'approved') {
        statusMatch = budget.estado === 'Aprobado';
      } else if (filters.status === 'rejected') {
        statusMatch = budget.estado === 'Rechazado';
      } else if (filters.status === 'expired') {
        statusMatch = budget.tipoSeguimiento === 'Vencido';
      }
    }
    
    // Date range filter
    let dateMatch = true;
    
    if (filters.dateRange && (filters.dateRange.from || filters.dateRange.to)) {
      const fromDate = filters.dateRange.from ? new Date(filters.dateRange.from) : new Date(0);
      const toDate = filters.dateRange.to ? new Date(filters.dateRange.to) : new Date();
      
      // Ensure from date has time at beginning of day and to date has time at end of day
      fromDate.setHours(0, 0, 0, 0);
      toDate.setHours(23, 59, 59, 999);
      
      let dateToCheck: Date | null = null;
      
      // Determine which date to check based on dateType
      if (!filters.dateType || filters.dateType === 'creation') {
        // Default is creation date
        dateToCheck = new Date(budget.fechaCreacion);
      } else if (filters.dateType === 'action' && budget.fechaCompletado) {
        dateToCheck = new Date(budget.fechaCompletado);
      } else if (filters.dateType === 'status' && budget.fechaEstado) {
        dateToCheck = new Date(budget.fechaEstado);
      } else if (filters.dateType === 'all') {
        // For 'all', check any of the dates
        const dates = [
          budget.fechaCreacion ? new Date(budget.fechaCreacion) : null,
          budget.fechaCompletado ? new Date(budget.fechaCompletado) : null,
          budget.fechaEstado ? new Date(budget.fechaEstado) : null,
          budget.fechaFinalizado ? new Date(budget.fechaFinalizado) : null
        ].filter(d => d !== null) as Date[];
        
        // If any date is in range, it's a match
        if (dates.length > 0) {
          dateMatch = dates.some(date => date >= fromDate && date <= toDate);
        } else {
          dateMatch = false;
        }
        
        // Skip the rest of date matching logic since we've already determined the result
        return searchMatch && statusMatch && dateMatch;
      }
      
      // If we have a date to check and it's not 'all' type
      if (dateToCheck) {
        dateMatch = dateToCheck >= fromDate && dateToCheck <= toDate;
      } else {
        // If we're looking for a specific date type and it doesn't exist, no match
        dateMatch = filters.dateType ? false : true;
      }
    }
    
    return searchMatch && statusMatch && dateMatch;
  });
}

export function filterTasks(budgets: Budget[], filters: TaskFilters, completedTasks: Record<string, boolean>): Budget[] {
  return budgets.filter(budget => {
    // Filter out completed tasks
    if (completedTasks[budget.id] && filters.priority !== 'all') {
      return false;
    }
    
    // Priority filter
    if (filters.priority === 'alta') {
      return budget.prioridad === 'Alta';
    }
    if (filters.priority === 'media') {
      return budget.prioridad === 'Media';
    }
    if (filters.priority === 'baja') {
      return budget.prioridad === 'Baja';
    }
    
    return true;
  }).sort((a, b) => {
    // Sort by priority (Alta > Media > Baja)
    const priorityOrder = { 'Alta': 0, 'Media': 1, 'Baja': 2 };
    return priorityOrder[a.prioridad as keyof typeof priorityOrder] - priorityOrder[b.prioridad as keyof typeof priorityOrder];
  });
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'Confirmación':
      return 'status-confirmacion';
    case 'Primer Seguimiento':
    case 'Seguimiento Final':
      return 'status-seguimiento';
    case 'Vencido':
      return 'status-vencido';
    case 'Aprobado':
      return 'status-aprobado';
    case 'Rechazado':
      return 'status-rechazado';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

export function getPriorityColor(priority: string): string {
  switch (priority) {
    case 'Alta':
      return 'priority-high';
    case 'Media':
      return 'priority-medium';
    case 'Baja':
      return 'priority-low';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

export function getEmailTemplate(budget: BudgetType, contactName: string): string {
  if (!budget) return '';
  
  const contactNameDisplay = contactName || '[CONTACTO]';
  
  if (budget.tipoSeguimiento === 'Confirmación') {
    return `Estimado/a ${contactNameDisplay}:

Esperamos que se encuentre bien. Nos comunicamos para confirmar la recepción de nuestro presupuesto N° ${budget.id} enviado el ${budget.fechaCreacion}.

Quisiéramos saber si ha tenido oportunidad de revisar nuestra propuesta y si tiene alguna duda inicial que podamos aclarar. Estamos a su disposición para brindar cualquier información adicional que necesite.

Quedamos atentos a su respuesta y le agradecemos su interés en nuestros productos ${budget.fabricante}.

Saludos cordiales,
[NOMBRE_VENDEDOR]`;
  } else {
    return `Estimado/a ${contactNameDisplay}:

Espero que se encuentre bien. Me comunico nuevamente con relación al presupuesto N° ${budget.id} que le enviamos el pasado ${budget.fechaCreacion}.

Quisiera compartir con usted información adicional sobre nuestros productos ${budget.fabricante} que podría resultarle de interés:

- Características destacadas de los productos cotizados
- Ventajas competitivas respecto a otras opciones del mercado
- Casos de éxito con clientes similares

Me gustaría saber si ha podido analizar nuestra propuesta y si tiene algún interés en avanzar o si necesita alguna aclaración adicional.

Quedo a su disposición para cualquier consulta.

Saludos cordiales,
[NOMBRE_VENDEDOR]`;
  }
}

export function getPhoneTemplate(budget: BudgetType, contactName: string): string {
  if (!budget) return '';
  
  const contactNameDisplay = contactName || '[CONTACTO]';
  
  if (budget.tipoSeguimiento === 'Confirmación') {
    return `• Presentación: "Buenos días/tardes, mi nombre es [NOMBRE_VENDEDOR] de [NOMBRE_EMPRESA]. ¿Hablo con ${contactNameDisplay}?"<br><br>
• Motivo: "Me comunico para confirmar la recepción del presupuesto N° ${budget.id} que le enviamos el ${budget.fechaCreacion} para los productos ${budget.fabricante}."<br><br>
• Preguntas clave:<br>
  - "¿Ha tenido oportunidad de revisar la propuesta?"<br>
  - "¿Tiene alguna duda sobre los productos o servicios cotizados?"<br>
  - "¿Necesita información adicional sobre algún punto específico?"<br><br>
• Cierre: "Quedo a su disposición para cualquier consulta. Mi número directo es [TELEFONO_VENDEDOR] y mi email es [EMAIL_VENDEDOR]. Le agradezco su tiempo."<br><br>
• Recordatorio: "Tenga presente que el presupuesto tiene una validez de ${budget.validez} días, es decir, hasta el [FECHA_VENCIMIENTO]."`;
  } else {
    return `• Presentación: "Buenos días/tardes, mi nombre es [NOMBRE_VENDEDOR] de [NOMBRE_EMPRESA]. ¿Hablo con ${contactNameDisplay}?"<br><br>
• Contextualización: "Me comunico con usted para hacer un seguimiento del presupuesto N° ${budget.id} que le enviamos hace aproximadamente 10 días, el ${budget.fechaCreacion}."<br><br>
• Preguntas clave:<br>
  - "¿Ha tenido oportunidad de revisar la propuesta en detalle?"<br>
  - "¿Puedo proporcionarle información adicional sobre los productos ${budget.fabricante}?"<br>
  - "¿Hay algún aspecto particular que le interese conocer más a fondo?"<br><br>
• Información adicional: Mencionar beneficios específicos del producto, características técnicas destacadas, casos de éxito.<br><br>
• Cierre: "Quedamos atentos a sus comentarios. Recuerde que el presupuesto tiene validez hasta el [FECHA_VENCIMIENTO]."`;
  }
}
