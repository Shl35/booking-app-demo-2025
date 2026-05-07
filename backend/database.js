const bcrypt = require('bcryptjs');
const path = require('path');

// 🔍 Check environment: Railway/Cloud usually has DATABASE_URL
const isProduction = !!process.env.DATABASE_URL;

let db;

if (isProduction) {
    // ☁️ CLOUD MODE: Use PostgreSQL
    const { Pool } = require('pg');
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });
    
    console.log('Production Mode: Using Cloud PostgreSQL Database');
    
    const pgWrapper = {
        get: (sql, params, cb) => {
            // Use standard parameters without forced casting to allow PG to infer types (Dates, Booleans, etc.)
            const pgSql = sql.replace(/\?/g, (m, i) => `$${i + 1}`);
            pool.query(pgSql, params)
                .then(r => cb(null, r.rows[0]))
                .catch(cb);
        },
        all: (sql, params, cb) => {
            const pgSql = sql.replace(/\?/g, (m, i) => `$${i + 1}`);
            pool.query(pgSql, params)
                .then(r => cb(null, r.rows))
                .catch(cb);
        },
        run: function(sql, params, cb) {
            const pgSql = sql.replace(/\?/g, (m, i) => `$${i + 1}`);
            pool.query(pgSql, params)
                .then(r => {
                    const resultContext = { 
                        lastID: (r.rows && r.rows[0]) ? r.rows[0].id : Date.now(),
                        changes: r.rowCount 
                    };
                    if (cb) cb.call(resultContext, null);
                })
                .catch(err => {
                    if (cb) cb(err);
                });
        }
    };
    db = pgWrapper;

} else {
    // 💻 LOCAL MODE: Use SQLite (Easy for testing on Windows)
    const sqlite3 = require('sqlite3').verbose();
    db = new sqlite3.Database(path.join(__dirname, 'local_test.db'));
    console.log('Local Mode: Using SQLite Database');
    
    db.serialize(() => {
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE,
            password TEXT,
            role TEXT DEFAULT 'user'
        )`);
        db.run(`CREATE TABLE IF NOT EXISTS bookings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            fullname TEXT, email TEXT, phone TEXT,
            checkin TEXT, checkout TEXT, roomtype TEXT,
            guests INTEGER, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);
        
        const adminPass = bcrypt.hashSync('admin123', 10);
        db.run(`INSERT OR IGNORE INTO users (username, password, role) VALUES (?, ?, ?)`, ['admin', adminPass, 'admin']);
    });
}

module.exports = db;