import React, { useState, useEffect, useCallback } from 'react';
import { api } from './api';
import Navbar from './components/Navbar';
import CalendarView from './components/CalendarView';
import ShiftAndSwapView from './components/ShiftAndSwapView';
import DailyNotesView from './components/DailyNotesView';
import AdminSettingsView from './components/AdminSettingsView';
import LoginView from './components/LoginView';
import ForceChangePasswordModal from './components/ForceChangePasswordModal';
import ExportView from './components/ExportView';
import { CheckCircle, AlertCircle } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [shiftTypes, setShiftTypes] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [swaps, setSwaps] = useState([]);
  const [notes, setNotes] = useState([]);
  const [activeTab, setActiveTab] = useState('calendar');
  const [toast, setToast] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Month state (YYYY-MM)
  const [currentMonthStr, setCurrentMonthStr] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  });

  // Show Toast
  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3500);
  }, []);

// Initial Login & Load Data
  useEffect(() => {
    initializeSession();
  }, []);

  async function initializeSession() {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('shiftflow_token');
      if (token) {
        try {
          const me = await api.auth.me();
          setCurrentUser(me);
        } catch {
          localStorage.removeItem('shiftflow_token');
          setCurrentUser(null);
        }
      } else {
        setCurrentUser(null);
      }
    } catch (err) {
      console.error('Session error:', err);
    } finally {
      setIsLoading(false);
    }
  }

  // Load all app data whenever currentUser or currentMonthStr changes
  const loadAppData = useCallback(async () => {
    if (!currentUser) return;

    try {
      const [usersData, shiftsData, typesData, holidaysData, swapsData, notesData] = await Promise.all([
        api.auth.getUsers(),
        api.shifts.get(currentMonthStr),
        api.shiftTypes.get(),
        api.holidays.get(),
        api.swaps.get(),
        api.notes.get(currentMonthStr)
      ]);

      setAllUsers(usersData);
      setShifts(shiftsData);
      setShiftTypes(typesData);
      setHolidays(holidaysData);
      setSwaps(swapsData);
      setNotes(notesData);
    } catch (err) {
      console.error('Error loading data:', err);
    }
  }, [currentUser, currentMonthStr]);

  useEffect(() => {
    if (currentUser) {
      loadAppData();
    }
  }, [currentUser, loadAppData]);

  // Demo Switch User Handler
  async function handleSwitchUser(newUserId) {
    const targetUser = allUsers.find(u => u.id === newUserId);
    if (!targetUser) return;

    try {
      const loginRes = await api.auth.login(targetUser.username, '1234');
      localStorage.setItem('shiftflow_token', loginRes.token);
      setCurrentUser(loginRes.user);
      showToast(`สลับบัญชีผู้ใช้เป็น: ${targetUser.full_name}`);
    } catch (err) {
      showToast('ไม่สามารถสลับบัญชีได้: ' + err.message, 'error');
    }
  }

  // Month navigation
  function handleChangeMonth(delta, customStr = null) {
    if (customStr) {
      setCurrentMonthStr(customStr);
      return;
    }
    const [y, m] = currentMonthStr.split('-').map(Number);
    const newDate = new Date(y, m - 1 + delta, 1);
    const newStr = `${newDate.getFullYear()}-${String(newDate.getMonth() + 1).padStart(2, '0')}`;
    setCurrentMonthStr(newStr);
  }

  // Count pending swap approvals for current user
  const pendingSwapCount = swaps.filter(
    s => s.target_user_id === currentUser?.id && s.status === 'PENDING'
  ).length;

  function handleLogout() {
    if (window.confirm('คุณต้องการออกจากระบบใช่หรือไม่?')) {
      localStorage.removeItem('shiftflow_token');
      setCurrentUser(null);
      showToast('ออกจากระบบเรียบร้อยแล้ว');
    }
  }

  function handlePasswordChanged(res) {
    if (res.token) {
      localStorage.setItem('shiftflow_token', res.token);
    }
    setCurrentUser(prev => ({
      ...prev,
      ...res.user,
      must_change_password: false
    }));
    showToast('🎉 บันทึกรหัสผ่านใหม่เรียบร้อยแล้ว ยินดีต้อนรับเข้าสู่ระบบ!');
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-3"></div>
        <div className="text-slate-600 font-medium text-sm">กำลังเชื่อมต่อระบบตารางเวร...</div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <>
        <LoginView
          onLoginSuccess={(user) => {
            setCurrentUser(user);
          }}
          onShowToast={showToast}
          api={api}
        />
        {toast && (
          <div
            className={`fixed bottom-5 right-5 px-4 py-3 rounded-xl shadow-lg text-xs flex items-center gap-2 z-50 transition-all ${
              toast.type === 'error' ? 'bg-rose-900 text-white' : 'bg-slate-900 text-white'
            }`}
          >
            {toast.type === 'error' ? <AlertCircle className="w-4 h-4 text-rose-400" /> : <CheckCircle className="w-4 h-4 text-emerald-400" />}
            <span>{toast.message}</span>
          </div>
        )}
      </>
    );
  }

  // Handle full-screen Export View
  if (activeTab === 'export') {
    return (
      <ExportView
        allUsers={allUsers}
        shifts={shifts}
        shiftTypes={shiftTypes}
        currentMonthStr={currentMonthStr}
        onClose={() => setActiveTab('admin')}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Navbar */}
      <Navbar
        currentUser={currentUser}
        allUsers={allUsers}
        onSwitchUser={handleSwitchUser}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        pendingSwapCount={pendingSwapCount}
        onLogout={handleLogout}
        onRefresh={loadAppData}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'calendar' && (
          <CalendarView
            shifts={shifts}
            shiftTypes={shiftTypes}
            holidays={holidays}
            allUsers={allUsers}
            notes={notes}
            currentMonthStr={currentMonthStr}
            onChangeMonth={handleChangeMonth}
            currentUser={currentUser}
            onGoToSwap={() => setActiveTab('swap')}
          />
        )}

        {activeTab === 'swap' && (
          <ShiftAndSwapView
            currentUser={currentUser}
            allUsers={allUsers}
            shifts={shifts}
            shiftTypes={shiftTypes}
            holidays={holidays}
            swaps={swaps}
            currentMonthStr={currentMonthStr}
            onChangeMonth={handleChangeMonth}
            onRefreshData={loadAppData}
            onShowToast={showToast}
            api={api}
          />
        )}

        {activeTab === 'notes' && (
          <DailyNotesView
            currentUser={currentUser}
            notes={notes}
            onRefreshData={loadAppData}
            onShowToast={showToast}
            api={api}
          />
        )}

        {activeTab === 'admin' && (
          <AdminSettingsView
            currentUser={currentUser}
            shiftTypes={shiftTypes}
            holidays={holidays}
            onRefreshData={loadAppData}
            onShowToast={showToast}
            api={api}
            setActiveTab={setActiveTab}
          />
        )}
      </main>

      {/* Force Change Password Modal for First-time / Admin Reset Login */}
      {currentUser && currentUser.must_change_password && (
        <ForceChangePasswordModal
          currentUser={currentUser}
          onPasswordChanged={handlePasswordChanged}
          onLogout={handleLogout}
          api={api}
        />
      )}

      {/* Global Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-5 right-5 px-4 py-3 rounded-xl shadow-lg text-xs flex items-center gap-2 z-50 transition-all transform duration-300 animate-bounce ${
            toast.type === 'error'
              ? 'bg-rose-900 text-white border border-rose-700'
              : 'bg-slate-900 text-white border border-slate-700'
          }`}
        >
          {toast.type === 'error' ? (
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          ) : (
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          )}
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
