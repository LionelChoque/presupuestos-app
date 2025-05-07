export interface BudgetItem {
  codigo: string;
  descripcion: string;
  precio: string; // Cambiado de number a string para ser consistente con el servidor
  cantidad?: number;
}

export interface BudgetStageHistoryItem {
  etapa: string;
  fecha: string;
  comentario?: string;
  usuario?: string;
  usuarioId?: number;
}

export interface BudgetActionHistoryItem {
  accion: string;
  fecha: string;
  comentario?: string;
  usuario?: string;
  usuarioId?: number;
}

export interface Budget {
  id: string;
  empresa: string;
  fechaCreacion: string;
  fabricante: string;
  moneda?: string;
  descuento?: number;
  validez?: number;
  items?: BudgetItem[];
  montoTotal: string; // Cambiado de number a string para ser consistente con el servidor
  diasTranscurridos?: number;
  diasRestantes: number;
  tipoSeguimiento: string;
  accion: string;
  prioridad: string;
  alertas: string[];
  completado?: boolean;
  fechaCompletado?: string;
  estado?: 'Pendiente' | 'Aprobado' | 'Rechazado' | 'Vencido';
  fechaEstado?: string;
  notas?: string;
  finalizado?: boolean;
  fechaFinalizado?: string;
  esLicitacion?: boolean;
  contacto?: ContactInfo;
  historialEtapas?: BudgetStageHistoryItem[];
  historialAcciones?: BudgetActionHistoryItem[];
  // Nuevos campos para registro de usuario y temporalidad
  fechaAccion?: string;
  usuarioAsignado?: number;
  ultimoUsuario?: number;
  fechaUltimaActualizacion?: string;
}

export interface ContactInfo {
  nombre: string;
  email?: string;
  telefono?: string;
}

export interface ImportOptions {
  compareWithPrevious: boolean;
  autoFinalizeMissing: boolean;
}

export interface ImportResult {
  added: number;
  updated: number;
  deleted: number;
  total: number;
}

export interface CsvBudgetRow {
  ID: string;
  Empresa: string;
  FechaCreacion: string;
  NroItem: string;
  Cantidad: string;
  Codigo_Producto: string;
  Descripcion: string;
  Fabricante: string;
  NetoItems_USD: string;
  Descuento: string;
  Validez: string;
  Nombre_Contacto?: string;
  Direccion?: string; // Usaremos este campo como email para contacto
}

export interface Stats {
  total: number;
  pending: number;
  expiringSoon: number;
  approved: number;
  rejected: number;
  byManufacturer: Record<string, number>;
  byStatus: Record<string, number>;
}

export interface ReportData {
  type: 'summary' | 'performance' | 'manufacturer' | 'client';
  from: string;
  to: string;
  format: 'excel' | 'pdf' | 'csv';
}

export interface ReportItem {
  title: string;
  format: 'excel' | 'pdf' | 'csv';
  date: string;
  size: string;
}

export interface ActivityItem {
  type: 'import' | 'update' | 'note';
  description: string;
  time: string;
}

export interface TaskFilters {
  priority: 'all' | 'alta' | 'media' | 'baja';
}

export interface BudgetFilters {
  search: string;
  status: 'all' | 'pending' | 'approved' | 'rejected' | 'expired';
  dateRange?: {
    from: string;
    to: string;
  };
  dateType?: 'creation' | 'action' | 'status' | 'all';
}
