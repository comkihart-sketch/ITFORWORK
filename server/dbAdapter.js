require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

const supabaseUrl = process.env.SUPABASE_URL || 'https://bctyjfizqnnwdghybfha.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY || process.env.SUPABASE_API_KEY || 'sb_publishable_izGd1wrMM0kjTdkLL8v2LQ_JFptbjEp';
const isSupabaseEnabled = Boolean(supabaseUrl && supabaseKey);

let supabase = null;
if (isSupabaseEnabled) {
  supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false }
  });
  console.log('📡 Connected to Supabase (PostgreSQL)');
} else {
  console.log('💾 Using Local SQLite Database (shifts.db)');
}

// Fallback SQLite db
let sqliteDb = null;
if (!isSupabaseEnabled) {
  try {
    const { db, initDatabase } = require('./db');
    initDatabase();
    sqliteDb = db;
  } catch (err) {
    console.warn('⚠️ SQLite fallback unavailable in serverless environment:', err.message);
  }
}

const dbAdapter = {
  isSupabase: isSupabaseEnabled,

  // ----------------------------------------------------
  // USERS / AUTH
  // ----------------------------------------------------
  async getUserByUsername(username) {
    if (isSupabaseEnabled) {
      const { data, error } = await supabase.from('users').select('*').eq('username', username.trim().toLowerCase()).single();
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    } else {
      return sqliteDb.prepare('SELECT * FROM users WHERE username = ?').get(username.trim().toLowerCase());
    }
  },

  async getUserById(id) {
    if (isSupabaseEnabled) {
      const { data } = await supabase.from('users').select('*').eq('id', id).single();
      if (data) delete data.password_hash;
      return data;
    } else {
      const user = sqliteDb.prepare('SELECT * FROM users WHERE id = ?').get(id);
      if (user) delete user.password_hash;
      return user;
    }
  },

  async changePassword(userId, newPassword) {
    const hash = bcrypt.hashSync(newPassword, 10);
    if (isSupabaseEnabled) {
      let { error } = await supabase.from('users').update({
        password_hash: hash,
        must_change_password: 0
      }).eq('id', userId);

      if (error && error.code === '42703') {
        const retry = await supabase.from('users').update({ password_hash: hash }).eq('id', userId);
        if (retry.error) throw retry.error;
      } else if (error) {
        throw error;
      }
      return { success: true };
    } else {
      try {
        sqliteDb.prepare('UPDATE users SET password_hash = ?, must_change_password = 0 WHERE id = ?').run(hash, userId);
      } catch (e) {
        sqliteDb.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, userId);
      }
      return { success: true };
    }
  },

  async getAllUsers() {
    if (isSupabaseEnabled) {
      const { data } = await supabase.from('users').select('id, username, full_name, role, position, phone').order('id', { ascending: true });
      return data || [];
    } else {
      return sqliteDb.prepare('SELECT id, username, full_name, role, position, phone FROM users ORDER BY id ASC').all();
    }
  },

  async getUserInfo(id) {
    if (!id) return { full_name: 'เจ้าหน้าที่', username: '-' };
    if (isSupabaseEnabled) {
      const { data } = await supabase.from('users').select('id, username, full_name, role').eq('id', id).maybeSingle();
      return data || { id, full_name: 'เจ้าหน้าที่', username: '-' };
    } else {
      return sqliteDb.prepare('SELECT id, username, full_name, role FROM users WHERE id = ?').get(id) || { id, full_name: 'เจ้าหน้าที่', username: '-' };
    }
  },

  async getShiftTypeInfo(id) {
    if (!id) return { name: 'เวร', code: '-' };
    if (isSupabaseEnabled) {
      const { data } = await supabase.from('shift_types').select('id, name, code, start_time, end_time').eq('id', id).maybeSingle();
      return data || { id, name: 'เวร', code: '-' };
    } else {
      return sqliteDb.prepare('SELECT id, name, code, start_time, end_time FROM shift_types WHERE id = ?').get(id) || { id, name: 'เวร', code: '-' };
    }
  },

  // ----------------------------------------------------
  // SHIFTS
  // ----------------------------------------------------
  async getShifts(month) {
    if (isSupabaseEnabled) {
      let query = supabase.from('shifts').select(`
        id, user_id, shift_type_id, shift_date, note, is_swapped, swapped_with_user_id,
        user:users!shifts_user_id_fkey(full_name, role),
        shift_type:shift_types!shifts_shift_type_id_fkey(code, name, start_time, end_time, color_bg, color_text, color_border),
        swapped_with:users!shifts_swapped_with_user_id_fkey(full_name)
      `);

      if (month) {
        query = query.like('shift_date', `${month}%`);
      }
      query = query.order('shift_date', { ascending: true });

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map(s => ({
        id: s.id,
        user_id: s.user_id,
        shift_type_id: s.shift_type_id,
        shift_date: s.shift_date,
        note: s.note,
        is_swapped: s.is_swapped,
        swapped_with_user_id: s.swapped_with_user_id,
        user_name: s.user?.full_name,
        user_role: s.user?.role,
        shift_code: s.shift_type?.code,
        shift_name: s.shift_type?.name,
        start_time: s.shift_type?.start_time,
        end_time: s.shift_type?.end_time,
        color_bg: s.shift_type?.color_bg,
        color_text: s.shift_type?.color_text,
        color_border: s.shift_type?.color_border,
        swapped_with_name: s.swapped_with?.full_name || null
      }));
    } else {
      let query = `
        SELECT 
          s.id, s.user_id, s.shift_type_id, s.shift_date, s.note, s.is_swapped, s.swapped_with_user_id,
          u.full_name as user_name, u.role as user_role,
          st.code as shift_code, st.name as shift_name, st.start_time, st.end_time,
          st.color_bg, st.color_text, st.color_border,
          swu.full_name as swapped_with_name
        FROM shifts s
        JOIN users u ON s.user_id = u.id
        JOIN shift_types st ON s.shift_type_id = st.id
        LEFT JOIN users swu ON s.swapped_with_user_id = swu.id
      `;
      let params = [];
      if (month) {
        query += ` WHERE s.shift_date LIKE ?`;
        params.push(`${month}%`);
      }
      query += ` ORDER BY s.shift_date ASC, s.user_id ASC`;
      return sqliteDb.prepare(query).all(...params);
    }
  },

  async saveShift({ user_id, shift_type_id, shift_date, note }) {
    if (isSupabaseEnabled) {
      const { data: existing } = await supabase
        .from('shifts')
        .select('id')
        .eq('user_id', user_id)
        .eq('shift_date', shift_date)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase.from('shifts').update({
          shift_type_id,
          note: note || null,
          is_swapped: 0,
          swapped_with_user_id: null
        }).eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('shifts').insert({
          user_id,
          shift_type_id,
          shift_date,
          note: note || null,
          is_swapped: 0
        });
        if (error) throw error;
      }
      const targetUser = await this.getUserInfo(user_id);
      const shiftType = await this.getShiftTypeInfo(shift_type_id);
      return { success: true, targetUser, shiftType, shift_date, note };
    } else {
      const existing = sqliteDb.prepare('SELECT id FROM shifts WHERE user_id = ? AND shift_date = ?').get(user_id, shift_date);
      if (existing) {
        sqliteDb.prepare(`
          UPDATE shifts 
          SET shift_type_id = ?, note = ?, is_swapped = 0, swapped_with_user_id = NULL 
          WHERE id = ?
        `).run(shift_type_id, note || null, existing.id);
      } else {
        sqliteDb.prepare(`
          INSERT INTO shifts (user_id, shift_type_id, shift_date, note)
          VALUES (?, ?, ?, ?)
        `).run(user_id, shift_type_id, shift_date, note || null);
      }
      const targetUser = await this.getUserInfo(user_id);
      const shiftType = await this.getShiftTypeInfo(shift_type_id);
      return { success: true, targetUser, shiftType, shift_date, note };
    }
  },

  // ----------------------------------------------------
  // SWAPS
  // ----------------------------------------------------
  async getSwaps() {
    if (isSupabaseEnabled) {
      const { data, error } = await supabase.from('shift_swaps').select(`
        id, shift_date, reason, status, response_note, created_at, responded_at,
        requester_id, requester:users!shift_swaps_requester_id_fkey(full_name),
        target_user_id, target:users!shift_swaps_target_user_id_fkey(full_name),
        requester_shift_type_id, req_shift:shift_types!shift_swaps_requester_shift_type_id_fkey(name, code),
        target_shift_type_id, tgt_shift:shift_types!shift_swaps_target_shift_type_id_fkey(name, code)
      `).order('id', { ascending: false });

      if (error) throw error;

      return (data || []).map(sw => ({
        id: sw.id,
        shift_date: sw.shift_date,
        reason: sw.reason,
        status: sw.status,
        response_note: sw.response_note,
        created_at: sw.created_at,
        responded_at: sw.responded_at,
        requester_id: sw.requester_id,
        requester_name: sw.requester?.full_name,
        target_user_id: sw.target_user_id,
        target_user_name: sw.target?.full_name,
        requester_shift_type_id: sw.requester_shift_type_id,
        requester_shift_name: sw.req_shift?.name,
        requester_shift_code: sw.req_shift?.code,
        target_shift_type_id: sw.target_shift_type_id,
        target_shift_name: sw.tgt_shift?.name,
        target_shift_code: sw.tgt_shift?.code
      }));
    } else {
      const query = `
        SELECT 
          sw.id, sw.shift_date, sw.reason, sw.status, sw.response_note, sw.created_at, sw.responded_at,
          sw.requester_id, u1.full_name as requester_name,
          sw.target_user_id, u2.full_name as target_user_name,
          sw.requester_shift_type_id, st1.name as requester_shift_name, st1.code as requester_shift_code,
          sw.target_shift_type_id, st2.name as target_shift_name, st2.code as target_shift_code
        FROM shift_swaps sw
        JOIN users u1 ON sw.requester_id = u1.id
        JOIN users u2 ON sw.target_user_id = u2.id
        LEFT JOIN shift_types st1 ON sw.requester_shift_type_id = st1.id
        LEFT JOIN shift_types st2 ON sw.target_shift_type_id = st2.id
        ORDER BY sw.id DESC
      `;
      return sqliteDb.prepare(query).all();
    }
  },

  async createSwapRequest({ requester_id, target_user_id, shift_date, reason }) {
    if (isSupabaseEnabled) {
      const { data: reqShift } = await supabase.from('shifts').select('shift_type_id').eq('user_id', requester_id).eq('shift_date', shift_date).maybeSingle();
      const { data: tgtShift } = await supabase.from('shifts').select('shift_type_id').eq('user_id', target_user_id).eq('shift_date', shift_date).maybeSingle();

      if (!reqShift) throw new Error('คุณยังไม่มีเวรในวันที่ระบุ กรุณาลงเวรก่อนขอสลับ');
      if (!tgtShift) throw new Error('เพื่อนร่วมงานปลายทางยังไม่มีเวรในวันที่ระบุ');

      const { data: pending } = await supabase.from('shift_swaps').select('id')
        .or(`and(requester_id.eq.${requester_id},target_user_id.eq.${target_user_id}),and(requester_id.eq.${target_user_id},target_user_id.eq.${requester_id})`)
        .eq('shift_date', shift_date)
        .eq('status', 'PENDING')
        .maybeSingle();

      if (pending) throw new Error('มีคำขอสลับเวรในวันนี้อยู่ระหว่างรอการตอบรับแล้ว');

      const { error } = await supabase.from('shift_swaps').insert({
        requester_id,
        target_user_id,
        shift_date,
        requester_shift_type_id: reqShift.shift_type_id,
        target_shift_type_id: tgtShift.shift_type_id,
        reason: reason || null,
        status: 'PENDING'
      });
      if (error) throw error;
      const targetUser = await this.getUserInfo(target_user_id);
      const requester = await this.getUserInfo(requester_id);
      const reqShiftType = await this.getShiftTypeInfo(reqShift.shift_type_id);
      const tgtShiftType = await this.getShiftTypeInfo(tgtShift.shift_type_id);

      return {
        success: true,
        requester,
        targetUser,
        shift_date,
        requesterShiftName: `${reqShiftType.name} (${reqShiftType.code})`,
        targetShiftName: `${tgtShiftType.name} (${tgtShiftType.code})`,
        reason
      };
    } else {
      const reqShift = sqliteDb.prepare('SELECT shift_type_id FROM shifts WHERE user_id = ? AND shift_date = ?').get(requester_id, shift_date);
      const tgtShift = sqliteDb.prepare('SELECT shift_type_id FROM shifts WHERE user_id = ? AND shift_date = ?').get(target_user_id, shift_date);

      if (!reqShift) throw new Error('คุณยังไม่มีเวรในวันที่ระบุ กรุณาลงเวรก่อนขอสลับ');
      if (!tgtShift) throw new Error('เพื่อนร่วมงานปลายทางยังไม่มีเวรในวันที่ระบุ');

      const pending = sqliteDb.prepare(`
        SELECT id FROM shift_swaps 
        WHERE ((requester_id = ? AND target_user_id = ?) OR (requester_id = ? AND target_user_id = ?))
          AND shift_date = ? AND status = 'PENDING'
      `).get(requester_id, target_user_id, target_user_id, requester_id, shift_date);

      if (pending) throw new Error('มีคำขอสลับเวรในวันนี้อยู่ระหว่างรอการตอบรับแล้ว');

      sqliteDb.prepare(`
        INSERT INTO shift_swaps (requester_id, target_user_id, shift_date, requester_shift_type_id, target_shift_type_id, reason, status)
        VALUES (?, ?, ?, ?, ?, ?, 'PENDING')
      `).run(requester_id, target_user_id, shift_date, reqShift.shift_type_id, tgtShift.shift_type_id, reason || null);

      const targetUser = await this.getUserInfo(target_user_id);
      const requester = await this.getUserInfo(requester_id);
      const reqShiftType = await this.getShiftTypeInfo(reqShift.shift_type_id);
      const tgtShiftType = await this.getShiftTypeInfo(tgtShift.shift_type_id);

      return {
        success: true,
        requester,
        targetUser,
        shift_date,
        requesterShiftName: `${reqShiftType.name} (${reqShiftType.code})`,
        targetShiftName: `${tgtShiftType.name} (${tgtShiftType.code})`,
        reason
      };
    }
  },

  async approveSwap(swapId, currentUser) {
    if (isSupabaseEnabled) {
      const { data: swap } = await supabase.from('shift_swaps').select('*').eq('id', swapId).single();
      if (!swap) throw new Error('ไม่พบรายการคำขอนี้');
      if (swap.status !== 'PENDING') throw new Error(`คำขอนี้อยู่ในสถานะ ${swap.status} แล้ว`);
      if (swap.target_user_id !== currentUser.id && currentUser.role !== 'ADMIN') {
        throw new Error('คุณไม่ใช่ผู้ที่ได้รับการขอสลับเวร จึงไม่สามารถอนุมัติได้');
      }

      const { data: reqShift } = await supabase.from('shifts').select('id, shift_type_id').eq('user_id', swap.requester_id).eq('shift_date', swap.shift_date).single();
      const { data: tgtShift } = await supabase.from('shifts').select('id, shift_type_id').eq('user_id', swap.target_user_id).eq('shift_date', swap.shift_date).single();

      if (!reqShift || !tgtShift) throw new Error('ไม่พบข้อมูลเวรของฝ่ายใดฝ่ายหนึ่งในระบบ');

      // Swap in database
      await supabase.from('shifts').update({
        shift_type_id: tgtShift.shift_type_id,
        is_swapped: 1,
        swapped_with_user_id: swap.target_user_id
      }).eq('id', reqShift.id);

      await supabase.from('shifts').update({
        shift_type_id: reqShift.shift_type_id,
        is_swapped: 1,
        swapped_with_user_id: swap.requester_id
      }).eq('id', tgtShift.id);

      await supabase.from('shift_swaps').update({
        status: 'APPROVED',
        responded_at: new Date().toISOString()
      }).eq('id', swapId);

      const requester = await this.getUserInfo(swap.requester_id);
      const targetUser = await this.getUserInfo(swap.target_user_id);
      const reqShiftType = await this.getShiftTypeInfo(reqShift.shift_type_id);
      const tgtShiftType = await this.getShiftTypeInfo(tgtShift.shift_type_id);

      return {
        success: true,
        requester,
        targetUser,
        shift_date: swap.shift_date,
        requesterShiftName: `${reqShiftType.name} (${reqShiftType.code})`,
        targetShiftName: `${tgtShiftType.name} (${tgtShiftType.code})`
      };
    } else {
      const swap = sqliteDb.prepare('SELECT * FROM shift_swaps WHERE id = ?').get(swapId);
      if (!swap) throw new Error('ไม่พบรายการคำขอนี้');
      if (swap.status !== 'PENDING') throw new Error(`คำขอนี้อยู่ในสถานะ ${swap.status} แล้ว`);
      if (swap.target_user_id !== currentUser.id && currentUser.role !== 'ADMIN') {
        throw new Error('คุณไม่ใช่ผู้ที่ได้รับการขอสลับเวร จึงไม่สามารถอนุมัติได้');
      }

      sqliteDb.exec('BEGIN TRANSACTION;');
      try {
        const reqShift = sqliteDb.prepare('SELECT id, shift_type_id FROM shifts WHERE user_id = ? AND shift_date = ?').get(swap.requester_id, swap.shift_date);
        const tgtShift = sqliteDb.prepare('SELECT id, shift_type_id FROM shifts WHERE user_id = ? AND shift_date = ?').get(swap.target_user_id, swap.shift_date);
        if (!reqShift || !tgtShift) throw new Error('ไม่พบข้อมูลเวรของฝ่ายใดฝ่ายหนึ่งในระบบ');

        sqliteDb.prepare('UPDATE shifts SET shift_type_id = ?, is_swapped = 1, swapped_with_user_id = ? WHERE id = ?')
          .run(tgtShift.shift_type_id, swap.target_user_id, reqShift.id);
        sqliteDb.prepare('UPDATE shifts SET shift_type_id = ?, is_swapped = 1, swapped_with_user_id = ? WHERE id = ?')
          .run(reqShift.shift_type_id, swap.requester_id, tgtShift.id);
        sqliteDb.prepare('UPDATE shift_swaps SET status = ?, responded_at = CURRENT_TIMESTAMP WHERE id = ?')
          .run('APPROVED', swapId);

        sqliteDb.exec('COMMIT;');

        const requester = await this.getUserInfo(swap.requester_id);
        const targetUser = await this.getUserInfo(swap.target_user_id);
        const reqShiftType = await this.getShiftTypeInfo(reqShift.shift_type_id);
        const tgtShiftType = await this.getShiftTypeInfo(tgtShift.shift_type_id);

        return {
          success: true,
          requester,
          targetUser,
          shift_date: swap.shift_date,
          requesterShiftName: `${reqShiftType.name} (${reqShiftType.code})`,
          targetShiftName: `${tgtShiftType.name} (${tgtShiftType.code})`
        };
      } catch (err) {
        sqliteDb.exec('ROLLBACK;');
        throw err;
      }
    }
  },

  async rejectSwap(swapId, responseNote, currentUser) {
    if (isSupabaseEnabled) {
      const { data: swap } = await supabase.from('shift_swaps').select('*').eq('id', swapId).single();
      if (!swap) throw new Error('ไม่พบรายการคำขอนี้');
      if (swap.status !== 'PENDING') throw new Error('คำขอนี้ไม่ได้อยู่ในสถานะรอการตอบรับ');
      if (swap.target_user_id !== currentUser.id && currentUser.role !== 'ADMIN') {
        throw new Error('คุณไม่มีสิทธิ์ปฏิเสธคำขอนี้');
      }

      await supabase.from('shift_swaps').update({
        status: 'REJECTED',
        response_note: responseNote || 'ไม่สะดวกสลับเวร',
        responded_at: new Date().toISOString()
      }).eq('id', swapId);

      const requester = await this.getUserInfo(swap.requester_id);
      const targetUser = await this.getUserInfo(swap.target_user_id);

      return {
        success: true,
        requester,
        targetUser,
        shift_date: swap.shift_date,
        response_note: responseNote || 'ไม่สะดวกสลับเวร'
      };
    } else {
      const swap = sqliteDb.prepare('SELECT * FROM shift_swaps WHERE id = ?').get(swapId);
      if (!swap) throw new Error('ไม่พบรายการคำขอนี้');
      if (swap.status !== 'PENDING') throw new Error('คำขอนี้ไม่ได้อยู่ในสถานะรอการตอบรับ');
      if (swap.target_user_id !== currentUser.id && currentUser.role !== 'ADMIN') {
        throw new Error('คุณไม่มีสิทธิ์ปฏิเสธคำขอนี้');
      }

      sqliteDb.prepare('UPDATE shift_swaps SET status = ?, response_note = ?, responded_at = CURRENT_TIMESTAMP WHERE id = ?')
        .run('REJECTED', responseNote || 'ไม่สะดวกสลับเวร', swapId);

      const requester = await this.getUserInfo(swap.requester_id);
      const targetUser = await this.getUserInfo(swap.target_user_id);

      return {
        success: true,
        requester,
        targetUser,
        shift_date: swap.shift_date,
        response_note: responseNote || 'ไม่สะดวกสลับเวร'
      };
    }
  },

  // ----------------------------------------------------
  // DAILY NOTES
  // ----------------------------------------------------
  async getNotes(month, date, currentUserId) {
    if (isSupabaseEnabled) {
      let query = supabase.from('daily_notes').select(`
        id, author_id, note_date, content, is_public, created_at,
        author:users!daily_notes_author_id_fkey(full_name, role)
      `).or(`is_public.eq.1,author_id.eq.${currentUserId}`);

      if (date) query = query.eq('note_date', date);
      else if (month) query = query.like('note_date', `${month}%`);
      query = query.order('note_date', { ascending: false }).order('id', { ascending: false });

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map(n => ({
        id: n.id,
        author_id: n.author_id,
        note_date: n.note_date,
        content: n.content,
        is_public: n.is_public,
        created_at: n.created_at,
        author_name: n.author?.full_name,
        author_role: n.author?.role
      }));
    } else {
      let query = `
        SELECT 
          n.id, n.author_id, n.note_date, n.content, n.is_public, n.created_at,
          u.full_name as author_name, u.role as author_role
        FROM daily_notes n
        JOIN users u ON n.author_id = u.id
        WHERE (n.is_public = 1 OR n.author_id = ?)
      `;
      const params = [currentUserId];
      if (date) {
        query += ` AND n.note_date = ?`;
        params.push(date);
      } else if (month) {
        query += ` AND n.note_date LIKE ?`;
        params.push(`${month}%`);
      }
      query += ` ORDER BY n.note_date DESC, n.id DESC`;
      return sqliteDb.prepare(query).all(...params);
    }
  },

  async createNote({ author_id, note_date, content, is_public }) {
    if (isSupabaseEnabled) {
      const { error } = await supabase.from('daily_notes').insert({
        author_id,
        note_date,
        content: content.trim(),
        is_public: is_public ? 1 : 0
      });
      if (error) throw error;
      return { success: true };
    } else {
      sqliteDb.prepare(`
        INSERT INTO daily_notes (author_id, note_date, content, is_public)
        VALUES (?, ?, ?, ?)
      `).run(author_id, note_date, content.trim(), is_public ? 1 : 0);
      return { success: true };
    }
  },

  async deleteNote(id, currentUser) {
    if (isSupabaseEnabled) {
      const { data: note } = await supabase.from('daily_notes').select('author_id').eq('id', id).single();
      if (!note) throw new Error('ไม่พบบันทึก');
      if (note.author_id !== currentUser.id && currentUser.role !== 'ADMIN') {
        throw new Error('คุณไม่มีสิทธิ์ลบบันทึกของผู้อื่น');
      }
      await supabase.from('daily_notes').delete().eq('id', id);
      return { success: true };
    } else {
      const note = sqliteDb.prepare('SELECT author_id FROM daily_notes WHERE id = ?').get(id);
      if (!note) throw new Error('ไม่พบบันทึก');
      if (note.author_id !== currentUser.id && currentUser.role !== 'ADMIN') {
        throw new Error('คุณไม่มีสิทธิ์ลบบันทึกของผู้อื่น');
      }
      sqliteDb.prepare('DELETE FROM daily_notes WHERE id = ?').run(id);
      return { success: true };
    }
  },

  // ----------------------------------------------------
  // HOLIDAYS
  // ----------------------------------------------------
  async getHolidays() {
    if (isSupabaseEnabled) {
      const { data } = await supabase.from('holidays').select('*').order('holiday_date', { ascending: true });
      return data || [];
    } else {
      return sqliteDb.prepare('SELECT * FROM holidays ORDER BY holiday_date ASC').all();
    }
  },

  async createHoliday({ holiday_date, name, is_department_only }) {
    if (isSupabaseEnabled) {
      const { error } = await supabase.from('holidays').insert({
        holiday_date,
        name: name.trim(),
        is_department_only: is_department_only ? 1 : 0
      });
      if (error) throw error;
      return { success: true };
    } else {
      sqliteDb.prepare(`
        INSERT INTO holidays (holiday_date, name, is_department_only)
        VALUES (?, ?, ?)
      `).run(holiday_date, name.trim(), is_department_only ? 1 : 0);
      return { success: true };
    }
  },

  async deleteHoliday(id) {
    if (isSupabaseEnabled) {
      await supabase.from('holidays').delete().eq('id', id);
      return { success: true };
    } else {
      sqliteDb.prepare('DELETE FROM holidays WHERE id = ?').run(id);
      return { success: true };
    }
  },

  // ----------------------------------------------------
  // SHIFT TYPES
  // ----------------------------------------------------
  async getShiftTypes() {
    if (isSupabaseEnabled) {
      const { data } = await supabase.from('shift_types').select('*').order('id', { ascending: true });
      return data || [];
    } else {
      return sqliteDb.prepare('SELECT * FROM shift_types ORDER BY id ASC').all();
    }
  },

  async createShiftType(data) {
    const { code, name, start_time, end_time, color_bg, color_text, color_border, min_staff } = data;
    if (isSupabaseEnabled) {
      const { error } = await supabase.from('shift_types').insert({
        code: code.toUpperCase().trim(),
        name: name.trim(),
        start_time: start_time || '08:00',
        end_time: end_time || '16:00',
        color_bg: color_bg || '#f1f5f9',
        color_text: color_text || '#1e293b',
        color_border: color_border || '#cbd5e1',
        min_staff: min_staff || 1
      });
      if (error) throw new Error('รหัสเวรนี้มีอยู่แล้วในระบบ');
      return { success: true };
    } else {
      try {
        sqliteDb.prepare(`
          INSERT INTO shift_types (code, name, start_time, end_time, color_bg, color_text, color_border, min_staff)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          code.toUpperCase().trim(), name.trim(), start_time || '08:00', end_time || '16:00',
          color_bg || '#f1f5f9', color_text || '#1e293b', color_border || '#cbd5e1', min_staff || 1
        );
        return { success: true };
      } catch (err) {
        throw new Error('รหัสเวรนี้มีอยู่แล้วในระบบ');
      }
    }
  },

  async updateShiftType(id, data) {
    const { name, start_time, end_time, color_bg, color_text, color_border, min_staff } = data;
    if (isSupabaseEnabled) {
      await supabase.from('shift_types').update({
        name, start_time, end_time, color_bg, color_text, color_border, min_staff
      }).eq('id', id);
      return { success: true };
    } else {
      sqliteDb.prepare(`
        UPDATE shift_types 
        SET name = ?, start_time = ?, end_time = ?, color_bg = ?, color_text = ?, color_border = ?, min_staff = ?
        WHERE id = ?
      `).run(name, start_time, end_time, color_bg, color_text, color_border, min_staff, id);
      return { success: true };
    }
  },

  async deleteShiftType(id) {
    if (isSupabaseEnabled) {
      const { count: inUseCount } = await supabase.from('shifts').select('id', { count: 'exact', head: true }).eq('shift_type_id', id);
      if (inUseCount > 0) {
        throw new Error(`ไม่สามารถลบได้ เนื่องจากมีข้อมูลเวรในตารางใช้งานประเภทนี้อยู่ (${inUseCount} รายการ) กรุณาเปลี่ยนเวรในตารางก่อนลบ`);
      }
      await supabase.from('shift_types').delete().eq('id', id);
      return { success: true };
    } else {
      const inUseCount = sqliteDb.prepare('SELECT COUNT(*) as count FROM shifts WHERE shift_type_id = ?').get(id).count;
      if (inUseCount > 0) {
        throw new Error(`ไม่สามารถลบได้ เนื่องจากมีข้อมูลเวรในตารางใช้งานประเภทนี้อยู่ (${inUseCount} รายการ) กรุณาเปลี่ยนเวรในตารางก่อนลบ`);
      }
      sqliteDb.prepare('DELETE FROM shift_types WHERE id = ?').run(id);
      return { success: true };
    }
  },

  // ----------------------------------------------------
  // ADMIN USERS MANAGEMENT
  // ----------------------------------------------------
  async getAdminUsers() {
    if (isSupabaseEnabled) {
      const { data: users, error } = await supabase.from('users')
        .select('id, username, full_name, role, position, phone, created_at, shifts(count)')
        .order('id', { ascending: true });
      if (error) throw error;

      return (users || []).map(u => ({
        id: u.id,
        username: u.username,
        full_name: u.full_name,
        role: u.role,
        position: u.position,
        phone: u.phone,
        created_at: u.created_at,
        total_shifts: u.shifts?.[0]?.count || 0
      }));
    } else {
      return sqliteDb.prepare(`
        SELECT u.id, u.username, u.full_name, u.role, u.position, u.phone, u.created_at,
               COUNT(s.id) as total_shifts
        FROM users u
        LEFT JOIN shifts s ON u.id = s.user_id
        GROUP BY u.id
        ORDER BY u.id ASC
      `).all();
    }
  },

  async createAdminUser({ username, password, full_name, role, position, phone }) {
    const hash = bcrypt.hashSync(password, 10);
    if (isSupabaseEnabled) {
      const insertData = {
        username: username.trim().toLowerCase(),
        password_hash: hash,
        full_name: full_name.trim(),
        role: role || 'STAFF',
        position: position || '',
        phone: phone || '',
        must_change_password: 1
      };
      let { error } = await supabase.from('users').insert(insertData);
      if (error && error.code === '42703') {
        delete insertData.must_change_password;
        const retry = await supabase.from('users').insert(insertData);
        if (retry.error) throw new Error('ชื่อผู้ใช้งาน (Username) นี้มีอยู่แล้วในระบบ');
      } else if (error) {
        throw new Error('ชื่อผู้ใช้งาน (Username) นี้มีอยู่แล้วในระบบ');
      }
      return { success: true };
    } else {
      try {
        sqliteDb.prepare(`
          INSERT INTO users (username, password_hash, full_name, role, position, phone, must_change_password)
          VALUES (?, ?, ?, ?, ?, ?, 1)
        `).run(username.trim().toLowerCase(), hash, full_name.trim(), role || 'STAFF', position || '', phone || '');
        return { success: true };
      } catch (err) {
        throw new Error('ชื่อผู้ใช้งาน (Username) นี้มีอยู่แล้วในระบบ');
      }
    }
  },

  async updateAdminUser(id, { full_name, role, position, phone, new_password }) {
    if (isSupabaseEnabled) {
      const updateData = { full_name, role, position, phone };
      if (new_password) {
        updateData.password_hash = bcrypt.hashSync(new_password, 10);
        updateData.must_change_password = 1;
      }
      let { error } = await supabase.from('users').update(updateData).eq('id', id);
      if (error && error.code === '42703' && updateData.must_change_password) {
        delete updateData.must_change_password;
        await supabase.from('users').update(updateData).eq('id', id);
      }
      return { success: true };
    } else {
      if (new_password) {
        const hash = bcrypt.hashSync(new_password, 10);
        try {
          sqliteDb.prepare(`
            UPDATE users SET full_name = ?, role = ?, position = ?, phone = ?, password_hash = ?, must_change_password = 1
            WHERE id = ?
          `).run(full_name, role, position, phone, hash, id);
        } catch (e) {
          sqliteDb.prepare(`
            UPDATE users SET full_name = ?, role = ?, position = ?, phone = ?, password_hash = ?
            WHERE id = ?
          `).run(full_name, role, position, phone, hash, id);
        }
      } else {
        sqliteDb.prepare(`
          UPDATE users SET full_name = ?, role = ?, position = ?, phone = ?
          WHERE id = ?
        `).run(full_name, role, position, phone, id);
      }
      return { success: true };
    }
  },

  async deleteAdminUser(id, currentUserId) {
    if (parseInt(id) === currentUserId) {
      throw new Error('ไม่สามารถลบบัญชีของตนเองที่กำลังใช้งานอยู่ได้');
    }
    if (isSupabaseEnabled) {
      await supabase.from('users').delete().eq('id', id);
      return { success: true };
    } else {
      sqliteDb.prepare('DELETE FROM users WHERE id = ?').run(id);
      return { success: true };
    }
  }
};

module.exports = { dbAdapter };
