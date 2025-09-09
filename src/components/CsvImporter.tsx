import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Upload, X } from 'lucide-react';

interface CsvImporterProps {
  tableName: string;
  columns: string[];
  onSuccess: () => void;
  onClose: () => void;
}

export const CsvImporter: React.FC<CsvImporterProps> = ({
  tableName,
  columns,
  onSuccess,
  onClose,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile && selectedFile.type === 'text/csv') {
      setFile(selectedFile);
      setError(null);
    } else {
      setError('Por favor selecciona un archivo CSV válido');
    }
  };

  const parseCsvLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current.trim());
    return result;
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    setProgress(0);
    setError(null);

    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        throw new Error('El archivo CSV debe tener al menos una fila de encabezados y una de datos');
      }

      const headers = parseCsvLine(lines[0]).map(h => h.toLowerCase().trim());
      const dataLines = lines.slice(1);

      // Validar que las columnas requeridas estén presentes
      const missingColumns = columns.filter(col => 
        !headers.some(h => h.includes(col.toLowerCase()))
      );
      
      if (missingColumns.length > 0) {
        throw new Error(`Columnas faltantes: ${missingColumns.join(', ')}`);
      }

      const records = dataLines.map((line, index) => {
        const values = parseCsvLine(line);
        const record: any = {};
        
        headers.forEach((header, i) => {
          const value = values[i]?.trim() || '';
          
          // Mapear columnas específicas para productos
          if (header.includes('sku') || header.includes('código')) {
            record.sku = value;
          } else if (header.includes('nombre') || header.includes('name')) {
            record.name = value;
          } else if (header.includes('tipo') || header.includes('type')) {
            record.type = value;
          } else if (header.includes('peso') || header.includes('weight')) {
            record.weight_grams = value ? parseFloat(value) : null;
          } else if (header.includes('stock') || header.includes('mínimo')) {
            record.min_stock_units = value ? parseInt(value) : null;
          } else if (header.includes('seguridad') || header.includes('safety')) {
            record.safety_stock_units = value ? parseInt(value) : null;
          } else if (header.includes('caja') || header.includes('box')) {
            record.units_per_box = value ? parseInt(value) : null;
          } else if (header.includes('vida') || header.includes('shelf')) {
            record.shelf_life_days = value ? parseInt(value) : 365;
          }
        });

        // Validaciones básicas
        if (!record.sku || !record.name || !record.type) {
          throw new Error(`Fila ${index + 2}: SKU, Nombre y Tipo son requeridos`);
        }

        return record;
      });

      // Insertar en lotes
      const batchSize = 50;
      for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);
        
        const { error: insertError } = await supabase
          .from('products')
          .insert(batch);

        if (insertError) {
          throw new Error(`Error insertando datos: ${insertError.message}`);
        }

        setProgress(Math.round(((i + batch.length) / records.length) * 100));
      }

      toast({
        title: "Importación exitosa",
        description: `Se importaron ${records.length} registros correctamente`,
      });

      onSuccess();
      onClose();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      setError(errorMessage);
      toast({
        title: "Error en la importación",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      setProgress(0);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Importar CSV
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="csv-file">Archivo CSV</Label>
            <Input
              id="csv-file"
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              disabled={isUploading}
            />
            <p className="text-sm text-muted-foreground">
              Columnas esperadas: {columns.join(', ')}
            </p>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {isUploading && (
            <div className="space-y-2">
              <Label>Progreso de importación</Label>
              <Progress value={progress} className="w-full" />
              <p className="text-sm text-muted-foreground">{progress}% completado</p>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isUploading}
            >
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!file || isUploading}
            >
              <Upload className="h-4 w-4 mr-2" />
              {isUploading ? 'Importando...' : 'Importar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};