// Componente de tabla optimizada para móviles
// Compatible con Lovable - Diseño responsivo con gestos táctiles
import { useState, useMemo, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  ChevronLeft, 
  ChevronRight, 
  Search, 
  Filter,
  MoreVertical,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

interface TableColumn {
  key: string;
  label: string;
  sortable?: boolean;
  filterable?: boolean;
  render?: (value: unknown, row: Record<string, unknown>) => React.ReactNode;
  className?: string;
  mobileHidden?: boolean;
}

interface TableAction {
  key: string;
  label: string;
  icon?: React.ReactNode;
  onClick: (row: Record<string, unknown>) => void;
  variant?: 'default' | 'destructive' | 'secondary' | 'outline';
  className?: string;
}

interface MobileOptimizedTableProps {
  data: Record<string, unknown>[];
  columns: TableColumn[];
  actions?: TableAction[];
  searchable?: boolean;
  filterable?: boolean;
  pagination?: boolean;
  pageSize?: number;
  className?: string;
  onRowClick?: (row: Record<string, unknown>) => void;
}

export const MobileOptimizedTable = ({
  data,
  columns,
  actions = [],
  searchable = true,
  filterable = false,
  pagination = true,
  pageSize = 10,
  className = '',
  onRowClick
}: MobileOptimizedTableProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);
  const isMobile = useIsMobile();

  // 🔍 FILTRAR Y ORDENAR DATOS
  const processedData = useMemo(() => {
    let filtered = data;

    // Filtrar por búsqueda
    if (searchTerm) {
      filtered = filtered.filter(row =>
        Object.values(row).some(value =>
          String(value || '').toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }

    // Ordenar
    if (sortField) {
      filtered = [...filtered].sort((a, b) => {
        const aVal = a[sortField];
        const bVal = b[sortField];
        
        if (typeof aVal === 'string' && typeof bVal === 'string') {
          return sortOrder === 'asc' 
            ? aVal.localeCompare(bVal)
            : bVal.localeCompare(aVal);
        }
        
        if (sortOrder === 'asc') {
          return Number(aVal) > Number(bVal) ? 1 : -1;
        } else {
          return Number(aVal) < Number(bVal) ? 1 : -1;
        }
      });
    }

    return filtered;
  }, [data, searchTerm, sortField, sortOrder]);

  // 📊 PAGINACIÓN
  const paginatedData = useMemo(() => {
    if (!pagination) return processedData;
    
    const startIndex = (currentPage - 1) * pageSize;
    return processedData.slice(startIndex, startIndex + pageSize);
  }, [processedData, currentPage, pageSize, pagination]);

  const totalPages = Math.ceil(processedData.length / pageSize);

  // 🔄 MANEJO DE ORDENAMIENTO
  const handleSort = (columnKey: string) => {
    const column = columns.find(col => col.key === columnKey);
    if (!column?.sortable) return;

    if (sortField === columnKey) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(columnKey);
      setSortOrder('asc');
    }
  };

  // 📱 RENDERIZADO MÓVIL (CARDS)
  if (isMobile) {
    return (
      <div className={`space-y-4 ${className}`}>
        {/* Búsqueda móvil */}
        {searchable && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        )}

        {/* Cards móviles */}
        <div className="space-y-3">
          {(() => {
            return (data as Record<string, unknown>[])
              .filter(item => {
                if (!searchTerm) return true;
                
                const visibleColumns = columns
                  .filter(column => !column.mobileHidden)
                  .map(column => column.key);
                
                const searchableText = visibleColumns
                  .map(key => {
                    const value = item[key];
                    return String(value || '');
                  })
                  .join(' ')
                  .toLowerCase();
                
                return searchableText.includes(searchTerm.toLowerCase());
              })
              .map((item, index) => {
                return (
                  <div 
                    key={String(item.id || index)}
                    className="bg-card rounded-lg border p-4 space-y-3"
                    style={{
                      animationDelay: `${index * 50}ms`
                    }}
                    onMouseEnter={() => setHoveredRow(index)}
                    onMouseLeave={() => setHoveredRow(null)}
                  >
                    {columns
                      .filter(column => !column.mobileHidden)
                      .map(column => (
                        <div key={column.key} className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground font-medium">
                            {column.label}
                          </span>
                          <span className="text-sm">
                            {column.render 
                              ? column.render(item[column.key], item) as React.ReactNode
                              : item[column.key] as React.ReactNode
                            }
                          </span>
                        </div>
                      ))
                    }

                    {actions && actions.length > 0 && (
                      <div className="flex justify-end gap-2 pt-2 border-t">
                        {actions.map(action => (
                          <Button
                            key={action.key}
                            variant={action.variant || "outline"}
                            size="sm"
                            onClick={() => action.onClick(item)}
                            className={action.className}
                          >
                            {action.icon && <span className="mr-1">{action.icon}</span>}
                            {action.label}
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              });
          })()}
          
          {(data as Record<string, unknown>[]).filter(item => {
            if (!searchTerm) return true;
            
            const visibleColumns = columns
              .filter(column => !column.mobileHidden)
              .map(column => column.key);
            
            const searchableText = visibleColumns
              .map(key => String(item[key] || ''))
              .join(' ')
              .toLowerCase();
            
            return searchableText.includes(searchTerm.toLowerCase());
          }).length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No se encontraron elementos
            </div>
          )}
        </div>

        {/* Paginación móvil */}
        {pagination && totalPages > 1 && (
          <div className="flex items-center justify-between py-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Anterior
            </Button>

            <span className="text-sm text-muted-foreground">
              Página {currentPage} de {totalPages}
            </span>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
            >
              Siguiente
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        )}
      </div>
    );
  }

  // 💻 RENDERIZADO DESKTOP (TABLA TRADICIONAL)
  return (
    <div className={`space-y-4 ${className}`}>
      {/* Búsqueda desktop */}
      {searchable && (
        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          {filterable && (
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Filtros
            </Button>
          )}
        </div>
      )}

      {/* Tabla desktop */}
      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map(column => (
                <TableHead 
                  key={column.key}
                  className={`cursor-pointer hover:bg-muted/50 transition-colors ${
                    sortField === column.key ? 'bg-muted' : ''
                  }`}
                  onClick={() => column.sortable !== false ? handleSort(column.key) : undefined}
                >
                  <div className="flex items-center gap-2">
                    {column.label}
                    {column.sortable !== false && (
                      <div className="flex flex-col">
                        <ChevronUp 
                          className={`h-3 w-3 ${
                            sortField === column.key && sortOrder === 'asc' 
                              ? 'text-foreground' 
                              : 'text-muted-foreground'
                          }`} 
                        />
                        <ChevronDown 
                          className={`h-3 w-3 -mt-1 ${
                            sortField === column.key && sortOrder === 'desc' 
                              ? 'text-foreground' 
                              : 'text-muted-foreground'
                          }`} 
                        />
                      </div>
                    )}
                  </div>
                </TableHead>
              ))}
              {actions && actions.length > 0 && (
                <TableHead className="text-right">Acciones</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.map((item, index) => (
              <TableRow 
                key={String(item.id || index)}
                className={`transition-colors hover:bg-muted/50 ${
                  hoveredRow === index ? 'bg-muted/30' : ''
                }`}
                onMouseEnter={() => setHoveredRow(index)}
                onMouseLeave={() => setHoveredRow(null)}
              >
                {columns.map(column => (
                  <TableCell key={column.key}>
                    {column.render 
                      ? column.render(item[column.key], item) as React.ReactNode
                      : item[column.key] as React.ReactNode
                    }
                  </TableCell>
                ))}
                {actions && actions.length > 0 && (
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {actions.map(action => (
                        <Button
                          key={action.key}
                          variant={action.variant || "outline"}
                          size="sm"
                          onClick={() => action.onClick(item)}
                          className={action.className}
                        >
                          {action.icon && <span className="mr-1">{action.icon}</span>}
                          {action.label}
                        </Button>
                      ))}
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* Paginación desktop */}
        {pagination && totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t">
            <p className="text-sm text-muted-foreground">
              Mostrando {(currentPage - 1) * pageSize + 1} a {Math.min(currentPage * pageSize, processedData.length)} de {processedData.length} resultados
            </p>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <span className="text-sm">
                {currentPage} de {totalPages}
              </span>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Mensaje sin datos */}
      {paginatedData.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          No se encontraron datos
        </div>
      )}
    </div>
  );
};