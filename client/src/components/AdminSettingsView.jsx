import React, { useState, useEffect } from 'react';
import { Settings, Plus, Edit2, Trash2, ShieldAlert, Users, Calendar, Clock, Key, Printer } from 'lucide-react';

export default function AdminSettingsView({
  currentUser,
  shiftTypes = [],
  holidays = [],
  onRefreshData,
  onShowToast,
  api,
  setActiveTab
}) {
  const isAdmin = currentUser?.role === 'ADMIN';

  // State for sub-tabs
  const [adminTab, setAdminTab] = useState('shifts'); // 'shifts', 'holidays', 'users'

  // Shift Types Form State
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [editingShiftId, setEditingShiftId] = useState(null);
  const [shiftForm, setShiftForm] = useState({
    code: '',
    name: '',
    start_time: '08:00',
    end_time: '16:00',
    color_bg: '#fef3c7',
    color_text: '#92400e',
    color_border: '#fde68a',
    min_staff: 1
  });

  // Holiday Form State
  const [showHolidayModal, setShowHolidayModal] = useState(false);
  const [holidayForm, setHolidayForm] = useState({
    holiday_date: '',
    name: '',
    is_department_only: false
  });

  // User Management State
  const [adminUsers, setAdminUsers] = useState([]);
  const [showUserModal, setShowUserModal] = useState(false);
  const [userForm, setUserForm] = useState({
    username: '',
    password: '',
    full_name: '',
    role: 'STAFF',
    position: '',
    phone: ''
  });

  // Load Admin Users
  useEffect(() => {
    if (isAdmin) {
      loadAdminUsers();
    }
  }, [isAdmin]);

  async function loadAdminUsers() {
    try {
      const data = await api.adminUsers.get();
      setAdminUsers(data);
    } catch (err) {
      console.error(err);
    }
  }

  // Handle Save Shift Type
  async function handleSaveShiftType(e) {
    e.preventDefault();
    try {
      if (editingShiftId) {
        await api.shiftTypes.update(editingShiftId, shiftForm);
        onShowToast('อัปเดตประเภทเวรเรียบร้อย');
      } else {
        await api.shiftTypes.create(shiftForm);
        onShowToast('เพิ่มประเภทเวรใหม่เรียบร้อย');
      }
      setShowShiftModal(false);
      setEditingShiftId(null);
      onRefreshData();
    } catch (err) {
      onShowToast(err.message, 'error');
    }
  }

  // Handle Delete Shift Type
  async function handleDeleteShiftType(id, name) {
    if (!window.confirm(`คุณต้องการลบประเภทเวร "${name}" ใช่หรือไม่?`)) return;
    try {
      await api.shiftTypes.delete(id);
      onShowToast(`ลบประเภทเวร "${name}" สำเร็จแล้ว`);
      onRefreshData();
    } catch (err) {
      onShowToast(err.message, 'error');
    }
  }

  // Handle Add Holiday
  async function handleSaveHoliday(e) {
    e.preventDefault();
    try {
      await api.holidays.create(holidayForm);
      onShowToast('เพิ่มวันหยุดเรียบร้อย');
      setShowHolidayModal(false);
      setHolidayForm({ holiday_date: '', name: '', is_department_only: false });
      onRefreshData();
    } catch (err) {
      onShowToast(err.message, 'error');
    }
  }

  // Handle Delete Holiday
  async function handleDeleteHoliday(id) {
    if (!window.confirm('คุณต้องการลบวันหยุดนี้ใช่หรือไม่?')) return;
    try {
      await api.holidays.delete(id);
      onShowToast('ลบวันหยุดเรียบร้อย');
      onRefreshData();
    } catch (err) {
      onShowToast(err.message, 'error');
    }
  }

  // Handle Add New Staff User
  async function handleSaveUser(e) {
    e.preventDefault();
    try {
      await api.adminUsers.create(userForm);
      onShowToast('เพิ่มผู้ใช้งานใหม่เรียบร้อย');
      setShowUserModal(false);
      setUserForm({ username: '', password: '', full_name: '', role: 'STAFF', position: '', phone: '' });
      loadAdminUsers();
      onRefreshData();
    } catch (err) {
      onShowToast(err.message, 'error');
    }
  }

  // Handle Delete User
  async function handleDeleteUser(userId, userName) {
    if (userId === currentUser?.id) {
      onShowToast('ไม่สามารถลบบัญชีของตนเองที่กำลังใช้งานอยู่ได้', 'error');
      return;
    }
    if (!window.confirm(`คุณต้องการลบพนักงาน "${userName}" ออกจากระบบใช่หรือไม่?`)) return;

    try {
      await api.adminUsers.delete(userId);
      onShowToast(`ลบผู้ใช้งาน "${userName}" เรียบร้อยแล้ว`);
      loadAdminUsers();
      onRefreshData();
    } catch (err) {
      onShowToast(err.message, 'error');
    }
  }

  return (
    <div className="space-y-6">
      
      {/* Admin Notice if viewing as normal Staff */}
      {!isAdmin && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              ขณะนี้คุณกำลังดูในฐานะพนักงานทั่วไป (Staff - View Only) เฉพาะผู้ดูแลระบบ (Admin) เท่านั้นที่สามารถเพิ่ม/แก้ไขการตั้งค่าได้
            </span>
          </div>
        </div>
      )}

      {/* Sub-tabs header */}
      <div className="flex justify-between items-center border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAdminTab('shifts')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
              adminTab === 'shifts'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>1. จัดการประเภทเวร (Shift Types)</span>
          </button>

          <button
            onClick={() => setAdminTab('holidays')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
              adminTab === 'holidays'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>2. จัดการวันหยุด (Holidays)</span>
          </button>

          <button
            onClick={() => setAdminTab('users')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
              adminTab === 'users'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>3. รายชื่อบุคลากร (Staff Accounts)</span>
          </button>
        </div>
        
        {isAdmin && (
          <button
            onClick={() => setActiveTab('export')}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-md transition"
          >
            <Printer className="w-4 h-4" />
            พิมพ์ตารางปฏิบัติงาน
          </button>
        )}
      </div>

      {/* ========================================================= */}
      {/* 1. SHIFT TYPES MANAGEMENT */}
      {/* ========================================================= */}
      {adminTab === 'shifts' && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex justify-between items-center border-b pb-3 border-slate-100">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">ประเภทเวรและกะการทำงาน (Shift Types)</h3>
              <p className="text-xs text-slate-500">กำหนดเวลาทำงาน สีป้ายกำกับ และจำนวนเจ้าหน้าที่ขั้นต่ำต่อกะ</p>
            </div>
            {isAdmin && (
              <button
                onClick={() => {
                  setEditingShiftId(null);
                  setShiftForm({
                    code: '',
                    name: '',
                    start_time: '08:00',
                    end_time: '16:00',
                    color_bg: '#fef3c7',
                    color_text: '#92400e',
                    color_border: '#fde68a',
                    min_staff: 1
                  });
                  setShowShiftModal(true);
                }}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ เพิ่มประเภทเวรใหม่</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {shiftTypes.map(st => (
              <div
                key={st.id}
                className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3 text-xs"
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <span
                      style={{ backgroundColor: st.color_bg, color: st.color_text, borderColor: st.color_border }}
                      className="px-2.5 py-1 rounded-lg font-bold border text-xs"
                    >
                      {st.code}
                    </span>
                    <div>
                      <h4 className="font-bold text-slate-900">{st.name}</h4>
                      <p className="text-slate-500 text-[11px]">
                        เวลา: {st.start_time} - {st.end_time} น.
                      </p>
                    </div>
                  </div>

                  {isAdmin && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setEditingShiftId(st.id);
                          setShiftForm({
                            code: st.code,
                            name: st.name,
                            start_time: st.start_time,
                            end_time: st.end_time,
                            color_bg: st.color_bg,
                            color_text: st.color_text,
                            color_border: st.color_border,
                            min_staff: st.min_staff
                          });
                          setShowShiftModal(true);
                        }}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition"
                        title="แก้ไขประเภทเวร"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleDeleteShiftType(st.id, st.name)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                        title="ลบประเภทเวรนี้"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex justify-between items-center text-[11px] pt-2 border-t border-slate-200/60 text-slate-500">
                  <span>เป้าหมายคนต่อกะ:</span>
                  <span className="font-semibold text-slate-700">{st.min_staff} คน</span>
                </div>
              </div>
            ))}
          </div>

          {/* Modal for Shift Type Add/Edit */}
          {showShiftModal && (
            <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4 shadow-xl text-xs">
                <h3 className="font-bold text-slate-900 text-sm">
                  {editingShiftId ? 'แก้ไขประเภทเวร' : 'เพิ่มประเภทเวรใหม่'}
                </h3>

                <form onSubmit={handleSaveShiftType} className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-medium text-slate-700 mb-1">รหัสเวร (Code)</label>
                      <input
                        type="text"
                        required
                        disabled={!!editingShiftId}
                        value={shiftForm.code}
                        onChange={(e) => setShiftForm({ ...shiftForm, code: e.target.value.toUpperCase() })}
                        placeholder="เช่น OT, SP"
                        className="w-full p-2 border rounded-xl border-slate-200"
                      />
                    </div>
                    <div>
                      <label className="block font-medium text-slate-700 mb-1">ชื่อเวร</label>
                      <input
                        type="text"
                        required
                        value={shiftForm.name}
                        onChange={(e) => setShiftForm({ ...shiftForm, name: e.target.value })}
                        placeholder="เช่น เวรล่วงเวลา"
                        className="w-full p-2 border rounded-xl border-slate-200"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-medium text-slate-700 mb-1">เวลาเริ่ม</label>
                      <input
                        type="text"
                        value={shiftForm.start_time}
                        onChange={(e) => setShiftForm({ ...shiftForm, start_time: e.target.value })}
                        placeholder="08:00"
                        className="w-full p-2 border rounded-xl border-slate-200"
                      />
                    </div>
                    <div>
                      <label className="block font-medium text-slate-700 mb-1">เวลาสิ้นสุด</label>
                      <input
                        type="text"
                        value={shiftForm.end_time}
                        onChange={(e) => setShiftForm({ ...shiftForm, end_time: e.target.value })}
                        placeholder="16:00"
                        className="w-full p-2 border rounded-xl border-slate-200"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-medium text-slate-700 mb-1">สีพื้นหลัง (Hex)</label>
                      <div className="flex gap-2 items-center">
                        <input
                          type="color"
                          value={shiftForm.color_bg}
                          onChange={(e) => setShiftForm({ ...shiftForm, color_bg: e.target.value })}
                          className="w-8 h-8 rounded border border-slate-200 cursor-pointer"
                        />
                        <input
                          type="text"
                          value={shiftForm.color_bg}
                          onChange={(e) => setShiftForm({ ...shiftForm, color_bg: e.target.value })}
                          className="w-full p-2 border rounded-xl border-slate-200 text-xs"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block font-medium text-slate-700 mb-1">สีตัวอักษร (Hex)</label>
                      <div className="flex gap-2 items-center">
                        <input
                          type="color"
                          value={shiftForm.color_text}
                          onChange={(e) => setShiftForm({ ...shiftForm, color_text: e.target.value })}
                          className="w-8 h-8 rounded border border-slate-200 cursor-pointer"
                        />
                        <input
                          type="text"
                          value={shiftForm.color_text}
                          onChange={(e) => setShiftForm({ ...shiftForm, color_text: e.target.value })}
                          className="w-full p-2 border rounded-xl border-slate-200 text-xs"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowShiftModal(false)}
                      className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl"
                    >
                      ยกเลิก
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-semibold"
                    >
                      บันทึก
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. HOLIDAYS MANAGEMENT */}
      {/* ========================================================= */}
      {adminTab === 'holidays' && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex justify-between items-center border-b pb-3 border-slate-100">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">กำหนดวันหยุดนักขัตฤกษ์ & วันหยุดแผนก</h3>
              <p className="text-xs text-slate-500">วันหยุดจะแสดงไฮไลต์สีแดงอ่อนในตารางรวมของทุกคน</p>
            </div>
            {isAdmin && (
              <button
                onClick={() => setShowHolidayModal(true)}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold transition flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ เพิ่มวันหยุด</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
            {holidays.map(h => (
              <div
                key={h.id}
                className="p-3.5 rounded-xl border border-rose-100 bg-rose-50/40 flex justify-between items-center"
              >
                <div className="space-y-1">
                  <div className="font-bold text-rose-900 flex items-center gap-1.5">
                    <span>🎌</span>
                    <span>{h.name}</span>
                  </div>
                  <div className="text-[11px] text-rose-600 font-medium">
                    📅 {h.holiday_date} {h.is_department_only === 1 && '(วันหยุดเฉพาะแผนก)'}
                  </div>
                </div>

                {isAdmin && (
                  <button
                    onClick={() => handleDeleteHoliday(h.id)}
                    className="p-1 text-rose-400 hover:text-rose-700 rounded transition"
                    title="ลบวันหยุด"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Modal for Adding Holiday */}
          {showHolidayModal && (
            <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4 shadow-xl text-xs">
                <h3 className="font-bold text-slate-900 text-sm">เพิ่มวันหยุดใหม่</h3>
                <form onSubmit={handleSaveHoliday} className="space-y-3">
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">วันที่วันหยุด</label>
                    <input
                      type="date"
                      required
                      value={holidayForm.holiday_date}
                      onChange={(e) => setHolidayForm({ ...holidayForm, holiday_date: e.target.value })}
                      className="w-full p-2 border rounded-xl border-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">ชื่อวันหยุด</label>
                    <input
                      type="text"
                      required
                      placeholder="เช่น วันหยุดสิ้นปี, วันบำรุงรักษาระบบ"
                      value={holidayForm.name}
                      onChange={(e) => setHolidayForm({ ...holidayForm, name: e.target.value })}
                      className="w-full p-2 border rounded-xl border-slate-200"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="isDept"
                      checked={holidayForm.is_department_only}
                      onChange={(e) => setHolidayForm({ ...holidayForm, is_department_only: e.target.checked })}
                      className="rounded text-rose-600"
                    />
                    <label htmlFor="isDept" className="text-slate-700 font-medium">
                      เป็นวันหยุดเฉพาะแผนก (ไม่ใช่ราชการ)
                    </label>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowHolidayModal(false)}
                      className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl"
                    >
                      ยกเลิก
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-rose-600 text-white rounded-xl font-semibold"
                    >
                      บันทึกวันหยุด
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* 3. STAFF ACCOUNTS MANAGEMENT */}
      {/* ========================================================= */}
      {adminTab === 'users' && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex justify-between items-center border-b pb-3 border-slate-100">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">รายชื่อบุคลากรและสิทธิ์การใช้งาน (Staff Accounts)</h3>
              <p className="text-xs text-slate-500">จัดการข้อมูลผู้ใช้งานในแผนกและสิทธิ์การเข้าถึงระบบ</p>
            </div>
            {isAdmin && (
              <button
                onClick={() => setShowUserModal(true)}
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ เพิ่มพนักงานใหม่</span>
              </button>
            )}
          </div>

          <div className="overflow-x-auto text-xs">
            <table className="w-full text-left">
              <thead>
                <tr className="text-slate-500 border-b border-slate-200 pb-2">
                  <th className="pb-2">ชื่อ - สกุล</th>
                  <th className="pb-2">Username</th>
                  <th className="pb-2">ตำแหน่ง</th>
                  <th className="pb-2">เบอร์โทรศัพท์</th>
                  <th className="pb-2">สิทธิ์ระบบ</th>
                  <th className="pb-2">เวรทั้งหมด</th>
                  {isAdmin && <th className="pb-2 text-right">การจัดการ</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {adminUsers.map(u => (
                  <tr key={u.id} className="hover:bg-slate-50">
                    <td className="py-3 font-semibold flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                        {u.full_name?.charAt(0)}
                      </div>
                      <span>{u.full_name}</span>
                    </td>
                    <td><code className="bg-slate-100 px-1.5 py-0.5 rounded text-[11px]">{u.username}</code></td>
                    <td>{u.position || '-'}</td>
                    <td>{u.phone || '-'}</td>
                    <td>
                      {u.role === 'ADMIN' ? (
                        <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 font-bold text-[10px]">
                          Administrator
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold text-[10px]">
                          Staff
                        </span>
                      )}
                    </td>
                    <td>{u.total_shifts || 0} กะ</td>
                    {isAdmin && (
                      <td className="text-right">
                        {u.id !== currentUser?.id ? (
                          <button
                            onClick={() => handleDeleteUser(u.id, u.full_name)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                            title={`ลบพนักงาน ${u.full_name}`}
                          >
                            <Trash2 className="w-3.5 h-3.5 inline" />
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">(บัญชีปัจจุบัน)</span>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Modal for Adding New User */}
          {showUserModal && (
            <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4 shadow-xl text-xs">
                <h3 className="font-bold text-slate-900 text-sm">เพิ่มบัญชีพนักงานใหม่</h3>
                <form onSubmit={handleSaveUser} className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-medium text-slate-700 mb-1">Username (เข้าสู่ระบบ)</label>
                      <input
                        type="text"
                        required
                        placeholder="เช่น somchai"
                        value={userForm.username}
                        onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
                        className="w-full p-2 border rounded-xl border-slate-200"
                      />
                    </div>
                    <div>
                      <label className="block font-medium text-slate-700 mb-1">รหัสผ่าน (Password)</label>
                      <input
                        type="password"
                        required
                        placeholder="รหัสผ่านเริ่มต้น"
                        value={userForm.password}
                        onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                        className="w-full p-2 border rounded-xl border-slate-200"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-medium text-slate-700 mb-1">ชื่อ - นามสกุลจริง</label>
                    <input
                      type="text"
                      required
                      placeholder="เช่น สมศักดิ์ มีสุข"
                      value={userForm.full_name}
                      onChange={(e) => setUserForm({ ...userForm, full_name: e.target.value })}
                      className="w-full p-2 border rounded-xl border-slate-200"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-medium text-slate-700 mb-1">ตำแหน่งงาน</label>
                      <input
                        type="text"
                        placeholder="เช่น System Admin"
                        value={userForm.position}
                        onChange={(e) => setUserForm({ ...userForm, position: e.target.value })}
                        className="w-full p-2 border rounded-xl border-slate-200"
                      />
                    </div>
                    <div>
                      <label className="block font-medium text-slate-700 mb-1">สิทธิ์การใช้งาน (Role)</label>
                      <select
                        value={userForm.role}
                        onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                        className="w-full p-2 border rounded-xl border-slate-200"
                      >
                        <option value="STAFF">พนักงานทั่วไป (Staff)</option>
                        <option value="ADMIN">ผู้ดูแลระบบ (Admin)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block font-medium text-slate-700 mb-1">เบอร์โทรศัพท์ติดต่อ</label>
                    <input
                      type="text"
                      placeholder="08X-XXX-XXXX"
                      value={userForm.phone}
                      onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })}
                      className="w-full p-2 border rounded-xl border-slate-200"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowUserModal(false)}
                      className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl"
                    >
                      ยกเลิก
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-slate-900 text-white rounded-xl font-semibold"
                    >
                      สร้างบัญชี
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
