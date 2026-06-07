import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Receipt, ListOrdered, CalendarDays, Settings, LogOut } from 'lucide-react';
import { getUsername, clearSession } from '../lib/auth';

const navItems = [
  { to: '/', label: 'ダッシュボード', icon: LayoutDashboard },
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
      {/* サイドバー（PC） */}
      <aside className="hidden md:flex flex-col w-56 bg-white border-r border-slate-200 shrink-0">
        <div className="px-5 py-5 border-b border-slate-200">
          <h1 className="text-lg font-bold text-indigo-600">家計簿アプリ</h1>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-600'
                    : 'text-slate-600 hover:bg-slate-100'
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* ユーザー情報 + ログアウト */}
        <div className="p-3 border-t border-slate-200">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg">
            <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-600 text-xs font-bold flex items-center justify-center shrink-0">
              {username.charAt(0).toUpperCase()}
            </div>
            <span className="text-sm text-slate-700 flex-1 truncate">{username}</span>
            <button
              onClick={handleLogout}
              title="ログアウト"
              className="text-slate-400 hover:text-red-500 transition-colors"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>

      {/* メインコンテンツ */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* スマホ用ヘッダー */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200">
          <h1 className="text-base font-bold text-indigo-600">家計簿アプリ</h1>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-600 text-xs font-bold flex items-center justify-center">
              {username.charAt(0).toUpperCase()}
            </div>
            <button onClick={handleLogout} className="text-slate-400 hover:text-red-500">
              <LogOut size={16} />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>

        {/* ボトムナビ（スマホ） */}
        <nav className="md:hidden flex border-t border-slate-200 bg-white">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center py-2 text-xs gap-1 ${
                  isActive ? 'text-indigo-600' : 'text-slate-500'
                }`
              }
            >
              <Icon size={20} />
              <span className="truncate">{label.slice(0, 4)}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}
