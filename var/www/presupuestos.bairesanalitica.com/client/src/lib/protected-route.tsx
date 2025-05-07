import { FC, ReactNode } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Redirect, useLocation } from "wouter";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: ReactNode;
  adminOnly?: boolean;
}

export const ProtectedRoute: FC<ProtectedRouteProps> = ({
  children,
  adminOnly = false,
}) => {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center w-full h-screen">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <span className="ml-2 text-lg text-muted-foreground">Cargando...</span>
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/auth" />;
  }

  if (adminOnly && user.rol !== "admin") {
    // Redireccionar a la página principal si no es administrador
    setLocation("/");
    return (
      <div className="flex flex-col items-center justify-center w-full h-screen">
        <h1 className="text-2xl font-bold text-destructive">Acceso denegado</h1>
        <p className="text-muted-foreground">
          No tienes permisos para acceder a esta página.
        </p>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;