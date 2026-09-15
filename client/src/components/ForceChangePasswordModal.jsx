import React, { useState } from 'react';
import { Lock, Eye, EyeOff, ShieldAlert, CheckCircle2, AlertCircle, LogOut } from 'lucide-react';

export default function ForceChangePasswordModal({ currentUser, onPasswordChanged, onLogout, api }) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const isMinLength = newPassword.trim().length >= 4;
  const isMatching = newPassword && confirmPassword && newPassword === confirmPassword;

  async function handleSubmit(e) {
    e.preventDefault();
    setErrorMsg('');

    if (!isMinLength) {
      setErrorMsg('รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 4 ตัวอักษร');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('รหัสผ่านยืนยันไม่ตรงกับรหัสผ่านใหม่');
      return;
    }

    try {
      setIsLoading(true);
      const res = await api.auth.changePassword({
        new_password: newPassword,
        confirm_password: confirmPassword
      });

      if (res.success) {
        onPasswordChanged(res);
      }
    } catch (err) {
      setErrorMsg(err.message || 'เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 sm:p-8 border border-slate-100 relative overflow-hidden">
        {/* Top Accent Bar */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-amber-400 via-indigo-500 to-indigo-600" />

        {/* Header */}
        <div className="text-center space-y-2 pt-2">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shadow-sm">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-800">
            กรุณาตั้งรหัสผ่านใหม่
          </h2>
          <p className="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">
            สวัสดีคุณ <span className="font-semibold text-slate-700">{currentUser?.full_name}</span> 
            <br />
            นี่คือการเข้าสู่ระบบครั้งแรกของคุณ กรุณากำหนดรหัสผ่านใหม่ที่คุณจะจดจำได้ เพื่อความปลอดภัยของข้อมูล
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-6 space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-start gap-2 animate-in fade-in duration-150">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* New Password */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">
              รหัสผ่านใหม่ (New Password) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPass ? 'text' : 'password'}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="ระบุรหัสผ่านใหม่ (อย่างน้อย 4 ตัวอักษร)"
                className="w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs transition"
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
              >
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">
              ยืนยันรหัสผ่านใหม่อีกครั้ง (Confirm Password) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showConfirmPass ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="กรอกรหัสผ่านใหม่อีกครั้งให้ตรงกัน"
                className="w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs transition"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPass(!showConfirmPass)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
              >
                {showConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Requirement hints */}
          <div className="p-3 bg-slate-50 rounded-xl space-y-1.5 text-[11px] text-slate-600 border border-slate-100">
            <div className="flex items-center gap-1.5">
              <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[10px] ${
                isMinLength ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-400'
              }`}>
                ✓
              </div>
              <span className={isMinLength ? 'text-emerald-700 font-medium' : 'text-slate-500'}>
                ความยาวอย่างน้อย 4 ตัวอักษร
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[10px] ${
                isMatching ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-400'
              }`}>
                ✓
              </div>
              <span className={isMatching ? 'text-emerald-700 font-medium' : 'text-slate-500'}>
                รหัสผ่านทั้งสองช่องตรงกัน
              </span>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading || !isMinLength || !isMatching}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl transition shadow-md shadow-indigo-100 flex items-center justify-center gap-2 text-xs"
          >
            {isLoading ? (
              <span>กำลังบันทึกรหัสผ่าน...</span>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>บันทึกรหัสผ่านและเริ่มใช้งาน</span>
              </>
            )}
          </button>

          {/* Logout option */}
          <div className="text-center pt-2">
            <button
              type="button"
              onClick={onLogout}
              className="inline-flex items-center gap-1 text-slate-400 hover:text-rose-600 transition text-[11px]"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>ต้องการออกจากระบบ</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
