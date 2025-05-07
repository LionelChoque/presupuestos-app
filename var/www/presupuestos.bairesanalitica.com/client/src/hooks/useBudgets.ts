import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { 
  Budget, 
  ContactInfo, 
  ImportOptions, 
  ImportResult, 
  BudgetStageHistoryItem,
  BudgetActionHistoryItem 
} from '@/lib/types';
import { processImportedCsv } from '@/lib/csvParser';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';

export function useBudgets() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth(); // Obtener el usuario autenticado
  const [selectedBudget, setSelectedBudget] = useState<Budget | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isBudgetDetailsOpen, setIsBudgetDetailsOpen] = useState(false);
  const [completedTasks, setCompletedTasks] = useState<Record<string, boolean>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [actionStatus, setActionStatus] = useState<Record<string, boolean>>({});
  const [contactsData, setContactsData] = useState<Record<string, ContactInfo>>({});
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [importOptions, setImportOptions] = useState<ImportOptions>({
    compareWithPrevious: true,
    autoFinalizeMissing: true
  });

  // Fetch budgets from API
  const { data: budgets = [], isLoading } = useQuery<Budget[]>({
    queryKey: ['/api/budgets'],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch contacts from API
  const { data: contacts = [] } = useQuery<(ContactInfo & { budgetId: string })[]>({
    queryKey: ['/api/contacts'],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  useEffect(() => {
    // Convert contacts array to record for easy lookup
    const contactsRecord: Record<string, ContactInfo> = {};
    contacts.forEach((contact: ContactInfo & { budgetId: string }) => {
      contactsRecord[contact.budgetId] = {
        nombre: contact.nombre,
        email: contact.email,
        telefono: contact.telefono
      };
    });
    setContactsData(contactsRecord);
  }, [contacts]);

  // Update budget mutation
  const updateBudgetMutation = useMutation({
    mutationFn: async (budget: Budget) => {
      const res = await apiRequest('PATCH', `/api/budgets/${budget.id}`, budget);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/budgets'] });
    }
  });

  // Save contact info mutation
  const saveContactMutation = useMutation({
    mutationFn: async ({ budgetId, data }: { budgetId: string, data: ContactInfo }) => {
      const res = await apiRequest('POST', `/api/contacts`, { budgetId, ...data });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/contacts'] });
    }
  });

  // Upload CSV mutation
  const uploadCsvMutation = useMutation({
    mutationFn: async ({ csvData, options }: { csvData: string, options: ImportOptions }) => {
      const res = await apiRequest('POST', '/api/import', { csvData, options });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/budgets'] });
      setIsImportModalOpen(false);
      setSelectedFile(null);
      setUploadProgress(0);
    }
  });

  // Import CSV file
  const importCsvFile = async () => {
    if (!selectedFile) return;

    try {
      setUploadProgress(10);
      const csvData = await readFileAsText(selectedFile);
      setUploadProgress(30);
      
      // Process locally first to get the result
      const { result } = await processImportedCsv(csvData, budgets as Budget[], importOptions);
      setUploadProgress(60);
      
      // Send to the server
      await uploadCsvMutation.mutateAsync({ csvData, options: importOptions });
      
      setUploadProgress(100);
      
      toast({
        title: 'Importación exitosa',
        description: `Se importaron ${result.added} presupuestos nuevos, se actualizaron ${result.updated} y se finalizaron ${result.deleted}.`,
      });
      
    } catch (error) {
      toast({
        title: 'Error al importar',
        description: 'Ocurrió un error al importar el archivo CSV.',
        variant: 'destructive'
      });
      console.error(error);
    }
  };

  // Read file as text
  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          resolve(event.target.result as string);
        } else {
          reject(new Error('Error reading file'));
        }
      };
      reader.onerror = () => {
        reject(reader.error);
      };
      reader.readAsText(file);
    });
  };

  // Toggle task completion
  const toggleTask = (id: string) => {
    setCompletedTasks(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Save notes for a budget
  const saveNotes = async (budgetId: string, notes: string) => {
    if (!budgetId) return;
    
    setNotes(prev => ({
      ...prev,
      [budgetId]: notes
    }));
    
    const budgetToUpdate = budgets.find((b: Budget) => b.id === budgetId);
    if (budgetToUpdate) {
      const currentDate = new Date().toISOString().split('T')[0]; // Formato YYYY-MM-DD
      
      // Crear nuevo item de historial para la acción de guardar notas
      const newAction: BudgetActionHistoryItem = {
        accion: 'Actualización de notas',
        fecha: currentDate,
        comentario: 'Se actualizaron las notas del presupuesto',
        usuario: user ? user.username : undefined,
        usuarioId: user ? user.id : undefined
      };
      
      // Añadir al historial existente o crear un nuevo array
      const updatedActionHistory = [
        ...(budgetToUpdate.historialAcciones || []),
        newAction
      ];
      
      await updateBudgetMutation.mutateAsync({
        ...budgetToUpdate,
        notas: notes,
        historialAcciones: updatedActionHistory,
        fechaAccion: currentDate,
        ultimoUsuario: user ? user.id : undefined,
        fechaUltimaActualizacion: currentDate
      });
      
      toast({
        title: 'Notas guardadas',
        description: 'Las notas se han guardado correctamente.'
      });
    }
  };

  // Mark action as completed
  const markActionCompleted = async (budgetId: string) => {
    if (!budgetId) return;
    
    const newStatus = !actionStatus[budgetId];
    
    setActionStatus(prev => ({
      ...prev,
      [budgetId]: newStatus
    }));
    
    const budgetToUpdate = budgets.find((b: Budget) => b.id === budgetId);
    if (budgetToUpdate) {
      const currentDate = new Date().toISOString().split('T')[0]; // Formato YYYY-MM-DD
      
      // Crear nuevo item de historial para la acción incluyendo usuario
      const newAction: BudgetActionHistoryItem = {
        accion: newStatus ? 'Acción completada' : 'Acción reabierta',
        fecha: currentDate,
        comentario: newStatus ? `Se completó la acción "${budgetToUpdate.accion}"` : `Se reabrió la acción "${budgetToUpdate.accion}"`,
        usuario: user ? user.username : undefined,
        usuarioId: user ? user.id : undefined
      };
      
      // Añadir al historial existente o crear un nuevo array
      const updatedActionHistory = [
        ...(budgetToUpdate.historialAcciones || []),
        newAction
      ];
      
      await updateBudgetMutation.mutateAsync({
        ...budgetToUpdate,
        completado: newStatus,
        fechaCompletado: newStatus ? currentDate : undefined,
        historialAcciones: updatedActionHistory,
        fechaAccion: currentDate,
        usuarioAsignado: user ? user.id : undefined
      });
    }
  };

  // Save contact info
  const saveContactInfo = async (budgetId: string, data: ContactInfo) => {
    if (!budgetId) return;
    
    setContactsData(prev => ({
      ...prev,
      [budgetId]: data
    }));
    
    // Incluir información del usuario que hace la actualización
    const contactData = {
      budgetId,
      ...data,
      usuarioId: user ? user.id : undefined,
      username: user ? user.username : undefined
    };
    
    await saveContactMutation.mutateAsync({ budgetId, data: contactData });
    
    // Actualizar también el presupuesto para registrar la última actividad
    const budgetToUpdate = budgets.find((b: Budget) => b.id === budgetId);
    if (budgetToUpdate) {
      const currentDate = new Date().toISOString().split('T')[0];
      
      // Crear nuevo item de historial para la acción de actualizar contacto
      const newAction: BudgetActionHistoryItem = {
        accion: 'Actualización de contacto',
        fecha: currentDate,
        comentario: `Se actualizó la información de contacto: ${data.nombre}`,
        usuario: user ? user.username : undefined,
        usuarioId: user ? user.id : undefined
      };
      
      // Añadir al historial existente o crear un nuevo array
      const updatedActionHistory = [
        ...(budgetToUpdate.historialAcciones || []),
        newAction
      ];
      
      await updateBudgetMutation.mutateAsync({
        ...budgetToUpdate,
        historialAcciones: updatedActionHistory,
        fechaAccion: currentDate,
        ultimoUsuario: user ? user.id : undefined,
        fechaUltimaActualizacion: currentDate
      });
    }
    
    toast({
      title: 'Contacto guardado',
      description: 'La información de contacto se ha guardado correctamente.'
    });
  };

  // Finalize budget (approve or reject)
  const finalizeBudget = async (budgetId: string, status: 'Aprobado' | 'Rechazado') => {
    if (!budgetId) return;
    
    const budgetToUpdate = budgets.find((b: Budget) => b.id === budgetId);
    if (budgetToUpdate) {
      const currentDate = new Date().toISOString().split('T')[0]; // Formato YYYY-MM-DD
      
      // Crear nuevo item de historial para la acción de finalización con usuario
      const newAction: BudgetActionHistoryItem = {
        accion: `Presupuesto ${status}`,
        fecha: currentDate,
        comentario: `El presupuesto ha sido ${status === 'Aprobado' ? 'aprobado' : 'rechazado'}`,
        usuario: user ? user.username : undefined,
        usuarioId: user ? user.id : undefined
      };
      
      // Añadir al historial existente o crear un nuevo array
      const updatedActionHistory = [
        ...(budgetToUpdate.historialAcciones || []),
        newAction
      ];
      
      await updateBudgetMutation.mutateAsync({
        ...budgetToUpdate,
        estado: status,
        fechaEstado: currentDate,
        finalizado: true,
        fechaFinalizado: currentDate,
        historialAcciones: updatedActionHistory,
        ultimoUsuario: user ? user.id : undefined, // Registrar el último usuario que actualizó
        fechaUltimaActualizacion: currentDate // Registrar la fecha de última actualización
      });
      
      setIsBudgetDetailsOpen(false);
      
      toast({
        title: 'Presupuesto finalizado',
        description: `El presupuesto ha sido marcado como ${status}.`
      });
    }
  };

  // Change budget type
  const changeBudgetType = async (budgetId: string, isLicitacion: boolean) => {
    if (!budgetId) return;
    
    const budgetToUpdate = budgets.find((b: Budget) => b.id === budgetId);
    if (budgetToUpdate) {
      const currentDate = new Date().toISOString().split('T')[0]; // Formato YYYY-MM-DD
      
      // Crear nuevo item de historial para la acción de cambio de tipo
      const newAction: BudgetActionHistoryItem = {
        accion: `Cambio de tipo a ${isLicitacion ? 'Licitación' : 'Presupuesto Estándar'}`,
        fecha: currentDate,
        comentario: `El tipo de presupuesto ha sido cambiado a ${isLicitacion ? 'Licitación' : 'Presupuesto Estándar'}`,
        usuario: user ? user.username : undefined,
        usuarioId: user ? user.id : undefined
      };
      
      // Añadir al historial existente o crear un nuevo array
      const updatedActionHistory = [
        ...(budgetToUpdate.historialAcciones || []),
        newAction
      ];
      
      await updateBudgetMutation.mutateAsync({
        ...budgetToUpdate,
        esLicitacion: isLicitacion,
        historialAcciones: updatedActionHistory,
        fechaAccion: currentDate,
        ultimoUsuario: user ? user.id : undefined,
        fechaUltimaActualizacion: currentDate
      });
      
      toast({
        title: 'Tipo de presupuesto actualizado',
        description: `El presupuesto ha sido marcado como ${isLicitacion ? 'Licitación' : 'Presupuesto Estándar'}.`
      });
    }
  };
  
  // Add a new stage to the budget history
  const advanceBudgetStage = async (budgetId: string, newStage: string, commentText?: string) => {
    if (!budgetId) return;
    
    const budgetToUpdate = budgets.find((b: Budget) => b.id === budgetId);
    if (budgetToUpdate) {
      const currentDate = new Date().toISOString().split('T')[0]; // Format as YYYY-MM-DD
      
      // Create new history item with user info
      const newHistoryItem: BudgetStageHistoryItem = {
        etapa: newStage,
        fecha: currentDate,
        comentario: commentText,
        usuario: user ? user.username : undefined, // Incluir usuario si está autenticado
        usuarioId: user ? user.id : undefined // Incluir ID del usuario si está autenticado
      };
      
      // Add to existing history or create new array
      const updatedHistory = [
        ...(budgetToUpdate.historialEtapas || []),
        newHistoryItem
      ];
      
      await updateBudgetMutation.mutateAsync({
        ...budgetToUpdate,
        historialEtapas: updatedHistory,
        tipoSeguimiento: newStage, // Also update the current stage
        fechaAccion: currentDate, // Actualizar fecha de la última acción
        usuarioAsignado: user ? user.id : undefined // Asignar usuario actual al presupuesto
      });
      
      toast({
        title: 'Etapa actualizada',
        description: `El presupuesto ha avanzado a la etapa "${newStage}".`
      });
    }
  };
  
  // Open budget details modal
  const openBudgetDetails = (budget: Budget) => {
    setSelectedBudget(budget);
    setIsBudgetDetailsOpen(true);
  };

  return {
    budgets,
    isLoading,
    selectedBudget,
    isImportModalOpen,
    isBudgetDetailsOpen,
    completedTasks,
    notes,
    actionStatus,
    contactsData,
    selectedFile,
    uploadProgress,
    importOptions,
    setSelectedBudget,
    setIsImportModalOpen,
    setIsBudgetDetailsOpen,
    setSelectedFile,
    setUploadProgress,
    setImportOptions,
    toggleTask,
    saveNotes,
    markActionCompleted,
    saveContactInfo,
    finalizeBudget,
    openBudgetDetails,
    importCsvFile,
    changeBudgetType,
    advanceBudgetStage
  };
}
