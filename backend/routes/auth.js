const express = require("express");
const bcrypt = require("bcryptjs");
const rateLimit = require("express-rate-limit");
const db = require("../initialize_db");

const {
  LoginBody,
  WhitelistDeleteBody,
  CreateClientBody,
} = require("../validation/schemas.js");

const router = express.Router();

// ---- rate limit just auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
router.use(authLimiter);

// ---- helpers
const requireAuth = (req, res, next) => {
  if (req.session?.user) return next();
  return res.status(401).json({ error: "Unauthenticated" });
};

const requireAdmin = (req, res, next) => {
  if (req.session?.user?.is_admin) return next();
  return res.status(403).json({ error: "Forbidden" });
};

// ---- session status
// POST /api/auth/session
router.post("/session", (req, res) => {
  if (!req.session?.user) {
    return res.status(401).json({ error: "Unauthenticated" });
  }
  return res.json({ user: req.session.user });
});



// ---- login
router.post("/login", async (req, res) => {
  // Zod validation
  const parse = LoginBody.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: "Invalid email or password format" });
  }
  const { email, password } = parse.data;

  try {
    const user = await new Promise((resolve, reject) => {
      db.get(
        `SELECT id, email, password, org_id, must_change_password, is_admin
           FROM users
          WHERE email = ?`,
        [email],
        (err, row) => (err ? reject(err) : resolve(row))
      );
    });

    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const ok = await bcrypt.compare(password, user.password || "");
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });

    // Session fixation protection
    req.session.regenerate((regenErr) => {
      if (regenErr) return res.status(500).json({ error: "Session error" });

      req.session.user = {
        id: user.id,
        email: user.email,
        org_id: user.org_id,
        is_admin: !!user.is_admin,
        must_change_password: !!user.must_change_password,
      };

      req.session.save((saveErr) => {
        if (saveErr) return res.status(500).json({ error: "Session save error" });
        return res.json({ user: req.session.user });
      });
    });
  } catch (err) {
    console.error("[auth/login] error:", err);
    return res.status(500).json({ error: "Login failed" });
  }
});


const strongEnough = (pwd) => {
  const checks = [
    /[a-z]/.test(pwd),
    /[A-Z]/.test(pwd),
    /\d/.test(pwd),
    /[^A-Za-z0-9]/.test(pwd),
  ].filter(Boolean).length;
  return pwd.length >= 8 && checks >= 3;
};

router.post("/change-password", requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};

  if (!newPassword || !strongEnough(newPassword)) {
    return res.status(400).json({
      error: "Weak password: min 8 chars and include at least 3 of (upper, lower, digit, special).",
    });
  }

  try {
    const me = req.session.user.id;

    const row = await new Promise((resolve, reject) => {
      db.get(
        "SELECT id, password, must_change_password FROM users WHERE id = ?",
        [me],
        (err, r) => (err ? reject(err) : resolve(r))
      );
    });

    if (!row) return res.status(404).json({ error: "User not found" });

    // If user is NOT flagged to change password, they must provide current password
    if (!row.must_change_password) {
      if (!currentPassword) {
        return res.status(400).json({ error: "Current password is required." });
      }
      const ok = await bcrypt.compare(currentPassword, row.password || "");
      if (!ok) return res.status(401).json({ error: "Current password incorrect" });
    }

    const hash = await bcrypt.hash(newPassword, 10);

    await new Promise((resolve, reject) => {
      db.run(
        "UPDATE users SET password = ?, must_change_password = 0 WHERE id = ?",
        [hash, me],
        function (err) { return err ? reject(err) : resolve(); }
      );
    });

    req.session.user.must_change_password = 0;
    return res.json({ ok: true });
  } catch (err) {
    console.error("[auth/change-password] error:", err);
    return res.status(500).json({ error: "Failed to change password" });
  }
});


router.post("/must-change-password", requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};

  if (!newPassword || !strongEnough(newPassword)) {
    return res.status(400).json({
      error: "Weak password: min 8 chars and include at least 3 of (upper, lower, digit, special).",
    });
  }

  try {
    const me = req.session.user.id;

    const row = await new Promise((resolve, reject) => {
      db.get(
        "SELECT id, password, must_change_password FROM users WHERE id = ?",
        [me],
        (err, r) => (err ? reject(err) : resolve(r))
      );
    });

    if (!row) return res.status(404).json({ error: "User not found" });

    // If flag is NOT set, require current password (same behavior as change-password)
    if (!row.must_change_password) {
      if (!currentPassword) {
        return res.status(400).json({ error: "Current password is required." });
      }
      const ok = await bcrypt.compare(currentPassword, row.password || "");
      if (!ok) return res.status(401).json({ error: "Current password incorrect" });
    }

    const hash = await bcrypt.hash(newPassword, 10);

    await new Promise((resolve, reject) => {
      db.run(
        "UPDATE users SET password = ?, must_change_password = 0 WHERE id = ?",
        [hash, me],
        function (err) { return err ? reject(err) : resolve(); }
      );
    });

    req.session.user.must_change_password = 0;
    return res.json({ ok: true });
  } catch (err) {
    console.error("[auth/must-change-password] error:", err);
    return res.status(500).json({ error: "Failed to change password" });
  }
});


router.post("/logout", requireAuth, (req, res) => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});

// /api/auth/whitelist/add
router.post(
  "/whitelist/add",
  requireAuth,
  requireAdmin,
  async (req, res) => {
    // Use the new CreateClientBody schema (email + org_id)
    const parse = CreateClientBody.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: "Invalid email/org_id" });
    }

    const { email, org_id } = parse.data;

    try {
      const exists = await new Promise((resolve, reject) => {
        db.get(
          "SELECT id FROM users WHERE email = ?",
          [email],
          (err, r) => (err ? reject(err) : resolve(r))
        );
      });
      if (exists) {
        return res.status(409).json({ error: "User already exists" });
      }

      // Generate a temporary strong-ish password you can show once to admin
      const initial = Math.random().toString(36).slice(-10) + "!";
      const hash = await bcrypt.hash(initial, 10);

      await new Promise((resolve, reject) => {
        db.run(
          `INSERT INTO users (email, password, is_admin, must_change_password, org_id)
           VALUES (?, ?, 0, 1, ?)`,
          [email, hash, org_id],
          function (err) { return err ? reject(err) : resolve(); }
        );
      });

      return res.json({ ok: true, tempPassword: initial });
    } catch (err) {
      console.error("[auth/whitelist/add] error:", err);
      return res.status(500).json({ error: "Failed to create client user" });
    }
  }
);

router.post(
  "/whitelist/delete",
  requireAuth,
  requireAdmin,
  async (req, res) => {
    const parse = WhitelistDeleteBody.safeParse(req.body);
    if (!parse.success) {
      return res
        .status(400)
        .json({ error: "Invalid email" });
    }
    const { email } = parse.data;

    try {
      await new Promise((resolve, reject) => {
        db.run(
          "DELETE FROM users WHERE email = ?",
          [email],
          function (err) {
            return err ? reject(err) : resolve();
          }
        );
      });
      res.json({ ok: true });
    } catch (err) {
      console.error("[auth/whitelist/delete] error:", err);
      res
        .status(500)
        .json({ error: "Failed to remove from whitelist" });
    }
  }
);

module.exports = router;
