const authModel = require('../models/authModel');
const bcrypt = require('bcryptjs');

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.validated.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    authModel.findUserByEmail(email, async (err, user) => {
      try {
        if (err) {
          console.error("Database error during login:", err.message);
          return res.status(500).json({ error: 'Internal server error' });
        }

        if (!user) {
          return res.status(404).json({ error: 'User not found' });
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
          return res.status(401).json({ error: 'Invalid credentials' });
        }

        // 🔐 Session fixation protection: issue a fresh session ID on successful auth
        req.session.regenerate((regenErr) => {
          if (regenErr) {
            console.error('Session regeneration error:', regenErr);
            return res.status(500).json({ error: 'Internal session error' });
          }

          // RBAC session payload
          req.session.user = {
            id: user.id,
            email: user.email,
            org_id: user.org_id,       // <-- add
            is_admin: !!user.is_admin, // <-- add
          };


          // ensure it’s written before replying
          req.session.save((saveErr) => {
            if (saveErr) {
              console.error('Session save error:', saveErr);
              return res.status(500).json({ error: 'Internal session error' });
            }
            return res.status(200).json({ message: 'Login successful' });
          });
        });
      } catch (error) {
        console.error("Error processing login:", error.message);
        return res.status(500).json({ error: 'An unexpected error occurred' });
      }
    });
  } catch (error) {
    console.error("Outer error in loginUser:", error.message);
    res.status(500).json({ error: 'An internal server error occurred' });
  }
};

module.exports = { loginUser };
