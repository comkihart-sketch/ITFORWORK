-- ==============================================================================
-- ShiftFlow • Supabase (PostgreSQL) Migration Script
-- รันสคริปต์นี้ใน Supabase Dashboard -> SQL Editor -> New Query -> Run
-- ==============================================================================

-- 1. สร้างตารางทั้งหมด (Tables Creation)
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'STAFF',
  position TEXT,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS shift_types (
  id SERIAL PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  start_time TEXT,
  end_time TEXT,
  color_bg TEXT DEFAULT '#f1f5f9',
  color_text TEXT DEFAULT '#1e293b',
  color_border TEXT DEFAULT '#cbd5e1',
  min_staff INTEGER DEFAULT 1,
  is_active INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS holidays (
  id SERIAL PRIMARY KEY,
  holiday_date TEXT NOT NULL,
  name TEXT NOT NULL,
  is_department_only INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS shifts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  shift_type_id INTEGER NOT NULL REFERENCES shift_types(id) ON DELETE RESTRICT,
  shift_date TEXT NOT NULL,
  note TEXT,
  is_swapped INTEGER DEFAULT 0,
  swapped_with_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, shift_date)
);

CREATE TABLE IF NOT EXISTS shift_swaps (
  id SERIAL PRIMARY KEY,
  requester_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  shift_date TEXT NOT NULL,
  requester_shift_type_id INTEGER REFERENCES shift_types(id) ON DELETE SET NULL,
  target_shift_type_id INTEGER REFERENCES shift_types(id) ON DELETE SET NULL,
  reason TEXT,
  status TEXT DEFAULT 'PENDING',
  response_note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  responded_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS daily_notes (
  id SERIAL PRIMARY KEY,
  author_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  note_date TEXT NOT NULL,
  content TEXT NOT NULL,
  is_public INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ปิด Row Level Security (RLS) เพื่อให้ Backend API ใช้งานได้ทันที
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE shift_types DISABLE ROW LEVEL SECURITY;
ALTER TABLE holidays DISABLE ROW LEVEL SECURITY;
ALTER TABLE shifts DISABLE ROW LEVEL SECURITY;
ALTER TABLE shift_swaps DISABLE ROW LEVEL SECURITY;
ALTER TABLE daily_notes DISABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- 2. ย้ายข้อมูลจริงของคุณเข้าสู่ Supabase ทันที (Data Seed)
-- ==============================================================================

-- เพิ่มรายชื่อพนักงานจริง 3 ท่าน (คงรหัสผ่านเดิมไว้ 100%)
INSERT INTO users (id, username, password_hash, full_name, role, position, phone) VALUES
(5, '0157', '$2b$10$TTrPIyzraBPEvZ8vOcg.I.Xx7Ow0GQ0DUp3zmFZ1HN5AaBkZcA4oi', 'วุฒิชัย เจิมเกาะ', 'ADMIN', 'HOU INFRASTRUCTURE', '0800572414'),
(6, '0533', '$2b$10$VwmuZqBr7TnrM0jywH5KMOmCSRQxAsSczfeI1yi2wvI1G7iPoqQzm', 'อนุชิต จันทอง', 'STAFF', 'IT SUPPORT', '-'),
(7, '0665', '$2b$10$L/BysqG9r9TT.3SyCAZ5tegK9Uoh8YNaIf8if6JdEkHdW30tI9KM.', 'นายศิวัช ทัพขวา', 'STAFF', 'IT SUPPORT', '-')
ON CONFLICT (username) DO NOTHING;

-- เพิ่มประเภทเวรที่ตั้งค่าไว้จริง 5 รูปแบบ
INSERT INTO shift_types (id, code, name, start_time, end_time, color_bg, color_text, color_border, min_staff, is_active) VALUES
(6, 'M05', 'เช้า', '08:00', '17:00', '#fef3c7', '#92400e', '#fde68a', 1, 1),
(7, 'M09', 'บ่าย', '11:00', '20:00', '#78e899', '#0b0a0a', '#fde68a', 1, 1),
(8, 'M10', 'เช้า-บ่าย', '08:00', '20:00', '#00fbff', '#100f0f', '#fde68a', 1, 1),
(9, 'X', 'หยุด', '08:00', '17:00', '#ff000d', '#000000', '#fde68a', 1, 1),
(10, 'V', 'พักร้อน', '08:00', '17:00', '#f1b8f5', '#000000', '#fde68a', 1, 1)
ON CONFLICT (code) DO NOTHING;

-- เพิ่มวันหยุดประจำปี 2569 ที่บันทึกไว้
INSERT INTO holidays (id, holiday_date, name, is_department_only) VALUES
(4, '2026-10-13', 'วันนวมินทรมหาราช', 0),
(5, '2026-10-23', 'วันปิยมหาราช', 0),
(6, '2026-12-07', 'วันชดเชยวันพ่อแห่งชาติ', 0),
(7, '2026-12-31', 'วันสิ้นปี', 0)
ON CONFLICT DO NOTHING;

-- เพิ่มข้อมูลเวรที่ได้ลงไว้แล้วสำหรับเดือนกันยายน 2569
INSERT INTO shifts (user_id, shift_type_id, shift_date, note, is_swapped) VALUES
(5, 6, '2026-09-01', NULL, 0),
(5, 6, '2026-09-02', NULL, 0),
(5, 6, '2026-09-03', NULL, 0),
(5, 7, '2026-09-04', NULL, 0),
(5, 9, '2026-09-05', NULL, 0),
(5, 8, '2026-09-06', NULL, 0),
(5, 6, '2026-09-07', NULL, 0),
(5, 7, '2026-09-08', NULL, 0),
(5, 7, '2026-09-09', NULL, 0),
(5, 6, '2026-09-10', NULL, 0),
(5, 6, '2026-09-11', NULL, 0),
(5, 9, '2026-09-12', NULL, 0),
(5, 9, '2026-09-13', NULL, 0),
(5, 7, '2026-09-14', NULL, 0),
(5, 6, '2026-09-15', NULL, 0),
(5, 7, '2026-09-16', NULL, 0),
(5, 6, '2026-09-17', NULL, 0),
(5, 7, '2026-09-18', NULL, 0),
(5, 9, '2026-09-19', NULL, 0),
(5, 6, '2026-09-20', NULL, 0),
(5, 6, '2026-09-21', NULL, 0),
(5, 6, '2026-09-22', NULL, 0),
(5, 6, '2026-09-23', NULL, 0),
(5, 9, '2026-09-24', NULL, 0),
(5, 9, '2026-09-25', NULL, 0),
(5, 9, '2026-09-26', NULL, 0),
(5, 9, '2026-09-27', NULL, 0),
(5, 6, '2026-09-28', NULL, 0),
(5, 6, '2026-09-29', NULL, 0),
(5, 6, '2026-09-30', NULL, 0)
ON CONFLICT (user_id, shift_date) DO NOTHING;

-- ปรับค่า Sequence ID ต่อเนื่องอัตโนมัติ
SELECT setval('users_id_seq', COALESCE((SELECT MAX(id) FROM users), 1));
SELECT setval('shift_types_id_seq', COALESCE((SELECT MAX(id) FROM shift_types), 1));
SELECT setval('holidays_id_seq', COALESCE((SELECT MAX(id) FROM holidays), 1));
SELECT setval('shifts_id_seq', COALESCE((SELECT MAX(id) FROM shifts), 1));
SELECT setval('shift_swaps_id_seq', COALESCE((SELECT MAX(id) FROM shift_swaps), 1));
SELECT setval('daily_notes_id_seq', COALESCE((SELECT MAX(id) FROM daily_notes), 1));
