const express    = require('express');
const cors       = require('cors');
const jwt        = require('jsonwebtoken');
const bcrypt     = require('bcryptjs');
const helmet     = require('helmet');
const rateLimit  = require('express-rate-limit');
const db         = require('./database');

const app        = express();
const PORT       = 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// ── 1. Security Headers (Helmet) ─────────────────
app.use(helmet());

// ── 2. CORS Configuration ─────────────────────
app.use(cors());

// ── 3. Rate Limiting ──────────────────────────
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please try again later.' }
});
app.use('/api/', generalLimiter);

app.use(express.json());

// Middleware: ตรวจสอบ JWT Token ก่อนเข้าถึง protected routes
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // "Bearer TOKEN"

  if (!token) {
    return res.status(401).json({ error: 'กรุณาเข้าสู่ระบบก่อน' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Token ไม่ถูกต้องหรือหมดอายุ' });
    }
    req.user = user;
    next();
  });
};

// ── API Endpoints ──

// POST /api/login — ตรวจสอบ username/password และออก JWT
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'กรุณากรอก username และ password' });
  }

  db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
    if (err)   return res.status(500).json({ error: err.message });
    if (!user) return res.status(401).json({ error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.json({
      token,
      user: { id: user.id, username: user.username, role: user.role }
    });
  });
});

// GET /api/rooms — ดูรายการห้องทั้งหมด
app.get('/api/rooms', (req, res) => {
  const rooms = [
    { id: 1, name: "Standard Room", type: "standard", capacity: 2, price: 1200 },
    { id: 2, name: "Deluxe Room", type: "deluxe", capacity: 4, price: 2500 },
    { id: 3, name: "Suite Room", type: "suite", capacity: 6, price: 5000 }
  ];
  res.json(rooms);
});

// POST /api/bookings — สร้างการจองใหม่ (ไม่ต้อง login)
app.post('/api/bookings', (req, res) => {
  const { fullname, email, phone, checkin, checkout, roomtype, guests } = req.body;
  const sql = `INSERT INTO bookings (fullname, email, phone, checkin, checkout, roomtype, guests)
               VALUES (?, ?, ?, ?, ?, ?, ?)`;

  db.run(sql, [fullname, email, phone, checkin, checkout, roomtype, guests], function(err) {
    if (err) return res.status(400).json({ error: err.message });
    db.get('SELECT * FROM bookings WHERE id = ?', [this.lastID], (err, row) => {
      if (err) return res.status(400).json({ error: err.message });
      res.status(201).json(row);
    });
  });
});

// GET /api/bookings — ดึงข้อมูลทั้งหมด (ต้อง login)
app.get('/api/bookings', authenticateToken, (req, res) => {
  db.all('SELECT * FROM bookings ORDER BY created_at DESC', [], (err, rows) => {
    if (err) return res.status(400).json({ error: err.message });
    res.json(rows);
  });
});

// GET /api/reports — ดูรายงาน (ต้อง login)
app.get('/api/reports', authenticateToken, (req, res) => {
  const sql = `
    SELECT 
      roomtype,
      COUNT(*) as total_bookings,
      SUM(guests) as total_guests
    FROM bookings
    GROUP BY roomtype
  `;
  db.all(sql, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({
      reportGeneratedAt: new Date().toISOString(),
      data: rows
    });
  });
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));