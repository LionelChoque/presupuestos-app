import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Budget, BudgetItem, ContactInfo } from '@/lib/types';
import { formatCurrency, getEmailTemplate, getPhoneTemplate, getStatusColor, getPriorityColor } from '@/lib/utils';
import { AlertCircle, Calendar, Check, CheckCircle, ClipboardCopy, History, PlusCircle, X } from 'lucide-react';

interface BudgetDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  budget: Budget | null;
  contactInfo: ContactInfo | undefined;
  onSaveNotes: (budgetId: string, notes: string) => void;
  onMarkAction: (budgetId: string) => void;
  onFinalizeBudget: (budgetId: string, status: 'Aprobado' | 'Rechazado') => void;
  onSaveContact: (budgetId: string, data: ContactInfo) => void;
  onChangeBudgetType: (budgetId: string, isLicitacion: boolean) => void;
  onAdvanceBudgetStage?: (budgetId: string, newStage: string, commentText?: string) => void;
  isActionCompleted: boolean;
}

export function BudgetDetailsModal({
  isOpen,
  onClose,
  budget,
  contactInfo,
  onSaveNotes,
  onMarkAction,
  onFinalizeBudget,
  onSaveContact,
  onChangeBudgetType,
  onAdvanceBudgetStage,
  isActionCompleted,
}: BudgetDetailsModalProps) {
  const [notes, setNotes] = useState(budget?.notas || '');
  // Usar información de contacto del CSV si está disponible, sino usar la almacenada
  const budgetContact = budget?.contacto || contactInfo;
  const [showContactForm, setShowContactForm] = useState(!budgetContact);
  const [newContactInfo, setNewContactInfo] = useState<ContactInfo>({
    nombre: budgetContact?.nombre || '',
    email: budgetContact?.email || '',
    telefono: budgetContact?.telefono || '',
  });
  const [activeTab, setActiveTab] = useState('info');
  
  // Variables para la funcionalidad de avance de etapa
  const [showStageForm, setShowStageForm] = useState(false);
  const [newStage, setNewStage] = useState('');
  const [stageComment, setStageComment] = useState('');

  // Function to copy text to clipboard
  const copyToClipboard = (text: string) => {
    // Remove HTML tags from text if present
    const plainText = text.replace(/<br>/g, '\n').replace(/<[^>]*>/g, '');
    
    navigator.clipboard.writeText(plainText).then(() => {
      alert('Copiado al portapapeles');
    }).catch(err => {
      console.error('Error al copiar: ', err);
    });
  };

  if (!budget) return null;

  const handleSaveNotes = () => {
    onSaveNotes(budget.id, notes);
  };

  const handleSaveContact = () => {
    onSaveContact(budget.id, newContactInfo);
    setShowContactForm(false);
  };
  
  const handleAdvanceStage = () => {
    if (!newStage || !onAdvanceBudgetStage) return;
    
    onAdvanceBudgetStage(budget.id, newStage, stageComment);
    setShowStageForm(false);
    setNewStage('');
    setStageComment('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <div className="flex justify-between items-center">
            <DialogTitle>Presupuesto #{budget.id}</DialogTitle>
            <Button size="icon" variant="ghost" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <Tabs defaultValue="info" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-5 mb-4">
            <TabsTrigger value="info">Información</TabsTrigger>
            <TabsTrigger value="contact">Contacto</TabsTrigger>
            <TabsTrigger value="actions">Acciones</TabsTrigger>
            <TabsTrigger value="items">Productos</TabsTrigger>
            <TabsTrigger 
              value="history" 
              className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:text-white hover:bg-gradient-to-r hover:from-blue-600 hover:to-indigo-700 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-700 data-[state=active]:to-indigo-800 data-[state=active]:text-white"
            >
              Seguimiento
            </TabsTrigger>
          </TabsList>
          
          {/* Info Tab */}
          <TabsContent value="info" className="space-y-4">
            <div className="bg-gray-50 px-4 py-3 sm:rounded-lg sm:px-6">
              <div className="grid grid-cols-1 gap-y-4 sm:grid-cols-2 sm:gap-x-6 md:grid-cols-3">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Empresa</dt>
                  <dd className="mt-1 text-sm text-gray-900">{budget.empresa}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Fecha creación</dt>
                  <dd className="mt-1 text-sm text-gray-900">{budget.fechaCreacion}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Fabricante</dt>
                  <dd className="mt-1 text-sm text-gray-900">{budget.fabricante}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Validez</dt>
                  <dd className="mt-1 text-sm text-gray-900">{budget.validez || 0} días</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Días restantes</dt>
                  <dd className={`mt-1 text-sm font-semibold ${
                    budget.diasRestantes <= 0 ? 'text-red-600' : 
                    budget.diasRestantes <= 7 ? 'text-yellow-600' : 
                    'text-gray-900'
                  }`}>{budget.diasRestantes}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Monto total (USD)</dt>
                  <dd className="mt-1 text-sm text-gray-900 font-mono font-semibold">
                    {formatCurrency(budget.montoTotal)}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Estado</dt>
                  <dd className="mt-1">
                    <Badge className={getStatusColor(budget.tipoSeguimiento)}>
                      {budget.tipoSeguimiento}
                    </Badge>
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Prioridad</dt>
                  <dd className="mt-1">
                    <Badge className={getPriorityColor(budget.prioridad)}>
                      {budget.prioridad}
                    </Badge>
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Tipo</dt>
                  <dd className="mt-1 flex items-center space-x-2">
                    <Badge 
                      variant={budget.esLicitacion ? "destructive" : "outline"}
                      className="cursor-pointer"
                    >
                      {budget.esLicitacion ? 'Licitación' : 'Presupuesto Estándar'}
                    </Badge>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-6 px-2 text-xs"
                      onClick={(e) => {
                        e.preventDefault();
                        // Usar setTimeout para evitar actualizar durante la renderización
                        setTimeout(() => {
                          onChangeBudgetType(budget.id, !budget.esLicitacion);
                        }, 0);
                      }}
                    >
                      Cambiar
                    </Button>
                  </dd>
                </div>
              </div>
            </div>
            
            {/* Notes Section */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Notas</h4>
              <div className="border border-gray-300 rounded-md">
                <Textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="block w-full border-0 p-3 placeholder-gray-400 focus:ring-0 sm:text-sm"
                  placeholder="Agregar notas sobre este presupuesto..."
                />
                <div className="flex justify-end p-2 border-t border-gray-300">
                  <Button 
                    size="sm"
                    onClick={handleSaveNotes}
                  >
                    Guardar notas
                  </Button>
                </div>
              </div>
            </div>
            
            {/* Alerts Section */}
            {budget.alertas.length > 0 && (
              <div className="bg-yellow-50 p-4 rounded-md border border-yellow-200">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <AlertCircle className="h-5 w-5 text-yellow-400" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-yellow-800">Alertas</h3>
                    <div className="mt-2 text-sm text-yellow-700">
                      <ul className="list-disc space-y-1 pl-5">
                        {budget.alertas.map((alerta, index) => (
                          <li key={index}>{alerta}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>
          
          {/* Contact Tab */}
          <TabsContent value="contact" className="space-y-4">
            <div className="border border-gray-200 rounded-lg">
              <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 rounded-t-lg">
                <h4 className="text-sm font-medium text-gray-700">Información de contacto</h4>
              </div>
              <div className="p-4">
                {!budgetContact && !showContactForm && (
                  <div className="flex flex-col items-center justify-center py-4">
                    <User className="h-6 w-6 text-gray-400 mb-2" />
                    <p className="text-sm text-gray-500">No hay información de contacto disponible</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowContactForm(true)}
                      className="mt-2"
                    >
                      Agregar contacto
                    </Button>
                  </div>
                )}
                
                {budgetContact && !showContactForm && (
                  <div className="grid grid-cols-1 gap-y-4 sm:grid-cols-2 sm:gap-x-6">
                    <div>
                      <dt className="text-xs font-medium text-gray-500">Nombre</dt>
                      <dd className="mt-1 text-sm text-gray-900">{budgetContact.nombre}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium text-gray-500">Email</dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        {budgetContact.email ? (
                          <a
                            href={`mailto:${budgetContact.email}`}
                            className="text-primary hover:text-primary-900"
                          >
                            {budgetContact.email}
                          </a>
                        ) : (
                          '-'
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium text-gray-500">Teléfono</dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        {budgetContact.telefono ? (
                          <a
                            href={`tel:${budgetContact.telefono}`}
                            className="text-primary hover:text-primary-900"
                          >
                            {budgetContact.telefono}
                          </a>
                        ) : (
                          '-'
                        )}
                      </dd>
                    </div>
                    <div className="sm:col-span-2">
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setNewContactInfo({
                              nombre: budgetContact.nombre,
                              email: budgetContact.email,
                              telefono: budgetContact.telefono,
                            });
                            setShowContactForm(true);
                          }}
                        >
                          Editar contacto
                        </Button>
                        {budget.contacto && <Badge variant="secondary">Importado del CSV</Badge>}
                      </div>
                    </div>
                  </div>
                )}
                
                {showContactForm && (
                  <div className="mt-4 border-t border-gray-200 pt-4">
                    <div className="grid grid-cols-1 gap-y-4 sm:grid-cols-2 sm:gap-x-6">
                      <div>
                        <Label htmlFor="contact-name">Nombre</Label>
                        <Input
                          id="contact-name"
                          value={newContactInfo.nombre}
                          onChange={(e) =>
                            setNewContactInfo({
                              ...newContactInfo,
                              nombre: e.target.value,
                            })
                          }
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="contact-email">Email</Label>
                        <Input
                          id="contact-email"
                          type="email"
                          value={newContactInfo.email || ''}
                          onChange={(e) =>
                            setNewContactInfo({
                              ...newContactInfo,
                              email: e.target.value,
                            })
                          }
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="contact-phone">Teléfono</Label>
                        <Input
                          id="contact-phone"
                          type="tel"
                          value={newContactInfo.telefono || ''}
                          onChange={(e) =>
                            setNewContactInfo({
                              ...newContactInfo,
                              telefono: e.target.value,
                            })
                          }
                          className="mt-1"
                        />
                      </div>
                    </div>
                    <div className="mt-4 flex justify-end space-x-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowContactForm(false)}
                      >
                        Cancelar
                      </Button>
                      <Button
                        type="button"
                        onClick={handleSaveContact}
                      >
                        Guardar
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
          
          {/* Actions Tab */}
          <TabsContent value="actions" className="space-y-4">
            {/* Action Required */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Acción requerida</h4>
              <div className="bg-yellow-50 px-4 py-3 rounded-lg border border-yellow-200">
                <div className="flex items-start">
                  <AlertCircle className="h-5 w-5 text-yellow-400 flex-shrink-0" />
                  <p className="ml-3 text-sm text-yellow-700">{budget.accion}</p>
                </div>
              </div>
            </div>
            
            {/* Action Templates */}
            {(budget.tipoSeguimiento === 'Confirmación' || budget.tipoSeguimiento === 'Primer Seguimiento') && (
              <div className="border border-gray-200 rounded-lg">
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 rounded-t-lg">
                  <h4 className="text-sm font-medium text-gray-700">Plantillas de acción</h4>
                </div>
                <div className="p-4 space-y-4">
                  <div>
                    <h5 className="text-sm font-medium text-gray-700 mb-2">Email de seguimiento</h5>
                    <div className="mb-2">
                      <Textarea
                        rows={10}
                        className="block w-full border-gray-300 rounded-md shadow-sm text-sm"
                        value={getEmailTemplate(budget, budgetContact?.nombre || '')}
                        readOnly
                      />
                    </div>
                    <div className="flex justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(getEmailTemplate(budget, budgetContact?.nombre || ''))}
                      >
                        <ClipboardCopy className="mr-2 h-4 w-4" />
                        Copiar
                      </Button>
                    </div>
                  </div>
                  
                  <div>
                    <h5 className="text-sm font-medium text-gray-700 mb-2">Script para llamada telefónica</h5>
                    <div className="mb-2">
                      <div
                        className="block w-full p-3 border border-gray-300 rounded-md shadow-sm bg-white text-sm text-gray-500"
                        dangerouslySetInnerHTML={{ __html: getPhoneTemplate(budget, budgetContact?.nombre || '') }}
                      />
                    </div>
                    <div className="flex justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(getPhoneTemplate(budget, budgetContact?.nombre || ''))}
                      >
                        <ClipboardCopy className="mr-2 h-4 w-4" />
                        Copiar
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>
          
          {/* Seguimiento Tab */}
          <TabsContent value="history" className="space-y-4">
            <div className="border border-indigo-200 rounded-lg overflow-hidden shadow-md">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-3 border-b border-indigo-200 flex justify-between items-center">
                <h4 className="text-sm font-medium text-indigo-800">Seguimiento de etapas</h4>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowStageForm(true)}
                  className="flex items-center text-xs bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700 border-none"
                  disabled={showStageForm || !onAdvanceBudgetStage}
                >
                  <PlusCircle className="h-3.5 w-3.5 mr-1" />
                  Avanzar etapa
                </Button>
              </div>
              
              {showStageForm && (
                <div className="p-4 border-b border-gray-200">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="new-stage">Nueva etapa</Label>
                      <Select onValueChange={setNewStage} value={newStage}>
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Seleccionar etapa" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Contacto inicial">Contacto inicial</SelectItem>
                          <SelectItem value="Envío de presupuesto">Envío de presupuesto</SelectItem>
                          <SelectItem value="Negociación">Negociación</SelectItem>
                          <SelectItem value="Revisión técnica">Revisión técnica</SelectItem>
                          <SelectItem value="Esperando aprobación">Esperando aprobación</SelectItem>
                          <SelectItem value="Entrega de muestras">Entrega de muestras</SelectItem>
                          <SelectItem value="Cierre">Cierre</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="stage-comment">Comentario (opcional)</Label>
                      <Textarea
                        id="stage-comment"
                        value={stageComment}
                        onChange={(e) => setStageComment(e.target.value)}
                        placeholder="Agregar detalles sobre esta etapa..."
                        className="mt-1"
                      />
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          setShowStageForm(false);
                          setNewStage('');
                          setStageComment('');
                        }}
                      >
                        Cancelar
                      </Button>
                      <Button 
                        size="sm"
                        onClick={handleAdvanceStage}
                        disabled={!newStage}
                      >
                        Guardar
                      </Button>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="p-4">
                {budget.historialEtapas && budget.historialEtapas.length > 0 ? (
                  <div className="relative">
                    <div className="absolute left-4 top-0 h-full w-1 bg-gradient-to-b from-blue-300 to-indigo-500 rounded-full"></div>
                    <ul className="space-y-8 ml-4">
                      {budget.historialEtapas.map((item, index) => (
                        <li key={index} className="relative pl-8">
                          <div className="absolute left-0 -translate-x-1/2 h-6 w-6 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 border-2 border-white shadow-md flex items-center justify-center">
                            <div className="h-2 w-2 rounded-full bg-white"></div>
                          </div>
                          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-3 shadow-sm border border-indigo-100">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge className="bg-indigo-100 text-indigo-800 hover:bg-indigo-200">{item.etapa}</Badge>
                              <span className="text-xs text-indigo-600 font-medium">{item.fecha}</span>
                            </div>
                            {item.comentario && (
                              <p className="mt-1 text-sm text-gray-700">{item.comentario}</p>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-indigo-100 shadow-sm">
                    <div className="h-16 w-16 rounded-full bg-gradient-to-r from-blue-100 to-indigo-100 flex items-center justify-center mb-4">
                      <History className="h-8 w-8 text-indigo-400" />
                    </div>
                    <h3 className="text-lg font-medium text-indigo-900">Sin seguimiento de etapas</h3>
                    <p className="mt-2 text-sm text-indigo-600 max-w-md mx-auto">
                      Este presupuesto aún no tiene etapas de seguimiento registradas.
                      {onAdvanceBudgetStage && 
                        <span className="block mt-2">
                          Haga clic en <span className="font-semibold text-indigo-800">"Avanzar etapa"</span> para registrar la primera.
                        </span>
                      }
                    </p>
                  </div>
                )}
              </div>
              
              <div className="mt-6 border border-gray-200 rounded-lg">
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 px-4 py-3 border-b border-gray-200 rounded-t-lg flex justify-between items-center">
                  <h4 className="text-sm font-medium text-purple-800">Historial de acciones</h4>
                </div>
                <div className="p-4">
                  {budget.historialAcciones && budget.historialAcciones.length > 0 ? (
                    <div className="space-y-6 pl-2">
                      <ul className="space-y-6 relative before:absolute before:inset-0 before:left-1/2 before:-ml-px before:bg-gradient-to-b before:from-purple-300 before:to-pink-300 before:w-0.5">
                        {budget.historialAcciones.map((item, index) => (
                          <li key={index} className="relative flex items-start">
                            <div className="flex items-center justify-center absolute left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-gradient-to-r from-purple-400 to-pink-400 shadow-md shadow-purple-100">
                              <Check className="h-3 w-3 text-white" />
                            </div>
                            <div className={`w-1/2 pr-8 pb-6 ${index % 2 === 0 ? 'text-right mr-auto' : 'ml-auto pl-8'}`}>
                              <div className={`${index % 2 === 0 ? 'text-right' : 'text-left'}`}>
                                <span className="block text-sm font-medium text-purple-700">{item.accion}</span>
                                <span className="block text-xs text-gray-500 font-mono mt-1">{item.fecha}</span>
                                {item.comentario && (
                                  <p className="mt-2 text-sm text-gray-600">{item.comentario}</p>
                                )}
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-center bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-100 shadow-sm">
                      <div className="h-16 w-16 rounded-full bg-gradient-to-r from-purple-100 to-pink-100 flex items-center justify-center mb-4">
                        <History className="h-8 w-8 text-purple-400" />
                      </div>
                      <h3 className="text-lg font-medium text-purple-900">Sin historial de acciones</h3>
                      <p className="mt-2 text-sm text-purple-600 max-w-md mx-auto">
                        Este presupuesto aún no tiene acciones registradas.
                        <span className="block mt-2">
                          Las acciones se registran automáticamente al interactuar con el presupuesto.
                        </span>
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>
          
          {/* Items Tab */}
          <TabsContent value="items" className="space-y-4">
            <div className="border border-gray-200 rounded-lg">
              <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 rounded-t-lg">
                <h4 className="text-sm font-medium text-gray-700">Ítems del presupuesto</h4>
              </div>
              <div className="overflow-x-auto budget-items-scrollbar">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Código
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Descripción
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Cantidad
                      </th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Precio (USD)
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {budget.items && budget.items.length > 0 ? (
                      budget.items.map((item: BudgetItem, index: number) => (
                        <tr key={index}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                            {item.codigo || 'N/A'}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {item.descripcion}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {item.cantidad || 1}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-mono">
                            {formatCurrency(item.precio)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
                          No hay ítems disponibles para este presupuesto
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex justify-between">
          <Button
            variant={isActionCompleted ? "outline" : "secondary"}
            onClick={() => onMarkAction(budget.id)}
            className={isActionCompleted ? "bg-green-100 text-green-800 border-green-200 hover:bg-green-200" : ""}
          >
            <CheckCircle className={`mr-2 h-5 w-5 ${isActionCompleted ? "text-green-600" : "text-gray-400"}`} />
            <span>{isActionCompleted ? 'Acción completada' : 'Marcar como completada'}</span>
          </Button>
          
          <div className="space-x-3">
            {budget.tipoSeguimiento === 'Vencido' && (
              <>
                <Button
                  onClick={() => onFinalizeBudget(budget.id, 'Aprobado')}
                  className="bg-green-600 hover:bg-green-700 focus:ring-green-500"
                >
                  Aprobado
                </Button>
                <Button
                  onClick={() => onFinalizeBudget(budget.id, 'Rechazado')}
                  variant="destructive"
                >
                  Rechazado
                </Button>
              </>
            )}
            <Button
              variant="outline"
              onClick={onClose}
            >
              Cerrar
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function User(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}
