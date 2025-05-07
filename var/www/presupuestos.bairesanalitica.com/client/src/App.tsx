import { useState } from 'react';
import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from '@/components/Layout';
import { ImportModal } from '@/components/ImportModal';
import { BudgetDetailsModal } from '@/components/BudgetDetailsModal';
import Dashboard from '@/pages/Dashboard';
import BudgetList from '@/pages/BudgetList';
import TaskList from '@/pages/TaskList';
import Reports from '@/pages/Reports';
import NotFound from "@/pages/not-found";
import { useBudgets } from '@/hooks/useBudgets';
import { AuthProvider } from '@/hooks/use-auth';
import AuthPage from '@/pages/auth-page';
import UsersAdmin from '@/pages/UsersAdmin';
import ProtectedRoute from '@/lib/protected-route';

function App() {
  // Eliminamos useLocation ya que estaba causando problemas
  const {
    budgets,
    isLoading,
    selectedBudget,
    isImportModalOpen,
    isBudgetDetailsOpen,
    completedTasks,
    notes,
    actionStatus,
    contactsData,
    selectedFile,
    uploadProgress,
    importOptions,
    setSelectedBudget,
    setIsImportModalOpen,
    setIsBudgetDetailsOpen,
    setSelectedFile,
    setUploadProgress,
    setImportOptions,
    toggleTask,
    saveNotes,
    markActionCompleted,
    saveContactInfo,
    finalizeBudget,
    openBudgetDetails,
    importCsvFile,
    changeBudgetType,
    advanceBudgetStage
  } = useBudgets();

  return (
    <TooltipProvider>
      <Layout onImport={() => setIsImportModalOpen(true)}>
        <Switch>
          <Route 
            path="/" 
            component={() => (
              <ProtectedRoute>
                <Dashboard budgets={budgets as any} isLoading={isLoading} />
              </ProtectedRoute>
            )}
          />
          <Route 
            path="/budgets" 
            component={() => (
              <ProtectedRoute>
                <BudgetList 
                  budgets={budgets as any} 
                  isLoading={isLoading} 
                  onOpenBudgetDetails={openBudgetDetails} 
                />
              </ProtectedRoute>
            )}
          />
          <Route 
            path="/tasks" 
            component={() => (
              <ProtectedRoute>
                <TaskList 
                  budgets={budgets as any} 
                  isLoading={isLoading} 
                  completedTasks={completedTasks} 
                  onToggleTask={toggleTask} 
                  onOpenBudgetDetails={openBudgetDetails} 
                />
              </ProtectedRoute>
            )}
          />
          <Route 
            path="/reports" 
            component={() => (
              <ProtectedRoute>
                <Reports />
              </ProtectedRoute>
            )}
          />
          <Route 
            path="/admin/users" 
            component={() => (
              <ProtectedRoute adminOnly>
                <UsersAdmin />
              </ProtectedRoute>
            )}
          />
          <Route path="/auth" component={AuthPage} />
          <Route component={NotFound} />
        </Switch>
      </Layout>

      {/* Import Modal */}
      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImport={importCsvFile}
        options={importOptions}
        setOptions={setImportOptions}
        uploadProgress={uploadProgress}
        selectedFile={selectedFile}
        setSelectedFile={setSelectedFile}
      />

      {/* Budget Details Modal */}
      <BudgetDetailsModal
        isOpen={isBudgetDetailsOpen}
        onClose={() => setIsBudgetDetailsOpen(false)}
        budget={selectedBudget}
        contactInfo={selectedBudget ? contactsData[selectedBudget.id] : undefined}
        onSaveNotes={(budgetId, notes) => saveNotes(budgetId, notes)}
        onMarkAction={(budgetId) => markActionCompleted(budgetId)}
        onFinalizeBudget={(budgetId, status) => finalizeBudget(budgetId, status)}
        onSaveContact={(budgetId, data) => saveContactInfo(budgetId, data)}
        onChangeBudgetType={(budgetId, isLicitacion) => changeBudgetType(budgetId, isLicitacion)}
        onAdvanceBudgetStage={(budgetId, newStage, commentText) => advanceBudgetStage(budgetId, newStage, commentText)}
        isActionCompleted={selectedBudget ? actionStatus[selectedBudget.id] || false : false}
      />

      <Toaster />
    </TooltipProvider>
  );
}

export default App;
