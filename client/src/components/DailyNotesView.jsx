import React, { useState, useMemo } from 'react';
import { Globe, Lock, Trash2, Calendar, FileText, Send, User } from 'lucide-react';

export default function DailyNotesView({
  currentUser,
  notes = [],
  onRefreshData,
  onShowToast,
  api
}) {
  const [noteDate, setNoteDate] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  });
  const [isPublic, setIsPublic] = useState(true);
  const [content, setContent] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all', 'public', 'private'
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter notes
  const filteredNotes = useMemo(() => {
    return notes.filter(n => {
      if (filterType === 'public') return n.is_public === 1;
      if (filterType === 'private') return n.is_public === 0;
      return true;
    });
  }, [notes, filterType]);

  async function handleAddNote(e) {
    e.preventDefault();
    if (!content.trim()) return;

    try {
      setIsSubmitting(true);
      await api.notes.create({
        note_date: noteDate,
        content: content.trim(),
        is_public: isPublic
      });
      onShowToast('บันทึกข้อมูลประจำวันเรียบร้อยแล้ว');
      setContent('');
      onRefreshData();
    } catch (err) {
      onShowToast(err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteNote(id) {
    if (!window.confirm('คุณต้องการลบบันทึกนี้ใช่หรือไม่?')) return;
    try {
      await api.notes.delete(id);
      onShowToast('ลบบันทึกเรียบร้อย');
      onRefreshData();
    } catch (err) {
      onShowToast(err.message, 'error');
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      
      {/* LEFT: Add Note Form (4 Cols) */}
      <div className="lg:col-span-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="border-b pb-3 border-slate-100 flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-700">
            <FileText className="w-4 h-4" />
          </span>
          <div>
            <h3 className="font-bold text-slate-900 text-sm">เพิ่มบันทึกประจำวัน</h3>
            <p className="text-xs text-slate-500">บันทึกเหตุการณ์ หมายเหตุ หรือส่งต่องาน</p>
          </div>
        </div>

        <form onSubmit={handleAddNote} className="space-y-4 text-xs">
          <div>
            <label className="block font-medium text-slate-700 mb-1">เลือกวันที่ต้องการบันทึก</label>
            <input
              type="date"
              value={noteDate}
              onChange={(e) => setNoteDate(e.target.value)}
              required
              className="w-full px-3 py-2 border rounded-xl border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs"
            />
          </div>

          {/* Privacy Toggle: Public vs Private */}
          <div>
            <label className="block font-medium text-slate-700 mb-1.5">
              ระดับความเป็นส่วนตัว (Privacy Mode)
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label
                className={`flex items-start gap-2 p-2.5 border rounded-xl cursor-pointer transition ${
                  isPublic
                    ? 'border-emerald-300 bg-emerald-50/50 shadow-2xs'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="visibility"
                  checked={isPublic}
                  onChange={() => setIsPublic(true)}
                  className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                />
                <div>
                  <div className="font-bold text-slate-800 text-xs flex items-center gap-1">
                    <Globe className="w-3 h-3 text-emerald-600" />
                    <span>ทุกคนเห็น</span>
                  </div>
                  <div className="text-[10px] text-slate-500">แสดงในตารางรวมแผนก</div>
                </div>
              </label>

              <label
                className={`flex items-start gap-2 p-2.5 border rounded-xl cursor-pointer transition ${
                  !isPublic
                    ? 'border-indigo-300 bg-indigo-50/50 shadow-2xs'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="visibility"
                  checked={!isPublic}
                  onChange={() => setIsPublic(false)}
                  className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                />
                <div>
                  <div className="font-bold text-slate-800 text-xs flex items-center gap-1">
                    <Lock className="w-3 h-3 text-indigo-600" />
                    <span>เห็นคนเดียว</span>
                  </div>
                  <div className="text-[10px] text-slate-500">บันทึกส่วนตัวของฉัน</div>
                </div>
              </label>
            </div>
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">เนื้อหาข้อความบันทึก</label>
            <textarea
              rows={4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="พิมพ์รายละเอียดบันทึกที่นี่... เช่น ส่งต่องาน, งานบำรุงรักษาประจำวัน, สิ่งที่ต้องติดตาม"
              required
              className="w-full px-3 py-2 border rounded-xl border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition shadow-xs flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{isSubmitting ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}</span>
          </button>
        </form>
      </div>

      {/* RIGHT: Notes List (8 Cols) */}
      <div className="lg:col-span-8 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        
        {/* Header & Filter Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3 border-slate-100">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">รายการบันทึกประจำวัน</h3>
            <p className="text-xs text-slate-500">
              แสดงบันทึกสาธารณะของแผนก และบันทึกส่วนตัวของคุณ ({currentUser?.full_name})
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 text-xs bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1 rounded-lg font-medium transition ${
                filterType === 'all'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              ทั้งหมด ({notes.length})
            </button>
            <button
              onClick={() => setFilterType('public')}
              className={`px-3 py-1 rounded-lg font-medium transition flex items-center gap-1 ${
                filterType === 'public'
                  ? 'bg-white text-emerald-700 shadow-2xs font-bold'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Globe className="w-3 h-3" />
              <span>ทุกคนเห็น</span>
            </button>
            <button
              onClick={() => setFilterType('private')}
              className={`px-3 py-1 rounded-lg font-medium transition flex items-center gap-1 ${
                filterType === 'private'
                  ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Lock className="w-3 h-3" />
              <span>เห็นคนเดียว</span>
            </button>
          </div>
        </div>

        {/* List of Notes */}
        <div className="space-y-3">
          {filteredNotes.map(note => {
            const isMine = note.author_id === currentUser?.id;
            const canDelete = isMine || currentUser?.role === 'ADMIN';

            return (
              <div
                key={note.id}
                className={`p-4 rounded-xl border transition space-y-2 text-xs ${
                  note.is_public === 1
                    ? 'bg-white border-slate-200 hover:border-slate-300'
                    : 'bg-indigo-50/20 border-indigo-200'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-[10px]">
                      {note.author_name?.charAt(0) || 'U'}
                    </div>
                    <div>
                      <span className="font-bold text-slate-800">{note.author_name}</span>
                      {isMine && <span className="text-[10px] text-indigo-600 font-semibold ml-1">(คุณ)</span>}
                      <span className="text-slate-400 mx-1.5">•</span>
                      <span className="text-slate-500 font-medium">📅 {note.note_date}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {note.is_public === 1 ? (
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md text-[10px] font-bold flex items-center gap-1">
                        <Globe className="w-2.5 h-2.5" /> ทุกคนเห็น
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-md text-[10px] font-bold flex items-center gap-1">
                        <Lock className="w-2.5 h-2.5" /> เห็นคนเดียว (Private)
                      </span>
                    )}

                    {canDelete && (
                      <button
                        onClick={() => handleDeleteNote(note.id)}
                        title="ลบบันทึกนี้"
                        className="p-1 text-slate-400 hover:text-rose-600 rounded transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <p className="text-slate-700 leading-relaxed whitespace-pre-wrap pl-8">
                  {note.content}
                </p>
              </div>
            );
          })}

          {filteredNotes.length === 0 && (
            <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-xs">
              ยังไม่มีบันทึกในหมวดหมู่นี้
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
