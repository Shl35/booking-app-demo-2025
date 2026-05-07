const express    = require('express');
const cors       = require('cors');
const jwt        = require('jsonwebtoken');
const bcrypt     = require('bcryptjs');
const helmet     = require('helmet');
const rateLimit  = require('express-rate-limit');
const db         = require('./database');

const app        = express();
const PORT       = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// ── 0. Trust Proxy (Needed for Cloud Providers like Railway/Render) ──
app.set('trust proxy', 1);

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

// Middleware: ตรวจสอบ JWT Token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

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

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!user) return res.status(401).json({ error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(401).json({ error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });
    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '1h' });
    res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
  });
});

app.get('/api/rooms', (req, res) => {
  res.json([
    { id: 1, name: "Standard Room", type: "standard", capacity: 2, price: 1200 },
    { id: 2, name: "Deluxe Room", type: "deluxe", capacity: 4, price: 2500 },
    { id: 3, name: "Suite Room", type: "suite", capacity: 6, price: 5000 }
  ]);
});

app.post('/api/bookings', (req, res) => {
  const { fullname, email, phone, checkin, checkout, guests } = req.body;
  // 🔥 FIX: Map roomId (from Frontend) to roomtype (for Database)
  let roomtype = req.body.roomtype;
  if (!roomtype && req.body.roomId) {
      const roomMap = { 1: 'standard', 2: 'deluxe', 3: 'suite' };
      roomtype = roomMap[req.body.roomId] || 'standard';
  }

  const sql = `INSERT INTO bookings (fullname, email, phone, checkin, checkout, roomtype, guests)
               VALUES (?, ?, ?, ?, ?, ?, ?)`;

  db.run(sql, [fullname || req.body.name, email, phone, checkin, checkout, roomtype, guests || 1], function(err) {
    if (err) return res.status(400).json({ error: err.message });
    res.status(201).json({ id: this.lastID, ...req.body, roomtype });
  });
});

app.get('/api/bookings', authenticateToken, (req, res) => {
  db.all('SELECT * FROM bookings ORDER BY created_at DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.get('/api/reports', authenticateToken, (req, res) => {
    res.json({ status: 'success', data: [] });
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));// Pipeline test Fri, May  8, 2026  3:12:35 AM
