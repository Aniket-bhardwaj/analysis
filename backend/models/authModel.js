const db = require('../database');

function findUserByEmail(email, callback) {
    const query = `SELECT * FROM users WHERE email = ?`;
    db.get(query, [email], callback);
}

module.exports = {
    findUserByEmail
};