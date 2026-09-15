import React, { useState } from 'react';
import { Lock, User, LogIn, Calendar, ShieldCheck, AlertCircle } from 'lucide-react';

export default function LoginView({ onLoginSuccess, onShowToast, api }) {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  async function handleLogin(e) {
    e.preventDefault();
    if (!username.trim() || !password) {
      setErrorMsg('กรุณากรอกชื่อผู้ใช้และรหัสผ่าน');
      return;
    }

    try {
      setIsLoading(true);
      setErrorMsg('');
      const res = await api.auth.login(username.trim(), password);
      localStorage.setItem('shiftflow_token', res.token);
      onShowToast(`ยินดีต้อนรับคุณ ${res.user.full_name}`);
      onLoginSuccess(res.user);
    } catch (err) {
      setErrorMsg(err.message || 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-indigo-50/40 to-slate-100 flex flex-col justify-center items-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-slate-200 shadow-xl space-y-6">
        
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-indigo-600 text-white rounded-2xl mx-auto flex items-center justify-center font-bold text-2xl shadow-lg shadow-indigo-200">
            📅
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">ShiftFlow</h1>
          <p className="text-xs text-slate-500">
            ระบบบริหารจัดการตารางเวรและสลับกะการทำงานออนไลน์
          </p>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4 text-xs">
          <div>
            <label className="block font-medium text-slate-700 mb-1">ชื่อผู้ใช้งาน (Username)</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <User className="w-4 h-4" />
              </span>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="กรอก Username ของคุณ"
                className="w-full pl-9 pr-3 py-2.5 border rounded-xl border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">รหัสผ่าน (Password)</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <Lock className="w-4 h-4" />
              </span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="กรอกรหัสผ่าน"
                className="w-full pl-9 pr-3 py-2.5 border rounded-xl border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition shadow-md shadow-indigo-100 flex items-center justify-center gap-2 text-xs disabled:opacity-50"
          >
            <LogIn className="w-4 h-4" />
            <span>{isLoading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ (Sign In)'}</span>
          </button>
        </form>

        {/* Initial Setup Info Callout */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1.5 text-[11px] text-slate-600">
          <div className="font-bold text-slate-800 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
            <span>ข้อมูลการเข้าสู่ระบบเริ่มต้น (Default Admin)</span>
          </div>
          <p className="text-slate-500 leading-relaxed">
            ผู้ดูแลระบบสามารถเข้าสู่ระบบครั้งแรกด้วย:
            <br />
            • Username: <code className="bg-white px-1.5 py-0.5 rounded border font-semibold text-slate-800">admin</code>
            <br />
            • Password: <code className="bg-white px-1.5 py-0.5 rounded border font-semibold text-slate-800">1234</code>
          </p>
          <p className="text-[10px] text-indigo-700 pt-1">
            * หลังจากเข้าสู่ระบบแล้ว สามารถเพิ่มรายชื่อพนักงานในแผนก และเปลี่ยนรหัสผ่านได้ที่เมนู <b>"4. เมนูตั้งค่า (Admin Settings)"</b>
          </p>
        </div>

      </div>

      <div className="mt-6 text-xs text-slate-400">
        ShiftFlow • ระบบจัดตารางเวรสำหรับองค์กรและแผนก
      </div>
    </div>
  );
}
