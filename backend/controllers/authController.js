const authModel = require('../models/authModel');
const bcrypt = require('bcryptjs');

const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

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

                if (isMatch) {
                    req.session.user = { id: user.id, email: user.email }; // Store user in session
                    return res.status(200).json({ message: 'Login successful' });
                } else {
                    return res.status(401).json({ error: 'Invalid credentials' });
                }
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

module.exports = {
    loginUser
};