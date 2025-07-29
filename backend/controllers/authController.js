const authModel = require('../models/authModel');
const bcrypt = require('bcryptjs');
//const jwt = require('jsonwebtoken');

const loginUser = async (req, res) => {
    const { email, password } = req.body;

    authModel.findUserByEmail(email, async(err, user) => {
        if(err){
            console.error("Login unsuccessful", err.message);
            return res.status(500).send({ error: 'Login failed' });
        }

        if(!user){
            return res.status(404).send({ error: 'User not found' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if(isMatch){
            return res.status(200).send({ message: 'Login successful' });
        }

        else{
            return res.status(401).send({ error: 'Invalid credentials' });
        }
    });
};

module.exports = {
    loginUser
};