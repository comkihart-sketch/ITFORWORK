import React, { useState } from 'react';
import { Calendar, RefreshCw, FileText, Settings, Bell, LogOut, User, CheckCircle2 } from 'lucide-react';

export default function Navbar({ 
  currentUser, 
  allUsers, 
  onSwitchUser, 
  activeTab, 
  setActiveTab, 
  pendingSwapCount,
  onLogout,
  onRefresh
}) {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (onRefresh) {
      setIsRefreshing(true);
      await onRefresh();
      setTimeout(() => setIsRefreshing(false), 500);
    } else {
      window.location.reload();
    }
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center h-16">
        
        {/* Logo & App Name */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white flex items-center justify-center font-bold text-xl shadow-md shadow-indigo-100">
            📅
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">ShiftFlow</h1>
              <span className="text-[10px] px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-semibold border border-indigo-100">
                ระบบเวรแผนก IT
              </span>
            </div>
            <p className="text-xs text-slate-500 hidden sm:block">ระบบจัดตารางเวรและสลับกะการทำงานออนไลน์</p>
          </div>
        </div>

        {/* User Profile & Actions */}
        <div className="flex items-center space-x-1 sm:space-x-3">

          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            title="รีเฟรชข้อมูล"
            className="relative p-2 rounded-xl text-slate-600 hover:bg-slate-100 hover:text-indigo-600 transition"
          >
            <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin text-indigo-600' : ''}`} />
          </button>

          {/* Pending Notification Button */}
          <button
            onClick={() => setActiveTab('swap')}
            title="การแจ้งเตือนคำขอสลับเวร"
            className="relative p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition"
          >
            <Bell className="w-5 h-5" />
            {pendingSwapCount > 0 && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-rose-500 rounded-full ring-2 ring-white animate-pulse" />
            )}
          </button>

          {/* User Badge & Profile */}
          <div className="flex items-center gap-2.5 pl-2 border-l border-slate-200">
            <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs shadow-2xs">
              {currentUser?.full_name?.charAt(0) || 'U'}
            </div>
            <div className="hidden sm:block text-left text-xs">
              <div className="font-semibold text-slate-800 flex items-center gap-1">
                <span>{currentUser?.full_name}</span>
                {currentUser?.role === 'ADMIN' && (
                  <span className="text-[9px] bg-indigo-600 text-white px-1.5 py-0.2 rounded font-bold">Admin</span>
                )}
              </div>
              <div className="text-[10px] text-slate-400 truncate max-w-[130px]">{currentUser?.position || 'เจ้าหน้าที่'}</div>
            </div>

            {/* Logout Button */}
            <button
              onClick={onLogout}
              title="ออกจากระบบ"
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition ml-1"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex space-x-1 sm:space-x-2 border-t border-slate-100 overflow-x-auto">
        <button
          onClick={() => setActiveTab('calendar')}
          className={`py-3 px-3 sm:px-4 text-xs sm:text-sm font-medium border-b-2 flex items-center gap-1.5 sm:gap-2 whitespace-nowrap transition ${
            activeTab === 'calendar'
              ? 'border-indigo-600 text-indigo-600 font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>1. ปฏิทินเวรรวม (Master Roster)</span>
        </button>

        <button
          onClick={() => setActiveTab('swap')}
          className={`py-3 px-3 sm:px-4 text-xs sm:text-sm font-medium border-b-2 flex items-center gap-1.5 sm:gap-2 whitespace-nowrap transition ${
            activeTab === 'swap'
              ? 'border-indigo-600 text-indigo-600 font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <RefreshCw className="w-4 h-4" />
          <span>2. ลงเวร & สลับเวร (My Shifts & Swap)</span>
          {pendingSwapCount > 0 && (
            <span className="bg-amber-100 text-amber-800 text-xs px-2 py-0.5 rounded-full font-bold">
              {pendingSwapCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('notes')}
          className={`py-3 px-3 sm:px-4 text-xs sm:text-sm font-medium border-b-2 flex items-center gap-1.5 sm:gap-2 whitespace-nowrap transition ${
            activeTab === 'notes'
              ? 'border-indigo-600 text-indigo-600 font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>3. บันทึกประจำวัน (Daily Notes)</span>
        </button>

        <button
          onClick={() => setActiveTab('admin')}
          className={`py-3 px-3 sm:px-4 text-xs sm:text-sm font-medium border-b-2 flex items-center gap-1.5 sm:gap-2 whitespace-nowrap transition ${
            activeTab === 'admin'
              ? 'border-indigo-600 text-indigo-600 font-semibold'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>4. เมนูตั้งค่า (Admin Settings)</span>
          {currentUser?.role === 'ADMIN' ? (
            <span className="bg-emerald-100 text-emerald-800 text-[10px] px-1.5 py-0.5 rounded font-bold">
              Admin
            </span>
          ) : (
            <span className="bg-slate-100 text-slate-500 text-[10px] px-1.5 py-0.5 rounded">
              View Only
            </span>
          )}
        </button>
      </div>
    </header>
  );
}
