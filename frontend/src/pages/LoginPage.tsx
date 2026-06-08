import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wallet, ArrowRight, Loader2 } from 'lucide-react';
import { saveSession } from '../lib/auth';
import { login } from '../lib/api';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = username.trim();
    if (!trimmed) { setError('ユーザー名を入力してください'); return; }
    setLoading(true);
    try {
      const { user, token } = await login(trimmed);
      saveSession(user.username, token);
      navigate('/', { replace: true });
    } catch {
      setError('ログインに失敗しました。サーバーに接続できません。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="flex flex-col items-center">
        {/* ブランド */}
        <div className="inline-flex w-14 h-14 bg-indigo-600 rounded-2xl items-center justify-center mb-5 shadow-lg shadow-indigo-200">
          <Wallet size={26} className="text-white" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">家計簿アプリ</h1>
        <p className="text-sm text-slate-500 mt-1">レシートで家計を賢く管理する</p>

        {/* フォーム — サブタイトルと同幅・間を空ける */}
        <form onSubmit={handleSubmit} className="w-64" style={{ marginTop: '1rem' }}>
          <div>
            <input
              type="text"
              autoComplete="username"
              autoFocus
              style={{ height: '30px' }}
              className="w-full px-4 bg-white border border-slate-200 rounded-xl text-slate-900 text-sm placeholder-slate-400 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition shadow-sm"
              placeholder="ユーザー名"
              value={username}
              onChange={(e) => { setUsername(e.target.value); setError(''); }}
            />
            {error && <p className="mt-1.5 text-xs text-red-500">{error}</p>}
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{ marginTop: '1rem', height: '30px' }}
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md shadow-indigo-200"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
            {loading ? '接続中...' : 'はじめる'}
          </button>
        </form>
      </div>
    </div>
  );
}
