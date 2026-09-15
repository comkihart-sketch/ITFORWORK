import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, RefreshCw, Info, CheckCircle, AlertCircle } from 'lucide-react';

export default function CalendarView({
  shifts = [],
  shiftTypes = [],
  holidays = [],
  allUsers = [],
  notes = [],
  currentMonthStr, // 'YYYY-MM'
  onChangeMonth,
  currentUser,
  onGoToSwap
}) {
  const [selectedShiftForDetail, setSelectedShiftForDetail] = useState(null);
  const [filterUserId, setFilterUserId] = useState('ALL');
  const scrollContainerRef = useRef(null);

  // Parse Year and Month
  const [year, month] = useMemo(() => {
    const parts = currentMonthStr.split('-');
    return [parseInt(parts[0]), parseInt(parts[1])];
  }, [currentMonthStr]);

  // Days in this month
  const daysInMonth = useMemo(() => {
    return new Date(year, month, 0).getDate();
  }, [year, month]);

  // Array of date strings: 'YYYY-MM-01', 'YYYY-MM-02', ...
  const dateList = useMemo(() => {
    const list = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const dayStr = String(d).padStart(2, '0');
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${dayStr}`;
      const jsDate = new Date(year, month - 1, d);
      const dayOfWeek = jsDate.getDay(); // 0 = Sun, 1 = Mon, ...
      list.push({
        dayNumber: d,
        dateStr,
        dayOfWeek,
        isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
      });
    }
    return list;
  }, [year, month, daysInMonth]);

  const thaiDayNames = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
  const thaiMonthNames = [
    '', 'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];

  // Holidays map for fast lookup
  const holidayMap = useMemo(() => {
    const map = {};
    holidays.forEach(h => {
      map[h.holiday_date] = h;
    });
    return map;
  }, [holidays]);

  // Shifts lookup map: key = `${userId}_${dateStr}`
  const shiftMap = useMemo(() => {
    const map = {};
    shifts.forEach(s => {
      const key = `${s.user_id}_${s.shift_date}`;
      map[key] = s;
    });
    return map;
  }, [shifts]);

  // Public Notes lookup map: key = dateStr, value = array of notes
  const publicNotesMap = useMemo(() => {
    const map = {};
    notes.filter(n => n.is_public === 1).forEach(n => {
      if (!map[n.note_date]) map[n.note_date] = [];
      map[n.note_date].push(n);
    });
    return map;
  }, [notes]);

  // Filter users
  const displayedUsers = useMemo(() => {
    if (filterUserId === 'ALL') return allUsers;
    return allUsers.filter(u => u.id === parseInt(filterUserId));
  }, [allUsers, filterUserId]);

  const todayStr = useMemo(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  }, []);

  // Scroll to Today's column when the component mounts or month changes
  useEffect(() => {
    if (scrollContainerRef.current) {
      // Use setTimeout to allow DOM to render first
      setTimeout(() => {
        const todayEl = scrollContainerRef.current.querySelector('#today-col');
        if (todayEl) {
          const container = scrollContainerRef.current;
          // Calculate the scroll position to center the 'Today' column
          const scrollTarget = todayEl.offsetLeft - (container.clientWidth / 2) + (todayEl.clientWidth / 2);
          
          container.scrollTo({
            left: Math.max(0, scrollTarget),
            behavior: 'smooth'
          });
        }
      }, 100);
    }
  }, [month, year, dateList, filterUserId]);

  return (
    <div className="space-y-6">
      {/* Top Toolbar */}
      <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col lg:flex-row justify-between items-center gap-4 lg:gap-3">
        
        {/* Month Selector (Center on mobile, Left on desktop) */}
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
                const [curY, curM] = curStr.split('-').map(Number);
                onChangeMonth(0, curStr);
              }
            }}
            className="w-full sm:w-auto px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-200 transition"
          >
            เดือนปัจจุบัน
          </button>
        </div>

        {/* Shift Types Legend (Center aligned) */}
        <div className="flex items-center justify-center flex-wrap gap-2 text-xs w-full lg:w-auto flex-1">
          <span className="text-slate-500 font-medium">สัญลักษณ์เวร:</span>
          {shiftTypes.map(st => (
            <span
              key={st.id}
              style={{ backgroundColor: st.color_bg, color: st.color_text, borderColor: st.color_border }}
              className="px-2 py-0.5 rounded-md font-medium border text-[11px]"
            >
              {st.name} ({st.code})
            </span>
          ))}
          <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 font-semibold border border-purple-300 text-[11px] flex items-center gap-1">
            <RefreshCw className="w-3 h-3" /> สลับเวรแล้ว
          </span>
        </div>

        {/* Actions & Filters (Right aligned on desktop, center on mobile) */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto justify-center lg:justify-end">
          <div className="flex items-center text-xs w-full sm:w-auto justify-center">
            <span className="text-slate-500 mr-2 font-medium whitespace-nowrap">กรองพนักงาน:</span>
            <select
              value={filterUserId}
              onChange={(e) => setFilterUserId(e.target.value)}
              className="flex-1 sm:flex-none bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 sm:py-1.5 text-xs text-slate-700 outline-none focus:ring-1 focus:ring-indigo-500 min-w-[140px]"
            >
              <option value="ALL">ทุกคนในแผนก ({allUsers.length} คน)</option>
              {allUsers.map(u => (
                <option key={u.id} value={u.id}>{u.full_name}</option>
              ))}
            </select>
          </div>

          <button
            onClick={onGoToSwap}
            className="w-full sm:w-auto justify-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>ลงเวร / สลับเวร</span>
          </button>
        </div>

      </div>

      {/* Main Roster Matrix Grid */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        
        {/* Table Header Details */}
        <div className="p-4 border-b border-slate-100 flex flex-wrap justify-between items-center gap-2">
          <div>
            <h3 className="font-bold text-slate-800 text-sm sm:text-base">
              ตารางเวรประจำเดือน • แผนกไอทีและปฏิบัติการ
            </h3>
            <p className="text-xs text-slate-500">
              แสดงตารางเวรของเจ้าหน้าที่ทุกคน พร้อมข้อมูลวันหยุดนักขัตฤกษ์ และประวัติการสลับเวร
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CheckCircle className="w-3.5 h-3.5" /> แสดงผลแบบเรียลไทม์
            </span>
          </div>
        </div>

        {/* Scrollable Matrix */}
        <div ref={scrollContainerRef} className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-xs border-collapse min-w-[1200px]">
            <thead>
              <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                
                {/* Staff Column Header */}
                <th className="p-3 text-left w-48 font-semibold sticky left-0 bg-slate-50 z-20 border-r border-slate-200 shadow-xs">
                  พนักงานในแผนก
                </th>

                {/* Date Columns */}
                {dateList.map(d => {
                  const holiday = holidayMap[d.dateStr];
                  const isToday = d.dateStr === todayStr;
                  const dayName = thaiDayNames[d.dayOfWeek];

                  let thClass = 'p-2 text-center w-24 min-w-[80px] transition ';
                  if (isToday) {
                    thClass += 'bg-indigo-50/70 text-indigo-900 border-x-2 border-indigo-300 ';
                  } else if (holiday) {
                    thClass += 'bg-rose-50 text-rose-800 border-x border-rose-200 ';
                  } else if (d.isWeekend) {
                    thClass += 'bg-rose-50/70 text-rose-600 border-x border-rose-100 ';
                  }

                  return (
                    <th key={d.dateStr} id={isToday ? 'today-col' : undefined} className={thClass} title={holiday ? holiday.name : ''}>
                      {isToday && (
                        <span className="text-[9px] block text-indigo-600 font-bold uppercase tracking-wider mb-0.5">
                          วันนี้
                        </span>
                      )}
                      {holiday && (
                        <span className="text-[9px] block text-rose-600 font-semibold truncate mb-0.5" title={holiday.name}>
                          🎌 {holiday.name}
                        </span>
                      )}
                      <div className={`text-[10px] ${d.isWeekend ? 'text-rose-600 font-bold' : 'text-slate-500'}`}>{dayName}</div>
                      <div className={`text-sm font-bold ${d.isWeekend ? 'text-rose-600' : 'text-slate-800'}`}>{d.dayNumber}</div>
                    </th>
                  );
                })}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {displayedUsers.map(user => {
                const isMe = user.id === currentUser?.id;

                return (
                  <tr key={user.id} className={isMe ? 'bg-indigo-50/20' : 'hover:bg-slate-50/60'}>
                    
                    {/* User Sticky Row Header */}
                    <td className="p-3 sticky left-0 bg-white z-10 border-r border-slate-200 shadow-xs">
                      <div className="flex items-center gap-2">
                        <div className={`w-2.5 h-2.5 rounded-full ${isMe ? 'bg-indigo-600' : 'bg-slate-300'}`} />
                        <div>
                          <div className="font-medium text-slate-900 text-xs flex items-center gap-1">
                            {user.full_name}
                            {isMe && <span className="text-[10px] text-indigo-600 font-bold">(ฉัน)</span>}
                          </div>
                          <div className="text-[10px] text-slate-400">{user.position || 'เจ้าหน้าที่'}</div>
                        </div>
                      </div>
                    </td>

                    {/* Day Cells */}
                    {dateList.map(d => {
                      const key = `${user.id}_${d.dateStr}`;
                      const shift = shiftMap[key];
                      const holiday = holidayMap[d.dateStr];
                      const isToday = d.dateStr === todayStr;

                      let cellBg = '';
                      if (isToday) cellBg = 'bg-indigo-50/30 ';
                      else if (holiday) cellBg = 'bg-rose-50/20 ';
                      else if (d.isWeekend) cellBg = 'bg-rose-50/30 border-x border-rose-100/40 ';

                      if (!shift) {
                        return (
                          <td key={d.dateStr} className={`p-1.5 text-center align-middle ${cellBg}`}>
                            <span className="text-slate-300 text-xs">-</span>
                          </td>
                        );
                      }

                      return (
                        <td key={d.dateStr} className={`p-1.5 text-center align-top ${cellBg}`}>
                          <div
                            style={{
                              backgroundColor: shift.color_bg,
                              color: shift.color_text,
                              borderColor: shift.color_border
                            }}
                            className="p-1.5 rounded-lg border font-medium text-[11px] shadow-2xs transition hover:scale-105 cursor-pointer"
                            title={`${shift.shift_name} (${shift.start_time} - ${shift.end_time})`}
                          >
                            <div className="font-semibold">{shift.shift_code}</div>
                            <div className="text-[9px] opacity-80 truncate">{shift.shift_name.split(' ')[0]}</div>
                          </div>

                          {/* Swapped Shift Indicator */}
                          {shift.is_swapped === 1 && (
                            <div
                              className="mt-1 flex items-center justify-center gap-0.5 bg-purple-100 text-purple-800 text-[9px] font-bold px-1 py-0.5 rounded border border-purple-200 truncate cursor-help shadow-2xs"
                              title={`สลับเวรกับ: ${shift.swapped_with_name || 'เพื่อนร่วมงาน'}`}
                            >
                              <RefreshCw className="w-2.5 h-2.5" />
                              <span className="truncate">สลับ: {shift.swapped_with_name?.split(' ')[0]}</span>
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Public Daily Notes Bottom Highlights */}
        <div className="bg-slate-50 border-t border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-2 text-xs font-bold text-slate-700">
            <Info className="w-4 h-4 text-indigo-600" />
            <span>บันทึกสาธารณะประจำวัน (Public Daily Notes ที่ทุกคนเห็น):</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
            {notes.filter(n => n.is_public === 1).slice(0, 6).map(note => (
              <div key={note.id} className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-1">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="font-bold text-indigo-700">📅 {note.note_date}</span>
                  <span className="text-slate-400">โดย {note.author_name}</span>
                </div>
                <p className="text-slate-700 leading-snug">{note.content}</p>
              </div>
            ))}

            {notes.filter(n => n.is_public === 1).length === 0 && (
              <div className="col-span-3 text-slate-400 text-center py-2 text-xs">
                ไม่มีบันทึกสาธารณะในขณะนี้
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
