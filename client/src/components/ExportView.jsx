import React, { useMemo } from 'react';
import { Printer, ArrowLeft } from 'lucide-react';

export default function ExportView({
  allUsers = [],
  shifts = [],
  shiftTypes = [],
  currentMonthStr,
  onClose
}) {
  // Calculate month details
  const [yearStr, monthStr] = currentMonthStr.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10) - 1; // 0-indexed
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const thaiMonths = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];
  const thaiDays = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];

  const monthName = `${thaiMonths[month]} ${year + 543}`;
  const printDate = new Date().toLocaleString('th-TH', { dateStyle: 'long', timeStyle: 'short' });

  // Build days array
  const days = [];
  for (let i = 1; i <= daysInMonth; i++) {
    const dateObj = new Date(year, month, i);
    days.push({
      dateNum: i,
      dayStr: thaiDays[dateObj.getDay()],
      dateFull: `${yearStr}-${monthStr}-${String(i).padStart(2, '0')}`
    });
  }

  // Calculate shift durations
  const getHours = (t1, t2) => {
    if (!t1 || !t2) return 0;
    const [h1, m1] = t1.split(':').map(Number);
    const [h2, m2] = t2.split(':').map(Number);
    let diff = (h2 + m2/60) - (h1 + m1/60);
    if (diff < 0) diff += 24; // overnight shift
    return diff;
  };

  const typeMap = {};
  shiftTypes.forEach(t => {
    typeMap[t.id] = { ...t, hours: getHours(t.start_time, t.end_time) };
  });

  // User Rows
  const userRows = allUsers.map(user => {
    const userShifts = shifts.filter(s => s.user_id === user.id);
    const dayCells = days.map(d => {
      const shift = userShifts.find(s => s.shift_date === d.dateFull);
      const type = shift ? typeMap[shift.shift_type_id] : null;
      return type ? type.code : '';
    });

    let normal = 0;
    let pt = 0;
    let off = 0;
    let leave = 0;
    let totalHours = 0;

    dayCells.forEach(code => {
      if (!code) return;
      if (code === 'X' || code.toLowerCase().includes('หยุด') || code === 'OFF') {
        off++;
      }
      else if (code === 'V' || code.toLowerCase().includes('ลา') || code.toLowerCase().includes('พักร้อน')) {
        leave++;
      }
      else if (code.toUpperCase().includes('PT')) {
        pt++;
      }
      else {
        normal++;
        const t = shiftTypes.find(st => st.code === code);
        if (t) totalHours += getHours(t.start_time, t.end_time);
      }
    });

    const totalShifts = normal + pt + off + leave;

    return {
      user,
      dayCells,
      totalShifts,
      normal,
      pt,
      off,
      leave,
      totalHours
    };
  });

  // Bottom Summary (Counts per shift type per day)
  const summaryRows = shiftTypes.map(t => {
    const counts = days.map(d => {
      const count = shifts.filter(s => s.shift_date === d.dateFull && s.shift_type_id === t.id).length;
      return count;
    });
    return {
      code: t.code,
      name: t.name,
      time: `${t.start_time ? t.start_time.substring(0, 5) : ''}-${t.end_time ? t.end_time.substring(0, 5) : ''}`,
      counts,
      total: counts.reduce((a, b) => a + b, 0)
    };
  });

  // Total working staff per day (sum of all counts except X and V)
  const totalStaffPerDay = days.map((d, i) => {
    let sum = 0;
    summaryRows.forEach(r => {
      if (r.code !== 'X' && r.code !== 'V' && !r.name.includes('หยุด') && !r.name.includes('ลา')) {
        sum += r.counts[i];
      }
    });
    return sum;
  });
  const grandTotal = totalStaffPerDay.reduce((a, b) => a + b, 0);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="bg-gray-100 min-h-screen">
      {/* Action Bar (Hidden when printing) */}
      <div className="print:hidden bg-white shadow-md p-4 flex justify-between items-center sticky top-0 z-50">
        <button 
          onClick={onClose}
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition font-medium"
        >
          <ArrowLeft className="w-5 h-5" />
          กลับหน้าหลัก
        </button>
        <h1 className="text-lg font-bold text-slate-800 hidden sm:block">โหมดแสดงผลสำหรับเครื่องพิมพ์</h1>
        <button 
          onClick={handlePrint}
          className="flex items-center gap-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition shadow-md"
        >
          <Printer className="w-5 h-5" />
          สั่งพิมพ์ (Print / PDF)
        </button>
      </div>

      {/* Printable A4 Area */}
      <div className="w-full overflow-auto p-4 sm:p-8 flex justify-center">
        <div className="bg-white shadow-2xl print:shadow-none print:p-0 p-8 min-w-[297mm] min-h-[210mm] relative">
          
          <style>{`
            @media print {
              @page { size: A4 landscape; margin: 10mm; }
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            }
            .export-table th, .export-table td {
              border: 1px solid #000;
              padding: 2px 4px;
              text-align: center;
              font-size: 11px;
            }
            .export-table th {
              background-color: #fff;
              font-weight: bold;
            }
            .export-table .text-left { text-align: left; }
            .export-table .text-right { text-align: right; }
          `}</style>

          {/* Header */}
          <div className="flex justify-between items-start mb-6">
            <div className="w-1/4 flex flex-col items-center">
              <div className="w-16 h-16 rounded-full border-[3px] border-slate-800 flex items-center justify-center font-bold text-2xl pb-1">
                🏥
              </div>
              <span className="text-[10px] mt-1 font-semibold text-center">โรงพยาบาล / บริษัท</span>
            </div>
            
            <div className="w-2/4 text-center">
              <div className="bg-black text-white font-bold py-1 px-8 inline-block text-xl mb-3 tracking-wide">
                ตารางการปฏิบัติงาน
              </div>
              <div className="font-medium text-[15px]">
                ประจำเดือน {monthName} คอมพิวเตอร์
              </div>
            </div>

            <div className="w-1/4 text-right text-[10px] pr-4">
              <div className="mb-1 font-medium">ผู้พิมพ์ : ผู้ดูแลระบบ</div>
              <div>วันที่พิมพ์ : {printDate} | หน้า 1 / 1</div>
            </div>
          </div>

          {/* Main Table */}
          <table className="export-table w-full border-collapse mb-6">
            <thead>
              <tr>
                <th rowSpan="2" className="w-8">ที่</th>
                <th rowSpan="2" className="w-32 text-left px-2 whitespace-nowrap">
                  รหัสพนักงาน<br/><br/>ชื่อ - นามสกุล
                </th>
                <th colSpan={daysInMonth} className="py-1">วันที่ปฏิบัติงาน</th>
                <th colSpan="5" className="py-1">สรุปการปฏิบัติงาน</th>
                <th rowSpan="2" className="w-16">ลายมือชื่อ<br/>เจ้าหน้าที่</th>
              </tr>
              <tr>
                {days.map(d => (
                  <th key={d.dateNum} className="w-6 py-1">
                    <div>{d.dateNum}</div>
                    <div className="text-[9px] font-normal">{d.dayStr}</div>
                  </th>
                ))}
                <th className="w-8">รวมเวร</th>
                <th className="w-8">ปกติ</th>
                <th className="w-8">PT</th>
                <th className="w-8">หยุด</th>
                <th className="w-8">ลา</th>
              </tr>
            </thead>
            <tbody>
              {userRows.map((row, idx) => (
                <React.Fragment key={row.user.id}>
                  {/* Row 1: Codes */}
                  <tr>
                    <td rowSpan="3" className="align-top pt-2">{idx + 1}</td>
                    <td rowSpan="3" className="text-left px-2 align-top pt-2 whitespace-nowrap">
                      <div>{row.user.username}</div>
                      <div className="mt-1">{row.user.full_name}</div>
                    </td>
                    {row.dayCells.map((code, i) => (
                      <td key={i} className="font-semibold text-[10px]">{code}</td>
                    ))}
                    <td colSpan="6" className="text-left px-2 text-[9px] py-1 border-b-0">
                      ข้าพเจ้ายินยอมทำงานล่วงเวลาเกินกว่า<br/>
                      36 ชั่วโมง/สัปดาห์(ตามที่ตกลง)
                    </td>
                  </tr>
                  {/* Row 2: Quantities */}
                  <tr>
                    {row.dayCells.map((code, i) => (
                      <td key={i} className="border-t-0 border-b-0 h-4"></td> // Empty cell spacing
                    ))}
                    <td className="border-t-0 border-b-0 font-medium">{row.normal || '-'}</td>
                    <td className="border-t-0 border-b-0 font-medium">{row.normal || '-'}</td>
                    <td className="border-t-0 border-b-0">{row.pt || '-'}</td>
                    <td className="border-t-0 border-b-0">{row.off || '-'}</td>
                    <td className="border-t-0 border-b-0">{row.leave || '-'}</td>
                    <td className="border-t-0 border-b-0"></td>
                  </tr>
                  {/* Row 3: H (Hours) */}
                  <tr>
                    {row.dayCells.map((code, i) => (
                      <td key={i} className="border-t-0 h-4"></td>
                    ))}
                    <td className="font-bold border-t-0 bg-gray-50">{row.totalHours > 0 ? `${row.totalHours}H` : '-'}</td>
                    <td className="font-bold border-t-0 bg-gray-50">{row.totalHours > 0 ? `${row.totalHours}H` : '-'}</td>
                    <td className="border-t-0"></td>
                    <td className="border-t-0"></td>
                    <td className="border-t-0"></td>
                    <td className="border-t-0"></td>
                  </tr>
                </React.Fragment>
              ))}
            </tbody>
          </table>

          {/* Bottom Summary Table */}
          <div className="flex justify-start">
            <table className="export-table border-collapse w-full">
              <thead>
                <tr>
                  <th className="text-left px-2 w-48 py-1">รหัสเวร</th>
                  {days.map(d => (
                    <th key={d.dateNum} className="w-6">{d.dateNum}</th>
                  ))}
                  <th className="w-10">รวม</th>
                </tr>
              </thead>
              <tbody>
                {summaryRows.map((row, idx) => (
                  <tr key={idx}>
                    <td className="text-left px-2 whitespace-nowrap text-[10px]">
                      {idx + 1}. {row.code}: {row.time} {row.name}
                    </td>
                    {row.counts.map((count, i) => (
                      <td key={i} className={count > 0 ? 'font-medium' : 'text-gray-300'}>
                        {count || ''}
                      </td>
                    ))}
                    <td className="font-bold">{row.total || ''}</td>
                  </tr>
                ))}
                <tr className="font-bold bg-gray-100">
                  <td className="text-right px-4">รวมจำนวนเวร</td>
                  {totalStaffPerDay.map((sum, i) => (
                    <td key={i}>{sum || ''}</td>
                  ))}
                  <td>{grandTotal}</td>
                </tr>
              </tbody>
            </table>
          </div>

        </div>
      </div>
    </div>
  );
}
