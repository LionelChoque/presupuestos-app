import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { ImportOptions } from '@/lib/types';
import { Upload, FileDown } from 'lucide-react';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: () => void;
  options: ImportOptions;
  setOptions: (options: ImportOptions) => void;
  uploadProgress: number;
  selectedFile: File | null;
  setSelectedFile: (file: File | null) => void;
}

export function ImportModal({
  isOpen,
  onClose,
  onImport,
  options,
  setOptions,
  uploadProgress,
  selectedFile,
  setSelectedFile,
}: ImportModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoadingDemo, setIsLoadingDemo] = useState(false);
  
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      setSelectedFile(files[0]);
    }
  };
  
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };
  
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };
  
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    const dt = e.dataTransfer;
    const files = dt.files;
    
    if (files && files.length > 0) {
      setSelectedFile(files[0]);
    }
  };
  
  // Cargar archivo de demostración directamente desde el servidor
  const loadDemoFile = async () => {
    try {
      setIsLoadingDemo(true);
      
      // Solicitamos al servidor que cargue directamente el archivo de demostración
      const response = await fetch('/api/import/demo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ options }),
      });
      
      if (!response.ok) {
        throw new Error('Error al cargar el archivo de demostración');
      }
      
      // La respuesta debería contener el resultado de la importación
      const result = await response.json();
      
      // Avisamos al componente padre que la importación se realizó correctamente
      setTimeout(() => {
        setIsLoadingDemo(false);
        onImport();
      }, 1000);
      
    } catch (error) {
      console.error('Error al cargar el archivo de demostración:', error);
      setIsLoadingDemo(false);
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Importar Archivo CSV</DialogTitle>
          <DialogDescription>
            Selecciona o arrastra un archivo CSV con el listado de presupuestos actualizado. El sistema procesará el archivo y actualizará la información.
          </DialogDescription>
        </DialogHeader>
        
        <div className="mt-4">
          <div
            className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 ${
              isDragging ? 'border-primary-300 bg-primary-50' : 'border-gray-300'
            } border-dashed rounded-md`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="space-y-1 text-center">
              <Upload className="mx-auto h-12 w-12 text-gray-400" />
              <div className="flex text-sm text-gray-600">
                <label
                  htmlFor="file-upload"
                  className="relative cursor-pointer bg-white rounded-md font-medium text-primary hover:text-primary-700 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary-500"
                >
                  <span>Seleccionar archivo</span>
                  <input
                    id="file-upload"
                    name="file-upload"
                    type="file"
                    className="sr-only"
                    accept=".csv"
                    onChange={handleFileSelect}
                    ref={fileInputRef}
                  />
                </label>
                <p className="pl-1">o arrastra y suelta</p>
              </div>
              <p className="text-xs text-gray-500">CSV hasta 10MB</p>
              
              <div className="mt-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadDemoFile}
                  disabled={isLoadingDemo}
                  className="text-xs"
                >
                  <FileDown className="h-4 w-4 mr-1" />
                  {isLoadingDemo ? 'Cargando...' : 'Cargar archivo de demostración'}
                </Button>
              </div>
              
              {selectedFile && (
                <p className="text-sm text-gray-600 mt-2">
                  Archivo seleccionado: {selectedFile.name}
                </p>
              )}
              
              {uploadProgress > 0 && (
                <div className="w-full mt-3">
                  <Progress value={uploadProgress} className="h-2" />
                  <p className="text-xs text-gray-500 mt-1">
                    Procesando: {uploadProgress}%
                  </p>
                </div>
              )}
            </div>
          </div>
          
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="compare"
                checked={options.compareWithPrevious}
                onCheckedChange={(checked) =>
                  setOptions({
                    ...options,
                    compareWithPrevious: checked as boolean,
                  })
                }
              />
              <Label htmlFor="compare" className="text-sm text-gray-600">
                Comparar con datos anteriores
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="autoFinalize"
                checked={options.autoFinalizeMissing}
                onCheckedChange={(checked) =>
                  setOptions({
                    ...options,
                    autoFinalizeMissing: checked as boolean,
                  })
                }
              />
              <Label htmlFor="autoFinalize" className="text-sm text-gray-600">
                Marcar faltantes como finalizados
              </Label>
            </div>
          </div>
        </div>
        
        <DialogFooter className="sm:justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={onImport}
            disabled={!selectedFile}
          >
            Importar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
