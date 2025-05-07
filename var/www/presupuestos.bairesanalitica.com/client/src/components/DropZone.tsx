import React, { useRef, useState } from 'react';
import { Upload } from 'lucide-react';

interface DropZoneProps {
  onFilesAdded: (file: File) => void;
  accept?: string;
  maxSize?: number;
  className?: string;
}

export function DropZone({
  onFilesAdded,
  accept = '.csv',
  maxSize = 10485760, // 10MB
  className = '',
}: DropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      validateAndProcessFile(files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      validateAndProcessFile(files[0]);
    }
  };

  const validateAndProcessFile = (file: File) => {
    setError(null);
    
    // Validate file type
    if (!file.name.endsWith('.csv')) {
      setError('Solo se permiten archivos CSV');
      return;
    }
    
    // Validate file size
    if (file.size > maxSize) {
      setError(`El archivo es demasiado grande. El tamaño máximo es ${maxSize / 1048576}MB`);
      return;
    }
    
    onFilesAdded(file);
  };

  return (
    <div
      className={`border-2 ${
        isDragging ? 'border-primary-300 bg-primary-50' : 'border-gray-300'
      } border-dashed rounded-md p-6 ${className}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
    >
      <div className="space-y-2 text-center">
        <Upload className="mx-auto h-12 w-12 text-gray-400" />
        <div className="flex text-sm text-gray-600 justify-center">
          <label
            htmlFor="file-upload"
            className="relative cursor-pointer rounded-md font-medium text-primary hover:text-primary-700 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary-500"
          >
            <span>Seleccionar archivo</span>
            <input
              id="file-upload"
              name="file-upload"
              type="file"
              className="sr-only"
              accept={accept}
              ref={fileInputRef}
              onChange={handleFileInputChange}
            />
          </label>
          <p className="pl-1">o arrastra y suelta</p>
        </div>
        <p className="text-xs text-gray-500">CSV hasta 10MB</p>
        
        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}
      </div>
    </div>
  );
}
