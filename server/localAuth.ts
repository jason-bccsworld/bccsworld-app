import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import bcrypt from "bcryptjs";
import session from "express-session";
import connectPg from "connect-pg-simple";
import type { Express, RequestHandler } from "express";
import { db } from "./db";
import { users } from "@shared/schema";
import { eq, sql } from "drizzle-orm";
import { storage } from "./storage";

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000;
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: true,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: sessionTtl,
    },
  });
}

async function seedAdminUser() {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminEmail || !adminPassword) return;

  const [existing] = await db.select().from(users).where(eq(users.email, adminEmail));
  if (existing) return;

  const hash = await bcrypt.hash(adminPassword, 12);
  await db.insert(users).values({
    email: adminEmail,
    firstName: "Admin",
    lastName: "User",
    passwordHash: hash,
    role: "admin",
  });
  console.log(`Admin user seeded: ${adminEmail}`);
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy({ usernameField: "email" }, async (email, password, done) => {
      try {
        const [user] = await db.select().from(users).where(eq(users.email, email));
        if (!user || !user.passwordHash) {
          return done(null, false, { message: "Invalid email or password" });
        }
        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) {
          return done(null, false, { message: "Invalid email or password" });
        }
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    })
  );

  passport.serializeUser((user: any, cb) => cb(null, user.id));
  passport.deserializeUser(async (id: string, cb) => {
    try {
      const user = await storage.getUser(id);
      cb(null, user ?? null);
    } catch (err) {
      cb(err);
    }
  });

  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) return next(err);
      if (!user) {
        return res.status(401).json({ message: info?.message ?? "Invalid credentials" });
      }
      // Check if user is active
      if (user.isActive === false) {
        return res.status(403).json({ message: "Your account has been deactivated. Contact your administrator." });
      }
      req.logIn(user, async (loginErr) => {
        if (loginErr) return next(loginErr);
        // Stamp last login timestamp (fire-and-forget)
        db.execute(sql`UPDATE users SET last_login_at = NOW() WHERE id = ${user.id}`).catch(() => {});
        const { passwordHash: _, ...safeUser } = user;
        res.json({ success: true, user: safeUser });
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res) => {
    req.logout(() => {
      res.json({ success: true });
    });
  });

  app.get("/api/logout", (req, res) => {
    req.logout(() => {
      res.redirect("/");
    });
  });

  try {
    await seedAdminUser();
  } catch (err: any) {
    console.error("[localAuth] seedAdminUser failed (non-fatal):", err?.message ?? err);
  }
}

export const isAuthenticated: RequestHandler = (req, res, next) => {
  if (req.isAuthenticated()) return next();
  res.status(401).json({ message: "Unauthorized" });
};
