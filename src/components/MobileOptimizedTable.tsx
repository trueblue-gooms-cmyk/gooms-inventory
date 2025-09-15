// Componente de tabla optimizada para móviles
// Compatible con Lovable - Diseño responsivo con gestos táctiles
import { useState, useMemo, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  ChevronLeft, 
  ChevronRight, 
  Search, 
  Filter,
  MoreVertical,
  Eye,
  Edit,
  Trash
} from 'lucide-react';
import { useMobileGestures } from '../hooks/useMobileGestures';

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
  variant?: 'default' | 'destructive' | 'secondary';
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
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const { isMobile, useSwipe, hapticFeedback } = useMobileGestures();

  // 🔍 FILTRAR Y ORDENAR DATOS
  const processedData = useMemo(() => {
    let filtered = data;

    // Filtrar por búsqueda
    if (searchTerm) {
      filtered = filtered.filter(row =>
        Object.values(row).some(value =>
          String(value).toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }

    // Ordenar
    if (sortColumn) {
      filtered = [...filtered].sort((a, b) => {
        const aVal = a[sortColumn];
        const bVal = b[sortColumn];
        
        if (typeof aVal === 'string' && typeof bVal === 'string') {
          return sortDirection === 'asc' 
            ? aVal.localeCompare(bVal)
            : bVal.localeCompare(aVal);
        }
        
        if (sortDirection === 'asc') {
          return aVal > bVal ? 1 : -1;
        } else {
          return aVal < bVal ? 1 : -1;
        }
      });
    }

    return filtered;
  }, [data, searchTerm, sortColumn, sortDirection]);

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

    hapticFeedback('light');

    if (sortColumn === columnKey) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(columnKey);
      setSortDirection('asc');
    }
  };

  // 📱 EXPANDIR/CONTRAER FILAS EN MÓVIL
  const toggleRowExpansion = (rowId: string) => {
    hapticFeedback('light');
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(rowId)) {
      newExpanded.delete(rowId);
    } else {
      newExpanded.add(rowId);
    }
    setExpandedRows(newExpanded);
  };

  // 👆 CREAR REF CON GESTOS DE SWIPE
  const createSwipeRef = useCallback((row: Record<string, unknown>) => {
    // Hook debe estar dentro de un componente, no en una función helper
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useSwipe(
      () => {
        // Swipe left - mostrar acciones
        if (actions.length > 0) {
          hapticFeedback('medium');
          toggleRowExpansion(row.id || JSON.stringify(row));
        }
      },
      () => {
        // Swipe right - acción principal
        if (onRowClick) {
          hapticFeedback('light');
          onRowClick(row);
        }
      }
    );
  }, [actions.length, hapticFeedback, onRowClick]);

  // 📱 RENDERIZADO MÓVIL (CARDS)
  if (isMobile) {
    return (
      <div className={`space-y-4 ${className}`}>
        {/* Búsqueda móvil */}
        {searchable && (
          <div className="mobile-sticky-search">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 mobile-input-no-zoom"
              />
            </div>
          </div>
        )}

        {/* Cards móviles */}
        <div className="space-y-3">
          {paginatedData.map((row, index) => {
            const rowId = row.id || index.toString();
            const isExpanded = expandedRows.has(rowId);
            const swipeRef = createSwipeRef(row);

            return (
              <Card 
                key={rowId}
                ref={swipeRef}
                className="mobile-card-table transition-all duration-200 hover:shadow-md"
              >
                <CardContent className="p-4">
                  {/* Información principal */}
                  <div 
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => onRowClick?.(row)}
                  >
                    <div className="flex-1 min-w-0">
                      {columns.filter(col => !col.mobileHidden).slice(0, 2).map(column => (
                        <div key={column.key} className="mb-1">
                          {column.key === columns[0].key ? (
                            <p className="font-semibold text-gray-900 truncate">
                              {column.render ? column.render(row[column.key], row) : row[column.key]}
                            </p>
                          ) : (
                            <p className="text-sm text-gray-600 truncate">
                              {column.render ? column.render(row[column.key], row) : row[column.key]}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Badge o estado */}
                    {columns.length > 2 && (
                      <div className="ml-2">
                        {columns[2].render ? 
                          columns[2].render(row[columns[2].key], row) : 
                          <Badge variant="secondary">{row[columns[2].key]}</Badge>
                        }
                      </div>
                    )}

                    {/* Acciones */}
                    {(actions.length > 0 || columns.length > 3) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleRowExpansion(rowId);
                        }}
                        className="ml-2 mobile-touch-target"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  {/* Información expandida */}
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t space-y-3">
                      {/* Datos adicionales */}
                      {columns.slice(3).map(column => (
                        <div key={column.key} className="flex justify-between items-center">
                          <span className="text-sm font-medium text-gray-700">
                            {column.label}:
                          </span>
                          <span className="text-sm text-gray-900">
                            {column.render ? column.render(row[column.key], row) : row[column.key]}
                          </span>
                        </div>
                      ))}

                      {/* Acciones */}
                      {actions.length > 0 && (
                        <div className="flex gap-2 pt-2">
                          {actions.map(action => (
                            <Button
                              key={action.key}
                              variant={action.variant || 'outline'}
                              size="sm"
                              onClick={() => {
                                hapticFeedback('light');
                                action.onClick(row);
                              }}
                              className={`flex-1 mobile-haptic-light ${action.className || ''}`}
                            >
                              {action.icon && <span className="mr-1">{action.icon}</span>}
                              {action.label}
                            </Button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Paginación móvil */}
        {pagination && totalPages > 1 && (
          <div className="flex items-center justify-between py-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="mobile-haptic-light"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Anterior
            </Button>

            <span className="text-sm text-gray-600">
              Página {currentPage} de {totalPages}
            </span>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="mobile-haptic-light"
            >
              Siguiente
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        )}

        {/* Mensaje sin datos */}
        {paginatedData.length === 0 && (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-gray-500">No se encontraron datos</p>
            </CardContent>
          </Card>
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
      <div className="mobile-table-container">
        <table className="mobile-table w-full">
          <thead>
            <tr className="border-b">
              {columns.map(column => (
                <th
                  key={column.key}
                  className={`text-left p-3 font-medium text-gray-700 ${column.className || ''}`}
                  onClick={() => column.sortable && handleSort(column.key)}
                  style={{ cursor: column.sortable ? 'pointer' : 'default' }}
                >
                  <div className="flex items-center gap-2">
                    {column.label}
                    {column.sortable && sortColumn === column.key && (
                      <span className="text-xs">
                        {sortDirection === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
              ))}
              {actions.length > 0 && (
                <th className="text-left p-3 font-medium text-gray-700 w-32">
                  Acciones
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {paginatedData.map((row, index) => (
              <tr 
                key={row.id || index}
                className="border-b hover:bg-gray-50 cursor-pointer"
                onClick={() => onRowClick?.(row)}
              >
                {columns.map(column => (
                  <td key={column.key} className={`p-3 ${column.className || ''}`}>
                    {column.render ? column.render(row[column.key], row) : row[column.key]}
                  </td>
                ))}
                {actions.length > 0 && (
                  <td className="p-3">
                    <div className="flex gap-1">
                      {actions.map(action => (
                        <Button
                          key={action.key}
                          variant={action.variant || 'ghost'}
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            action.onClick(row);
                          }}
                          className={action.className}
                        >
                          {action.icon}
                        </Button>
                      ))}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Paginación desktop */}
      {pagination && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
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
  );
};