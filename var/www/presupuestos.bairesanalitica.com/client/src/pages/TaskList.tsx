import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Budget, TaskFilters } from '@/lib/types';
import { filterTasks } from '@/lib/utils';
import { CalendarDays, RefreshCw } from 'lucide-react';

interface TaskListProps {
  budgets: Budget[];
  isLoading: boolean;
  completedTasks: Record<string, boolean>;
  onToggleTask: (id: string) => void;
  onOpenBudgetDetails: (budget: Budget) => void;
}

export default function TaskList({
  budgets,
  isLoading,
  completedTasks,
  onToggleTask,
  onOpenBudgetDetails,
}: TaskListProps) {
  const [taskFilter, setTaskFilter] = useState<TaskFilters>({
    priority: 'all',
  });

  const filteredTasks = filterTasks(budgets, taskFilter, completedTasks);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-gray-900">Tareas Pendientes</h1>
      
      <Card>
        <CardHeader className="px-5 py-4 border-b border-gray-200">
          <CardTitle className="text-lg font-medium text-gray-900">Tareas</CardTitle>
        </CardHeader>
        <div className="px-5 py-3 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex space-x-4">
              <Button
                variant={taskFilter.priority === 'all' ? 'secondary' : 'ghost'}
                onClick={() => setTaskFilter({ ...taskFilter, priority: 'all' })}
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  taskFilter.priority === 'all' ? 'bg-primary-100 text-primary-700' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Todas
              </Button>
              <Button
                variant={taskFilter.priority === 'alta' ? 'secondary' : 'ghost'}
                onClick={() => setTaskFilter({ ...taskFilter, priority: 'alta' })}
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  taskFilter.priority === 'alta' ? 'bg-red-100 text-red-700' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Alta Prioridad
              </Button>
              <Button
                variant={taskFilter.priority === 'media' ? 'secondary' : 'ghost'}
                onClick={() => setTaskFilter({ ...taskFilter, priority: 'media' })}
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  taskFilter.priority === 'media' ? 'bg-yellow-100 text-yellow-700' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Media Prioridad
              </Button>
            </div>
          </div>
        </div>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center items-center py-10">
              <RefreshCw className="animate-spin h-5 w-5 mr-2 text-primary" />
              <span>Cargando tareas...</span>
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {filteredTasks.length > 0 ? (
                filteredTasks.map((budget) => (
                  <li key={budget.id} className="relative px-5 py-4 hover:bg-gray-50">
                    <div className="flex items-start">
                      <div className="flex-shrink-0 mt-1">
                        <Checkbox
                          id={`task-${budget.id}`}
                          checked={completedTasks[budget.id] || false}
                          onCheckedChange={() => onToggleTask(budget.id)}
                        />
                      </div>
                      <div className="ml-3 flex-1">
                        <div className="flex items-center justify-between">
                          <p className={`text-sm font-medium ${
                            completedTasks[budget.id] ? 'text-gray-400 line-through' : 'text-gray-900'
                          }`}>
                            <span>{budget.empresa}</span> - <span className="font-mono">#{budget.id}</span>
                          </p>
                          <div className="ml-2 flex-shrink-0 flex">
                            <Badge className={budget.prioridad === 'Alta' ? 'priority-high' : 
                              budget.prioridad === 'Media' ? 'priority-medium' : 'priority-low'}>
                              {budget.prioridad}
                            </Badge>
                          </div>
                        </div>
                        <p className={`text-sm ${
                          completedTasks[budget.id] ? 'text-gray-400 line-through' : 'text-gray-500'
                        }`}>
                          {budget.accion}
                        </p>
                        <div className="mt-2 flex items-center text-xs text-gray-500">
                          <CalendarDays className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                          <span>{budget.fechaCreacion}</span>
                          <svg xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0 mx-1.5 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>{budget.diasRestantes} días restantes</span>
                          {budget.alertas && budget.alertas.length > 0 && (
                            <span className="flex-shrink-0 ml-1.5 inline-flex items-center">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                              </svg>
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="ml-3 flex-shrink-0">
                        <Button
                          variant="link"
                          onClick={() => onOpenBudgetDetails(budget)}
                          className="text-primary hover:text-primary-900 text-sm font-medium"
                        >
                          Acción
                        </Button>
                      </div>
                    </div>
                  </li>
                ))
              ) : (
                <li className="relative p-6 text-center">
                  <p className="text-gray-500">No hay tareas pendientes que coincidan con el filtro seleccionado.</p>
                </li>
              )}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
