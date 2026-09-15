const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, '..', 'shifts.db');
const db = new DatabaseSync(dbPath);

// Initialize schema
function initDatabase() {
  db.exec('PRAGMA foreign_keys = ON;');

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'STAFF',
      position TEXT,
      phone TEXT,
      must_change_password INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    try {
      db.exec('ALTER TABLE users ADD COLUMN must_change_password INTEGER DEFAULT 0;');
    } catch (e) {}

    CREATE TABLE IF NOT EXISTS shift_types (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
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
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      holiday_date TEXT NOT NULL,
      name TEXT NOT NULL,
      is_department_only INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS shifts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      shift_type_id INTEGER NOT NULL,
      shift_date TEXT NOT NULL,
      note TEXT,
      is_swapped INTEGER DEFAULT 0,
      swapped_with_user_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (shift_type_id) REFERENCES shift_types(id) ON DELETE RESTRICT,
      FOREIGN KEY (swapped_with_user_id) REFERENCES users(id) ON DELETE SET NULL,
      UNIQUE(user_id, shift_date)
    );

    CREATE TABLE IF NOT EXISTS shift_swaps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      requester_id INTEGER NOT NULL,
      target_user_id INTEGER NOT NULL,
      shift_date TEXT NOT NULL,
      requester_shift_type_id INTEGER,
      target_shift_type_id INTEGER,
      reason TEXT,
      status TEXT DEFAULT 'PENDING',
      response_note TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      responded_at DATETIME,
      FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (target_user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (requester_shift_type_id) REFERENCES shift_types(id) ON DELETE SET NULL,
      FOREIGN KEY (target_shift_type_id) REFERENCES shift_types(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS daily_notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      author_id INTEGER NOT NULL,
      note_date TEXT NOT NULL,
      content TEXT NOT NULL,
      is_public INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  seedProductionDefaults();
}

function seedProductionDefaults() {
  // Ensure default Admin user exists
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  if (userCount === 0) {
    console.log('Creating default Administrator account...');
    const defaultPasswordHash = bcrypt.hashSync('1234', 10);

    const insertUser = db.prepare(`
      INSERT INTO users (username, password_hash, full_name, role, position, phone)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    insertUser.run('admin', defaultPasswordHash, 'ผู้ดูแลระบบ (Admin)', 'ADMIN', 'หัวหน้างาน / ผู้ดูแลระบบ', '-');
  }

  // Ensure standard shift types template exists
  const shiftTypeCount = db.prepare('SELECT COUNT(*) as count FROM shift_types').get().count;
  if (shiftTypeCount === 0) {
    console.log('Creating standard shift types template...');
    const insertShiftType = db.prepare(`
      INSERT INTO shift_types (code, name, start_time, end_time, color_bg, color_text, color_border, min_staff)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertShiftType.run('M', 'เวรเช้า (Morning)', '08:00', '16:00', '#fef3c7', '#92400e', '#fde68a', 1);
    insertShiftType.run('A', 'เวรบ่าย (Afternoon)', '16:00', '24:00', '#e0f2fe', '#0369a1', '#bae6fd', 1);
    insertShiftType.run('N', 'เวรดึก (Night)', '00:00', '08:00', '#ede9fe', '#5b21b6', '#ddd6fe', 1);
    insertShiftType.run('OFF', 'วันหยุด (Day Off)', '-', '-', '#f1f5f9', '#475569', '#e2e8f0', 0);
  }
}

// Function to wipe all data completely for production reset
function wipeAllProductionData() {
  db.exec('PRAGMA foreign_keys = OFF;');
  db.exec('DELETE FROM shifts;');
  db.exec('DELETE FROM shift_swaps;');
  db.exec('DELETE FROM daily_notes;');
  db.exec('DELETE FROM holidays;');
  db.exec("DELETE FROM users WHERE username != 'admin';");
  
  // Ensure admin exists
  const admin = db.prepare("SELECT id FROM users WHERE username = 'admin'").get();
  if (!admin) {
    const hash = bcrypt.hashSync('1234', 10);
    db.prepare(`
      INSERT INTO users (username, password_hash, full_name, role, position, phone)
      VALUES ('admin', ?, 'ผู้ดูแลระบบ (Admin)', 'ADMIN', 'หัวหน้างาน / ผู้ดูแลระบบ', '-')
    `).run(hash);
  }

  db.exec('PRAGMA foreign_keys = ON;');
  console.log('All test data wiped successfully. Clean database ready for production.');
}

module.exports = {
  db,
  initDatabase,
  wipeAllProductionData
};
