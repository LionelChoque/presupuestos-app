import { createContext, ReactNode, useContext } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { getQueryFn, apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Define el tipo de usuario autenticado (sin contraseña)
export type AuthUser = {
  id: number;
  username: string;
  email?: string;
  nombre?: string;
  apellido?: string;
  rol: string;
  fechaCreacion?: string;
  ultimoAcceso?: string;
  activo: boolean;
};

// Tipo para los datos de login
type LoginData = {
  username: string;
  password: string;
};

// Tipo para los datos de registro
type RegisterData = LoginData & {
  email?: string;
  nombre?: string;
  apellido?: string;
};

// Interfaz para el contexto de autenticación
type AuthContextType = {
  user: AuthUser | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<AuthUser, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<AuthUser, Error, RegisterData>;
};

// Crear el contexto de autenticación
export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  
  // Consulta para obtener el usuario actual
  const {
    data: user,
    error,
    isLoading,
  } = useQuery<AuthUser | undefined, Error>({
    queryKey: ["/api/auth/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  // Mutación para el login
  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      const res = await apiRequest("POST", "/api/auth/login", credentials);
      return await res.json();
    },
    onSuccess: (user: AuthUser) => {
      // Actualizar el estado del usuario en caché
      queryClient.setQueryData(["/api/auth/user"], user);
      
      // Mostrar notificación
      toast({
        title: "Inicio de sesión exitoso",
        description: `Bienvenido/a ${user.nombre || user.username}`,
      });
      
      // Redirigir al dashboard después de inicio de sesión exitoso
      // Usar window.location para asegurar una recarga completa
      window.location.href = "/";
    },
    onError: (error: Error) => {
      toast({
        title: "Error al iniciar sesión",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutación para el registro
  const registerMutation = useMutation({
    mutationFn: async (userData: RegisterData) => {
      const res = await apiRequest("POST", "/api/auth/register", userData);
      return await res.json();
    },
    onSuccess: (user: AuthUser) => {
      // Actualizar el estado del usuario en caché
      queryClient.setQueryData(["/api/auth/user"], user);
      
      // Mostrar notificación
      toast({
        title: "Registro exitoso",
        description: "Tu cuenta ha sido creada correctamente",
      });
      
      // Redirigir al dashboard después de registro exitoso
      window.location.href = "/";
    },
    onError: (error: Error) => {
      toast({
        title: "Error al registrarse",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutación para el logout
  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/auth/logout");
    },
    onSuccess: () => {
      // Limpiar el caché completo de React Query
      queryClient.clear();
      
      // Establecer el usuario como null
      queryClient.setQueryData(["/api/auth/user"], null);
      
      // Mostrar notificación
      toast({
        title: "Sesión cerrada",
        description: "Has cerrado sesión correctamente",
      });
      
      // La redirección ocurrirá automáticamente por ProtectedRoute
      // al detectar que el usuario es null
      window.location.href = "/auth";
    },
    onError: (error: Error) => {
      toast({
        title: "Error al cerrar sesión",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        error,
        loginMutation,
        logoutMutation,
        registerMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// Hook personalizado para usar el contexto de autenticación
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth debe ser usado dentro de un AuthProvider");
  }
  return context;
}