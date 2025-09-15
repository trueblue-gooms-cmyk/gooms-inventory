// src/components/CsvImporter.tsx
import { useState } from 'react';
import { Upload, X, CheckCircle, AlertCircle, FileText } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface CsvImporterProps {
  tableName: string;
  columns: Array<{
    field: string;
    label: string;
    required?: boolean;
    type?: 'text' | 'number' | 'date' | 'boolean';
  }>;
  onSuccess?: () => void;
  onClose: () => void;
}

export function CsvImporter({ tableName, columns, onSuccess, onClose }: CsvImporterProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<unknown[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    
    if (!selectedFile.name.endsWith('.csv')) {
      alert('Por favor selecciona un archivo CSV');
      return;
    }
    
    setFile(selectedFile);
    parseFile(selectedFile);
  };

  const parseFile = (file: File) => {
    setParsing(true);
    setErrors([]);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split('\n').filter(line => line.trim());
        const headers = lines[0].split(',').map(h => h.trim());
        
        const data = lines.slice(1).map(line => {
          const values = line.split(',').map(v => v.trim());
          const row: unknown = {};
          headers.forEach((header, index) => {
            row[header] = values[index] || '';
          });
          return row;
        });
        
        // Auto-mapear columnas
        const autoMapping: Record<string, string> = {};
        columns.forEach(col => {
          const match = headers.find(header => 
            header.toLowerCase() === col.label.toLowerCase() ||
            header.toLowerCase() === col.field.toLowerCase()
          );
          if (match) {
            autoMapping[col.field] = match;
          }
        });
        
        setMapping(autoMapping);
        setPreview(data); // Use all data, not just first 5 rows
        setParsing(false);
      } catch (error) {
        setErrors(['Error al procesar el archivo']);
        setParsing(false);
      }
    };
    
    reader.readAsText(file);
  };

  const sanitizeForCsv = (value: string) => {
    // Prevent CSV injection by removing dangerous characters
    if (typeof value !== 'string') return value;
    return value.replace(/^[=@+-]/, "'").replace(/[\r\n]/g, ' ');
  };

  const handleImport = async () => {
    if (!file || preview.length === 0) return;
    
    setUploading(true);
    setErrors([]);
    
    try {
      // Mapear datos según la configuración
      const mappedData = preview.map(row => {
        const newRow: unknown = {};
        Object.entries(mapping).forEach(([field, csvColumn]) => {
          if (csvColumn && row[csvColumn] !== undefined) {
            let value = row[csvColumn];
            // Sanitize for CSV injection
            if (typeof value === 'string') {
              value = sanitizeForCsv(value);
            }
            newRow[field] = value;
          }
        });
        return newRow;
      });
      
      // Validar campos requeridos
      const requiredFields = columns.filter(c => c.required).map(c => c.field);
      const invalidRows: number[] = [];
      const newErrors: string[] = [];
      
      mappedData.forEach((row, index) => {
        const missingFields = requiredFields.filter(field => !row[field]);
        if (missingFields.length > 0) {
          newErrors.push(`Fila ${index + 1}: Faltan campos requeridos: ${missingFields.join(', ')}`);
          invalidRows.push(index);
        }
      });
      
      if (newErrors.length > 0) {
        setErrors(newErrors);
        setUploading(false);
        return;
      }
      
      // Insertar en la base de datos usando casting para tabla dinámica
      const { error } = await (supabase as unknown as { from: (table: string) => { insert: (data: unknown[]) => Promise<{ error?: unknown }> } }).from(tableName).insert(mappedData);
      
      if (error) throw error;
      
      alert(`Se importaron ${mappedData.length} registros exitosamente`);
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Error importing:', error);
      alert('Error al importar datos');
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    setFile(null);
    setPreview([]);
    setMapping({});
    setErrors([]);
  };

  const csvHeaders = preview.length > 0 ? Object.keys(preview[0]) : [];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">Importar desde CSV</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* File Upload */}
        {!file ? (
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-2">Arrastra un archivo CSV aquí o</p>
            <label className="cursor-pointer">
              <span className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 inline-block">
                Seleccionar archivo
              </span>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden"
              />
            </label>
          </div>
        ) : (
          <div className="space-y-6">
            {/* File Info */}
            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
              <FileText className="w-8 h-8 text-gray-400" />
              <div className="flex-1">
                <p className="font-medium">{file.name}</p>
                <p className="text-sm text-gray-600">
                  {(file.size / 1024).toFixed(1)} KB • {preview.length} filas
                </p>
              </div>
              <button
                onClick={resetForm}
                className="p-2 hover:bg-gray-200 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Column Mapping */}
            <div>
              <h3 className="font-medium mb-3">Mapeo de columnas</h3>
              <div className="space-y-2">
                {columns.map(col => (
                  <div key={col.field} className="flex items-center gap-4">
                    <div className="w-1/3">
                      <label className="text-sm text-gray-600">
                        {col.label}
                        {col.required && <span className="text-red-500 ml-1">*</span>}
                      </label>
                    </div>
                    <select
                      value={mapping[col.field] || ''}
                      onChange={(e) => setMapping({...mapping, [col.field]: e.target.value})}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    >
                      <option value="">-- No mapear --</option>
                      {csvHeaders.map(header => (
                        <option key={header} value={header}>{header}</option>
                      ))}
                    </select>
                    {mapping[col.field] && (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Preview */}
            {preview.length > 0 && (
              <div>
                <h3 className="font-medium mb-3">Vista previa</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        {columns.filter(col => mapping[col.field]).map(col => (
                          <th key={col.field} className="px-4 py-2 text-left">
                            {col.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {preview.slice(0, 3).map((row, i) => (
                        <tr key={i}>
                          {columns.filter(col => mapping[col.field]).map(col => (
                            <td key={col.field} className="px-4 py-2">
                              {row[mapping[col.field]] || '-'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Errors */}
            {errors.length > 0 && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-red-900">Errores encontrados</p>
                    <ul className="mt-2 space-y-1">
                      {errors.map((error, i) => (
                        <li key={i} className="text-sm text-red-700">• {error}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleImport}
                disabled={parsing || uploading || errors.length > 0}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
              >
                {uploading ? 'Importando...' : `Importar ${preview.length} registros`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}