import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Receipt, ListOrdered, CalendarDays, Settings, LogOut, Wallet } from 'lucide-react';
import { getUsername, clearSession } from '../lib/auth';

const navItems = [
  { to: '/', label: 'ホーム', icon: LayoutDashboard },
  { to: '/scan', label: 'レシート読み取り', icon: Receipt },
  { to: '/expenses', label: '支出管理', icon: ListOrdered },
  { to: '/calendar', label: 'カレンダー', icon: CalendarDays },
  { to: '/settings', label: '設定', icon: Settings },
];

export default function Layout() {
  const navigate = useNavigate();
  const username = getUsername() ?? '';

  const handleLogout = () => {
    clearSession();
    navigate('/login', { replace: true });
  };

  return (
    <div className="flex h-screen bg-slate-100">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200 shrink-0">
        {/* Brand */}
        <div className="px-6 py-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-indigo-500 rounded-xl flex items-center justify-center shrink-0 shadow-sm">
              <Wallet size={18} className="text-white" />
            </div>
            <span className="text-slate-800 font-bold text-base tracking-tight">家計簿</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-3">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} end={to === '/'}>
              {({ isActive }) => (
                <div className={`flex items-center gap-4 px-4 py-4 rounded-xl text-[16px] font-medium transition-all cursor-pointer ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-700 font-semibold'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                }`}>
                  <Icon size={26} strokeWidth={isActive ? 2.2 : 1.8} className={isActive ? 'text-indigo-600' : 'text-slate-400'} />
                  {label}
                </div>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User */}
        <div className="p-4 border-t border-slate-100">
          <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-slate-50 transition-colors">
            <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 text-sm font-bold flex items-center justify-center shrink-0">
              {username.charAt(0).toUpperCase()}
            </div>
            <span className="text-sm text-slate-600 flex-1 truncate font-medium">{username}</span>
            <button onClick={handleLogout} title="ログアウト" className="text-slate-400 hover:text-red-400 transition-colors">
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile header */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center">
              <Wallet size={15} className="text-white" />
            </div>
            <span className="text-slate-800 font-bold text-sm">家計簿</span>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 text-sm font-bold flex items-center justify-center">
              {username.charAt(0).toUpperCase()}
            </div>
            <button onClick={handleLogout} className="text-slate-400 hover:text-red-400 transition-colors">
              <LogOut size={16} />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <Outlet />
        </main>

        {/* Mobile bottom nav */}
        <nav className="md:hidden flex border-t border-slate-200 bg-white">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} end={to === '/'}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center py-2.5 gap-0.5 text-[10px] font-medium transition-colors ${
                  isActive ? 'text-indigo-600' : 'text-slate-400'
                }`
              }
            >
              <Icon size={19} strokeWidth={1.6} />
              <span>{label.slice(0, 4)}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}
