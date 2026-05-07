const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

// Use SQLite for local testing if no DATABASE_URL is provided
const isLocal = !process.env.DATABASE_URL;

let db;

if (isLocal) {
    db = new sqlite3.Database(path.join(__dirname, 'local_test.db'));
    console.log('Using Local SQLite Database');
} else {
    const { Pool } = require('pg');
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });
    console.log('Using Cloud PostgreSQL Database');
    
    // Simple wrapper to make PG look like SQLite for the rest of the app
    db = {
        get: (sql, params, cb) => pool.query(sql.replace(/\?/g, (m, i) => `$${i+1}`), params).then(r => cb(null, r.rows[0])).catch(cb),
        all: (sql, params, cb) => pool.query(sql.replace(/\?/g, (m, i) => `$${i+1}`), params).then(r => cb(null, r.rows)).catch(cb),
        run: function(sql, params, cb) {
            pool.query(sql.replace(/\?/g, (m, i) => `$${i+1}`), params)
                .then(r => cb.call({ lastID: Date.now() }, null))
                .catch(cb);
        }
    };
}

const initDb = () => {
    if (isLocal) {
        db.serialize(() => {
            db.run(`CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE,
                password TEXT,
                role TEXT DEFAULT 'user'
            )`);
            db.run(`CREATE TABLE IF NOT EXISTS bookings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                fullname TEXT,
                email TEXT,
                phone TEXT,
                checkin TEXT,
                checkout TEXT,
                roomtype TEXT,
                guests INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`);
            const adminPass = bcrypt.hashSync('admin123', 10);
            db.run(`INSERT OR IGNORE INTO users (username, password, role) VALUES (?, ?, ?)`, ['admin', adminPass, 'admin']);
        });
    }
};

initDb();

module.exports = db;