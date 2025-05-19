const express = require('express');
const bcrypt = require('bcrypt');
const db = require('../database');

const router = express.Router();

// Register a new user
router.post('/register', async (req, res) => {
    const { email, password } = req.body;

    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        const query = `INSERT INTO users (email, password) VALUES (?, ?)`;

        db.run(query, [email, hashedPassword], function (err) {
            if (err) {
                if (err.message.includes('UNIQUE constraint failed')) {
                    return res.status(400).send('User already exists');
                }
                console.error('Registration error:', err.message);
                return res.status(500).send('Error registering user');
            }

            res.status(201).send('User registered successfully');
        });
    } catch (error) {
        console.error('Bcrypt error:', error.message);
        res.status(500).send('Error registering user');
    }
});

// User login
router.post('/login', (req, res) => {
    const { email, password } = req.body;

    const query = `SELECT * FROM users WHERE email = ?`;

    db.get(query, [email], async (err, user) => {
        if (err) {
            console.error('Login error:', err.message);
            return res.status(500).send('Login failed');
        }

        if (!user) {
            return res.status(404).send('User not found');
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (isMatch) {
            res.status(200).send('Login successful');
        } else {
            res.status(401).send('Invalid credentials');
        }
    });
});

module.exports = router;
