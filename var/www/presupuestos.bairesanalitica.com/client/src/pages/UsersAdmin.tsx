import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, PlusCircle, UserCog, UserX, Users } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";

// Tipos para los datos de usuario
interface User {
  id: number;
  username: string;
  email?: string;
  nombre?: string;
  apellido?: string;
  rol: string;
  fechaCreacion: string;
  ultimoAcceso?: string;
  activo: boolean;
}

// Tipo para la actividad de usuario
interface UserActivity {
  id: number;
  userId: number;
  username: string;
  tipo: string;
  descripcion: string;
  entidadId?: string;
  fecha: string;
  detalles?: Record<string, any>;
}

// Tipo para las estadísticas generales
interface UserStats {
  totalUsers: number;
  activeUsers: number;
  userActivities: { userId: number; username: string; count: number }[];
  recentActivities: UserActivity[];
}

export default function UsersAdmin() {
  // Estado para el diálogo de nuevo usuario
  const [isNewUserDialogOpen, setIsNewUserDialogOpen] = useState(false);
  const [newUserData, setNewUserData] = useState({
    username: "",
    password: "",
    email: "",
    nombre: "",
    apellido: "",
    rol: "user", // Por defecto, el rol es usuario
  });

  // Consulta para obtener la lista de usuarios
  const {
    data: users,
    isLoading: isLoadingUsers,
    refetch: refetchUsers,
  } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  // Consulta para obtener las estadísticas de usuarios
  const {
    data: stats,
    isLoading: isLoadingStats,
    refetch: refetchStats,
  } = useQuery<UserStats>({
    queryKey: ["/api/admin/stats"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  // Manejar cambio en los campos del formulario de nuevo usuario
  const handleNewUserChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewUserData((prev) => ({ ...prev, [name]: value }));
  };

  // Manejar envío del formulario de nuevo usuario
  const handleNewUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newUserData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al crear usuario');
      }
      
      // Resetear el formulario
      setNewUserData({
        username: "",
        password: "",
        email: "",
        nombre: "",
        apellido: "",
        rol: "user",
      });
      
      // Cerrar el diálogo y refrescar la lista
      setIsNewUserDialogOpen(false);
      refetchUsers();
      refetchStats();
      
      // Mostrar mensaje de éxito (se podría implementar un sistema de notificaciones)
      alert('Usuario creado correctamente');
    } catch (error) {
      console.error('Error al crear usuario:', error);
      alert(error instanceof Error ? error.message : 'Error al crear usuario');
    }
  };

  // Manejar cambio de estado activo/inactivo de un usuario
  const handleUserStatusChange = async (userId: number, isActive: boolean) => {
    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ activo: isActive }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al actualizar estado del usuario');
      }
      
      // Refrescar la lista
      refetchUsers();
      refetchStats();
      
      // Notificar éxito (se podría mejorar con sistema de notificaciones)
      alert(`El usuario ha sido ${isActive ? 'activado' : 'desactivado'} correctamente`);
    } catch (error) {
      console.error('Error al cambiar estado del usuario:', error);
      alert(error instanceof Error ? error.message : 'Error al actualizar estado del usuario');
    }
  };

  // Renderizar tabla de usuarios
  const renderUsersTable = () => {
    if (isLoadingUsers) {
      return (
        <div className="flex justify-center items-center py-8">
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
          <span className="ml-2 text-muted-foreground">Cargando usuarios...</span>
        </div>
      );
    }

    if (!users || users.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          No hay usuarios registrados.
        </div>
      );
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>Usuario</TableHead>
            <TableHead>Nombre</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Rol</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Último acceso</TableHead>
            <TableHead>Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell className="font-mono text-xs">{user.id}</TableCell>
              <TableCell>{user.username}</TableCell>
              <TableCell>
                {user.nombre && user.apellido
                  ? `${user.nombre} ${user.apellido}`
                  : "-"}
              </TableCell>
              <TableCell>{user.email || "-"}</TableCell>
              <TableCell>
                <Badge variant={user.rol === "admin" ? "destructive" : "default"}>
                  {user.rol === "admin" ? "Administrador" : "Usuario"}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={user.activo}
                    onCheckedChange={(checked) =>
                      handleUserStatusChange(user.id, checked)
                    }
                  />
                  <span>{user.activo ? "Activo" : "Inactivo"}</span>
                </div>
              </TableCell>
              <TableCell>
                {user.ultimoAcceso
                  ? new Date(user.ultimoAcceso).toLocaleString()
                  : "Nunca"}
              </TableCell>
              <TableCell>
                <div className="flex space-x-1">
                  <Button variant="ghost" size="icon">
                    <UserCog className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon">
                    <UserX className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  // Renderizar tabla de actividad de usuarios
  const renderActivityTable = () => {
    if (isLoadingStats) {
      return (
        <div className="flex justify-center items-center py-8">
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
          <span className="ml-2 text-muted-foreground">Cargando actividad...</span>
        </div>
      );
    }

    if (!stats || !stats.recentActivities || stats.recentActivities.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          No hay actividad reciente registrada.
        </div>
      );
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Usuario</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Descripción</TableHead>
            <TableHead>Entidad</TableHead>
            <TableHead>Fecha</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {stats.recentActivities.map((activity) => (
            <TableRow key={activity.id}>
              <TableCell>{activity.username}</TableCell>
              <TableCell>
                <Badge variant="outline">{activity.tipo}</Badge>
              </TableCell>
              <TableCell>{activity.descripcion}</TableCell>
              <TableCell>
                {activity.entidadId ? (
                  <code className="text-xs bg-muted p-1 rounded">
                    {activity.entidadId}
                  </code>
                ) : (
                  "-"
                )}
              </TableCell>
              <TableCell>
                {new Date(activity.fecha).toLocaleString()}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  // Renderizar estadísticas de usuario
  const renderUserStats = () => {
    if (isLoadingStats) {
      return (
        <div className="flex justify-center items-center py-8">
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
          <span className="ml-2 text-muted-foreground">Cargando estadísticas...</span>
        </div>
      );
    }

    if (!stats) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          No hay estadísticas disponibles.
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-2xl font-bold">
              {stats.totalUsers}
            </CardTitle>
            <CardDescription>Usuarios totales</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-2xl font-bold">
              {stats.activeUsers}
            </CardTitle>
            <CardDescription>Usuarios activos</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-2xl font-bold">
              {stats.userActivities.length}
            </CardTitle>
            <CardDescription>Usuarios con actividad</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  };

  return (
    <div className="py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent">
            Administración de Usuarios
          </h1>
          <p className="text-muted-foreground">
            Gestiona los usuarios del sistema y monitorea su actividad
          </p>
        </div>
        <Dialog open={isNewUserDialogOpen} onOpenChange={setIsNewUserDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center">
              <PlusCircle className="mr-2 h-4 w-4" />
              Nuevo Usuario
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Crear nuevo usuario</DialogTitle>
              <DialogDescription>
                Ingresa los datos para crear un nuevo usuario en el sistema.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleNewUserSubmit}>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col space-y-1.5">
                    <Label htmlFor="nombre">Nombre</Label>
                    <Input
                      id="nombre"
                      name="nombre"
                      value={newUserData.nombre}
                      onChange={handleNewUserChange}
                      placeholder="Nombre"
                    />
                  </div>
                  <div className="flex flex-col space-y-1.5">
                    <Label htmlFor="apellido">Apellido</Label>
                    <Input
                      id="apellido"
                      name="apellido"
                      value={newUserData.apellido}
                      onChange={handleNewUserChange}
                      placeholder="Apellido"
                    />
                  </div>
                </div>
                <div className="flex flex-col space-y-1.5">
                  <Label htmlFor="username">Nombre de usuario</Label>
                  <Input
                    id="username"
                    name="username"
                    value={newUserData.username}
                    onChange={handleNewUserChange}
                    placeholder="Nombre de usuario"
                    required
                  />
                </div>
                <div className="flex flex-col space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={newUserData.email}
                    onChange={handleNewUserChange}
                    placeholder="correo@ejemplo.com"
                  />
                </div>
                <div className="flex flex-col space-y-1.5">
                  <Label htmlFor="password">Contraseña</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    value={newUserData.password}
                    onChange={handleNewUserChange}
                    placeholder="Contraseña"
                    required
                  />
                </div>
                <div className="flex flex-col space-y-1.5">
                  <Label htmlFor="rol">Rol</Label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="user"
                      name="rol"
                      value="user"
                      checked={newUserData.rol === "user"}
                      onChange={handleNewUserChange}
                      className="mr-1"
                    />
                    <Label htmlFor="user" className="mr-4">Usuario</Label>
                    <input
                      type="radio"
                      id="admin"
                      name="rol"
                      value="admin"
                      checked={newUserData.rol === "admin"}
                      onChange={handleNewUserChange}
                      className="mr-1"
                    />
                    <Label htmlFor="admin">Administrador</Label>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">Crear usuario</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {renderUserStats()}

      <Tabs defaultValue="users" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="users" className="flex items-center">
            <Users className="mr-2 h-4 w-4" />
            Usuarios
          </TabsTrigger>
          <TabsTrigger value="activity" className="flex items-center">
            <UserCog className="mr-2 h-4 w-4" />
            Actividad
          </TabsTrigger>
        </TabsList>
        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>Lista de usuarios</CardTitle>
              <CardDescription>
                Ver y gestionar todos los usuarios del sistema
              </CardDescription>
            </CardHeader>
            <CardContent>{renderUsersTable()}</CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="activity">
          <Card>
            <CardHeader>
              <CardTitle>Actividad reciente</CardTitle>
              <CardDescription>
                Monitoreo de las acciones realizadas por los usuarios
              </CardDescription>
            </CardHeader>
            <CardContent>{renderActivityTable()}</CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}