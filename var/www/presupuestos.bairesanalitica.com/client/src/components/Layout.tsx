import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import {
  BarChart,
  CalendarClock,
  CheckSquare,
  ClipboardList,
  Users,
  LogOut,
  Menu,
  Settings,
  User,
  X,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface LayoutProps {
  children: React.ReactNode;
  onImport: () => void;
}

export function Layout({ children, onImport }: LayoutProps) {
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, logoutMutation } = useAuth();

  const navItems = [
    {
      id: '/',
      label: 'Dashboard',
      icon: <BarChart className="h-5 w-5" />,
    },
    {
      id: '/budgets',
      label: 'Presupuestos',
      icon: <ClipboardList className="h-5 w-5" />,
    },
    {
      id: '/tasks',
      label: 'Tareas',
      icon: <CheckSquare className="h-5 w-5" />,
    },
    {
      id: '/reports',
      label: 'Reportes',
      icon: <CalendarClock className="h-5 w-5" />,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <div className="flex items-center">
            <div className="text-primary font-semibold text-lg">
              <span className="hidden md:inline">Sistema de Seguimiento de Presupuestos</span>
              <span className="md:hidden">Presupuestos</span>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <Button
              onClick={onImport}
              size="sm"
              className="flex items-center"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 mr-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              Importar CSV
            </Button>
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="relative h-8 w-8 rounded-full bg-primary flex items-center justify-center text-white p-0"
                  >
                    <span className="sr-only">Abrir menú de usuario</span>
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-primary text-white text-xs">
                        {user.nombre && user.apellido
                          ? `${user.nombre[0]}${user.apellido[0]}`
                          : user.username.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {user.nombre && user.apellido
                          ? `${user.nombre} ${user.apellido}`
                          : user.username}
                      </p>
                      {user.email && (
                        <p className="text-xs leading-none text-muted-foreground">
                          {user.email}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {user.rol === 'admin' ? 'Administrador' : 'Usuario'}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <User className="mr-2 h-4 w-4" />
                    <span>Mi perfil</span>
                  </DropdownMenuItem>
                  {user.rol === 'admin' && (
                    <DropdownMenuItem asChild>
                      <Link href="/admin/users">
                        <Users className="mr-2 h-4 w-4" />
                        <span>Gestionar usuarios</span>
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Configuración</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => logoutMutation.mutate()}
                    disabled={logoutMutation.isPending}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>{logoutMutation.isPending ? 'Cerrando sesión...' : 'Cerrar sesión'}</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button asChild size="sm" variant="outline">
                <Link href="/auth">
                  <User className="mr-2 h-4 w-4" />
                  Iniciar sesión
                </Link>
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1">
        {/* Desktop Sidebar */}
        <div className="hidden md:flex md:flex-shrink-0">
          <div className="flex flex-col w-64 bg-white border-r border-gray-200">
            <div className="h-0 flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
              <nav className="mt-5 flex-1 px-2 space-y-1">
                {navItems.map((item) => (
                  <Link
                    key={item.id}
                    href={item.id}
                    className={`
                      group flex items-center px-2 py-2 text-sm font-medium rounded-md cursor-pointer
                      ${
                        location === item.id
                          ? 'bg-primary-50 text-primary-700'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }
                    `}
                  >
                    <span className="mr-3 h-5 w-5">{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                ))}
              </nav>
            </div>
          </div>
        </div>

        {/* Mobile menu overlay */}
        {mobileMenuOpen && (
          <div
            className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 md:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        {/* Mobile menu */}
        <div className={`fixed inset-y-0 left-0 z-40 w-full bg-white md:hidden transform ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 ease-in-out`}>
          <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200">
            <div className="text-primary-800 font-semibold">Sistema de Seguimiento</div>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="text-gray-500"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          <nav className="mt-2 px-4 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.id}
                href={item.id}
                className={`
                  group flex items-center px-2 py-3 text-base font-medium rounded-md
                  ${
                    location === item.id
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }
                `}
                onClick={() => setMobileMenuOpen(false)}
              >
                <span className="mr-4 h-6 w-6">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>
        </div>

        {/* Mobile menu button */}
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="fixed bottom-4 right-4 z-20 p-2 rounded-full bg-primary text-white shadow-lg md:hidden"
        >
          <Menu className="h-6 w-6" />
        </button>

        {/* Content area */}
        <div className="flex-1 overflow-auto">
          <main className="py-6 px-4 sm:px-6 lg:px-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
