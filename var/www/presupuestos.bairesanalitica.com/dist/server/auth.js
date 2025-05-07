import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import connectPg from "connect-pg-simple";
import { pool } from "./db";
const scryptAsync = promisify(scrypt);
async function hashPassword(password) {
    const salt = randomBytes(16).toString("hex");
    const buf = (await scryptAsync(password, salt, 64));
    return `${buf.toString("hex")}.${salt}`;
}
async function comparePasswords(supplied, stored) {
    const [hashed, salt] = stored.split(".");
    const hashedBuf = Buffer.from(hashed, "hex");
    const suppliedBuf = (await scryptAsync(supplied, salt, 64));
    return timingSafeEqual(hashedBuf, suppliedBuf);
}
export function isAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.status(401).json({ message: "No autenticado" });
}
export function isAdmin(req, res, next) {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "No autenticado" });
    }
    if (req.user && req.user.rol === "admin") {
        return next();
    }
    res.status(403).json({ message: "No autorizado" });
}
export async function logUserActivity(userId, tipo, descripcion, entidadId, detalles) {
    try {
        const activityData = {
            userId,
            tipo,
            descripcion,
            entidadId,
            detalles: detalles || {},
        };
        await storage.createUserActivity(activityData);
    }
    catch (error) {
        console.error("Error al registrar actividad de usuario:", error);
    }
}
export function setupAuth(app) {
    const PostgresSessionStore = connectPg(session);
    const sessionSettings = {
        secret: process.env.SESSION_SECRET || "presupuestos_secret_key_change_this_in_production",
        resave: false,
        saveUninitialized: false,
        cookie: {
            secure: process.env.NODE_ENV === "production",
            maxAge: 1000 * 60 * 60 * 24,
        },
        store: new PostgresSessionStore({
            pool,
            tableName: 'session',
            createTableIfMissing: true
        }),
    };
    app.set("trust proxy", 1);
    app.use(session(sessionSettings));
    app.use(passport.initialize());
    app.use(passport.session());
    passport.use(new LocalStrategy(async (username, password, done) => {
        try {
            const user = await storage.getUserByUsername(username);
            if (!user || !(await comparePasswords(password, user.password))) {
                return done(null, false);
            }
            else {
                try {
                    await storage.updateUser(user.id, {
                        ultimoAcceso: new Date()
                    });
                    await logUserActivity(user.id, "login", `Usuario ${username} ha iniciado sesión`);
                    return done(null, user);
                }
                catch (updateErr) {
                    console.error("Error al actualizar acceso:", updateErr);
                    return done(null, user);
                }
            }
        }
        catch (err) {
            console.error("Error en autenticación:", err);
            return done(err);
        }
    }));
    passport.serializeUser((user, done) => done(null, user.id));
    passport.deserializeUser(async (id, done) => {
        try {
            const user = await storage.getUser(id);
            if (!user) {
                return done(null, false);
            }
            done(null, user);
        }
        catch (err) {
            console.error("Error al deserializar usuario:", err);
            done(err, null);
        }
    });
    app.post("/api/auth/register", async (req, res, next) => {
        try {
            const userCount = await storage.getUserCount();
            const rol = userCount === 0 ? "admin" : "usuario";
            const { username, password, email, nombre, apellido } = req.body;
            const existingUser = await storage.getUserByUsername(username);
            if (existingUser) {
                return res.status(400).json({ message: "El nombre de usuario ya existe" });
            }
            const userData = {
                username,
                password: await hashPassword(password),
                email,
                nombre,
                apellido,
                rol
            };
            const user = await storage.createUser(userData);
            if (req.user) {
                const currentUser = req.user;
                await logUserActivity(currentUser.id, "user_create", `Usuario ${currentUser.username} creó un nuevo usuario: ${username}`, String(user.id));
            }
            req.login(user, (err) => {
                if (err)
                    return next(err);
                const { password, ...userWithoutPassword } = user;
                res.status(201).json(userWithoutPassword);
            });
        }
        catch (err) {
            console.error("Error al registrar usuario:", err);
            res.status(500).json({ message: "Error al registrar usuario" });
        }
    });
    app.post("/api/auth/login", (req, res, next) => {
        passport.authenticate("local", (err, user, info) => {
            if (err)
                return next(err);
            if (!user) {
                return res.status(401).json({ message: "Credenciales incorrectas" });
            }
            req.login(user, (err) => {
                if (err)
                    return next(err);
                const { password, ...userWithoutPassword } = user;
                res.status(200).json(userWithoutPassword);
            });
        })(req, res, next);
    });
    app.post("/api/auth/logout", (req, res, next) => {
        const userId = req.user?.id;
        const username = req.user?.username;
        req.logout((err) => {
            if (err)
                return next(err);
            if (userId) {
                logUserActivity(userId, "logout", `Usuario ${username} ha cerrado sesión`);
            }
            res.sendStatus(200);
        });
    });
    app.get("/api/auth/user", (req, res) => {
        if (!req.isAuthenticated()) {
            return res.status(401).json({ message: "No autenticado" });
        }
        const user = req.user;
        const { password, ...userWithoutPassword } = user;
        res.json(userWithoutPassword);
    });
    app.get("/api/auth/check", (req, res) => {
        res.json({ authenticated: req.isAuthenticated() });
    });
    app.get("/api/admin/users", isAdmin, async (req, res) => {
        try {
            const users = await storage.getAllUsers();
            const usersWithoutPasswords = users.map(user => {
                const { password, ...userWithoutPassword } = user;
                return userWithoutPassword;
            });
            res.json(usersWithoutPasswords);
        }
        catch (err) {
            console.error("Error al obtener usuarios:", err);
            res.status(500).json({ message: "Error al obtener usuarios" });
        }
    });
    app.patch("/api/users/:id", isAuthenticated, async (req, res) => {
        try {
            const userId = parseInt(req.params.id);
            const user = req.user;
            if (userId !== user.id && user.rol !== "admin") {
                return res.status(403).json({ message: "No autorizado para editar este usuario" });
            }
            const userData = { ...req.body };
            if (userData.rol && user.rol !== "admin") {
                delete userData.rol;
            }
            if (userData.password) {
                userData.password = await hashPassword(userData.password);
            }
            const updatedUser = await storage.updateUser(userId, userData);
            await logUserActivity(user.id, "user_update", `Usuario ${user.username} actualizó los datos de usuario: ${updatedUser.username}`, String(userId));
            const { password, ...userWithoutPassword } = updatedUser;
            res.json(userWithoutPassword);
        }
        catch (err) {
            console.error("Error al actualizar usuario:", err);
            res.status(500).json({ message: "Error al actualizar usuario" });
        }
    });
    app.delete("/api/users/:id", isAdmin, async (req, res) => {
        try {
            const userId = parseInt(req.params.id);
            const adminUser = req.user;
            if (userId === adminUser.id) {
                return res.status(400).json({ message: "No puede eliminar su propia cuenta" });
            }
            const user = await storage.getUser(userId);
            if (!user) {
                return res.status(404).json({ message: "Usuario no encontrado" });
            }
            await storage.updateUser(userId, { activo: false });
            await logUserActivity(adminUser.id, "user_delete", `Usuario ${adminUser.username} desactivó la cuenta de usuario: ${user.username}`, String(userId));
            res.json({ message: "Usuario desactivado correctamente" });
        }
        catch (err) {
            console.error("Error al eliminar usuario:", err);
            res.status(500).json({ message: "Error al eliminar usuario" });
        }
    });
    app.get("/api/user-activities", isAdmin, async (req, res) => {
        try {
            const limit = parseInt(req.query.limit) || 50;
            const offset = parseInt(req.query.offset) || 0;
            const activities = await storage.getUserActivities(limit, offset);
            res.json(activities);
        }
        catch (err) {
            console.error("Error al obtener actividades:", err);
            res.status(500).json({ message: "Error al obtener actividades" });
        }
    });
    app.get("/api/users/:id/activities", isAuthenticated, async (req, res) => {
        try {
            const userId = parseInt(req.params.id);
            const currentUser = req.user;
            if (userId !== currentUser.id && currentUser.rol !== "admin") {
                return res.status(403).json({ message: "No autorizado para ver actividades de este usuario" });
            }
            const limit = parseInt(req.query.limit) || 50;
            const offset = parseInt(req.query.offset) || 0;
            const activities = await storage.getUserActivitiesByUserId(userId, limit, offset);
            res.json(activities);
        }
        catch (err) {
            console.error("Error al obtener actividades del usuario:", err);
            res.status(500).json({ message: "Error al obtener actividades del usuario" });
        }
    });
    app.get("/api/admin/stats", isAdmin, async (req, res) => {
        try {
            const stats = await storage.getUserStats();
            res.json(stats);
        }
        catch (err) {
            console.error("Error al obtener estadísticas de usuarios:", err);
            res.status(500).json({ message: "Error al obtener estadísticas de usuarios" });
        }
    });
}
//# sourceMappingURL=auth.js.map