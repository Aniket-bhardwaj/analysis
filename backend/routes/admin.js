// routes/admin.js
const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../initialize_db');

const router = express.Router();

// RBAC guard (compatible with attachRBAC in app.js)
function requireAdmin(req, res, next) {
  if (!req?.rbac?.isAdmin) {
    return res.status(403).json({ error: 'Admin privileges required' });
  }
  next();
}

// Helper: generate secure random password (used only as fallback)
function generateTempPassword(length = 10) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789@$!';
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

/* ============================================================
   ORGANIZATION MANAGEMENT
   ============================================================ */

// List all organizations
router.get('/orgs', requireAdmin, (req, res) => {
  db.all(`SELECT id, name, active, created_at FROM organizations ORDER BY id ASC`, [], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Failed to fetch organizations' });
    res.json({ success: true, data: rows });
  });
});

// Create new organization
router.post('/orgs/create', requireAdmin, (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Organization name required' });

  db.run(
    `INSERT INTO organizations (name, active, created_at) VALUES (?, 1, CURRENT_TIMESTAMP)`,
    [name],
    function (err) {
      if (err) {
        console.error('Error creating organization:', err.message);
        return res.status(500).json({ error: 'Failed to create organization' });
      }
      console.log(`[admin] Created new organization '${name}' (id=${this.lastID})`);
      res.json({ success: true, orgId: this.lastID });
    }
  );
});

// Toggle org activation status
router.patch('/orgs/toggle/:id', requireAdmin, (req, res) => {
  const { id } = req.params;
  db.run(
    `UPDATE organizations SET active = CASE active WHEN 1 THEN 0 ELSE 1 END WHERE id = ?`,
    [id],
    function (err) {
      if (err) return res.status(500).json({ error: 'Failed to toggle organization' });
      res.json({ success: true, changed: this.changes });
    }
  );
});

/* ============================================================
   USER MANAGEMENT
   ============================================================ */

// List users under an organization
router.get('/users/:orgId', requireAdmin, (req, res) => {
  const { orgId } = req.params;
  db.all(
    `SELECT id, email, is_admin, must_change_password, org_id, created_at 
     FROM users WHERE org_id = ? ORDER BY id ASC`,
    [orgId],
    (err, rows) => {
      if (err) return res.status(500).json({ error: 'Failed to fetch users' });
      res.json({ success: true, data: rows });
    }
  );
});

// Create new user under organization
router.post('/users/create', requireAdmin, async (req, res) => {
  const { email, orgId, isAdmin = 0 } = req.body;
  if (!email || !orgId) return res.status(400).json({ error: 'Email and orgId are required' });

  try {
    // Custom temp password: capitalize prefix before '@'
    const prefix = email.split('@')[0];
    const tempPassword = prefix.charAt(0).toUpperCase() + prefix.slice(1);

    const hashed = await bcrypt.hash(tempPassword, 10);

    db.run(
      `INSERT INTO users (email, password, is_admin, must_change_password, org_id)
       VALUES (?, ?, ?, 1, ?)`,
      [email, hashed, isAdmin ? 1 : 0, orgId],
      function (err) {
        if (err) {
          console.error('Error creating user:', err.message);
          return res.status(500).json({ error: 'Failed to create user' });
        }
        console.log(`[admin] Created user '${email}' (org=${orgId}) tempPass=${tempPassword}`);
        res.json({ success: true, userId: this.lastID, tempPassword });
      }
    );
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Password hashing failed' });
  }
});

// Delete organization
router.delete('/orgs/:id', requireAdmin, (req, res) => {
  const { id } = req.params;
  db.run(`DELETE FROM organizations WHERE id = ?`, [id], function (err) {
    if (err) return res.status(500).json({ error: 'Failed to delete organization' });
    res.json({ success: true, deleted: this.changes });
  });
});

// Delete user
router.delete('/users/:id', requireAdmin, (req, res) => {
  const { id } = req.params;
  db.run(`DELETE FROM users WHERE id = ?`, [id], function (err) {
    if (err) return res.status(500).json({ error: 'Failed to delete user' });
    res.json({ success: true, deleted: this.changes });
  });
});

// Reset a user's password
router.patch('/users/reset/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  db.get(`SELECT email FROM users WHERE id = ?`, [id], async (err, user) => {
    if (err || !user) {
      console.error('User lookup failed:', err?.message);
      return res.status(404).json({ error: 'User not found' });
    }

    try {
      // Same rule: capitalize prefix before '@'
      const prefix = user.email.split('@')[0];
      const tempPassword = prefix.charAt(0).toUpperCase() + prefix.slice(1);
      const hashed = await bcrypt.hash(tempPassword, 10);

      db.run(
        `UPDATE users SET password = ?, must_change_password = 1 WHERE id = ?`,
        [hashed, id],
        function (err2) {
          if (err2) {
            console.error('Error resetting password:', err2.message);
            return res.status(500).json({ error: 'Failed to reset password' });
          }
          console.log(`[admin] Reset password for '${user.email}' → tempPass=${tempPassword}`);
          res.json({ success: true, tempPassword });
        }
      );
    } catch (e2) {
      console.error('Hashing error:', e2);
      res.status(500).json({ error: 'Password hashing failed' });
    }
  });
});

module.exports = router;

