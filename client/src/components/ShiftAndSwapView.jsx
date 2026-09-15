import React, { useState, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, RefreshCw, 
  Check, X, Plus, AlertCircle, Clock, Send, CheckCircle2, UserCheck, Shield 
} from 'lucide-react';

export default function ShiftAndSwapView({
  currentUser,
  allUsers = [],
  shifts = [],
  shiftTypes = [],
  holidays = [],
  swaps = [],
  currentMonthStr, // 'YYYY-MM'
  onChangeMonth,
  onRefreshData,
  onShowToast,
  api
}) {
  // Sub-tab: 'calendar' (ปฏิทินลงเวร) | 'swaps' (กล่องคำขอสลับเวร)
  const [activeSubTab, setActiveSubTab] = useState('calendar');

  // Modal State for Quick Shift Booking directly on calendar date click
  const [selectedDateForModal, setSelectedDateForModal] = useState(null);
  const [selectedShiftTypeId, setSelectedShiftTypeId] = useState(shiftTypes[0]?.id || 1);
  const [bookingNote, setBookingNote] = useState('');
  const [isSavingShift, setIsSavingShift] = useState(false);

  // Swap Request Form State
  const [swapModalOpen, setSwapModalOpen] = useState(false);
  const [swapDate, setSwapDate] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  });
  const [swapTargetUserId, setSwapTargetUserId] = useState('');
  const [swapReason, setSwapReason] = useState('');
  const [isSubmittingSwap, setIsSubmittingSwap] = useState(false);

  // Rejection note state
  const [rejectId, setRejectId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  // Parse Month & Year
  const [year, month] = useMemo(() => {
    const parts = (currentMonthStr || '2026-09').split('-');
    return [parseInt(parts[0]), parseInt(parts[1])];
  }, [currentMonthStr]);

  const thaiDayNames = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
  const thaiMonthNames = [
    '', 'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];

  const todayStr = useMemo(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  }, []);

  // Holidays lookup map
  const holidayMap = useMemo(() => {
    const map = {};
    (holidays || []).forEach(h => {
      map[h.holiday_date] = h;
    });
    return map;
  }, [holidays]);

  // Current User's Shifts lookup map: dateStr -> shift object
  const myShiftsMap = useMemo(() => {
    const map = {};
    (shifts || []).filter(s => s.user_id === currentUser?.id).forEach(s => {
      map[s.shift_date] = s;
    });
    return map;
  }, [shifts, currentUser]);

  // Count my shifts this month
  const myShiftsSummary = useMemo(() => {
    const list = Object.values(myShiftsMap);
    const countByCode = {};
    let total = 0;
    list.forEach(s => {
      if (s.shift_code !== 'OFF') total++;
      countByCode[s.shift_code] = (countByCode[s.shift_code] || 0) + 1;
    });
    return { total, countByCode };
  }, [myShiftsMap]);

  // Generate Calendar Days Grid (Sunday -> Saturday)
  const calendarCells = useMemo(() => {
    const daysInMonth = new Date(year, month, 0).getDate();
    const firstDayOfWeek = new Date(year, month - 1, 1).getDay(); // 0 = Sun, 1 = Mon ...

    const cells = [];

    // Empty padding cells for days before the 1st
    for (let i = 0; i < firstDayOfWeek; i++) {
      cells.push({ isPadding: true, key: `pad-prev-${i}` });
    }

    // Days in current month
    for (let d = 1; d <= daysInMonth; d++) {
      const dayStr = String(d).padStart(2, '0');
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${dayStr}`;
      const dayOfWeek = new Date(year, month - 1, d).getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const isToday = dateStr === todayStr;
      const holiday = holidayMap[dateStr];
      const shift = myShiftsMap[dateStr];

      cells.push({
        isPadding: false,
        key: dateStr,
        dayNumber: d,
        dateStr,
        dayOfWeek,
        isWeekend,
        isToday,
        holiday,
        shift
      });
    }

    // Trailing padding cells to complete 7-column grid
    const remaining = 7 - (cells.length % 7);
    if (remaining < 7) {
      for (let i = 0; i < remaining; i++) {
        cells.push({ isPadding: true, key: `pad-next-${i}` });
      }
    }

    return cells;
  }, [year, month, holidayMap, myShiftsMap, todayStr]);

  // Pending swap requests where target_user_id === currentUser.id
  const pendingRequestsForMe = useMemo(() => {
    return swaps.filter(sw => sw.target_user_id === currentUser?.id && sw.status === 'PENDING');
  }, [swaps, currentUser]);

  // Pending swap requests sent by me
  const pendingRequestsSentByMe = useMemo(() => {
    return swaps.filter(sw => sw.requester_id === currentUser?.id && sw.status === 'PENDING');
  }, [swaps, currentUser]);

  // Historical swaps
  const historicalSwaps = useMemo(() => {
    return swaps.filter(sw => sw.status !== 'PENDING');
  }, [swaps]);

  // Open modal when clicking any date cell on the calendar
  function handleCellClick(dateStr) {
    const existing = myShiftsMap[dateStr];
    setSelectedDateForModal(dateStr);
    setSelectedShiftTypeId(existing ? existing.shift_type_id : (shiftTypes[0]?.id || 1));
    setBookingNote(existing?.note || '');
  }

  // Handle Save Shift from Calendar Modal
  async function handleSaveShiftFromModal(e) {
    e.preventDefault();
    if (!selectedDateForModal) return;

    try {
      setIsSavingShift(true);
      await api.shifts.save({
        shift_date: selectedDateForModal,
        shift_type_id: parseInt(selectedShiftTypeId),
        note: bookingNote
      });
      onShowToast(`บันทึกเวรวันที่ ${selectedDateForModal} เรียบร้อยแล้ว`);
      setSelectedDateForModal(null);
      onRefreshData();
    } catch (err) {
      onShowToast(err.message, 'error');
    } finally {
      setIsSavingShift(false);
    }
  }

  // Open Swap Form with preselected date from modal
  function handleOpenSwapFromModal(dateStr) {
    setSelectedDateForModal(null);
    setSwapDate(dateStr);
    setActiveSubTab('swaps');
  }

  // Handle Request Swap submission
  async function handleRequestSwap(e) {
    e.preventDefault();
    if (!swapTargetUserId) {
      onShowToast('กรุณาเลือกเพื่อนร่วมงานที่ต้องการสลับเวรด้วย', 'error');
      return;
    }

    const myShift = myShiftsMap[swapDate];
    if (!myShift) {
      onShowToast('คุณยังไม่มีเวรในวันที่เลือก ไม่สามารถขอสลับเวรได้', 'error');
      return;
    }

    try {
      setIsSubmittingSwap(true);
      await api.swaps.request({
        target_user_id: parseInt(swapTargetUserId),
        shift_date: swapDate,
        reason: swapReason
      });
      onShowToast('ส่งคำขอสลับเวรเรียบร้อยแล้ว รอการอนุมัติจากเพื่อนร่วมงาน');
      setSwapReason('');
      onRefreshData();
    } catch (err) {
      onShowToast(err.message, 'error');
    } finally {
      setIsSubmittingSwap(false);
    }
  }

  // Handle Approve Swap
  async function handleApproveSwap(swapId) {
    try {
      await api.swaps.approve(swapId);
      onShowToast('อนุมัติการสลับเวรสำเร็จ! ตารางเวรอัปเดตพร้อมตราประทับสลับเวร 🔄');
      onRefreshData();
    } catch (err) {
      onShowToast(err.message, 'error');
    }
  }

  // Handle Reject Swap
  async function handleRejectSwap(swapId) {
    try {
      await api.swaps.reject(swapId, rejectReason || 'ไม่สะดวกสลับเวร');
      onShowToast('ปฏิเสธคำขอสลับเวรแล้ว');
      setRejectId(null);
      setRejectReason('');
      onRefreshData();
    } catch (err) {
      onShowToast(err.message, 'error');
    }
  }

  return (
    <div className="space-y-6">
      
      {/* Top Banner Alert for Incoming Pending Swaps */}
      {pendingRequestsForMe.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 shadow-xs flex flex-wrap items-center justify-between gap-3 animate-pulse">
          <div className="flex items-center gap-2.5 text-xs text-amber-950">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
            <span className="font-bold text-sm">คุณมี {pendingRequestsForMe.length} คำขอสลับเวรที่รอการอนุมัติ!</span>
            <span className="text-amber-800">เพื่อนร่วมงานกำลังรอความยินยอมของคุณ</span>
          </div>
          <button
            onClick={() => setActiveSubTab('swaps')}
            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
          >
            เปิดดูคำขอเพื่ออนุมัติ &gt;
          </button>
        </div>
      )}

      {/* Sub-tab Navigation */}
      <div className="flex items-center justify-between flex-wrap gap-4 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveSubTab('calendar')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              activeSubTab === 'calendar'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <CalendarIcon className="w-4 h-4" />
            <span>📅 ปฏิทินลงเวรของฉัน (กดลงเวรในปฏิทินได้เลย)</span>
          </button>

          <button
            onClick={() => setActiveSubTab('swaps')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 relative ${
              activeSubTab === 'swaps'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <RefreshCw className="w-4 h-4" />
            <span>🔄 คำขอสลับเวร & การอนุมัติ</span>
            {pendingRequestsForMe.length > 0 && (
              <span className="bg-amber-400 text-amber-950 text-[11px] px-2 py-0.2 rounded-full font-black">
                {pendingRequestsForMe.length}
              </span>
            )}
          </button>
        </div>

        {/* User Info */}
        <div className="text-xs text-slate-500 flex items-center gap-2">
          <span>ผู้ใช้งาน:</span>
          <span className="font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg">
            {currentUser?.full_name} ({currentUser?.role === 'ADMIN' ? 'Admin' : 'Staff'})
          </span>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 1. VISUAL MONTHLY CALENDAR VIEW (CLICK CELL TO BOOK SHIFT) */}
      {/* ==================================================================== */}
      {activeSubTab === 'calendar' && (
        <div className="space-y-4">
          
          {/* Calendar Toolbar */}
          <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col lg:flex-row justify-between items-center gap-4 lg:gap-3">
            
            {/* Month Navigation */}
            <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3 w-full lg:w-auto justify-center lg:justify-start">
              <div className="flex items-center justify-between sm:justify-start bg-slate-100 rounded-xl p-1 border border-slate-200 w-full sm:w-auto">
                <button
                  onClick={() => onChangeMonth(-1)}
                  title="เดือนก่อนหน้า"
                  className="px-3 py-1.5 rounded-lg text-slate-600 hover:bg-white text-xs font-semibold transition"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-4 py-1 text-sm font-bold text-slate-800 flex items-center gap-1.5 justify-center flex-1 sm:flex-none">
                  <CalendarIcon className="w-4 h-4 text-indigo-600" />
                  {thaiMonthNames[month]} {year + 543}
                </span>
                <button
                  onClick={() => onChangeMonth(1)}
                  title="เดือนถัดไป"
                  className="px-3 py-1.5 rounded-lg text-slate-600 hover:bg-white text-xs font-semibold transition"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <button
                onClick={() => {
                  const now = new Date();
                  const curStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
                  if (curStr !== currentMonthStr) {
                    onChangeMonth(0, curStr);
                  }
                }}
                className="w-full sm:w-auto px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-200 transition"
              >
                เดือนปัจจุบัน
              </button>
            </div>

            {/* Quick Summary of User's Shifts */}
            <div className="flex items-center justify-center flex-wrap gap-2 text-xs w-full lg:w-auto flex-1">
              <span className="text-slate-500 font-medium">เวรของคุณเดือนนี้:</span>
              <span className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-800 font-bold border border-indigo-200">
                รวม {myShiftsSummary.total} กะ
              </span>
              {Object.entries(myShiftsSummary.countByCode).map(([code, count]) => {
                const sType = shiftTypes.find(t => t.code === code);
                return (
                  <span
                    key={code}
                    style={{ backgroundColor: sType?.color_bg, color: sType?.color_text, borderColor: sType?.color_border }}
                    className="px-2 py-0.5 rounded-md font-semibold border text-[11px]"
                  >
                    {code}: {count}
                  </span>
                );
              })}
            </div>

          </div>

          {/* Hint */}
          <div className="text-[11px] text-slate-500 flex items-center gap-1 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 text-amber-800">
            <span>💡 คลิกที่ช่องวันในปฏิทิน เพื่อลงเวรหรือเปลี่ยนเวรได้ทันที</span>
          </div>

          {/* 7-Columns Calendar Grid */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            
            {/* Day of Week Headers */}
            <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-slate-700 font-semibold text-xs text-center py-2.5">
              <div className="text-rose-600 font-bold bg-rose-50/80 py-1 rounded-lg mx-1 border border-rose-100">อาทิตย์ (อา.)</div>
              <div className="py-1">จันทร์ (จ.)</div>
              <div className="py-1">อังคาร (อ.)</div>
              <div className="py-1">พุธ (พ.)</div>
              <div className="py-1">พฤหัสฯ (พฤ.)</div>
              <div className="py-1">ศุกร์ (ศ.)</div>
              <div className="text-rose-600 font-bold bg-rose-50/80 py-1 rounded-lg mx-1 border border-rose-100">เสาร์ (ส.)</div>
            </div>

            {/* Calendar Cells */}
            <div className="grid grid-cols-7 divide-x divide-y divide-slate-100 min-h-[520px]">
              {calendarCells.map((cell) => {
                if (cell.isPadding) {
                  return (
                    <div key={cell.key} className="bg-slate-50/40 min-h-[95px] p-2 select-none" />
                  );
                }

                const { dayNumber, dateStr, isToday, isWeekend, holiday, shift } = cell;

                return (
                  <div
                    key={cell.key}
                    onClick={() => handleCellClick(dateStr)}
                    className={`min-h-[100px] p-2 relative flex flex-col justify-between transition group cursor-pointer hover:bg-indigo-50/40 hover:border-indigo-300 ${
                      isToday ? 'bg-indigo-50/30 ring-2 ring-indigo-400 inset-0' : (holiday ? 'bg-rose-50/20' : (isWeekend ? 'bg-rose-50/35' : 'bg-white'))
                    }`}
                  >
                    {/* Top Row of Cell: Day Number & Holiday Tag */}
                    <div className="flex justify-between items-start">
                      <span className={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center ${
                        isToday ? 'bg-indigo-600 text-white shadow-2xs' : (isWeekend ? 'text-rose-600 font-extrabold bg-rose-100/70' : 'text-slate-800')
                      }`}>
                        {dayNumber}
                      </span>

                      {holiday && (
                        <span
                          className="text-[9px] px-1.5 py-0.5 bg-rose-100 text-rose-800 rounded font-semibold truncate max-w-[80px]"
                          title={holiday.name}
                        >
                          🎌 {holiday.name}
                        </span>
                      )}
                    </div>

                    {/* Middle: Shift Information (If booked) */}
                    <div className="my-1.5 flex-1 flex flex-col justify-center">
                      {shift ? (
                        <div
                          style={{
                            backgroundColor: shift.color_bg,
                            color: shift.color_text,
                            borderColor: shift.color_border
                          }}
                          className="p-1.5 rounded-xl border shadow-2xs text-center space-y-0.5 transition group-hover:scale-102"
                        >
                          <div className="font-bold text-xs flex items-center justify-center gap-1">
                            <span>{shift.shift_code}</span>
                            <span className="text-[11px] font-normal truncate">({shift.shift_name.split(' ')[0]})</span>
                          </div>
                          <div className="text-[9px] opacity-75">{shift.start_time} - {shift.end_time}</div>

                          {/* Swapped Badge */}
                          {shift.is_swapped === 1 && (
                            <div className="mt-1 bg-purple-100 text-purple-800 text-[9px] font-bold px-1 py-0.5 rounded border border-purple-200 flex items-center justify-center gap-0.5">
                              <RefreshCw className="w-2.5 h-2.5" />
                              <span className="truncate">สลับ: {shift.swapped_with_name?.split(' ')[0]}</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="h-full flex items-center justify-center border border-dashed border-slate-200 rounded-xl text-slate-300 text-[11px] group-hover:border-indigo-300 group-hover:text-indigo-600 transition">
                          <Plus className="w-3.5 h-3.5 mr-0.5" />
                          <span>ลงเวร</span>
                        </div>
                      )}
                    </div>

                    {/* Bottom Row Hint on Hover */}
                    <div className="text-[10px] text-slate-400 opacity-0 group-hover:opacity-100 transition text-right">
                      คลิกเพื่อแก้ไข
                    </div>

                  </div>
                );
              })}
            </div>

          </div>

        </div>
      )}

      {/* ==================================================================== */}
      {/* 2. QUICK BOOKING MODAL (POPUP ON DATE CLICK) */}
      {/* ==================================================================== */}
      {selectedDateForModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl border border-slate-200 text-xs">
            
            {/* Modal Header */}
            <div className="flex justify-between items-start border-b pb-3 border-slate-100">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 block">
                  บันทึกการลงเวลาเวรของฉัน
                </span>
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-1.5 mt-0.5">
                  <CalendarIcon className="w-4 h-4 text-indigo-600" />
                  <span>วันที่ {selectedDateForModal}</span>
                </h3>
              </div>
              <button
                onClick={() => setSelectedDateForModal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Current Status on Date */}
            {myShiftsMap[selectedDateForModal] ? (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center text-xs">
                <div>
                  <span className="text-slate-500 block text-[11px]">เวรที่ลงไว้ปัจจุบัน:</span>
                  <span className="font-bold text-slate-800">
                    {myShiftsMap[selectedDateForModal].shift_name} ({myShiftsMap[selectedDateForModal].shift_code})
                  </span>
                </div>
                {myShiftsMap[selectedDateForModal].is_swapped === 1 && (
                  <span className="px-2 py-0.5 bg-purple-100 text-purple-800 text-[10px] font-bold rounded">
                    🔄 สลับกับ {myShiftsMap[selectedDateForModal].swapped_with_name}
                  </span>
                )}
              </div>
            ) : (
              <div className="p-2.5 bg-indigo-50/60 rounded-xl border border-indigo-100 text-indigo-800 text-[11px]">
                ℹ️ ยังไม่ได้ลงเวลาเวรในวันนี้ กรุณาเลือกกะการทำงานด้านล่าง
              </div>
            )}

            {/* Shift Type Fast Picker Grid */}
            <form onSubmit={handleSaveShiftFromModal} className="space-y-4">
              <div>
                <label className="block font-medium text-slate-700 mb-2">
                  เลือกประเภทกะการทำงานที่ต้องการ:
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  {shiftTypes.map(st => {
                    const isSelected = parseInt(selectedShiftTypeId) === st.id;
                    return (
                      <button
                        type="button"
                        key={st.id}
                        onClick={() => setSelectedShiftTypeId(st.id)}
                        style={{
                          backgroundColor: isSelected ? st.color_bg : '#ffffff',
                          borderColor: isSelected ? st.color_text : '#e2e8f0',
                        }}
                        className={`p-3 rounded-2xl border text-left transition flex flex-col justify-between ${
                          isSelected ? 'ring-2 ring-indigo-500 shadow-sm' : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <span
                            style={{ color: st.color_text }}
                            className="font-black text-sm"
                          >
                            {st.code}
                          </span>
                          {isSelected && (
                            <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                          )}
                        </div>
                        <div className="mt-1">
                          <div className="font-bold text-slate-900 text-xs">{st.name}</div>
                          <div className="text-[10px] text-slate-500">{st.start_time} - {st.end_time}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">หมายเหตุเพิ่มเติม (ถ้ามี):</label>
                <input
                  type="text"
                  placeholder="เช่น ติดงานประชุมเช้า, สลับเวลากับทีมสำรอง"
                  value={bookingNote}
                  onChange={(e) => setBookingNote(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                {myShiftsMap[selectedDateForModal] ? (
                  <button
                    type="button"
                    onClick={() => handleOpenSwapFromModal(selectedDateForModal)}
                    className="px-3 py-2 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-xl text-xs font-semibold flex items-center gap-1 transition"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>ขอสลับเวรวันนี้</span>
                  </button>
                ) : <div />}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedDateForModal(null)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingShift}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition disabled:opacity-50"
                  >
                    {isSavingShift ? 'กำลังบันทึก...' : 'บันทึกการลงเวร'}
                  </button>
                </div>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 3. SHIFT SWAP CENTER & APPROVALS (TAB 2) */}
      {/* ==================================================================== */}
      {activeSubTab === 'swaps' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Create Swap Request Form (5 Cols) */}
          <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-purple-200 shadow-xs space-y-4">
            <div className="border-b pb-3 border-purple-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-purple-100 text-purple-700">
                  <RefreshCw className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">สร้างคำขอสลับเวรกับเพื่อน</h3>
                  <p className="text-xs text-slate-500">ระบบส่งคำขอให้เพื่อนยินยอมก่อนเปลี่ยนเวร</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleRequestSwap} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">1. เลือกวันที่ต้องการสลับเวร</label>
                <input
                  type="date"
                  value={swapDate}
                  onChange={(e) => setSwapDate(e.target.value)}
                  required
                  className="w-full px-3 py-2 border rounded-xl border-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-500 text-xs bg-purple-50/20"
                />
                <div className="mt-1 text-[11px] text-slate-500">
                  เวรของคุณในวันนี้: {myShiftsMap[swapDate] ? (
                    <span className="font-bold text-indigo-700">
                      {myShiftsMap[swapDate].shift_name} ({myShiftsMap[swapDate].shift_code})
                    </span>
                  ) : (
                    <span className="text-rose-500 font-semibold">⚠️ คุณยังไม่มีเวรในวันนี้ (กรุณาลงเวรก่อน)</span>
                  )}
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">2. เลือกเพื่อนร่วมงานที่ต้องการสลับเวรด้วย</label>
                <select
                  value={swapTargetUserId}
                  onChange={(e) => setSwapTargetUserId(e.target.value)}
                  required
                  className="w-full px-3 py-2 border rounded-xl border-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-500 text-xs bg-white"
                >
                  <option value="">-- เลือกเพื่อนร่วมงาน --</option>
                  {allUsers.filter(u => u.id !== currentUser?.id).map(u => (
                    <option key={u.id} value={u.id}>
                      {u.full_name} ({u.position || 'เจ้าหน้าที่'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">3. เหตุผลในการขอสลับเวร</label>
                <input
                  type="text"
                  placeholder="เช่น ติดภารกิจด่วน, นัดตรวจสุขภาพ, แลกกะช่วยงาน"
                  value={swapReason}
                  onChange={(e) => setSwapReason(e.target.value)}
                  required
                  className="w-full px-3 py-2 border rounded-xl border-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-500 text-xs"
                />
              </div>

              <div className="p-3 bg-purple-50 rounded-xl border border-purple-100 text-[11px] text-purple-900 leading-relaxed">
                💡 <b>เงื่อนไข:</b> เมื่อส่งคำขอแล้ว ระบบจะแจ้งเตือนไปยังเพื่อนร่วมงานปลายทาง และจะยังไม่สลับเวรจนกว่าเพื่อนจะกด <b>"อนุมัติ"</b> เมื่ออนุมัติแล้วระบบจะประทับตรา <b>🔄 สลับเวร</b> ในตารางรวม
              </div>

              <button
                type="submit"
                disabled={isSubmittingSwap || !myShiftsMap[swapDate]}
                className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl transition shadow-xs flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSubmittingSwap ? 'กำลังส่งคำขอ...' : 'ส่งคำขอสลับเวร'}</span>
              </button>
            </form>
          </div>

          {/* Pending Inboxes & History (7 Cols) */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Pending Approvals Inbox */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b pb-3 border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                  <h3 className="font-bold text-slate-900 text-sm">
                    คำขอสลับเวรที่รอคุณอนุมัติ ({pendingRequestsForMe.length})
                  </h3>
                </div>
                <span className="text-xs text-slate-400">ต้องการความยินยอมของคุณ</span>
              </div>

              {pendingRequestsForMe.length === 0 ? (
                <div className="p-6 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-xs">
                  🎉 ไม่มีคำขอสลับเวรที่รอการอนุมัติในขณะนี้
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingRequestsForMe.map(req => (
                    <div key={req.id} className="p-4 rounded-xl border border-amber-200 bg-amber-50/50 space-y-3 text-xs">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-amber-200 text-amber-900 font-bold text-[10px]">
                            รอคุณอนุมัติ
                          </span>
                          <span className="font-bold text-slate-800 text-sm">
                            {req.requester_name} ขอสลับเวรกับคุณ
                          </span>
                        </div>
                        <span className="text-slate-400 text-[11px]">{req.created_at}</span>
                      </div>

                      <div className="bg-white p-3 rounded-xl border border-amber-100 space-y-1 text-slate-700">
                        <div>📅 วันที่เวร: <b>{req.shift_date}</b></div>
                        <div>
                          {req.requester_name}: <b>{req.requester_shift_name}</b> 🔁 แลกกับเวรของคุณ: <b className="text-indigo-700">{req.target_shift_name}</b>
                        </div>
                        {req.reason && <div className="text-slate-500 italic text-[11px]">💬 เหตุผล: "{req.reason}"</div>}
                      </div>

                      {/* Approve / Reject actions */}
                      {rejectId === req.id ? (
                        <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 space-y-2">
                          <input
                            type="text"
                            placeholder="ระบุเหตุผลที่ปฏิเสธ..."
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            className="w-full p-2 bg-white rounded-lg border border-rose-200 text-xs"
                          />
                          <div className="flex gap-2 justify-end">
                            <button onClick={() => setRejectId(null)} className="px-3 py-1 bg-slate-200 rounded-lg text-xs">
                              ยกเลิก
                            </button>
                            <button onClick={() => handleRejectSwap(req.id)} className="px-3 py-1 bg-rose-600 text-white rounded-lg text-xs font-semibold">
                              ยืนยันปฏิเสธ
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex justify-end gap-2 pt-1">
                          <button
                            onClick={() => setRejectId(req.id)}
                            className="px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-xl transition flex items-center gap-1"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>ปฏิเสธ</span>
                          </button>
                          <button
                            onClick={() => handleApproveSwap(req.id)}
                            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs transition flex items-center gap-1"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>อนุมัติการสลับเวร</span>
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* My Sent Requests */}
            {pendingRequestsSentByMe.length > 0 && (
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                <div className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-500" />
                  <span>คำขอที่คุณส่งไป (รอเพื่อนตอบรับ):</span>
                </div>
                <div className="space-y-2 text-xs">
                  {pendingRequestsSentByMe.map(req => (
                    <div key={req.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center">
                      <div>
                        <div className="font-semibold text-slate-800">
                          ขอสลับกับ <b>{req.target_user_name}</b> (วันที่ {req.shift_date})
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {req.requester_shift_name} 🔁 {req.target_shift_name}
                        </div>
                      </div>
                      <span className="px-2.5 py-1 bg-amber-100 text-amber-800 rounded-full font-bold text-[10px]">
                        ⏳ รอเพื่อนตอบรับ
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Audit History */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <h3 className="font-bold text-slate-900 text-sm">ประวัติการสลับเวร (Swap History)</h3>
              <div className="overflow-x-auto text-xs">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-slate-500 border-b border-slate-200 pb-2">
                      <th className="pb-2">วันที่เวร</th>
                      <th className="pb-2">ผู้ขอสลับ</th>
                      <th className="pb-2">สลับกับ</th>
                      <th className="pb-2">สถานะ</th>
                      <th className="pb-2">เวลา</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {historicalSwaps.map(item => (
                      <tr key={item.id} className="hover:bg-slate-50">
                        <td className="py-2.5 font-medium">{item.shift_date}</td>
                        <td>{item.requester_name}</td>
                        <td>{item.target_user_name}</td>
                        <td>
                          {item.status === 'APPROVED' ? (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                              ✓ อนุมัติแล้ว
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-bold">
                              ✕ ปฏิเสธ
                            </span>
                          )}
                        </td>
                        <td className="text-slate-400 text-[11px]">{item.responded_at || '-'}</td>
                      </tr>
                    ))}
                    {historicalSwaps.length === 0 && (
                      <tr><td colSpan="5" className="py-4 text-center text-slate-400">ยังไม่มีประวัติ</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

        </div>
      )}

    </div>
  );
}
