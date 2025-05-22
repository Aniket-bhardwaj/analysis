const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
// Register a new user
// router.post('/login', async (req, res) => {
//     const { email, password } = req.body;

//     try {
//         const hashedPassword = await bcrypt.hash(password, 10);

//         const query = `INSERT INTO users (email, password) VALUES (?, ?)`;

//         db.run(query, [email, hashedPassword], function (err) {
//             if (err) {
//                 if (err.message.includes('UNIQUE constraint failed')) {
//                     return res.status(400).send('User already exists');
//                 }
//                 console.error('Registration error:', err.message);
//                 return res.status(500).send('Error registering user');
//             }

//             res.status(201).send('User registered successfully');
//         });
//     } catch (error) {
//         console.error('Bcrypt error:', error.message);
//         res.status(500).send('Error registering user');
//     }
// });

// User login
router.post('/login', authController.loginUser);

module.exports = router;
