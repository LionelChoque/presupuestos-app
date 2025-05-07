import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  AlertCircle,
  BarChart,
  CheckCircle,
  Clock,
  FileText,
  Upload,
  RefreshCw,
  Calendar as CalendarIcon,
  Filter
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { Calendar } from "@/components/ui/calendar";
import { Budget, Stats, ActivityItem, BudgetFilters } from '@/lib/types';
import { calculateStats, filterBudgets } from '@/lib/utils';
import { Chart } from 'chart.js/auto';

interface DashboardProps {
  budgets: Budget[];
  isLoading: boolean;
}

export default function Dashboard({ budgets, isLoading }: DashboardProps) {
  const [filters, setFilters] = useState<BudgetFilters>({
    search: '',
    status: 'all',
    dateRange: undefined,
    dateType: 'creation'
  });
  
  const [showDateFilters, setShowDateFilters] = useState(false);
  const [stats, setStats] = useState<Stats>({
    total: 0,
    pending: 0,
    expiringSoon: 0,
    approved: 0,
    rejected: 0,
    byManufacturer: {},
    byStatus: {}
  });
  
  const dateFilterForm = useForm({
    defaultValues: {
      from: filters.dateRange?.from ? new Date(filters.dateRange.from) : undefined,
      to: filters.dateRange?.to ? new Date(filters.dateRange.to) : undefined,
      dateType: filters.dateType || 'creation'
    }
  });
  
  const applyDateFilter = (values: any) => {
    const { from, to, dateType } = values;
    
    setFilters({
      ...filters,
      dateRange: from || to ? {
        from: from ? format(from, 'yyyy-MM-dd') : '',
        to: to ? format(to, 'yyyy-MM-dd') : '',
      } : undefined,
      dateType: dateType
    });
  };
  
  const resetDateFilters = () => {
    dateFilterForm.reset({
      from: undefined,
      to: undefined,
      dateType: 'creation'
    });
    
    setFilters({
      ...filters,
      dateRange: undefined,
      dateType: 'creation'
    });
  };
  
  const activeDateFilters = !!(filters.dateRange?.from || filters.dateRange?.to);
  
  const statusChartRef = useRef<HTMLCanvasElement>(null);
  const manufacturerChartRef = useRef<HTMLCanvasElement>(null);
  const statusChartInstance = useRef<Chart<'doughnut'> | null>(null);
  const manufacturerChartInstance = useRef<Chart<'bar'> | null>(null);

  // Mock recent activity
  const recentActivity: ActivityItem[] = [
    { type: 'import', description: 'Importación de presupuestos (84 presupuestos)', time: '2 minutos atrás' },
    { type: 'update', description: 'Se marcó el presupuesto #39120 como Rechazado', time: '15 minutos atrás' },
    { type: 'update', description: 'Se marcó el presupuesto #39118 como Aprobado', time: '45 minutos atrás' },
    { type: 'note', description: 'Nota añadida al presupuesto #39097', time: '1 hora atrás' },
    { type: 'import', description: 'Importación de presupuestos (76 presupuestos)', time: '1 día atrás' }
  ];

  // Calculate filtered budgets and stats only when filters or budgets change
  useEffect(() => {
    if (!isLoading) {
      const filteredBudgets = filterBudgets(budgets, filters);
      
      if (filteredBudgets.length > 0) {
        setStats(calculateStats(filteredBudgets));
      } else {
        // Reset stats when no budgets match the filter
        setStats({
          total: 0,
          pending: 0,
          expiringSoon: 0,
          approved: 0,
          rejected: 0,
          byManufacturer: {},
          byStatus: {}
        });
      }
    }
  }, [filters, budgets, isLoading]);

  useEffect(() => {
    // Initialize the charts when stats are available
    if (stats.total > 0) {
      initCharts();
    }
    
    return () => {
      // Clean up chart instances on unmount
      if (statusChartInstance.current) {
        statusChartInstance.current.destroy();
      }
      if (manufacturerChartInstance.current) {
        manufacturerChartInstance.current.destroy();
      }
    };
  }, [stats]);

  const initCharts = () => {
    const statusLabels = ['Confirmación', 'Primer Seguimiento', 'Seguimiento Final', 'Vencido', 'Aprobado', 'Rechazado'];
    const statusData = statusLabels.map(label => stats.byStatus[label] || 0);
    
    // Get top 5 manufacturers
    const manufacturerEntries = Object.entries(stats.byManufacturer)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    const manufacturerLabels = manufacturerEntries.map(([label]) => label);
    const manufacturerData = manufacturerEntries.map(([, value]) => value);

    if (statusChartRef.current) {
      if (statusChartInstance.current) {
        statusChartInstance.current.destroy();
      }
      
      statusChartInstance.current = new Chart(statusChartRef.current, {
        type: 'doughnut',
        data: {
          labels: statusLabels,
          datasets: [{
            data: statusData,
            backgroundColor: ['#93C5FD', '#A78BFA', '#FBBF24', '#9CA3AF', '#34D399', '#F87171']
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'right',
            }
          }
        }
      });
    }

    if (manufacturerChartRef.current) {
      if (manufacturerChartInstance.current) {
        manufacturerChartInstance.current.destroy();
      }
      
      manufacturerChartInstance.current = new Chart(manufacturerChartRef.current, {
        type: 'bar',
        data: {
          labels: manufacturerLabels,
          datasets: [{
            label: 'Presupuestos',
            data: manufacturerData,
            backgroundColor: '#3B82F6',
            borderColor: '#2563EB',
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                precision: 0 // Show only integers
              }
            }
          }
        }
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 text-primary animate-spin" />
        <span className="ml-2 text-lg">Cargando datos...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
        
        <Popover open={showDateFilters} onOpenChange={setShowDateFilters}>
          <PopoverTrigger asChild>
            <Button 
              variant={activeDateFilters ? "default" : "outline"} 
              className={`${activeDateFilters ? "bg-primary text-white" : "text-gray-700"}`}
              size="sm"
            >
              <Filter className="w-4 h-4 mr-2" />
              Filtrar por fechas
              {activeDateFilters && <span className="ml-1 bg-white text-primary rounded-full px-1.5 py-0.5 text-xs font-medium">
                Activo
              </span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-96 p-4" align="end">
            <Form {...dateFilterForm}>
              <form onSubmit={dateFilterForm.handleSubmit(applyDateFilter)} className="space-y-4">
                <h3 className="font-medium text-sm mb-2">Filtrar datos por rango de fechas</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <FormField
                      control={dateFilterForm.control}
                      name="from"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel className="text-xs">Desde</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant={"outline"}
                                  className={`w-full pl-3 text-left font-normal ${!field.value && "text-muted-foreground"}`}
                                  size="sm"
                                >
                                  {field.value ? (
                                    format(field.value, "PPP", { locale: es })
                                  ) : (
                                    <span>Seleccionar fecha</span>
                                  )}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                disabled={(date) =>
                                  date > new Date() || date < new Date("2010-01-01")
                                }
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <FormField
                      control={dateFilterForm.control}
                      name="to"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel className="text-xs">Hasta</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant={"outline"}
                                  className={`w-full pl-3 text-left font-normal ${!field.value && "text-muted-foreground"}`}
                                  size="sm"
                                >
                                  {field.value ? (
                                    format(field.value, "PPP", { locale: es })
                                  ) : (
                                    <span>Seleccionar fecha</span>
                                  )}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                disabled={(date) =>
                                  date > new Date() || date < new Date("2010-01-01")
                                }
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <FormField
                    control={dateFilterForm.control}
                    name="dateType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Tipo de fecha</FormLabel>
                        <div className="relative">
                          <select
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                            value={field.value}
                            onChange={(e) => field.onChange(e.target.value)}
                          >
                            <option value="creation">Fecha de creación</option>
                            <option value="action">Fecha de acción</option>
                            <option value="status">Fecha de cambio de estado</option>
                            <option value="all">Cualquier fecha</option>
                          </select>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="flex justify-between">
                  <Button 
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      resetDateFilters();
                      setShowDateFilters(false);
                    }}
                  >
                    Limpiar filtros
                  </Button>
                  <Button 
                    type="submit"
                    size="sm"
                    onClick={() => setShowDateFilters(false)}
                  >
                    Aplicar filtros
                  </Button>
                </div>
              </form>
            </Form>
          </PopoverContent>
        </Popover>
      </div>
      
      {activeDateFilters && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-3 flex items-center justify-between">
          <div className="flex items-center">
            <CalendarIcon className="h-4 w-4 text-blue-500 mr-2" />
            <span className="text-sm text-blue-700">
              Filtrando datos: {filters.dateType === 'creation' ? 'Fecha de creación' : 
                              filters.dateType === 'action' ? 'Fecha de acción' : 
                              filters.dateType === 'status' ? 'Fecha de cambio de estado' : 
                              'Cualquier fecha'}
              {filters.dateRange?.from && ` desde ${filters.dateRange.from}`}
              {filters.dateRange?.to && ` hasta ${filters.dateRange.to}`}
            </span>
          </div>
          <Button 
            variant="ghost" 
            size="sm"
            className="h-7 px-2 text-blue-600 hover:text-blue-800 hover:bg-blue-100"
            onClick={resetDateFilters}
          >
            Limpiar filtros
          </Button>
        </div>
      )}
      
      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="stat-card">
          <CardContent className="p-5">
            <div className="flex items-center">
              <div className="stat-card-icon bg-primary-100">
                <FileText className="h-6 w-6 text-primary-700" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Presupuestos
                  </dt>
                  <dd className="flex items-baseline">
                    <div className="stat-card-value">{stats.total}</div>
                  </dd>
                </dl>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="stat-card">
          <CardContent className="p-5">
            <div className="flex items-center">
              <div className="stat-card-icon bg-yellow-100">
                <Clock className="h-6 w-6 text-yellow-700" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Pendientes
                  </dt>
                  <dd className="flex items-baseline">
                    <div className="stat-card-value">{stats.pending}</div>
                  </dd>
                </dl>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="stat-card">
          <CardContent className="p-5">
            <div className="flex items-center">
              <div className="stat-card-icon bg-red-100">
                <AlertCircle className="h-6 w-6 text-red-700" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Por Vencer (7 días)
                  </dt>
                  <dd className="flex items-baseline">
                    <div className="stat-card-value">{stats.expiringSoon}</div>
                  </dd>
                </dl>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="stat-card">
          <CardContent className="p-5">
            <div className="flex items-center">
              <div className="stat-card-icon bg-green-100">
                <CheckCircle className="h-6 w-6 text-green-700" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Aprobados (Este mes)
                  </dt>
                  <dd className="flex items-baseline">
                    <div className="stat-card-value">{stats.approved}</div>
                  </dd>
                </dl>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardContent className="p-5">
            <h3 className="text-lg font-medium leading-6 text-gray-900">Estado de Presupuestos</h3>
            <div className="mt-2 h-64">
              <canvas ref={statusChartRef}></canvas>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <h3 className="text-lg font-medium leading-6 text-gray-900">Presupuestos por Fabricante</h3>
            <div className="mt-2 h-64">
              <canvas ref={manufacturerChartRef}></canvas>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <div className="px-5 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium leading-6 text-gray-900">Actividad Reciente</h3>
        </div>
        <div className="overflow-hidden">
          <ul className="divide-y divide-gray-200">
            {recentActivity.map((activity, i) => (
              <li key={i} className="px-5 py-4">
                <div className="flex items-center space-x-4">
                  <div className={`
                    flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center
                    ${activity.type === 'import' ? 'bg-blue-100' : activity.type === 'update' ? 'bg-green-100' : 'bg-yellow-100'}
                  `}>
                    {activity.type === 'import' && <Upload className="h-4 w-4 text-blue-700" />}
                    {activity.type === 'update' && <RefreshCw className="h-4 w-4 text-green-700" />}
                    {activity.type === 'note' && (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-yellow-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{activity.description}</p>
                    <p className="text-sm text-gray-500">{activity.time}</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </Card>
    </div>
  );
}
