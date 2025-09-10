import { useState } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';

interface DateRange {
  label: string;
  value: string;
  days: number;
}

interface DateFilterProps {
  onRangeChange: (days: number, label: string) => void;
  currentRange?: string;
}

const dateRanges: DateRange[] = [
  { label: 'Últimos 7 días', value: '7d', days: 7 },
  { label: 'Últimos 15 días', value: '15d', days: 15 },
  { label: 'Últimos 30 días', value: '30d', days: 30 },
  { label: 'Últimos 60 días', value: '60d', days: 60 },
  { label: 'Últimos 90 días', value: '90d', days: 90 },
  { label: 'Último año', value: '1y', days: 365 }
];

export function DateFilter({ onRangeChange, currentRange = 'Últimos 30 días' }: DateFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedRange, setSelectedRange] = useState(currentRange);

  const handleRangeSelect = (range: DateRange) => {
    setSelectedRange(range.label);
    setIsOpen(false);
    onRangeChange(range.days, range.label);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-background border border-input rounded-lg hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 transition-colors"
      >
        <Calendar className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-medium">{selectedRange}</span>
        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          {/* Overlay */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown */}
          <div className="absolute right-0 top-full mt-1 w-48 bg-popover border border-border rounded-lg shadow-lg z-50">
            <div className="py-1">
              {dateRanges.map((range) => (
                <button
                  key={range.value}
                  onClick={() => handleRangeSelect(range)}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors ${
                    selectedRange === range.label 
                      ? 'bg-primary/10 text-primary font-medium' 
                      : 'text-popover-foreground'
                  }`}
                >
                  {range.label}
                </button>
              ))}
            </div>
            
            <div className="border-t border-border p-2">
              <div className="text-xs text-muted-foreground px-2">
                Filtrar datos por período de tiempo
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Hook para usar el filtro de fechas
export function useDateFilter(initialDays: number = 30) {
  const [dateRange, setDateRange] = useState({
    days: initialDays,
    label: 'Últimos 30 días',
    startDate: new Date(Date.now() - initialDays * 24 * 60 * 60 * 1000),
    endDate: new Date()
  });

  const updateRange = (days: number, label: string) => {
    const endDate = new Date();
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
    setDateRange({
      days,
      label,
      startDate,
      endDate
    });
  };

  return {
    dateRange,
    updateRange,
    // Formatos útiles para queries
    startDate: dateRange.startDate.toISOString().split('T')[0],
    endDate: dateRange.endDate.toISOString().split('T')[0],
    startDateTime: dateRange.startDate.toISOString(),
    endDateTime: dateRange.endDate.toISOString()
  };
}