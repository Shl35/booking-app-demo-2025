const bcrypt = require('bcryptjs');
const path = require('path');

// 🔍 Check environment: Railway/Cloud usually has DATABASE_URL
const isProduction = !!process.env.DATABASE_URL;

let db;

if (isProduction) {
    // ☁️ CLOUD MODE: Use PostgreSQL with PROPER parameter handling
    const { Pool } = require('pg');
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });
    
    console.log('Production Mode: Using Cloud PostgreSQL Database');
    
    // Explicitly handle SQL translation from '?' (SQLite) to '$1' (Postgres)
    const pgWrapper = {
        get: (sql, params, cb) => {
            let i = 1;
            const pgSql = sql.replace(/\?/g, () => `$${i++}`); // Simple binding
            pool.query(pgSql, params)
                .then(r => cb(null, r.rows[0]))
                .catch(cb);
        },
        all: (sql, params, cb) => {
            let i = 1;
            const pgSql = sql.replace(/\?/g, () => `$${i++}`);
            pool.query(pgSql, params)
                .then(r => cb(null, r.rows))
                .catch(cb);
        },
        run: function(sql, params, cb) {
            let i = 1;
            // For Insert/Update, we force strings to be passed correctly to avoid "could not determine data type"
            const pgSql = sql.replace(/\?/g, () => `$${i++}`);
            
            pool.query(pgSql, params)
                .then(r => {
                    const resultContext = { 
                        lastID: Date.now(), // PG doesn't return lastID easily like SQLite
                        changes: r.rowCount 
                    };
                    if (cb) cb.call(resultContext, null);
                })
                .catch(err => {
                    console.error('PG Run Error:', err.message);
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