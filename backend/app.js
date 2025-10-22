require("dotenv").config({
  path: require("path").join(__dirname, ".env"),
});
console.log(
  "[boot] FRONTEND_URL =",
  process.env.FRONTEND_URL
);

const express = require("express");
const multer = require("multer");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const session = require("express-session");
const SQLiteStore = require("connect-sqlite3")(session);
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const securityRoutes = require("./routes/security");
const { conditionalCsrf } = require("./middleware/csrf");
const app = express();
const PORT = process.env.PORT || 8080;
const isProd = process.env.NODE_ENV === "production";
const adminRoutes = require("./routes/admin");
app.disable("x-powered-by");

// Minimal, safe-by-default Permissions Policy
app.use((req, res, next) => {
  res.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=()"
  );
  next();
});

console.log(
  `[boot] starting backend on port ${PORT} (NODE_ENV=${
    process.env.NODE_ENV || "dev"
  })`
);

const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

app.set("trust proxy", 1);

app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        "default-src": ["'self'"],
        "img-src": ["'self'", "data:"],
        "style-src": ["'self'", "'unsafe-inline'"],
        "script-src": ["'self'"],
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);

app.use(
  cors({
    origin: isProd
      ? process.env.FRONTEND_URL
      : process.env.FRONTEND_URL || "http://localhost:4028",
    credentials: true,
  })
);

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api", apiLimiter);
app.use("/api/auth", apiLimiter);

if (!process.env.SESSION_SECRET) {
  console.warn(
    "[warn] SESSION_SECRET is empty; set it in .env for production!"
  );
}
app.use(
  session({
    name: "sid",
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: new SQLiteStore({
      db: "sessions.sqlite",
      dir: "./",
    }),
    rolling: true, // <— refresh cookie on any request
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: isProd, // only true behind HTTPS/proxy in prod
      maxAge: 1000 * 60 * 60 * 4, // 4h
    },
  })
);

app.use("/api", securityRoutes);
app.use("/api", conditionalCsrf());
const isAuthenticated = (req, res, next) => {
  const u = req.session && req.session.user;
  if (u && u.id != null && u.org_id != null && typeof u.is_admin !== 'undefined') {
    return next();
  }
  return res.status(401).json({ error: "Unauthorized: Please log in." });
};
const attachRBAC = (req, _res, next) => {
  const u = req.session.user;
  req.rbac = { isAdmin: !!u.is_admin, orgId: u.org_id, userId: u.id, email: u.email };
  next();
};

// -------- routes --------
const uploadRoutes = require("./routes/upload");
const listRoutes = require("./routes/list");
const previewRoutes = require("./routes/preview");
const hideRoutes = require("./routes/hide");
const authRoutes = require("./routes/auth");
const graphRoutes = require("./routes/graph");
const tableRoutes = require("./routes/tables");
const downloadRoutes = require("./routes/download");
const qcCheckRoutes = require("./routes/qcCheck");
const dashboardRoutes = require("./routes/dashboard");
const sampleRoutes = require("./routes/sample");
const elementRoutes = require("./routes/element");


// Healthcheck
app.get("/healthz", (_req, res) =>
  res.json({ status: "ok" })
);

// Public auth routes
app.use("/api/auth", authRoutes);

// Protected API routes
app.use("/api", isAuthenticated, attachRBAC, uploadRoutes);
app.use("/api", isAuthenticated, attachRBAC, listRoutes);
app.use("/api", isAuthenticated, attachRBAC, previewRoutes);
app.use("/api", isAuthenticated, attachRBAC, hideRoutes);
app.use("/api", isAuthenticated, attachRBAC, graphRoutes);
app.use("/api", isAuthenticated, attachRBAC, tableRoutes);
app.use("/api", isAuthenticated, attachRBAC, downloadRoutes);
app.use("/api", isAuthenticated, attachRBAC, qcCheckRoutes);
app.use("/api", isAuthenticated, attachRBAC, dashboardRoutes);
app.use("/api", isAuthenticated, attachRBAC, sampleRoutes);
app.use("/api", isAuthenticated, attachRBAC, elementRoutes);
app.use("/api/admin", isAuthenticated, attachRBAC, adminRoutes);

app.use((err, req, res, next) => {
  if (
    err instanceof multer.MulterError &&
    err.code === "LIMIT_FILE_SIZE"
  ) {
    return res
      .status(413)
      .json({ error: "File too large (max 100MB)." });
  }
  next(err);
});
// 404 handler (last)
app.use((req, res) => {
  console.warn("[404]", req.method, req.originalUrl);
  res.status(404).json({ error: "Route not found" });
});

// -------- start --------
app.listen(PORT, "0.0.0.0", () => {
  console.log(
    `[boot] server listening on http://localhost:${PORT}`
  );
});
