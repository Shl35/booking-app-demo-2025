const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

// ตั้งค่า Pool สำหรับ PostgreSQL (ดึงจาก DATABASE_URL ของ Render)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // จำเป็นสำหรับ Render ถ้าไม่ใช้ SSL Certificate
  }
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

const createTables = async () => {
  try {
    // 1. ตาราง users
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id       SERIAL    PRIMARY KEY,
        username TEXT      UNIQUE NOT NULL,
        password TEXT      NOT NULL,
        role     TEXT      NOT NULL DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 2. ตาราง bookings
    await pool.query(`
      CREATE TABLE IF NOT EXISTS bookings (
        id         SERIAL    PRIMARY KEY,
        fullname   TEXT      NOT NULL,
        email      TEXT      NOT NULL,
        phone      TEXT      NOT NULL,
        checkin    DATE      NOT NULL,
        checkout   DATE      NOT NULL,
        roomtype   TEXT      NOT NULL,
        guests     INTEGER   NOT NULL,
        status     TEXT      DEFAULT 'pending',
        comment    TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 3. สร้าง admin account เริ่มต้น
    const adminPassword = bcrypt.hashSync('admin123', 10);
    await pool.query(
      `INSERT INTO users (username, password, role) 
       VALUES ($1, $2, $3) 
       ON CONFLICT (username) DO NOTHING`,
      ['admin', adminPassword, 'admin']
    );
    
    console.log('PostgreSQL Tables & Admin created/verified');
  } catch (err) {
    console.error('Error creating PostgreSQL tables:', err);
  }
};

// รันการสร้างตารางทันทีที่เริ่ม
createTables();

// ส่งออก module ที่มีหน้าตาเหมือน sqlite3 เดิม (Compatibility Layer) เพื่อให้ไม่ต้องแก้ server.js เยอะ
module.exports = {
  query: (text, params) => pool.query(text, params),
  
  // จำลองเมธอด get (คืนค่าแถวเดียว)
  get: (text, params, callback) => {
    pool.query(text, params)
      .then(res => callback(null, res.rows[0]))
      .catch(err => callback(err));
  },
  
  // จำลองเมธอด all (คืนค่าทุกแถว)
  all: (text, params, callback) => {
    pool.query(text, params)
      .then(res => callback(null, res.rows))
      .catch(err => callback(err));
  },
  
  // จำลองเมธอด run (ทำงานและคืนค่า lastID/changes)
  run: function(text, params, callback) {
    // แปลง ? เป็น $1, $2, ... สำหรับ pg
    let i = 1;
    const pgText = text.replace(/\?/g, () => `$${i++}`);
    
    pool.query(pgText, params)
      .then(res => {
        // จำลอง context ของ sqlite3.run
        if (callback) callback.call({ lastID: res.oid, changes: res.rowCount }, null);
      })
      .catch(err => {
        if (callback) callback(err);
      });
  }
};