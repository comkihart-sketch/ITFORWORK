require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const path = require('path');
const { dbAdapter } = require('./dbAdapter');

const app = express();
const JWT_SECRET = process.env.JWT_SECRET || 'shiftflow_super_secret_key_2026';

// Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());

// Auth Middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'กรุณาเข้าสู่ระบบก่อนใช้งาน' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Token ไม่ถูกต้องหรือหมดอายุ' });
    req.user = user;
    next();
  });
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'เฉพาะผู้ดูแลระบบ (Admin) เท่านั้นที่สามารถดำเนินการได้' });
  }
  next();
}

// ----------------------------------------------------
// AUTH ROUTES
// ----------------------------------------------------
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน' });
  }

  try {
    const user = await dbAdapter.getUserByUsername(username.trim());
    if (!user) {
      return res.status(401).json({ error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });
    }

    const validPassword = bcrypt.compareSync(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });
    }

    const payload = {
      id: user.id,
      username: user.username,
      full_name: user.full_name,
      role: user.role,
      position: user.position
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: payload });
  } catch (err) {
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ: ' + err.message });
  }
});

app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const user = await dbAdapter.getUserById(req.user.id);
    if (!user) return res.status(404).json({ error: 'ไม่พบผู้ใช้' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/auth/users', authenticateToken, async (req, res) => {
  try {
    const users = await dbAdapter.getAllUsers();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// SHIFTS ROUTES
// ----------------------------------------------------
app.get('/api/shifts', authenticateToken, async (req, res) => {
  try {
    const { month } = req.query; // format: 'YYYY-MM'
    const shifts = await dbAdapter.getShifts(month);
    res.json(shifts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/shifts', authenticateToken, async (req, res) => {
  try {
    const { user_id, shift_type_id, shift_date, note } = req.body;
    const targetUserId = user_id || req.user.id;

    if (targetUserId !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'คุณไม่มีสิทธิ์ลงเวรแทนบุคคลอื่น' });
    }

    if (!shift_type_id || !shift_date) {
      return res.status(400).json({ error: 'กรุณาระบุประเภทเวรและวันที่' });
    }

    await dbAdapter.saveShift({
      user_id: targetUserId,
      shift_type_id,
      shift_date,
      note
    });

    res.json({ success: true, message: 'บันทึกการลงเวรสำเร็จ' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// SHIFT SWAPS ROUTES
// ----------------------------------------------------
app.get('/api/swaps', authenticateToken, async (req, res) => {
  try {
    const swaps = await dbAdapter.getSwaps();
    res.json(swaps);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/swaps/request', authenticateToken, async (req, res) => {
  try {
    const { target_user_id, shift_date, reason } = req.body;
    const requester_id = req.user.id;

    if (requester_id === parseInt(target_user_id)) {
      return res.status(400).json({ error: 'ไม่สามารถขอสลับเวรกับตนเองได้' });
    }

    await dbAdapter.createSwapRequest({
      requester_id,
      target_user_id: parseInt(target_user_id),
      shift_date,
      reason
    });

    res.json({ success: true, message: 'ส่งคำขอสลับเวรเรียบร้อยแล้ว รอการอนุมัติจากเพื่อนร่วมงาน' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/swaps/:id/approve', authenticateToken, async (req, res) => {
  try {
    await dbAdapter.approveSwap(req.params.id, req.user);
    res.json({ success: true, message: 'อนุมัติการสลับเวรเรียบร้อยแล้ว ตารางเวรอัปเดตพร้อมแสดงตราประทับสลับเวร' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/swaps/:id/reject', authenticateToken, async (req, res) => {
  try {
    const { response_note } = req.body;
    await dbAdapter.rejectSwap(req.params.id, response_note, req.user);
    res.json({ success: true, message: 'ปฏิเสธคำขอสลับเวรเรียบร้อยแล้ว' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ----------------------------------------------------
// DAILY NOTES ROUTES
// ----------------------------------------------------
app.get('/api/notes', authenticateToken, async (req, res) => {
  try {
    const { month, date } = req.query;
    const notes = await dbAdapter.getNotes(month, date, req.user.id);
    res.json(notes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/notes', authenticateToken, async (req, res) => {
  try {
    const { note_date, content, is_public } = req.body;
    if (!note_date || !content) {
      return res.status(400).json({ error: 'กรุณาระบุวันที่และข้อความบันทึก' });
    }

    await dbAdapter.createNote({
      author_id: req.user.id,
      note_date,
      content,
      is_public: is_public === true || is_public === 1 || is_public === '1'
    });

    res.json({ success: true, message: 'บันทึกข้อมูลเรียบร้อยแล้ว' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/notes/:id', authenticateToken, async (req, res) => {
  try {
    await dbAdapter.deleteNote(req.params.id, req.user);
    res.json({ success: true, message: 'ลบบันทึกเรียบร้อย' });
  } catch (err) {
    res.status(403).json({ error: err.message });
  }
});

// ----------------------------------------------------
// HOLIDAYS ROUTES
// ----------------------------------------------------
app.get('/api/holidays', authenticateToken, async (req, res) => {
  try {
    const holidays = await dbAdapter.getHolidays();
    res.json(holidays);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/holidays', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { holiday_date, name, is_department_only } = req.body;
    if (!holiday_date || !name) {
      return res.status(400).json({ error: 'กรุณากรอกวันที่และชื่อวันหยุด' });
    }

    await dbAdapter.createHoliday({ holiday_date, name, is_department_only });
    res.json({ success: true, message: 'เพิ่มวันหยุดสำเร็จ' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/holidays/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    await dbAdapter.deleteHoliday(req.params.id);
    res.json({ success: true, message: 'ลบวันหยุดสำเร็จ' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// SHIFT TYPES ROUTES
// ----------------------------------------------------
app.get('/api/shift-types', authenticateToken, async (req, res) => {
  try {
    const types = await dbAdapter.getShiftTypes();
    res.json(types);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/shift-types', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { code, name, start_time, end_time, color_bg, color_text, color_border, min_staff } = req.body;
    if (!code || !name) return res.status(400).json({ error: 'กรุณากรอกรหัสและชื่อเวร' });

    await dbAdapter.createShiftType({ code, name, start_time, end_time, color_bg, color_text, color_border, min_staff });
    res.json({ success: true, message: 'เพิ่มประเภทเวรสำเร็จ' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/shift-types/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, start_time, end_time, color_bg, color_text, color_border, min_staff } = req.body;
    await dbAdapter.updateShiftType(req.params.id, { name, start_time, end_time, color_bg, color_text, color_border, min_staff });
    res.json({ success: true, message: 'อัปเดตประเภทเวรสำเร็จ' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/shift-types/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    await dbAdapter.deleteShiftType(req.params.id);
    res.json({ success: true, message: 'ลบประเภทเวรเรียบร้อยแล้ว' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ----------------------------------------------------
// ADMIN USER MANAGEMENT
// ----------------------------------------------------
app.get('/api/admin/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const users = await dbAdapter.getAdminUsers();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { username, password, full_name, role, position, phone } = req.body;
    if (!username || !password || !full_name) {
      return res.status(400).json({ error: 'กรุณากรอก Username, Password และชื่อ-สกุล' });
    }

    await dbAdapter.createAdminUser({ username, password, full_name, role, position, phone });
    res.json({ success: true, message: 'เพิ่มผู้ใช้งานสำเร็จ' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/admin/users/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { full_name, role, position, phone, new_password } = req.body;
    await dbAdapter.updateAdminUser(req.params.id, { full_name, role, position, phone, new_password });
    res.json({ success: true, message: 'อัปเดตข้อมูลผู้ใช้สำเร็จ' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/admin/users/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    await dbAdapter.deleteAdminUser(req.params.id, req.user.id);
    res.json({ success: true, message: 'ลบผู้ใช้งานเรียบร้อยแล้ว' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Serve frontend in production or if static build exists
const clientDist = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientDist));
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(clientDist, 'index.html'), (err) => {
    if (err) res.status(200).send('ShiftFlow API Server is running.');
  });
});

module.exports = app;
