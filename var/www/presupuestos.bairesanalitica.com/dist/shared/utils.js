import { z } from 'zod';
import Papa from 'papaparse';
export const csvRowSchema = z.object({
    ID: z.string(),
    Empresa: z.string(),
    FechaCreacion: z.string(),
    NroItem: z.string().optional(),
    Cantidad: z.string().optional(),
    Codigo_Producto: z.string().optional(),
    Descripcion: z.string().optional(),
    Fabricante: z.string(),
    NetoItems_USD: z.string(),
    Descuento: z.string().optional(),
    Validez: z.string().optional(),
});
export function parseCsvFile(csvContent) {
    return new Promise((resolve, reject) => {
        Papa.parse(csvContent, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                try {
                    const validatedRows = [];
                    for (const row of results.data) {
                        try {
                            const validRow = csvRowSchema.parse(row);
                            validatedRows.push(validRow);
                        }
                        catch (err) {
                            console.error('Invalid row:', row, err);
                        }
                    }
                    resolve(validatedRows);
                }
                catch (error) {
                    reject(error);
                }
            },
            error: (error) => {
                reject(error);
            }
        });
    });
}
export function daysBetween(date1, date2) {
    const oneDay = 24 * 60 * 60 * 1000;
    const diffDays = Math.round(Math.abs((date1.getTime() - date2.getTime()) / oneDay));
    return diffDays;
}
export function groupRowsByBudgetId(rows) {
    const budgetMap = new Map();
    for (const row of rows) {
        if (!budgetMap.has(row.ID)) {
            budgetMap.set(row.ID, []);
        }
        budgetMap.get(row.ID)?.push(row);
    }
    return budgetMap;
}
export function convertRowToBudgetItem(row, budgetId) {
    return {
        budgetId,
        codigo: row.Codigo_Producto || '',
        descripcion: row.Descripcion || '',
        precio: parseFloat(row.NetoItems_USD.replace(',', '.')) * 100,
        cantidad: parseInt(row.Cantidad || '1', 10),
    };
}
export function determineFollowUpStatus(diasTranscurridos, diasRestantes, validez) {
    let tipoSeguimiento;
    let accion;
    let prioridad;
    if (diasRestantes <= 0) {
        tipoSeguimiento = 'Vencido';
        accion = 'Registrar estado final del presupuesto (aprobado, rechazado, o vencido sin respuesta)';
        prioridad = 'Alta';
    }
    else if (diasTranscurridos <= 3) {
        tipoSeguimiento = 'Confirmación';
        accion = 'Confirmar recepción del presupuesto y aclarar dudas iniciales';
        prioridad = validez < 14 ? 'Alta' : 'Media';
    }
    else if (diasTranscurridos <= 15) {
        tipoSeguimiento = 'Primer Seguimiento';
        accion = 'Proporcionar información adicional sobre productos y verificar interés inicial';
        prioridad = diasRestantes <= 7 ? 'Alta' : 'Media';
    }
    else {
        tipoSeguimiento = 'Seguimiento Final';
        accion = 'Última comunicación antes de expiración y motivar decisión final';
        prioridad = 'Alta';
    }
    return { tipoSeguimiento, prioridad, accion };
}
export function generateAlerts(validez, diasRestantes) {
    const alertas = [];
    if (validez === 0) {
        alertas.push('Sin fecha de validez definida');
    }
    if (validez > 0 && validez < 14) {
        alertas.push(`Validez corta (${validez} días)`);
    }
    if (diasRestantes < 0) {
        alertas.push(`Presupuesto vencido hace ${Math.abs(diasRestantes)} días`);
    }
    else if (diasRestantes <= 7 && diasRestantes > 0) {
        alertas.push(`Próximo a vencer (${diasRestantes} días restantes)`);
    }
    return alertas;
}
//# sourceMappingURL=utils.js.map